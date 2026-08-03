<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\PriceSchema;
use App\Models\Surfboard;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Surfboard>
 */
class SurfboardFactory extends Factory
{
    protected $model = Surfboard::class;

    public function definition(): array
    {
        $name = 'Tabla '.$this->faker->unique()->numberBetween(1, 9999);

        return [
            'price_schema_id' => PriceSchema::factory(),
            'category' => Surfboard::CATEGORY_SOFT,
            'is_active' => true,
            'name' => $name,
            'slug' => Str::slug($name),
            'description' => 'Tabla de alquiler de pruebas.',
        ];
    }

    public function category(string $category): static
    {
        return $this->state(fn () => ['category' => $category]);
    }
}
