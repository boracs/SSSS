<?php

namespace App\Http\Controllers\Rentals;

use App\Http\Controllers\Controller;
use App\Http\Requests\Rentals\StoreBookingRequest;
use App\Models\Booking;
use App\Models\Surfboard;
use App\Services\BookingService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BookingController extends Controller
{
    public function __construct(
        private BookingService $bookingService
    ) {}

    public function store(StoreBookingRequest $request): RedirectResponse|JsonResponse
    {
        $data = $request->validated();
        $surfboard = Surfboard::query()->findOrFail($data['surfboard_id']);
        $start = Carbon::parse($data['start_date']);
        $end = Carbon::parse($data['end_date']);

        if (! $this->bookingService->isAvailable((int) $surfboard->id, $start, $end)) {
            $msg = 'La tabla no está disponible en ese rango. Ya existe una reserva (pendiente o confirmada) que la bloquea.';
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $msg,
                    'collision' => true,
                ], 422);
            }
            return redirect()->back()->withErrors([
                'start_date' => 'La tabla no está disponible en ese rango. Comprueba el calendario o elija otras fechas.',
            ]);
        }

        $schema = $surfboard->priceSchema;
        $totalPrice = $this->bookingService->calculateBestPrice($schema, $start, $end);
        $depositAmount = $this->bookingService->calculateDeposit($totalPrice, 30.0);
        $expiresAt = Carbon::now()->addDays(7);
        $hasProof = $request->hasFile('proof');

        $proofPath = null;
        if ($hasProof) {
            $proofPath = $request->file('proof')->storeAs(
                'payment-proofs/rentals',
                Str::uuid()->toString().'.'.$request->file('proof')->getClientOriginalExtension(),
                'local'
            );
        }

        $booking = Booking::create([
            'surfboard_id' => $surfboard->id,
            'user_id' => $request->user()?->id,
            'client_name' => $data['client_name'],
            'client_email' => $data['client_email'] ?? null,
            'client_phone' => $data['client_phone'] ?? null,
            'start_date' => $start,
            'end_date' => $end,
            'expires_at' => $expiresAt,
            'status' => Booking::STATUS_PENDING,
            'payment_status' => $hasProof ? Booking::PAYMENT_SUBMITTED : Booking::PAYMENT_PENDING,
            'payment_proof_path' => $proofPath,
            'proof_uploaded_at' => $hasProof ? now() : null,
            'payment_method' => $data['payment_method'] ?? null,
            'total_price' => $totalPrice,
            'deposit_amount' => $depositAmount,
            'payment_proof_note' => null,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'booking' => $booking->fresh(),
                'message' => $hasProof
                    ? 'Reserva creada y comprobante enviado. Queda pendiente de validación manual.'
                    : 'Reserva creada en estado pendiente. El cliente dispone de 7 días para realizar el ingreso.',
            ], 201);
        }

        return redirect()->back()->with([
            'success' => $hasProof
                ? 'Reserva creada y comprobante enviado correctamente. Te avisaremos tras validación.'
                : 'Reserva creada (pendiente). Depósito: ' . number_format((float) $depositAmount, 2, ',', '') . ' €. Caduca en 7 días.',
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

        $from = Carbon::parse($request->input('from'));
        $to = Carbon::parse($request->input('to'));
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

