<?php

namespace Database\Factories;

use App\Models\Pedido;
use App\Models\User;
use App\Models\Producto;
use Illuminate\Database\Eloquent\Factories\Factory;

class PedidoFactory extends Factory
{
    protected $model = Pedido::class;

    public function definition()
    {
        return [
            'user_id' => User::factory(), // Relación con User, crea un usuario automáticamente
            'precio_total' => $this->faker->randomFloat(2, 10, 100), // Precio aleatorio entre 10 y 100
            'pagado' => $this->faker->boolean, // Estado aleatorio de si está pagado o no
            'entregado' => $this->faker->boolean, // Estado aleatorio de si ha sido entregado
        ];
    }
}