<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Segunda mano: no se borran tablas del inventario (historial de compra/venta).
 * El botón admin "eliminar" pasa a soft-delete (desactivar / retirar del catálogo).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('second_hand_boards', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('second_hand_boards', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
