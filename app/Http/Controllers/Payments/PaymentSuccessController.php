<?php

declare(strict_types=1);

namespace App\Http\Controllers\Payments;

use App\Events\Payments\PaymentConfirmed;
use App\Http\Controllers\Controller;
use App\Models\PaymentWebhookIdempotency;
use App\Services\Invoicing\FiscalInvoiceAccessService;
use App\Services\Payments\PaymentGatewayService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Throwable;

/**
 * Página de aterrizaje tras pago exitoso en Stripe.
 * Sincroniza el pago si el webhook aún no llegó (idempotente, misma ruta que el webhook).
 */
final class PaymentSuccessController extends Controller
{
    public function __construct(
        private readonly PaymentGatewayService $gateway,
        private readonly FiscalInvoiceAccessService $fiscalInvoices,
    ) {}

    public function show(Request $request): InertiaResponse|\Illuminate\Http\RedirectResponse
    {
        $sessionId = trim((string) $request->query('session_id', ''));

        if ($sessionId === '') {
            return redirect()->route('Pag_principal');
        }

        $intent = PaymentWebhookIdempotency::query()
            ->where('transaction_id', $sessionId)
            ->first();

        $status = $intent?->status ?? 'pending';
        $amountCents = (int) ($intent?->amount ?? 0);
        $shouldDispatchConfirmed = false;

        if ($status !== 'processed') {
            try {
                $result = $this->gateway->syncCheckoutSessionIfPaid($sessionId);
                if ($result['ok'] && ! $result['duplicate']) {
                    $shouldDispatchConfirmed = true;
                    $amountCents = (int) ($result['amount_cents'] ?? $amountCents);
                }
                if ($result['ok']) {
                    $status = 'processed';
                    $intent = PaymentWebhookIdempotency::query()
                        ->where('transaction_id', $sessionId)
                        ->first();
                    $amountCents = (int) ($result['amount_cents'] ?? $intent?->amount ?? $amountCents);
                }
            } catch (Throwable $e) {
                Log::error('PaymentSuccessController::show sync falló', [
                    'session_id' => $sessionId,
                    'error'      => $e->getMessage(),
                ]);
            }
        }

        $payableType = $intent?->payable_type ?? '';
        $payableId   = (int) ($intent?->payable_id ?? 0);

        // Si el webhook confirmó primero, esta página no volvía a disparar el evento
        // y no se creaba factura/recibo. Reemitir solo si aún no hay factura.
        if (
            $status === 'processed'
            && ! $shouldDispatchConfirmed
            && $payableType !== ''
            && $payableId > 0
            && $this->fiscalInvoices->forPayable($payableType, $payableId) === null
        ) {
            $shouldDispatchConfirmed = true;
        }

        if ($shouldDispatchConfirmed && $payableType !== '' && $payableId > 0) {
            try {
                PaymentConfirmed::emit(
                    payableType: $payableType,
                    payableId: $payableId,
                    amountCents: $amountCents,
                    stripeSessionId: $sessionId,
                );
            } catch (Throwable $e) {
                Log::error('PaymentSuccessController: PaymentConfirmed falló (pago ya confirmado)', [
                    'session_id' => $sessionId,
                    'payable_type' => $payableType,
                    'payable_id' => $payableId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $redirectRoute = match (true) {
            str_ends_with($payableType, 'Pedido') => route('pedidos'),
            str_ends_with($payableType, 'Booking') => route('rentals.surfboards.index'),
            // Guest particular: sin cuenta → academia; alumno logueado → mis reservas
            str_ends_with($payableType, 'LessonUser') => auth()->check()
                ? route('my-reservations.index')
                : route('academy.lessons.index'),
            str_ends_with($payableType, 'UserBono') => route('bonos.index'),
            str_ends_with($payableType, 'PagoCuota') => route('taquillas.index.client'),
            str_ends_with($payableType, 'Auction') => route('auctions.index'),
            default => route('Pag_principal'),
        };

        $fiscal = ($payableType !== '' && $payableId > 0)
            ? $this->fiscalInvoices->forPayable($payableType, $payableId)
            : null;

        return Inertia::render('Payments/Success', [
            'status'         => $status === 'processed' ? 'processed' : 'pending',
            'payableType'    => class_basename($payableType),
            'payableId'      => $payableId,
            'redirectTo'     => $redirectRoute,
            'fiscalInvoice'  => $fiscal?->toArray(),
        ]);
    }
}
