<?php

namespace Database\Factories;

use App\Models\Producto;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductoFactory extends Factory
{
    protected $model = Producto::class;

 public function definition()
    {
        return [
            'nombre' => $this->faker->word,
            'precio' => $this->faker->randomFloat(2, 5, 100),
            'unidades' => $this->faker->numberBetween(1, 50),
            'descuento' => $this->faker->numberBetween(0, 80), 
            'tags' => $this->faker->randomElements(
                \App\Enums\ProductTag::values(),
                $this->faker->numberBetween(1, 3)
            ),
            'eliminado' => $this->faker->boolean(30),
        ];
    }
}