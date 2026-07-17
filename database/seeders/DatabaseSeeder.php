<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Dataset sandbox rico (admin@gmail.com / user@gmail.com → 12121212)
        $this->call(SandboxRandomDemoSeeder::class);
        $this->call(ArticleSeeder::class);
    }
}
