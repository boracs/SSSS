<?php

declare(strict_types=1);

namespace App\DTOs\Taquilla;

use Illuminate\Support\Carbon;

/**
 * Alta desde el panel de vigencia. `altaEl` null = hoy (inmediata).
 */
final readonly class AltaTaquillaDto
{
    public function __construct(
        public int $numero,
        public ?string $altaEl,
    ) {}

    /**
     * @param  array{numero_taquilla: int|string, alta_el?: string|null}  $data
     */
    public static function fromValidated(array $data): self
    {
        $altaEl = $data['alta_el'] ?? null;
        $altaEl = is_string($altaEl) && trim($altaEl) !== '' ? trim($altaEl) : null;

        return new self(
            numero: (int) $data['numero_taquilla'],
            altaEl: $altaEl,
        );
    }

    public function altaElDate(): ?Carbon
    {
        if ($this->altaEl === null) {
            return null;
        }

        return Carbon::parse($this->altaEl)->startOfDay();
    }
}
