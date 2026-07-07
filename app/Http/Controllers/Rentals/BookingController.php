<?php

namespace App\Http\Controllers\Rentals;

use App\Http\Controllers\Controller;
use App\Http\Requests\Rentals\StoreBookingRequest;
use App\Models\Surfboard;
use App\Services\BookingService;
use App\Support\BusinessDateTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class BookingController extends Controller
{
    public function __construct(
        private BookingService $bookingService
    ) {}

    public function store(StoreBookingRequest $request): RedirectResponse|JsonResponse
    {
        $data = $request->validated();
        $surfboard = Surfboard::query()->findOrFail($data['surfboard_id']);
        $start = BusinessDateTime::parseRentalHandoffDate((string) $data['start_date']);
        $end = BusinessDateTime::parseRentalHandoffDate((string) $data['end_date']);

        try {
            $booking = $this->bookingService->createPendingBooking(
                $surfboard,
                $start,
                $end,
                [
                    'client_name' => $data['client_name'],
                    'client_email' => $data['client_email'] ?? null,
                    'client_phone' => $data['client_phone'] ?? null,
                    'payment_method' => $data['payment_method'] ?? null,
                ],
                $request->file('proof'),
                $request->user()?->id,
            );
        } catch (InvalidArgumentException $e) {
            $msg = $e->getMessage();
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $msg,
                    'collision' => str_contains($msg, 'disponible'),
                ], 422);
            }

            return redirect()->back()->withErrors([
                'start_date' => $msg,
            ]);
        }

        $depositAmount = (float) $booking->deposit_amount;

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'booking' => $booking->fresh(),
                'message' => 'Reserva creada y comprobante enviado. Queda pendiente de validación manual.',
            ], 201);
        }

        return redirect()->back()->with([
            'success' => 'Reserva creada y comprobante enviado correctamente. Te avisaremos tras validación. Depósito: '
                .number_format($depositAmount, 2, ',', '').' €. Caduca en 7 días.',
            'booking_id' => $booking->id,
        ]);
    }

    public function checkAvailability(Request $request): JsonResponse
    {
        $request->validate([
            'surfboard_id' => ['required', 'integer', 'exists:surfboards,id'],
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
        ]);

        $fromRaw = (string) $request->input('from');
        $toRaw = (string) $request->input('to');
        $from = BusinessDateTime::parseRentalDate($fromRaw);
        $to = preg_match('/^\d{4}-\d{2}-\d{2}$/', trim($toRaw))
            ? BusinessDateTime::parseInAppTimezone(trim($toRaw).' 23:59:59')
            : BusinessDateTime::parseRentalDate($toRaw);
        $ranges = $this->bookingService->getBlockedRanges(
            (int) $request->input('surfboard_id'),
            $from,
            $to
        );

        return response()->json([
            'blocked_ranges' => $ranges,
        ]);
    }
}
