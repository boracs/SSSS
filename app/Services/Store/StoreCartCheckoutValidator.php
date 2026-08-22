<?php

declare(strict_types=1);

namespace App\Services\Store;

use App\Models\User;
use App\Support\StoreCartLines;
use InvalidArgumentException;

/**
 * Comprueba que el checkout use exactamente las líneas del carrito persistido (anti-tampering).
 */
final class StoreCartCheckoutValidator
{
    /**
     * @param  list<array{id?: mixed, cantidad?: mixed}>  $cartLines
     *
     * @throws InvalidArgumentException
     */
    public function assertMatchesUserCart(User $user, array $cartLines): void
    {
        $requested = StoreCartLines::normalizeQuantities($cartLines);
        $expected = $this->quantitiesFromPersistedCart($user);

        if ($expected === []) {
            throw new InvalidArgumentException('Tu carrito está vacío. Recarga la página e inténtalo de nuevo.');
        }

        if ($expected !== $requested) {
            throw new InvalidArgumentException(
                'El pedido no coincide con tu carrito. Recarga la página e inténtalo de nuevo.',
            );
        }
    }

    /** @return array<int, int> */
    private function quantitiesFromPersistedCart(User $user): array
    {
        $carrito = $user->carrito()->with('productos:id')->first();
        if ($carrito === null) {
            return [];
        }

        $quantities = [];

        foreach ($carrito->productos as $producto) {
            $id = (int) $producto->id;
            $cantidad = (int) $producto->pivot->cantidad;
            if ($id < 1 || $cantidad < 1) {
                continue;
            }

            $quantities[$id] = ($quantities[$id] ?? 0) + $cantidad;
        }

        if ($quantities === []) {
            return [];
        }

        ksort($quantities);

        return $quantities;
    }
}
