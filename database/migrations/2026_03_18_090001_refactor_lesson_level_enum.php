<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Paso 1: ampliar enum para permitir el nuevo valor antes del update (MySQL).
        DB::statement("ALTER TABLE lessons MODIFY level ENUM('iniciacion','pro','intermedio','avanzado') NOT NULL DEFAULT 'iniciacion'");

        // Paso 2: datos: Pro -> Avanzado
        DB::statement("UPDATE lessons SET level = 'avanzado' WHERE level = 'pro'");

        // Paso 3: cerrar enum final (sin 'pro')
        DB::statement("ALTER TABLE lessons MODIFY level ENUM('iniciacion','intermedio','avanzado') NOT NULL DEFAULT 'iniciacion'");
    }

    public function down(): void
    {
        // Paso 1: ampliar enum temporalmente para permitir el downgrade.
        DB::statement("ALTER TABLE lessons MODIFY level ENUM('iniciacion','pro','intermedio','avanzado') NOT NULL DEFAULT 'iniciacion'");

        // Paso 2: revertir datos
        DB::statement("UPDATE lessons SET level = 'pro' WHERE level = 'avanzado'");
        DB::statement("UPDATE lessons SET level = 'iniciacion' WHERE level = 'intermedio'");

        // Paso 3: volver al enum original
        DB::statement("ALTER TABLE lessons MODIFY level ENUM('iniciacion','pro') NOT NULL DEFAULT 'iniciacion'");
    }
};

