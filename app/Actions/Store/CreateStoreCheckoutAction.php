<?php

declare(strict_types=1);

namespace App\Actions\Store;

use App\Contracts\Payments\StartsCheckout;
use App\DTOs\Payments\InitiatePaymentDto;
use App\DTOs\Payments\PaymentLineItemDto;
use App\DTOs\Store\CreateStoreCheckoutDto;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\User;
use App\Services\Store\StoreCartCheckoutValidator;
use App\Services\Store\StoreOrderStockService;
use App\Support\MoneyCents;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Reserva stock, abre Stripe Checkout y vacía el carrito solo si la sesión se crea.
 */
final class CreateStoreCheckoutAction
{
    public function __construct(
        private readonly StoreCartCheckoutValidator $cartValidator,
        private readonly StoreOrderStockService $stock,
        private readonly StartsCheckout $initiatePayment,
    ) {}

    /**
     * @throws \InvalidArgumentException stock, carrito o total
     * @throws RuntimeException Stripe no pudo abrir sesión (stock ya liberado)
     */
    public function execute(CreateStoreCheckoutDto $dto): string
    {
        $user = User::query()->findOrFail($dto->userId);

        $this->cartValidator->assertMatchesUserCart($user, $dto->cartLines);

        $pedido = $this->stock->reserveFromCartLines(
            $user,
            $dto->cartLines,
            $dto->fechaEntregaYmd,
            $dto->quotedTotalEuros,
        );

        $pedido->load('productos');
        $lineItems = $pedido->productos->map(static function (Producto $prod): PaymentLineItemDto {
            return new PaymentLineItemDto(
                name: $prod->nombre,
                description: 'Compra tienda S4',
                unitAmountCents: MoneyCents::eurosToCents($prod->pivot->precio_pagado),
                quantity: (int) $prod->pivot->cantidad,
            );
        })->values()->all();

        $payment = new InitiatePaymentDto(
            payableType: Pedido::class,
            payableId: (int) $pedido->id,
            lineItems: $lineItems,
            successPath: '/pago/exito',
            cancelPath: '/tienda',
            customerEmail: $user->email,
            metadata: ['pedido_id' => (string) $pedido->id],
        );

        try {
            $checkoutUrl = $this->initiatePayment->execute($payment);
        } catch (RuntimeException $e) {
            Log::error('CreateStoreCheckoutAction: no se pudo crear la sesión Stripe', [
                'pedido_id' => $pedido->id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            $this->stock->releaseUnpaid($pedido);

            throw new RuntimeException(
                'No se pudo abrir el pago con tarjeta. Tu carrito sigue intacto; inténtalo de nuevo.',
                0,
                $e,
            );
        }

        $user->carrito()->delete();

        return $checkoutUrl;
    }
}
