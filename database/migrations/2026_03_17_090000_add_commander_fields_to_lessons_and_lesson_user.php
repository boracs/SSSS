<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            if (!Schema::hasColumn('lessons', 'type')) {
                $table->string('type', 20)->default('surf')->after('level'); // surf, skate (extensible)
            }
            if (!Schema::hasColumn('lessons', 'is_private')) {
                $table->boolean('is_private')->default(false)->after('location');
            }
            if (!Schema::hasColumn('lessons', 'max_capacity')) {
                $table->unsignedTinyInteger('max_capacity')->nullable()->after('max_slots');
            }
        });

        Schema::table('lesson_user', function (Blueprint $table) {
            if (!Schema::hasColumn('lesson_user', 'party_size')) {
                $table->unsignedSmallInteger('party_size')->default(1)->after('user_id');
            }
            if (!Schema::hasColumn('lesson_user', 'confirmed_at')) {
                $table->timestamp('confirmed_at')->nullable()->after('cancelled_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            if (Schema::hasColumn('lessons', 'type')) {
                $table->dropColumn('type');
            }
            if (Schema::hasColumn('lessons', 'is_private')) {
                $table->dropColumn('is_private');
            }
            if (Schema::hasColumn('lessons', 'max_capacity')) {
                $table->dropColumn('max_capacity');
            }
        });

        Schema::table('lesson_user', function (Blueprint $table) {
            if (Schema::hasColumn('lesson_user', 'party_size')) {
                $table->dropColumn('party_size');
            }
            if (Schema::hasColumn('lesson_user', 'confirmed_at')) {
                $table->dropColumn('confirmed_at');
            }
        });
    }
};

