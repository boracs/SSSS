<?php

declare(strict_types=1);

namespace App\Actions\Store;

use App\Contracts\Payments\FindsOpenCheckout;
use App\Contracts\Payments\StartsCheckout;
use App\DTOs\Payments\InitiatePaymentDto;
use App\DTOs\Payments\PaymentLineItemDto;
use App\DTOs\Store\CreateStoreCheckoutDto;
use App\Models\Carrito;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\User;
use App\Services\Store\StoreCartCheckoutValidator;
use App\Services\Store\StoreOrderStockService;
use App\Support\MoneyCents;
use App\Support\StoreCartLines;
use Illuminate\Support\Facades\DB;
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
        private readonly FindsOpenCheckout $openCheckout,
    ) {}

    /**
     * @throws \InvalidArgumentException stock, carrito o total
     * @throws RuntimeException Stripe no pudo abrir sesión (stock ya liberado)
     */
    public function execute(CreateStoreCheckoutDto $dto): string
    {
        $user = User::query()->findOrFail($dto->userId);

        // El checkout entero va serializado por la fila del carrito (UNIQUE
        // carritos.user_id): un segundo POST del mismo usuario espera y acaba
        // reutilizando pedido y sesión en vez de abrir un segundo cobro. El
        // lock se mantiene durante la llamada a Stripe a propósito: soltarlo
        // antes deja la ventana en la que dos sesiones apuntan al mismo pedido.
        return DB::transaction(function () use ($user, $dto): string {
            Carrito::query()->where('user_id', $user->id)->lockForUpdate()->first();

            $reused = $this->reusableCheckoutUrl($user, $dto);
            if ($reused !== null) {
                return $reused;
            }

            $this->cartValidator->assertMatchesUserCart($user, $dto->cartLines);

            $pedido = $this->stock->reserveFromCartLines(
                $user,
                $dto->cartLines,
                $dto->fechaEntregaYmd,
                $dto->quotedTotalEuros,
            );

            $checkoutUrl = $this->openCheckoutFor($pedido, $user);

            $user->carrito()->delete();

            return $checkoutUrl;
        });
    }

    /**
     * Sesión ya abierta para un pedido equivalente sin pagar (doble clic / dos pestañas).
     */
    private function reusableCheckoutUrl(User $user, CreateStoreCheckoutDto $dto): ?string
    {
        $requested = StoreCartLines::normalizeQuantities($dto->cartLines);
        if ($requested === []) {
            return null;
        }

        $cutoff = now()->subMinutes(max(15, (int) config('store.unpaid_hold_minutes', 1440)));

        $candidates = Pedido::query()
            ->where('user_id', $user->id)
            ->where('pagado', false)
            ->where('entregado', false)
            ->where('payment_method', 'card')
            ->where('created_at', '>=', $cutoff)
            ->when(
                $dto->fechaEntregaYmd === null,
                static fn ($query) => $query->whereNull('fecha_entrega'),
                static fn ($query) => $query->whereDate('fecha_entrega', $dto->fechaEntregaYmd),
            )
            ->with('productos')
            ->orderByDesc('id')
            ->get();

        foreach ($candidates as $pedido) {
            if ($this->lineFingerprint($pedido) !== $requested) {
                continue;
            }

            if (! MoneyCents::amountsMatchCents((int) $pedido->precio_total_cents, $dto->quotedTotalEuros)) {
                continue;
            }

            $url = $this->openCheckout->openCheckoutUrlFor(Pedido::class, (int) $pedido->id);
            if ($url !== null) {
                Log::info('CreateStoreCheckoutAction: reutilizada sesión de pago existente', [
                    'pedido_id' => $pedido->id,
                    'user_id' => $user->id,
                ]);

                return $url;
            }
        }

        return null;
    }

    /** @return array<int, int> */
    private function lineFingerprint(Pedido $pedido): array
    {
        $quantities = [];

        foreach ($pedido->productos as $producto) {
            $id = (int) $producto->id;
            $quantities[$id] = ($quantities[$id] ?? 0) + (int) $producto->pivot->cantidad;
        }

        ksort($quantities);

        return $quantities;
    }

    private function openCheckoutFor(Pedido $pedido, User $user): string
    {
        $pedido->load('productos');

        $lineItems = $pedido->productos->map(static function (Producto $prod): PaymentLineItemDto {
            return new PaymentLineItemDto(
                name: $prod->nombre,
                description: 'Compra tienda S4',
                unitAmountCents: (int) $prod->pivot->precio_pagado_cents,
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
            return $this->initiatePayment->execute($payment);
        } catch (RuntimeException $e) {
            Log::error('CreateStoreCheckoutAction: no se pudo crear la sesión Stripe', [
                'pedido_id' => $pedido->id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            // El rollback de la transacción devuelve stock, pedido y carrito.
            throw new RuntimeException(
                'No se pudo abrir el pago con tarjeta. Tu carrito sigue intacto; inténtalo de nuevo.',
                0,
                $e,
            );
        }
    }
}
