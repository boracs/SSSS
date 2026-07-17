<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fiscal_invoices', function (Blueprint $table) {
            $table->id();
            $table->string('payable_type', 120);
            $table->unsignedBigInteger('payable_id');
            $table->string('stripe_checkout_session_id', 120)->unique();
            $table->unsignedInteger('amount_cents')->comment('Importe facturado en céntimos EUR');
            $table->string('currency', 3)->default('EUR');
            $table->string('provider', 30)->default('b2brouter');
            $table->string('status', 24)->default('pending')->index();
            $table->string('b2b_invoice_id', 64)->nullable();
            $table->string('b2b_tax_report_id', 64)->nullable();
            $table->string('tbai_identifier', 100)->nullable();
            $table->text('qr_payload')->nullable();
            $table->string('pdf_url', 500)->nullable();
            $table->text('last_error')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('issued_at')->nullable();
            $table->timestamps();

            $table->unique(['payable_type', 'payable_id']);
            $table->index(['payable_type', 'payable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fiscal_invoices');
    }
};
