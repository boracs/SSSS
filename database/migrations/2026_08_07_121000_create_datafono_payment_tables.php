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
        Schema::create('payment_terminals', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 40)->unique();
            $table->string('nombre', 120);
            $table->boolean('activo')->default(true);
            $table->boolean('emite_ticketbai_propio')->default(true);
            $table->timestamps();
        });

        Schema::create('datafono_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_terminal_id')->constrained('payment_terminals')->cascadeOnDelete();
            $table->unsignedInteger('amount_cents');
            $table->dateTime('paid_at');
            $table->string('external_reference', 120)->nullable();
            $table->string('status', 40)->default('pending_review');
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->nullableMorphs('payable');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'paid_at']);
        });

        DB::table('payment_terminals')->insert([
            [
                'codigo' => 'datafono1',
                'nombre' => 'Datáfono 1 · Mostrador',
                'activo' => true,
                'emite_ticketbai_propio' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'codigo' => 'datafono2',
                'nombre' => 'Datáfono 2 · Reserva',
                'activo' => true,
                'emite_ticketbai_propio' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('datafono_payments');
        Schema::dropIfExists('payment_terminals');
    }
};
