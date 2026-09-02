<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * T1: un casillero físico = un socio. MariaDB no tiene UNIQUE parcial, así
 * que la columna generada vale NULL en 500/600 (compartidas VIP) y en
 * usuarios sin plaza. UNIQUE admite varios NULL.
 *
 * Los números 500/600 quedan congelados en el esquema (patrón F3).
 */
return new class extends Migration
{
    private const COLUMN = 'physical_locker_key';

    private const INDEX = 'users_physical_locker_unique';

    public function up(): void
    {
        if (Schema::hasColumn('users', self::COLUMN) && ! $this->hasIndex(self::INDEX)) {
            DB::statement('ALTER TABLE `users` DROP COLUMN `'.self::COLUMN.'`');
        }

        if (! Schema::hasColumn('users', self::COLUMN)) {
            DB::statement(
                'ALTER TABLE `users` ADD COLUMN `'.self::COLUMN.'` INT '
                .'GENERATED ALWAYS AS ('.$this->keyExpression().') STORED'
            );
        }

        $this->assertNoPhysicalDuplicates();

        if (! $this->hasIndex(self::INDEX)) {
            DB::statement(
                'ALTER TABLE `users` ADD UNIQUE INDEX `'.self::INDEX.'` (`'.self::COLUMN.'`)'
            );
        }
    }

    public function down(): void
    {
        if ($this->hasIndex(self::INDEX)) {
            DB::statement('ALTER TABLE `users` DROP INDEX `'.self::INDEX.'`');
        }

        if (Schema::hasColumn('users', self::COLUMN)) {
            DB::statement('ALTER TABLE `users` DROP COLUMN `'.self::COLUMN.'`');
        }
    }

    private function keyExpression(): string
    {
        return <<<'SQL'
            CASE
                WHEN `numeroTaquilla` IS NULL OR `numeroTaquilla` = 0 THEN NULL
                WHEN `numeroTaquilla` IN (500, 600) THEN NULL
                ELSE `numeroTaquilla`
            END
            SQL;
    }

    private function assertNoPhysicalDuplicates(): void
    {
        $duplicates = DB::table('users')
            ->select('numeroTaquilla', DB::raw('COUNT(*) as total'))
            ->whereNotNull('numeroTaquilla')
            ->where('numeroTaquilla', '>', 0)
            ->whereNotIn('numeroTaquilla', [500, 600])
            ->groupBy('numeroTaquilla')
            ->having('total', '>', 1)
            ->get();

        if ($duplicates->isEmpty()) {
            return;
        }

        $detalle = $duplicates
            ->map(static fn ($row): string => '#'.$row->numeroTaquilla.' ×'.$row->total)
            ->implode(', ');

        throw new RuntimeException(
            'No se puede crear el UNIQUE de taquilla física: hay duplicados. '
            .'Resuélvelos a mano y vuelve a migrar. Conflictos: '
            .Str::limit($detalle, 1000)
        );
    }

    private function hasIndex(string $indexName): bool
    {
        return DB::select('SHOW INDEX FROM `users` WHERE Key_name = ?', [$indexName]) !== [];
    }
};
