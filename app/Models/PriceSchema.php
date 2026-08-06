<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PriceSchema extends Model
{
    use HasFactory;

    public const MINUTES_PER_DAY = 1440;

    /** Packs por minutos (tramos cortos). */
    public const MINUTE_PACKS = [
        60 => 'price_60m',
        90 => 'price_90m',
        120 => 'price_120m',
        180 => 'price_180m',
        240 => 'price_240m',
        360 => 'price_360m',
    ];

    /** Packs por días (tramos largos); 7 => semana. */
    public const DAY_PACKS = [
        1 => 'price_1d',
        2 => 'price_2d',
        3 => 'price_3d',
        4 => 'price_4d',
        5 => 'price_5d',
        7 => 'price_week',
    ];

    /** Nombre canónico del esquema por categoría de tabla. */
    public const NAME_BY_CATEGORY = [
        Surfboard::CATEGORY_SOFT => 'Softboards',
        Surfboard::CATEGORY_HARD_BASIC => 'Hard boards',
        Surfboard::CATEGORY_HARD_PRO => 'Premium boards',
    ];

    protected $fillable = [
        'name',
        'price_60m',
        'price_90m',
        'price_120m',
        'price_180m',
        'price_240m',
        'price_360m',
        'price_1d',
        'price_2d',
        'price_3d',
        'price_4d',
        'price_5d',
        'price_week',
    ];

    protected $casts = [
        'price_60m' => 'decimal:2',
        'price_90m' => 'decimal:2',
        'price_120m' => 'decimal:2',
        'price_180m' => 'decimal:2',
        'price_240m' => 'decimal:2',
        'price_360m' => 'decimal:2',
        'price_1d' => 'decimal:2',
        'price_2d' => 'decimal:2',
        'price_3d' => 'decimal:2',
        'price_4d' => 'decimal:2',
        'price_5d' => 'decimal:2',
        'price_week' => 'decimal:2',
    ];

    public function surfboards(): HasMany
    {
        return $this->hasMany(Surfboard::class, 'price_schema_id');
    }

    /**
     * TODOS los packs cobrables indexados por minutos: fuente única del cálculo
     * de mejor precio (PHP en BookingService, espejo JS en lib/rentalPricing.js).
     * Los packs de día se expresan como ciclos de 1440 min (12:00 → 12:00).
     *
     * @return array<int, float>
     */
    public function getPacksByMinutes(): array
    {
        $packs = [];

        foreach (self::MINUTE_PACKS as $minutes => $column) {
            $packs[$minutes] = (float) $this->{$column};
        }

        foreach (self::DAY_PACKS as $days => $column) {
            $packs[$days * self::MINUTES_PER_DAY] = (float) $this->{$column};
        }

        return $packs;
    }

    /**
     * Packs con precio configurado (> 0). Un pack a 0 se considera no ofertado.
     *
     * @return array<int, float>
     */
    public function getSellablePacksByMinutes(): array
    {
        return array_filter($this->getPacksByMinutes(), static fn (float $price) => $price > 0);
    }
}
