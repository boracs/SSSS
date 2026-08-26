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
        $this->mergeDuplicateCarts();

        DB::table('carritos')->whereNull('user_id')->delete();

        DB::statement('ALTER TABLE carritos MODIFY user_id BIGINT UNSIGNED NOT NULL');

        Schema::table('carritos', function (Blueprint $table) {
            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('carritos', function (Blueprint $table) {
            $table->dropUnique(['user_id']);
        });

        DB::statement('ALTER TABLE carritos MODIFY user_id BIGINT UNSIGNED NULL');
    }

    private function mergeDuplicateCarts(): void
    {
        $duplicateUserIds = DB::table('carritos')
            ->select('user_id')
            ->whereNotNull('user_id')
            ->groupBy('user_id')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('user_id');

        foreach ($duplicateUserIds as $userId) {
            $cartIds = DB::table('carritos')
                ->where('user_id', $userId)
                ->orderBy('id')
                ->pluck('id');

            $keepId = (int) $cartIds->shift();

            foreach ($cartIds as $extraId) {
                $this->mergeCartLines($keepId, (int) $extraId);
                DB::table('carritos')->where('id', $extraId)->delete();
            }
        }
    }

    private function mergeCartLines(int $keepId, int $extraId): void
    {
        $lines = DB::table('carrito_producto')->where('carrito_id', $extraId)->get();

        foreach ($lines as $line) {
            $existing = DB::table('carrito_producto')
                ->where('carrito_id', $keepId)
                ->where('producto_id', $line->producto_id)
                ->first();

            if ($existing) {
                DB::table('carrito_producto')->where('id', $existing->id)->update([
                    'cantidad' => (int) $existing->cantidad + (int) $line->cantidad,
                    'updated_at' => now(),
                ]);
                DB::table('carrito_producto')->where('id', $line->id)->delete();

                continue;
            }

            DB::table('carrito_producto')->where('id', $line->id)->update([
                'carrito_id' => $keepId,
            ]);
        }
    }
};
