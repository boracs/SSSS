<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            if (!Schema::hasColumn('pedidos', 'user_id')) {
                $table->foreignId('user_id')->nullable()->after('id');
            }
        });

        DB::statement('UPDATE pedidos SET user_id = id_usuario WHERE user_id IS NULL');

        Schema::table('pedidos', function (Blueprint $table) {
            try {
                $table->dropForeign(['id_usuario']);
            } catch (\Throwable $e) {
                // noop
            }
            if (Schema::hasColumn('pedidos', 'id_usuario')) {
                $table->dropColumn('id_usuario');
            }
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::table('carritos', function (Blueprint $table) {
            if (!Schema::hasColumn('carritos', 'user_id')) {
                $table->foreignId('user_id')->nullable()->after('id');
            }
        });

        DB::statement('UPDATE carritos SET user_id = id_usuario WHERE user_id IS NULL');

        Schema::table('carritos', function (Blueprint $table) {
            try {
                $table->dropForeign(['id_usuario']);
            } catch (\Throwable $e) {
                // noop
            }
            if (Schema::hasColumn('carritos', 'id_usuario')) {
                $table->dropColumn('id_usuario');
            }
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            if (!Schema::hasColumn('pedidos', 'id_usuario')) {
                $table->foreignId('id_usuario')->nullable()->after('id');
            }
        });

        DB::statement('UPDATE pedidos SET id_usuario = user_id WHERE id_usuario IS NULL');

        Schema::table('pedidos', function (Blueprint $table) {
            try {
                $table->dropForeign(['user_id']);
            } catch (\Throwable $e) {
                // noop
            }
            if (Schema::hasColumn('pedidos', 'user_id')) {
                $table->dropColumn('user_id');
            }
            $table->foreign('id_usuario')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::table('carritos', function (Blueprint $table) {
            if (!Schema::hasColumn('carritos', 'id_usuario')) {
                $table->foreignId('id_usuario')->nullable()->after('id');
            }
        });

        DB::statement('UPDATE carritos SET id_usuario = user_id WHERE id_usuario IS NULL');

        Schema::table('carritos', function (Blueprint $table) {
            try {
                $table->dropForeign(['user_id']);
            } catch (\Throwable $e) {
                // noop
            }
            if (Schema::hasColumn('carritos', 'user_id')) {
                $table->dropColumn('user_id');
            }
            $table->foreign('id_usuario')->references('id')->on('users')->cascadeOnDelete();
        });
    }
};

