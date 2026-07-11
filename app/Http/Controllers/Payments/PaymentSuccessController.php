<?php

declare(strict_types=1);

namespace App\Http\Controllers\Payments;

use App\Http\Controllers\Controller;
use App\Models\PaymentWebhookIdempotency;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * Página de aterrizaje tras pago exitoso en Stripe.
 * Stripe redirige aquí con ?session_id=cs_…
 */
final class PaymentSuccessController extends Controller
{
    public function show(Request $request): InertiaResponse|\Illuminate\Http\RedirectResponse
    {
        $sessionId = (string) $request->query('session_id', '');

        if ($sessionId === '') {
            return redirect()->route('Pag_principal');
        }

        $intent = PaymentWebhookIdempotency::query()
            ->where('transaction_id', $sessionId)
            ->first();

        $payableType = $intent?->payable_type ?? '';
        $payableId   = (int) ($intent?->payable_id ?? 0);
        $status      = $intent?->status ?? 'pending';

        $redirectRoute = match (true) {
            str_ends_with($payableType, 'Pedido')     => route('pedidos'),
            str_ends_with($payableType, 'Booking')    => route('rentals.surfboards.index'),
            str_ends_with($payableType, 'LessonUser') => route('my-reservations.index'),
            str_ends_with($payableType, 'UserBono')   => route('bonos.index'),
            str_ends_with($payableType, 'PagoCuota')  => route('taquillas.index.client'),
            default                                   => route('Pag_principal'),
        };

        return Inertia::render('Payments/Success', [
            'status'      => $status,
            'payableType' => class_basename($payableType),
            'payableId'   => $payableId,
            'redirectTo'  => $redirectRoute,
        ]);
    }
}
