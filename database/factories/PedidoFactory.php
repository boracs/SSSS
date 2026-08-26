<?php

namespace Database\Factories;

use App\Models\Pedido;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PedidoFactory extends Factory
{
    protected $model = Pedido::class;

    public function definition()
    {
        return [
            'user_id' => User::factory(),
            'precio_total_cents' => $this->faker->numberBetween(1000, 10000),
            // Cobro por pasarela: un pedido visible/operativo nace pagado.
            'pagado' => true,
            'entregado' => false,
            'payment_method' => 'card',
        ];
    }

    /** Pedido aún no confirmado por la pasarela (checkout incompleto). */
    public function unpaid(): static
    {
        return $this->state(fn () => [
            'pagado' => false,
            'entregado' => false,
            'payment_method' => null,
        ]);
    }

    public function delivered(): static
    {
        return $this->state(fn () => [
            'pagado' => true,
            'entregado' => true,
            'payment_method' => 'card',
        ]);
    }
}
