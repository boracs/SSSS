<?php

declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;

/**
 * Normaliza líneas {id, cantidad} del checkout tienda a mapa producto → unidades.
 */
final class StoreCartLines
{
    /**
     * @param  list<array{id?: mixed, cantidad?: mixed}>  $cartLines
     * @return array<int, int>
     */
    public static function normalizeQuantities(array $cartLines): array
    {
        $quantities = [];

        foreach ($cartLines as $idx => $item) {
            if (! is_array($item) || ! isset($item['id'], $item['cantidad'])) {
                throw new InvalidArgumentException("Carrito inválido en la posición {$idx}.");
            }

            $id = (int) $item['id'];
            $cantidad = (int) $item['cantidad'];
            if ($id < 1 || $cantidad < 1) {
                throw new InvalidArgumentException("Carrito inválido en la posición {$idx}.");
            }

            $quantities[$id] = ($quantities[$id] ?? 0) + $cantidad;
        }

        if ($quantities === []) {
            throw new InvalidArgumentException('El carrito enviado no es válido.');
        }

        ksort($quantities);

        return $quantities;
    }
}
