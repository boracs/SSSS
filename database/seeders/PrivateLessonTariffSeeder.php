<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\PrivateLessonTariff;
use Illuminate\Database\Seeder;

/**
 * Tarifa vigente de clases particulares (precio TOTAL del grupo a la duración
 * base). Editable después desde el admin; aquí solo se siembra el arranque.
 */
class PrivateLessonTariffSeeder extends Seeder
{
    /** @var array<int, int> personas => precio total en euros */
    private const TARIFFS = [
        1 => 80,
        2 => 110,
        3 => 120,
        4 => 120,
        5 => 150,
        6 => 180,
    ];

    public function run(): void
    {
        self::ensure();
    }

    /**
     * @return array<int, PrivateLessonTariff> indexado por número de personas
     */
    public static function ensure(): array
    {
        $rows = [];

        foreach (self::TARIFFS as $people => $priceEur) {
            $rows[$people] = PrivateLessonTariff::query()->updateOrCreate(
                ['people' => $people],
                ['price_cents' => $priceEur * 100, 'activo' => true],
            );
        }

        return $rows;
    }
}
