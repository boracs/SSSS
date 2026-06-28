<?php

namespace Database\Factories;

use App\Models\PlanTaquilla;
use App\Support\MoneyCents;
use Illuminate\Database\Eloquent\Factories\Factory;

class PlanTaquillaFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = PlanTaquilla::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // Definimos precios y duraciones base para la creación aleatoria
        $months = $this->faker->randomElement([1, 3, 6, 12]);
        $basePricePerMonth = $this->faker->randomFloat(2, 40, 60);
        $totalPrice = round($basePricePerMonth * $months, 2);

        return [
            'nombre' => 'Plan de Taquilla ' . $months . ' Meses (' . $basePricePerMonth . '€/mes)',
            'duracion_dias' => $months * 30, // Aproximación
            'precio_total_cents' => MoneyCents::eurosToCents($totalPrice),
            'activo' => true,
        ];
    }
}
