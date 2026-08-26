<?php

declare(strict_types=1);

namespace App\Services\Store;

use App\Models\Pedido;
use App\Models\Producto;
use App\Models\User;
use App\Support\MoneyCents;
use App\Support\StoreCartLines;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

final class StoreOrderStockService
{
    /**
     * @param  list<array{id?: mixed, cantidad?: mixed}>  $cartLines
     */
    public function reserveFromCartLines(
        User $user,
        array $cartLines,
        ?string $fechaEntrega = null,
        float|int|string|null $quotedTotalEuros = null,
    ): Pedido {
        $quantitiesByProductId = $this->normalizeLines($cartLines);

        return DB::transaction(function () use ($user, $quantitiesByProductId, $fechaEntrega, $quotedTotalEuros): Pedido {
            $ids = array_keys($quantitiesByProductId);
            sort($ids);

            $productos = Producto::query()
                ->whereIn('id', $ids)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $pedido = Pedido::query()->create([
                'user_id' => $user->id,
                'precio_total_cents' => 0,
                'pagado' => false,
                'entregado' => false,
                'fecha_entrega' => $fechaEntrega,
                'payment_method' => 'card',
            ]);

            $totalCents = 0;

            foreach ($quantitiesByProductId as $productId => $cantidad) {
                $prod = $productos->get($productId);
                if ($prod === null || (bool) $prod->eliminado) {
                    throw new InvalidArgumentException("El producto con ID {$productId} no existe.");
                }

                if ((int) $prod->unidades < $cantidad) {
                    throw new InvalidArgumentException(
                        "No hay stock suficiente para '{$prod->nombre}'.",
                    );
                }

                $descuentoPct = max(0, min(100, (int) round((float) ($prod->descuento ?? 0))));
                $unitCents = StoreProductPricing::unitPriceCents($prod->precio, $descuentoPct);
                $totalCents += $unitCents * $cantidad;

                $pedido->productos()->attach($prod->id, [
                    'cantidad' => $cantidad,
                    'descuento_aplicado' => $descuentoPct,
                    'precio_pagado_cents' => $unitCents,
                ]);

                $prod->decrement('unidades', $cantidad);
            }

            if (! MoneyCents::amountsMatchCents($totalCents, $quotedTotalEuros)) {
                throw new InvalidArgumentException(
                    'El total del carrito no coincide. Recarga la página e inténtalo de nuevo.',
                );
            }

            $pedido->update(['precio_total_cents' => $totalCents]);

            return $pedido->fresh(['productos']) ?? $pedido;
        });
    }

    public function releaseUnpaid(Pedido $pedido): bool
    {
        return (bool) DB::transaction(function () use ($pedido): bool {
            $locked = Pedido::query()
                ->whereKey($pedido->id)
                ->lockForUpdate()
                ->first();

            if ($locked === null || (bool) $locked->pagado) {
                return false;
            }

            $locked->load('productos');

            $productIds = $locked->productos->pluck('id')->map(fn ($id) => (int) $id)->sort()->values()->all();
            if ($productIds !== []) {
                Producto::query()->whereIn('id', $productIds)->lockForUpdate()->get();
            }

            foreach ($locked->productos as $prod) {
                $prod->increment('unidades', (int) $prod->pivot->cantidad);
            }

            $locked->productos()->detach();
            $locked->delete();

            return true;
        });
    }

    public function releaseExpiredUnpaid(): int
    {
        $minutes = max(15, (int) config('store.unpaid_hold_minutes', 1440));
        $cutoff = now()->subMinutes($minutes);

        $ids = Pedido::query()
            ->where('pagado', false)
            ->where('entregado', false)
            ->where('payment_method', 'card')
            ->where('created_at', '<=', $cutoff)
            ->orderBy('id')
            ->pluck('id');

        $released = 0;
        foreach ($ids as $id) {
            $pedido = Pedido::query()->find($id);
            if ($pedido !== null && $this->releaseUnpaid($pedido)) {
                $released++;
            }
        }

        return $released;
    }

    /**
     * @param  list<array{id?: mixed, cantidad?: mixed}>  $cartLines
     * @return array<int, int>
     */
    private function normalizeLines(array $cartLines): array
    {
        return StoreCartLines::normalizeQuantities($cartLines);
    }
}
