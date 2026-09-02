<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Contracts\Payments\StartsCheckout;
use App\DTOs\Payments\InitiatePaymentDto;
use App\Events\Payments\PaymentInitiated;
use App\Services\Payments\PaymentGatewayService;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Punto de entrada único para iniciar un cobro.
 *
 * Flujo: DTO → PaymentGatewayService → Event → URL de redirección
 */
final class InitiatePaymentAction implements StartsCheckout
{
    public function __construct(
        private readonly PaymentGatewayService $gateway,
    ) {}

    /**
     * @throws \RuntimeException si Stripe falla
     */
    public function execute(InitiatePaymentDto $dto): string
    {
        Log::withContext([
            'payable_type' => $dto->payableType,
            'payable_id'   => $dto->payableId,
        ]);

        $openUrl = $this->gateway->openCheckoutUrlFor($dto->payableType, $dto->payableId);
        if ($openUrl !== null) {
            Log::info('InitiatePaymentAction: reutilizada sesión de pago existente', [
                'payable_type' => $dto->payableType,
                'payable_id'   => $dto->payableId,
            ]);

            return $openUrl;
        }

        $result = $this->gateway->createCheckoutSession($dto);

        try {
            PaymentInitiated::dispatch(
                dto: $dto,
                stripeSessionId: $result->stripeSessionId,
                checkoutUrl: $result->checkoutUrl,
            );
        } catch (Throwable $e) {
            Log::error('InitiatePaymentAction::execute listener PaymentInitiated falló (pago continúa)', [
                'payable_type' => $dto->payableType,
                'payable_id'   => $dto->payableId,
                'session_id'   => $result->stripeSessionId,
                'error'        => $e->getMessage(),
            ]);
        }

        return $result->checkoutUrl;
    }
}
