<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\PriceSchema;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PriceSchema>
 */
class PriceSchemaFactory extends Factory
{
    protected $model = PriceSchema::class;

    /**
     * Tarifa Softboards del seeder: curva monótona en la que componer packs
     * cortos sale caro (300 min → 6 h, 6 días → semana).
     *
     * @var array<string, float>
     */
    public const SOFTBOARD_PACKS = [
        'price_60m' => 10,
        'price_90m' => 13,
        'price_120m' => 16,
        'price_180m' => 20,
        'price_240m' => 24,
        'price_360m' => 30,
        'price_1d' => 35,
        'price_2d' => 60,
        'price_3d' => 80,
        'price_4d' => 95,
        'price_5d' => 110,
        'price_week' => 140,
    ];

    public function definition(): array
    {
        return array_merge(['name' => 'Softboards'], self::SOFTBOARD_PACKS);
    }

    /**
     * Deja a 0 (= no ofertado) todos los packs salvo los indicados.
     *
     * @param  array<string, float>  $packs
     */
    public function onlyPacks(array $packs): static
    {
        return $this->state(fn () => array_merge(
            array_fill_keys(array_keys(self::SOFTBOARD_PACKS), 0),
            $packs,
        ));
    }
}
