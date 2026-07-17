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

        if ($status !== 'processed') {
            try {
                $result = $this->gateway->syncCheckoutSessionIfPaid($sessionId);
                if ($result['ok'] && ! $result['duplicate']) {
                    PaymentConfirmed::dispatch(
                        payableType: $result['payable_type'],
                        payableId: $result['payable_id'],
                        amountCents: (int) ($result['amount_cents'] ?? 0),
                        stripeSessionId: $sessionId,
                    );
                }
                if ($result['ok']) {
                    $status = 'processed';
                    $intent = PaymentWebhookIdempotency::query()
                        ->where('transaction_id', $sessionId)
                        ->first();
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

        $redirectRoute = match (true) {
            str_ends_with($payableType, 'Pedido')     => route('pedidos'),
            str_ends_with($payableType, 'Booking')    => route('rentals.surfboards.index'),
            str_ends_with($payableType, 'LessonUser') => route('my-reservations.index'),
            str_ends_with($payableType, 'UserBono')   => route('bonos.index'),
            str_ends_with($payableType, 'PagoCuota')  => route('taquillas.index.client'),
            default                                   => route('Pag_principal'),
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
