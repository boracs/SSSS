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
        Schema::create('mostrador_tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('datafono_payment_id')->unique()->constrained('datafono_payments')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('guest_name', 120)->nullable();
            $table->string('guest_email', 190)->nullable();
            $table->unsignedInteger('total_cents');
            $table->string('status', 20)->default('closed');
            $table->timestamps();
        });

        Schema::create('mostrador_ticket_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('mostrador_tickets')->cascadeOnDelete();
            $table->string('category', 40);
            $table->unsignedInteger('amount_cents');
            $table->nullableMorphs('payable');
            $table->json('payload')->nullable();
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();

            $table->index(['ticket_id', 'sort']);
        });

        // Backfill 1:1 de cobros ya asignados (fuente legacy morph en datafono_payments).
        $assigned = DB::table('datafono_payments')
            ->where('status', 'assigned')
            ->whereNotNull('payable_type')
            ->whereNotNull('payable_id')
            ->get(['id', 'assigned_user_id', 'amount_cents', 'payable_type', 'payable_id', 'external_reference', 'created_at', 'updated_at']);

        foreach ($assigned as $payment) {
            $category = match ($payment->payable_type) {
                'App\\Models\\PagoCuota' => 'taquilla',
                'App\\Models\\UserBono' => 'bono',
                'App\\Models\\Booking' => 'alquiler',
                'App\\Models\\LessonUser' => 'clase',
                'App\\Models\\PhotoSessionBooking' => 'fotos',
                'App\\Models\\Pedido' => 'producto',
                default => 'producto',
            };

            $ticketId = DB::table('mostrador_tickets')->insertGetId([
                'datafono_payment_id' => $payment->id,
                'user_id' => $payment->assigned_user_id,
                'guest_name' => $payment->assigned_user_id ? null : $payment->external_reference,
                'guest_email' => null,
                'total_cents' => (int) $payment->amount_cents,
                'status' => 'closed',
                'created_at' => $payment->created_at ?? now(),
                'updated_at' => $payment->updated_at ?? now(),
            ]);

            DB::table('mostrador_ticket_lines')->insert([
                'ticket_id' => $ticketId,
                'category' => $category,
                'amount_cents' => (int) $payment->amount_cents,
                'payable_type' => $payment->payable_type,
                'payable_id' => $payment->payable_id,
                'payload' => null,
                'sort' => 0,
                'created_at' => $payment->created_at ?? now(),
                'updated_at' => $payment->updated_at ?? now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('mostrador_ticket_lines');
        Schema::dropIfExists('mostrador_tickets');
    }
};
