<?php

namespace Database\Seeders;

use App\Models\Surfboard;
use Illuminate\Database\Seeder;

class SurfboardDemoSeeder extends Seeder
{
    public function run(): void
    {
        $faker = fake('es_ES');
        $schemasByCategory = PriceSchemaSeeder::ensure();

        $names = [
            'Easy Up',
            'Way Up',
            'Blue Rider',
            'Cantabrico Pro',
            'Zurriola Flow',
            'Concha Glide',
            'Nordic Twin',
        ];

        foreach ($names as $i => $name) {
            $category = Surfboard::CATEGORIES[$i % count(Surfboard::CATEGORIES)];
            $lengthFeet = $faker->randomElement(['5\'10"', '6\'0"', '6\'2"', '6\'4"', '6\'6"', '7\'0"']);
            $widthInches = $faker->randomElement(['19"', '19 1/2"', '20"', '20 1/4"', '21"']);
            $thicknessInches = $faker->randomElement(['2 3/8"', '2 1/2"', '2 5/8"', '2 3/4"']);
            $volume = $faker->randomFloat(2, 26, 52);

            Surfboard::create([
                'name' => $name,
                'category' => $category,
                'is_active' => true,
                'price_schema_id' => $schemasByCategory[$category]->id,
                'description' => $faker->sentence(12),
                'altura' => $lengthFeet,
                'ancho' => $widthInches,
                'grosor' => $thicknessInches,
                'volumen' => $volume,
                'image_url' => null,
                'image_alt' => "Tabla {$name}",
            ]);
        }
    }
}

