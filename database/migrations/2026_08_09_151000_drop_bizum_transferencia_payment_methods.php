<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * El club ya solo cobra por pasarela (Stripe), datáfono TPV o efectivo registrado
 * por un admin. Las filas antiguas con bizum/transferencia eran cobros validados a
 * mano en el club, así que se normalizan a `datafono` y se retiran ambos valores del
 * ENUM para que ninguna validación pueda volver a escribirlos.
 */
return new class extends Migration
{
    /** @var list<string> */
    private const LEGACY = ['bizum', 'transferencia'];

    public function up(): void
    {
        foreach (['pagos_cuotas', 'bookings', 'lesson_user', 'pedidos', 'photo_session_bookings'] as $table) {
            DB::table($table)
                ->whereIn('payment_method', self::LEGACY)
                ->update(['payment_method' => 'datafono']);
        }

        DB::statement("ALTER TABLE `bookings` MODIFY `payment_method` ENUM('card', 'tienda', 'datafono') NULL");
        DB::statement("ALTER TABLE `lesson_user` MODIFY `payment_method` ENUM('bono_vip', 'card', 'tienda', 'datafono') NULL");
    }

    public function down(): void
    {
        // Solo se reabre el ENUM: qué fila era bizum y cuál transferencia ya no se sabe.
        DB::statement("ALTER TABLE `bookings` MODIFY `payment_method` ENUM('bizum', 'transferencia', 'card', 'tienda', 'datafono') NULL");
        DB::statement("ALTER TABLE `lesson_user` MODIFY `payment_method` ENUM('bizum', 'transferencia', 'bono_vip', 'card', 'tienda', 'datafono') NULL");
    }
};
