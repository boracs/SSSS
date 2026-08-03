<?php

declare(strict_types=1);

namespace Tests\Unit\Rentals;

use App\DTOs\Rentals\RentalRequestDto;
use App\DTOs\Rentals\RentalWindowDto;
use App\Models\PriceSchema;
use App\Services\BookingService;
use App\Support\BusinessDateTime;
use Database\Factories\PriceSchemaFactory;
use DateTimeInterface;
use Illuminate\Support\Carbon;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Contrato de las ventanas de alquiler:
 *   pickup_at → return_at : tiempo cobrado
 *   pickup_at → block_end : inventario (return + buffer de rotación, no cobrado)
 */
class RentalWindowTest extends TestCase
{
    private BookingService $service;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.academy.business_timezone' => 'Europe/Madrid',
            'rentals.turnover_buffer_minutes' => 30,
            'rentals.pickup_flexibility_minutes' => 30,
            'rentals.day_mode_pickup_hour' => 12,
            'rentals.pickup_window_start' => '09:00',
            'rentals.pickup_window_end' => '19:00',
            'rentals.pricing_step_minutes' => 30,
            'rentals.deposit_percentage' => 30,
            'rentals.max_rental_days' => 60,
        ]);

        $this->service = app(BookingService::class);
    }

    // ── Modo día ──────────────────────────────────────────────

    #[Test]
    public function un_dia_es_el_ciclo_12_00_a_12_00(): void
    {
        $window = $this->service->normalizeDayRange($this->day('2026-08-10'), 1);

        $this->assertSame(RentalWindowDto::MODE_DAY, $window->mode);
        $this->assertSame('2026-08-10 12:00:00', $this->wall($window->pickupAt));
        $this->assertSame('2026-08-11 12:00:00', $this->wall($window->returnAt));
        $this->assertSame('2026-08-11 12:30:00', $this->wall($window->blockEnd));
        $this->assertSame(PriceSchema::MINUTES_PER_DAY, $window->chargedMinutes);
        $this->assertSame(1, $window->packDays);
        $this->assertNull($window->packMinutes);
    }

    #[Test]
    public function n_dias_alargan_la_devolucion_manteniendo_las_12_00(): void
    {
        $window = $this->service->normalizeDayRange($this->day('2026-08-10'), 3);

        $this->assertSame('2026-08-13 12:00:00', $this->wall($window->returnAt));
        $this->assertSame(3 * PriceSchema::MINUTES_PER_DAY, $window->chargedMinutes);
        $this->assertSame(3, $window->packDays);
    }

    #[Test]
    public function una_duracion_sin_pack_de_dias_no_guarda_pack_days(): void
    {
        // 6 días no es pack ofertado (1,2,3,4,5,7): se cobra por composición.
        $window = $this->service->normalizeDayRange($this->day('2026-08-10'), 6);

        $this->assertNull($window->packDays);
        $this->assertSame(6 * PriceSchema::MINUTES_PER_DAY, $window->chargedMinutes);
    }

    #[Test]
    public function la_hora_de_recogida_del_modo_dia_sale_de_config(): void
    {
        config(['rentals.day_mode_pickup_hour' => 10]);

        $window = app(BookingService::class)->normalizeDayRange($this->day('2026-08-10'), 1);

        $this->assertSame('2026-08-10 10:00:00', $this->wall($window->pickupAt));
        $this->assertSame('2026-08-11 10:00:00', $this->wall($window->returnAt));
    }

    #[Test]
    public function el_buffer_de_bloqueo_sale_de_config(): void
    {
        config(['rentals.turnover_buffer_minutes' => 45]);

        $window = app(BookingService::class)->normalizeDayRange($this->day('2026-08-10'), 1);

        $this->assertSame(45, $window->bufferMinutes);
        $this->assertSame('2026-08-11 12:45:00', $this->wall($window->blockEnd));
    }

    #[Test]
    public function una_duracion_fuera_de_rango_se_rechaza(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->service->normalizeDayRange($this->day('2026-08-10'), 0);
    }

    #[Test]
    public function el_rango_de_calendario_cuenta_el_mismo_dia_como_un_dia(): void
    {
        $mismoDia = $this->service->buildWindow(new RentalRequestDto(
            startDate: '2026-08-10',
            endDate: '2026-08-10',
            mode: RentalWindowDto::MODE_DAY,
        ));
        $dosDias = $this->service->buildWindow(new RentalRequestDto(
            startDate: '2026-08-10',
            endDate: '2026-08-12',
            mode: RentalWindowDto::MODE_DAY,
        ));

        $this->assertSame(PriceSchema::MINUTES_PER_DAY, $mismoDia->chargedMinutes);
        $this->assertSame(2 * PriceSchema::MINUTES_PER_DAY, $dosDias->chargedMinutes);
    }

    // ── Modo hora ─────────────────────────────────────────────

    #[Test]
    public function el_modo_hora_es_recogida_mas_pack(): void
    {
        $window = $this->service->normalizeHourWindow($this->at('2026-08-10 10:00:00'), 120);

        $this->assertSame(RentalWindowDto::MODE_HOUR, $window->mode);
        $this->assertSame('2026-08-10 10:00:00', $this->wall($window->pickupAt));
        $this->assertSame('2026-08-10 12:00:00', $this->wall($window->returnAt));
        $this->assertSame('2026-08-10 12:30:00', $this->wall($window->blockEnd));
        $this->assertSame(120, $window->chargedMinutes);
        $this->assertSame(120, $window->packMinutes);
        $this->assertNull($window->packDays);
    }

    #[Test]
    public function el_buffer_bloquea_inventario_pero_no_se_cobra(): void
    {
        $window = $this->service->normalizeHourWindow($this->at('2026-08-10 10:00:00'), 120);
        $schema = PriceSchema::factory()->make(PriceSchemaFactory::SOFTBOARD_PACKS);

        // 2 h cobradas (16 €), no 2,5 h (que serían 20 €).
        $this->assertSame(120, $window->chargedMinutes);
        $this->assertSame(16.0, $this->service->resolvePricingForWindow($schema, $window)['total_price']);
        $this->assertSame(30, (int) $window->returnAt->diffInMinutes($window->blockEnd));
    }

    #[Test]
    public function la_ventana_de_cortesia_de_recogida_rodea_la_hora_acordada(): void
    {
        $window = $this->service->normalizeHourWindow($this->at('2026-08-10 10:00:00'), 60);

        $this->assertSame('2026-08-10 09:30:00', $this->wall($window->pickupWindowStart()));
        $this->assertSame('2026-08-10 10:30:00', $this->wall($window->pickupWindowEnd()));
    }

    #[Test]
    public function un_pack_de_minutos_inexistente_se_rechaza(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->service->normalizeHourWindow($this->at('2026-08-10 10:00:00'), 75);
    }

    #[Test]
    public function una_recogida_antes_de_abrir_se_rechaza(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->service->normalizeHourWindow($this->at('2026-08-10 08:30:00'), 60);
    }

    #[Test]
    public function una_devolucion_despues_del_cierre_se_rechaza(): void
    {
        $this->expectException(InvalidArgumentException::class);

        // 14:00 + 6 h = 20:00, fuera del cierre de mostrador (19:00).
        $this->service->normalizeHourWindow($this->at('2026-08-10 14:00:00'), 360);
    }

    #[Test]
    public function una_devolucion_justo_al_cierre_se_acepta(): void
    {
        $window = $this->service->normalizeHourWindow($this->at('2026-08-10 13:00:00'), 360);

        // El buffer puede pasar del cierre: solo bloquea inventario.
        $this->assertSame('2026-08-10 19:00:00', $this->wall($window->returnAt));
        $this->assertSame('2026-08-10 19:30:00', $this->wall($window->blockEnd));
    }

    #[Test]
    public function el_modo_hora_exige_hora_de_recogida(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->service->buildWindow(new RentalRequestDto(
            startDate: '2026-08-10',
            mode: RentalWindowDto::MODE_HOUR,
            packMinutes: 120,
        ));
    }

    #[Test]
    public function build_window_respeta_la_hora_enviada_por_el_cliente(): void
    {
        $window = $this->service->buildWindow(new RentalRequestDto(
            startDate: '2026-08-10T11:30',
            mode: RentalWindowDto::MODE_HOUR,
            packMinutes: 90,
        ));

        $this->assertSame('2026-08-10 11:30:00', $this->wall($window->pickupAt));
        $this->assertSame('2026-08-10 13:00:00', $this->wall($window->returnAt));
    }

    private function at(string $datetime): Carbon
    {
        return BusinessDateTime::parseInAppTimezone($datetime);
    }

    private function day(string $date): Carbon
    {
        return BusinessDateTime::parseRentalDate($date);
    }

    /** Hora de pared de la escuela, que es lo que ve el cliente y guarda la BD. */
    private function wall(DateTimeInterface $date): string
    {
        return BusinessDateTime::toDatabaseString($date);
    }
}
