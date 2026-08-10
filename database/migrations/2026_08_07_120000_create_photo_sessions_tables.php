<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('photo_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 150);
            $table->text('descripcion')->nullable();
            $table->unsignedInteger('precio_cents');
            $table->unsignedSmallInteger('duracion_minutos');
            $table->unsignedSmallInteger('capacidad_maxima')->nullable();
            $table->foreignId('fotografo_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        Schema::create('photo_session_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('photo_session_id')->constrained('photo_sessions')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('guest_first_name', 100)->nullable();
            $table->string('guest_last_name', 100)->nullable();
            $table->string('guest_phone', 40)->nullable();
            $table->string('guest_email', 191)->nullable();
            $table->boolean('is_admin_guest')->default(false);
            $table->dateTime('fecha_inicio');
            $table->dateTime('fecha_fin');
            $table->dateTime('fecha_pago')->nullable();
            $table->unsignedSmallInteger('party_size')->default(1);
            $table->unsignedInteger('precio_pagado_cents');
            $table->string('status', 40)->default('pending');
            $table->string('payment_status', 40)->default('pending');
            $table->string('payment_method', 40)->nullable();
            $table->string('payment_proof_path', 500)->nullable();
            $table->timestamp('proof_uploaded_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('admin_notes')->nullable();
            $table->timestamps();

            $table->index(['status', 'payment_status']);
            $table->index(['fecha_inicio', 'fecha_fin']);
        });

        // Catálogo inicial (antes era hardcode en Servicios_Fotos.jsx).
        DB::table('photo_sessions')->insert([
            [
                'nombre' => 'Bono Básico',
                'descripcion' => 'Perfecto para quienes quieren iniciarse. Llévate fotos de tu primera experiencia sobre la tabla.',
                'precio_cents' => 500,
                'duracion_minutos' => 60,
                'capacidad_maxima' => null,
                'fotografo_user_id' => null,
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre' => 'Bono de 1 hora',
                'descripcion' => 'Una hora de pura diversión en el agua para mejorar tus habilidades, con recuerdo fotográfico.',
                'precio_cents' => 1000,
                'duracion_minutos' => 60,
                'capacidad_maxima' => null,
                'fotografo_user_id' => null,
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre' => 'Bono de 1,5 horas',
                'descripcion' => 'Un poco más de tiempo para perfeccionar tu técnica y disfrutar del mar mientras te capturamos.',
                'precio_cents' => 1500,
                'duracion_minutos' => 90,
                'capacidad_maxima' => null,
                'fotografo_user_id' => null,
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre' => 'Bono Grupal',
                'descripcion' => 'Perfecto para disfrutar en grupo y aprender juntos las mejores técnicas de surf con reportaje incluido.',
                'precio_cents' => 8000,
                'duracion_minutos' => 120,
                'capacidad_maxima' => 5,
                'fotografo_user_id' => null,
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre' => 'Bono Semanal',
                'descripcion' => 'Una semana completa de surf para llevar tus habilidades al siguiente nivel, con cobertura fotográfica.',
                'precio_cents' => 5000,
                'duracion_minutos' => 300,
                'capacidad_maxima' => null,
                'fotografo_user_id' => null,
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('photo_session_bookings');
        Schema::dropIfExists('photo_sessions');
    }
};
