<?php

declare(strict_types=1);

namespace App\DTOs\Store;

use App\Services\Store\StoreProductPricing;

final readonly class StoreProductWriteDto
{
    /**
     * @param  list<string>|null  $tags
     */
    public function __construct(
        public string $nombre,
        public float $precioEuros,
        public int $unidades,
        public float $descuentoPercent,
        public bool $eliminado,
        public ?array $tags,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function fromValidated(array $data, bool $defaultEliminado = false): self
    {
        $tags = $data['tags'] ?? null;

        return new self(
            nombre: trim((string) $data['nombre']),
            precioEuros: StoreProductPricing::catalogEuros($data['precio'] ?? 0),
            unidades: max(0, (int) ($data['unidades'] ?? 0)),
            descuentoPercent: max(0.0, min(100.0, (float) ($data['descuento'] ?? 0))),
            eliminado: array_key_exists('eliminado', $data)
                ? (bool) $data['eliminado']
                : $defaultEliminado,
            tags: is_array($tags) ? $tags : null,
        );
    }
}
