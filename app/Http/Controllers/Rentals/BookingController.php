<?php

declare(strict_types=1);

namespace App\Http\Controllers\Rentals;

use App\Actions\Payments\InitiatePaymentAction;
use App\DTOs\Payments\InitiatePaymentDto;
use App\DTOs\Payments\PaymentLineItemDto;
use App\DTOs\Rentals\RentalWindowDto;
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
use Throwable;

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

        // 1. Crear la reserva (estado pending)
        try {
            $window = $this->bookingService->buildWindow($request->toRentalRequest());

            $booking = $this->bookingService->createPendingBooking(
                $surfboard,
                $window,
                [
                    'client_name'    => $data['client_name'],
                    'client_email'   => $data['client_email'] ?? null,
                    'client_phone'   => $data['client_phone'] ?? null,
                    'payment_method' => 'card',
                ],
                userId: $request->user()?->id,
                // Va directa a Stripe Checkout: si el cliente abandona el pago,
                // la tabla se libera en minutos, no tras 7 días de gracia.
                expiresInMinutes: $this->bookingService->pendingUnpaidExpirationMinutes(),
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

            $this->releaseUnpaidBooking($booking, 'Reserva liberada: no se pudo calcular el importe del alquiler.');

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

        $description = $this->describeWindow($window);

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

            // Sin pasarela no hay reserva: si la dejáramos pending bloquearía la
            // tabla durante días por un fallo que el cliente no puede resolver.
            $this->releaseUnpaidBooking($booking, 'Reserva liberada: falló la apertura del pago (Stripe).');

            $message = 'No se pudo abrir la pasarela de pago y la reserva no se ha guardado. Inténtalo de nuevo en unos minutos.';

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $message,
                ], 422);
            }

            return redirect()->back()->withErrors(['payment' => $message]);
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

    /**
     * Devuelve la tabla al inventario cuando la reserva recién creada no llega
     * a cobrarse. Se cancela (no se borra) para dejar rastro en el panel, y el
     * scope `blocking()` deja de contarla al instante.
     *
     * Nunca debe tapar el error original: si la liberación falla, se registra.
     */
    private function releaseUnpaidBooking(Booking $booking, string $reason): void
    {
        try {
            $note = trim((string) $booking->admin_notes);
            $booking->admin_notes = trim($note."\n".$reason);
            $booking->applyCancellationWithRefundQueue();
        } catch (Throwable $e) {
            Log::error('BookingController::store no se pudo liberar la reserva sin pago', [
                'booking_id' => $booking->id,
                'reason'     => $reason,
                'error'      => $e->getMessage(),
            ]);
        }
    }

    /**
     * Texto de la línea de pago: refleja el tiempo cobrado, nunca el buffer.
     */
    private function describeWindow(RentalWindowDto $window): string
    {
        $range = $window->pickupAt->format('d/m/Y H:i').' → '.$window->returnAt->format('d/m/Y H:i');

        if ($window->isDayMode()) {
            $days = (int) round($window->chargedMinutes / 1440);

            return "Alquiler {$days} día(s) · {$range}";
        }

        $hours = rtrim(rtrim(number_format($window->chargedMinutes / 60, 1, ',', ''), '0'), ',');

        return "Alquiler {$hours} h · {$range}";
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

        // Endpoint público: nada de id de reserva ni estado interno crudo, solo
        // el rango de inventario y el color a pintar (ver getPublicBlockedRanges).
        $ranges = $this->bookingService->getPublicBlockedRanges(
            (int) $request->input('surfboard_id'),
            $from,
            $to,
        );

        return response()->json(['blocked_ranges' => $ranges]);
    }
}
