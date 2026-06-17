<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\SecondHandBoard;
use Illuminate\Database\Seeder;

class SecondHandBoardSeeder extends Seeder
{
    public function run(): void
    {
        // 15 tablas disponibles para el catalogo publico
        SecondHandBoard::factory()
            ->count(15)
            ->create();

        // 5 tablas vendidas para el historial y estadisticas admin
        SecondHandBoard::factory()
            ->sold()
            ->count(5)
            ->create();
    }
}