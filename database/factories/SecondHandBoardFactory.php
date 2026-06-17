<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\SecondHandStatus;
use App\Models\SecondHandBoard;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SecondHandBoard>
 */
class SecondHandBoardFactory extends Factory
{
    protected $model = SecondHandBoard::class;

    private static array $boardPool = [
        'Al Merrick Channel Islands Fever',
        'Pukas Tasty Treat',
        'Lost Driver 2.0',
        'Firewire Seaside & Enjoy',
        'JS Industries Monsta Box',
        'DHD Sweet Spot 3.0',
        'Pyzel Ghost',
        'Rusty Dwart',
        'Haydenshapes Hypto Krypto',
        'Torq TEC Fish',
        'Slater Designs Great White',
        'Album Surf Trice',
        'Elektra Longboard Classic',
        'Catch Surf Odysea Log',
        'CI Mid Twin',
        'Stacey Hyena',
        'Lib Tech Pickup Stick',
        'Mayhem MB07',
        'Roberts Sanchez',
        'Pukas Ice 9',
    ];

    private static array $brandPool = [
        'Channel Islands', 'Pukas', 'Lost', 'Firewire',
        'JS Industries', 'DHD', 'Pyzel', 'Rusty',
        'Haydenshapes', 'Torq', 'Slater Designs',
    ];

    private static array $descriptions = [
        'Tipicas marcas de presion en el deck, cantos intactos, reparacion profesional en la quilla derecha.',
        'Excelente estado general, pequeno ding en la cola reparado con resina. Sin deformaciones en el rocker.',
        'Tabla con poco uso, marcas de wax en deck. Rails en perfecto estado. Lista para surf.',
        'Reparacion menor en nose, resto de la tabla en buen estado. Ideal para olas de 1 a 2 metros.',
        'Deck con uso normal para su antiguedad, fibra sana, sin delaminaciones. Buena opcion para progresion.',
        'Tabla de competicion con marcas de uso. Dos reparaciones previas, solidas y bien acabadas.',
        'Sin golpes ni reparaciones visibles. Tabla cuidada por su propietario, guardada en funda siempre.',
        'Pequeno ding en rail izquierdo ya reparado. Colores algo desvaidos por el sol, estructura intacta.',
        'Tabla de escuela con varias temporadas. Refuerzos en nose y tail. Optima para aprendizaje.',
        'Segunda tabla de su propietario, usado solo en verano. Estado muy cuidado para su edad.',
    ];

    public function definition(): array
    {
        $purchasePrice = $this->faker->numberBetween(15000, 30000);
        $margin        = $this->faker->numberBetween(10000, 20000);
        $hasDiscount   = $this->faker->boolean(30);

        return [
            'name'           => $this->faker->randomElement(self::$boardPool),
            'brand'          => $this->faker->randomElement(self::$brandPool),
            'description'    => $this->faker->randomElement(self::$descriptions),
            'height'         => round($this->faker->randomFloat(2, 5.4, 6.6), 2),
            'width'          => round($this->faker->randomFloat(2, 18.25, 21.0), 2),
            'thickness'      => round($this->faker->randomFloat(2, 2.2, 2.75), 2),
            'volume'         => round($this->faker->randomFloat(1, 26.5, 42.0), 1),
            'purchase_price' => $purchasePrice,
            'sale_price'     => $purchasePrice + $margin,
            'discount_pct'   => $hasDiscount
                ? $this->faker->randomElement([5, 10, 15, 20])
                : 0,
            'status'         => SecondHandStatus::AVAILABLE,
            'images'         => null,
            'purchased_at'   => $this->faker->dateTimeBetween('-6 months', 'now'),
            'sold_at'        => null,
        ];
    }

    /**
     * Estado: tabla vendida.
     * Garantiza coherencia temporal: sold_at >= purchased_at.
     */
    public function sold(): static
    {
        return $this->state(function (array $attributes): array {
            $purchasedAt = $attributes['purchased_at'] instanceof \DateTimeInterface
                ? $attributes['purchased_at']
                : new \DateTime((string) $attributes['purchased_at']);

            $soldAt = $this->faker->dateTimeBetween(
                $purchasedAt->format('Y-m-d H:i:s'),
                'now'
            );

            return [
                'status'  => SecondHandStatus::SOLD,
                'sold_at' => $soldAt,
            ];
        });
    }
}