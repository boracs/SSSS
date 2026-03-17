<?php

namespace Database\Seeders;

use App\Models\PriceSchema;
use Illuminate\Database\Seeder;

class PriceSchemaSeeder extends Seeder
{
    public function run(): void
    {
        PriceSchema::create([
            'name' => 'Tarifa Blanda',
            'price_1h' => 10,
            'price_2h' => 20,
            'price_4h' => 25,
            'price_12h' => 35,
            'price_24h' => 45,
            'price_48h' => 90,
            'price_72h' => 135,
            'price_week' => 180,
        ]);

        PriceSchema::create([
            'name' => 'Tarifa Dura',
            'price_1h' => 15,
            'price_2h' => 30,
            'price_4h' => 40,
            'price_12h' => 55,
            'price_24h' => 65,
            'price_48h' => 130,
            'price_72h' => 195,
            'price_week' => 250,
        ]);
    }
}
