<?php

declare(strict_types=1);

use App\Models\LessonUser;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Red de BD contra la doble inscripción (F3).
 *
 * La migración 2026_07_08_100000 tiró el UNIQUE (lesson_id, user_id) para
 * admitir invitados con user_id NULL y no lo repuso: desde entonces el código
 * era la única barrera. MariaDB/MySQL no tienen índices parciales, así que la
 * unicidad se expresa con una columna generada que vale NULL cuando la fila no
 * debe competir por la plaza (UNIQUE admite varios NULL):
 *
 *  - filas canceladas / caducadas / reembolsadas → NULL, se puede reinscribir
 *  - altas de mostrador (`is_admin_guest`) → NULL: el admin apunta legítimamente
 *    a varios invitados con el mismo email (una familia, por ejemplo)
 *  - socio identificado → 'u:<lesson>:<user>'
 *  - invitado de la web → 'g:<lesson>:<email en minúsculas>'
 */
return new class extends Migration
{
    private const COLUMN = 'active_enrollment_key';

    private const INDEX = 'lesson_user_active_enrollment_unique';

    public function up(): void
    {
        if (! Schema::hasColumn('lesson_user', self::COLUMN)) {
            DB::statement(
                'ALTER TABLE `lesson_user` ADD COLUMN `'.self::COLUMN.'` VARCHAR(190) '
                .'GENERATED ALWAYS AS ('.$this->keyExpression().') STORED'
            );
        }

        $this->assertNoActiveDuplicates();

        if (! $this->hasIndex(self::INDEX)) {
            DB::statement(
                'ALTER TABLE `lesson_user` ADD UNIQUE INDEX `'.self::INDEX.'` (`'.self::COLUMN.'`)'
            );
        }
    }

    public function down(): void
    {
        if ($this->hasIndex(self::INDEX)) {
            DB::statement('ALTER TABLE `lesson_user` DROP INDEX `'.self::INDEX.'`');
        }

        if (Schema::hasColumn('lesson_user', self::COLUMN)) {
            DB::statement('ALTER TABLE `lesson_user` DROP COLUMN `'.self::COLUMN.'`');
        }
    }

    private function keyExpression(): string
    {
        $activeStatuses = collect(LessonUser::activeSeatStatuses())
            ->map(static fn (string $status): string => "'".$status."'")
            ->implode(', ');

        return <<<SQL
            CASE
                WHEN COALESCE(`is_admin_guest`, 0) = 1 THEN NULL
                WHEN `status` NOT IN ({$activeStatuses}) THEN NULL
                WHEN `user_id` IS NOT NULL THEN CONCAT('u:', `lesson_id`, ':', `user_id`)
                WHEN `guest_email` IS NOT NULL AND `guest_email` <> ''
                    THEN CONCAT('g:', `lesson_id`, ':', LOWER(`guest_email`))
                ELSE NULL
            END
            SQL;
    }

    /**
     * Sin esto el ALTER del índice fallaría a medias y dejaría la columna creada
     * sin unicidad. Preferimos abortar con la lista de conflictos que borrar
     * inscripciones a ciegas.
     */
    private function assertNoActiveDuplicates(): void
    {
        $duplicates = DB::table('lesson_user')
            ->select(self::COLUMN, DB::raw('COUNT(*) as total'))
            ->whereNotNull(self::COLUMN)
            ->groupBy(self::COLUMN)
            ->having('total', '>', 1)
            ->get();

        if ($duplicates->isEmpty()) {
            return;
        }

        $detalle = $duplicates
            ->map(static fn ($row): string => $row->{self::COLUMN}.' ×'.$row->total)
            ->implode(', ');

        throw new RuntimeException(
            'No se puede crear el índice único de inscripciones: hay duplicados activos en `lesson_user`. '
            .'Resuélvelos a mano (cancelando la fila sobrante) y vuelve a migrar. Conflictos: '
            .Str::limit($detalle, 1000)
        );
    }

    private function hasIndex(string $indexName): bool
    {
        return DB::select('SHOW INDEX FROM `lesson_user` WHERE Key_name = ?', [$indexName]) !== [];
    }
};
