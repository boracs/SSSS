<?php

use App\DTOs\Rentals\RentalWindowDto;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Ventana real del alquiler: tiempo cobrado (pickup_at → return_at) frente a
 * ventana de inventario (pickup_at → block_end, con buffer de rotación),
 * más los campos de control de recogida / no-show.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('mode', 10)->default(RentalWindowDto::MODE_DAY)->after('user_id');
            $table->dateTime('pickup_at')->nullable()->after('end_date');
            $table->dateTime('return_at')->nullable()->after('pickup_at');
            $table->dateTime('block_end')->nullable()->after('return_at');
            $table->unsignedSmallInteger('pack_minutes')->nullable()->after('block_end');
            $table->unsignedTinyInteger('pack_days')->nullable()->after('pack_minutes');
            $table->dateTime('picked_up_at')->nullable()->after('pack_days');
            $table->dateTime('no_show_at')->nullable()->after('picked_up_at');

            $table->index(['surfboard_id', 'pickup_at', 'block_end'], 'bookings_availability_index');
        });

        $buffer = (int) config('rentals.turnover_buffer_minutes', 30);

        DB::table('bookings')->orderBy('id')->chunkById(500, function ($bookings) use ($buffer) {
            foreach ($bookings as $booking) {
                $pickup = $booking->start_date;
                $return = $booking->end_date;

                if ($pickup === null || $return === null) {
                    continue;
                }

                DB::table('bookings')->where('id', $booking->id)->update([
                    'pickup_at' => $pickup,
                    'return_at' => $return,
                    'block_end' => (new DateTimeImmutable((string) $return))
                        ->modify("+{$buffer} minutes")
                        ->format('Y-m-d H:i:s'),
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex('bookings_availability_index');
            $table->dropColumn([
                'mode',
                'pickup_at',
                'return_at',
                'block_end',
                'pack_minutes',
                'pack_days',
                'picked_up_at',
                'no_show_at',
            ]);
        });
    }
};
