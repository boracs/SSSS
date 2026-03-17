<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lesson_user', function (Blueprint $table) {
            if (! Schema::hasColumn('lesson_user', 'expires_at')) {
                $table->timestamp('expires_at')->nullable()->after('confirmed_at');
            }
        });

        Schema::table('lessons', function (Blueprint $table) {
            if (! Schema::hasColumn('lessons', 'price')) {
                $table->decimal('price', 8, 2)->nullable()->after('max_capacity');
            }
            if (! Schema::hasColumn('lessons', 'currency')) {
                $table->string('currency', 3)->default('EUR')->after('price');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lesson_user', function (Blueprint $table) {
            if (Schema::hasColumn('lesson_user', 'expires_at')) {
                $table->dropColumn('expires_at');
            }
        });

        Schema::table('lessons', function (Blueprint $table) {
            if (Schema::hasColumn('lessons', 'price')) {
                $table->dropColumn('price');
            }
            if (Schema::hasColumn('lessons', 'currency')) {
                $table->dropColumn('currency');
            }
        });
    }
};
