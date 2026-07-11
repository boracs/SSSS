<?php

declare(strict_types=1);

namespace App\Http\Controllers\Rentals;

use App\Actions\Payments\InitiatePaymentAction;
use App\DTOs\Payments\InitiatePaymentDto;
use App\DTOs\Payments\PaymentLineItemDto;
use App\Http\Controllers\Controller;
use App\Http\Requests\Rentals\StoreBookingRequest;
use App\Models\Booking;
use App\Models\Surfboard;
use App\Services\BookingService;
use App\Support\BusinessDateTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;

final class BookingController extends Controller
{
    public function __construct(
        private readonly BookingService $bookingService,
        private readonly InitiatePaymentAction $initiatePayment,
    ) {}

    public function store(StoreBookingRequest $request): RedirectResponse|JsonResponse|Response
    {
        $data      = $request->validated();
        $surfboard = Surfboard::query()->findOrFail($data['surfboard_id']);
        $start     = BusinessDateTime::parseRentalHandoffDate((string) $data['start_date']);
        $end       = BusinessDateTime::parseRentalHandoffDate((string) $data['end_date']);

        // 1. Crear la reserva (estado pending) — sin proof file
        try {
            $booking = $this->bookingService->createPendingBooking(
                $surfboard,
                $start,
                $end,
                [
                    'client_name'    => $data['client_name'],
                    'client_email'   => $data['client_email'] ?? null,
                    'client_phone'   => $data['client_phone'] ?? null,
                    'payment_method' => 'card',
                ],
                null,
                $request->user()?->id,
            );
        } catch (InvalidArgumentException $e) {
            $msg = $e->getMessage();

            if ($request->wantsJson()) {
                return response()->json([
                    'success'   => false,
                    'message'   => $msg,
                    'collision' => str_contains($msg, 'disponible'),
                ], 422);
            }

            return redirect()->back()->withErrors(['start_date' => $msg]);
        }

        // 2. Construir línea de pago (depósito = señal de reserva)
        $depositCents = (int) round((float) $booking->deposit_amount * 100);
        if ($depositCents <= 0) {
            Log::error('BookingController::store depósito cero — revisar PriceSchema y fechas', [
                'booking_id'     => $booking->id,
                'surfboard_id'   => $surfboard->id,
                'total_price'    => $booking->total_price,
                'deposit_amount' => $booking->deposit_amount,
            ]);

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se pudo calcular el importe del alquiler. Contacta con el club.',
                ], 422);
            }

            return redirect()->back()->withErrors([
                'start_date' => 'No se pudo calcular el importe del alquiler. Revisa las fechas o contacta con nosotros.',
            ]);
        }

        $days         = max(1, (int) $start->diffInDays($end));
        $description  = "Alquiler {$days} día(s) · {$start->format('d/m/Y')} → {$end->format('d/m/Y')}";

        $dto = new InitiatePaymentDto(
            payableType:   Booking::class,
            payableId:     $booking->id,
            lineItems:     [
                new PaymentLineItemDto(
                    name:             "Reserva: {$surfboard->name}",
                    description:      $description,
                    unitAmountCents:  $depositCents,
                    quantity:         1,
                ),
            ],
            successPath:   '/pago/exito',
            cancelPath:    '/tablas-alquiler',
            customerEmail: $data['client_email'] ?? null,
            metadata:      ['booking_id' => (string) $booking->id],
        );

        try {
            $checkoutUrl = $this->initiatePayment->execute($dto);
        } catch (\RuntimeException $e) {
            Log::error('BookingController::store error al crear sesión Stripe', [
                'booking_id' => $booking->id,
                'error'      => $e->getMessage(),
            ]);

            if ($request->wantsJson()) {
                return response()->json([
                    'success'    => true,
                    'booking_id' => $booking->id,
                    'message'    => 'Reserva creada. Por favor, contacta con nosotros para completar el pago.',
                ], 201);
            }

            return redirect()->back()->with(
                'success',
                'Reserva registrada. Hubo un problema al abrir el pago automático — por favor, contáctanos.'
            );
        }

        if ($request->wantsJson()) {
            return response()->json([
                'success'      => true,
                'booking_id'   => $booking->id,
                'checkout_url' => $checkoutUrl,
                'message'      => 'Redirigiendo al pago…',
            ], 201);
        }

        return $this->redirectToStripeCheckout($checkoutUrl);
    }

    public function checkAvailability(Request $request): JsonResponse
    {
        $request->validate([
            'surfboard_id' => ['required', 'integer', 'exists:surfboards,id'],
            'from'         => ['required', 'date'],
            'to'           => ['required', 'date', 'after_or_equal:from'],
        ]);

        $fromRaw = (string) $request->input('from');
        $toRaw   = (string) $request->input('to');
        $from    = BusinessDateTime::parseRentalDate($fromRaw);
        $to      = preg_match('/^\d{4}-\d{2}-\d{2}$/', trim($toRaw))
            ? BusinessDateTime::parseInAppTimezone(trim($toRaw).' 23:59:59')
            : BusinessDateTime::parseRentalDate($toRaw);

        $ranges = $this->bookingService->getBlockedRanges(
            (int) $request->input('surfboard_id'),
            $from,
            $to,
        );

        return response()->json(['blocked_ranges' => $ranges]);
    }
}
