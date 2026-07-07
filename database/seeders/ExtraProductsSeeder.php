<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Producto;
use Illuminate\Database\Seeder;

/**
 * Añade productos de demo para probar paginación en /tienda (18 por página).
 */
final class ExtraProductsSeeder extends Seeder
{
    /** @var list<array{0: string, 1: float, 2: int, 3: float}> */
    private const ITEMS = [
        ['Neopreno 4/3 mm invierno', 129.00, 15, 10],
        ['Botas reef booties 3 mm', 39.90, 22, 0],
        ['Sombrero surf UV', 22.00, 30, 15],
        ['Funda tabla shortboard', 55.00, 18, 0],
        ['Tail pad deck grip', 19.50, 40, 5],
        ['Invento leash competición', 28.00, 25, 0],
        ['Pulsera leash llaves', 12.50, 50, 0],
        ['Cera cold water', 9.50, 80, 0],
        ['Aceite limpieza neopreno', 14.00, 35, 0],
        ['Sudadera S4 oversize', 45.00, 20, 25],
        ['Toalla microfibra playa', 16.00, 45, 0],
        ['Bolsa impermeable wetsuit', 32.00, 28, 10],
        ['Quillas twin retro', 38.00, 12, 0],
        ['Camiseta lycra rashguard', 35.00, 30, 15],
        ['Candado taquilla surf', 11.00, 60, 0],
    ];

    public function run(): void
    {
        $created = 0;
        $skipped = 0;

        foreach (self::ITEMS as [$nombre, $precio, $stock, $dto]) {
            $producto = Producto::query()->firstOrCreate(
                ['nombre' => $nombre],
                [
                    'precio' => $precio,
                    'unidades' => $stock,
                    'descuento' => $dto,
                    'eliminado' => false,
                ]
            );

            if ($producto->wasRecentlyCreated) {
                $created++;
            } else {
                $skipped++;
            }
        }

        $this->command?->info(sprintf(
            'ExtraProductsSeeder: %d creado(s), %d ya existían. Total activos: %d.',
            $created,
            $skipped,
            Producto::query()->where('eliminado', false)->count()
        ));

        $this->call(ProductImagesSeeder::class);
    }
}
