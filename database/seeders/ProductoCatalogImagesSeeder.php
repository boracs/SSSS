<?php

namespace Database\Seeders;

use App\Models\Imagen;
use App\Models\Producto;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductoCatalogImagesSeeder extends Seeder
{
    /** @var array<string, string> */
    private const FILES = [
        'fins' => 'productos/fcs-fins.png',
        'leash_1' => 'productos/leash-ocean-earth-1.png',
        'leash_2' => 'productos/leash-ocean-earth-2.png',
        'neopreno_top' => 'productos/neopreno-top-oneill.png',
        'neopreno_front' => 'productos/neopreno-traje-frontal.png',
        'neopreno_back' => 'productos/neopreno-traje-trasera.png',
        'nowax_1' => 'productos/nowax-1.png',
        'nowax_2' => 'productos/nowax-2.png',
        'nowax_3' => 'productos/nowax-3.png',
        'nowax_4' => 'productos/nowax-4.png',
    ];

    /**
     * Conjuntos de imagenes: neopreno siempre en pareja, nowax siempre las 4.
     *
     * @return list<list<string>>
     */
    private function imageSets(): array
    {
        return [
            [self::FILES['fins']],
            [self::FILES['leash_1']],
            [self::FILES['leash_2']],
            [self::FILES['neopreno_front'], self::FILES['neopreno_back']],
            [self::FILES['neopreno_top'], self::FILES['neopreno_front']],
            [
                self::FILES['nowax_1'],
                self::FILES['nowax_2'],
                self::FILES['nowax_3'],
                self::FILES['nowax_4'],
            ],
        ];
    }

    public function run(): void
    {
        $sets = $this->imageSets();
        $productos = Producto::query()
            ->where('eliminado', false)
            ->whereDoesntHave('imagenes')
            ->orderBy('id')
            ->get();

        if ($productos->isEmpty()) {
            $this->command?->warn('No hay productos sin imagenes para asignar.');

            return;
        }

        $shuffledSets = collect($sets)->shuffle()->values();

        DB::transaction(function () use ($productos, $shuffledSets, $sets) {
            foreach ($productos as $index => $producto) {
                $rutas = $shuffledSets[$index % $shuffledSets->count()] ?? $sets[array_rand($sets)];

                foreach ($rutas as $position => $ruta) {
                    Imagen::query()->create([
                        'nombre' => basename($ruta),
                        'ruta' => $ruta,
                        'producto_id' => $producto->id,
                        'es_principal' => $position === 0,
                    ]);
                }
            }
        });

        $this->command?->info(sprintf(
            'Imagenes asignadas a %d productos.',
            $productos->count()
        ));
    }
}
