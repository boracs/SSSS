<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * `lesson_user.user_id` seguía siendo NOT NULL.
 *
 * La migración 2026_07_08_100000 pretendía hacerlo nullable para admitir
 * invitados, pero condicionó el cambio a que NO existiera la foreign key
 * `lesson_user_user_id_foreign` — y esa FK nace con la tabla
 * (2026_03_16_140002 usa `foreignId()->constrained()`), así que el bloque nunca
 * se ejecutó. Resultado: toda inscripción sin cuenta (web de invitado y alta de
 * mostrador) fallaba con «Column 'user_id' cannot be null».
 *
 * De paso la FK pasa a `ON DELETE SET NULL`: borrar un usuario no debe llevarse
 * por delante el historial de inscripciones (era `CASCADE`).
 */
return new class extends Migration
{
    private const FK = 'lesson_user_user_id_foreign';

    public function up(): void
    {
        if (! $this->userIdIsNullable()) {
            $this->dropForeignKeyIfExists();

            DB::statement('ALTER TABLE `lesson_user` MODIFY `user_id` BIGINT UNSIGNED NULL');
        }

        if (! $this->hasForeignKey()) {
            DB::statement(
                'ALTER TABLE `lesson_user` ADD CONSTRAINT `'.self::FK.'` '
                .'FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL'
            );
        }
    }

    public function down(): void
    {
        // Solo se puede volver a NOT NULL si no hay invitados guardados.
        if (DB::table('lesson_user')->whereNull('user_id')->exists()) {
            return;
        }

        $this->dropForeignKeyIfExists();

        DB::statement('ALTER TABLE `lesson_user` MODIFY `user_id` BIGINT UNSIGNED NOT NULL');
        DB::statement(
            'ALTER TABLE `lesson_user` ADD CONSTRAINT `'.self::FK.'` '
            .'FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE'
        );
    }

    private function dropForeignKeyIfExists(): void
    {
        if ($this->hasForeignKey()) {
            DB::statement('ALTER TABLE `lesson_user` DROP FOREIGN KEY `'.self::FK.'`');
        }
    }

    private function hasForeignKey(): bool
    {
        return DB::select(
            'SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS '
            .'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = ?',
            ['lesson_user', self::FK, 'FOREIGN KEY']
        ) !== [];
    }

    private function userIdIsNullable(): bool
    {
        $row = DB::selectOne(
            'SELECT IS_NULLABLE FROM information_schema.COLUMNS '
            .'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            ['lesson_user', 'user_id']
        );

        return $row !== null && strtoupper((string) $row->IS_NULLABLE) === 'YES';
    }
};
