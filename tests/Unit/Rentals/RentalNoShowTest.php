<?php

declare(strict_types=1);

namespace Tests\Unit\Rentals;

use App\Models\Booking;
use App\Services\BookingService;
use App\Support\BusinessDateTime;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Regla de no-show TAL Y COMO ESTÁ HOY: se protege solo el alquiler prepagado
 * entero (deposit_amount >= total_price). Con la señal del 30 % eso casi nunca
 * ocurre, así que una reserva confirmada con señal SÍ es candidata a liberarse.
 * Si el negocio decide proteger también la señal, este test debe cambiar antes
 * de encender el barrido automático.
 */
class RentalNoShowTest extends TestCase
{
    private BookingService $service;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.academy.business_timezone' => 'Europe/Madrid',
            'rentals.no_show_grace_minutes' => 30,
        ]);

        $this->service = app(BookingService::class);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    #[Test]
    public function dentro_del_margen_de_cortesia_no_hay_no_show(): void
    {
        $booking = $this->booking();

        $this->assertFalse($this->service->isNoShow($booking, $this->at('2026-08-10 10:20:00')));
        // El límite exacto todavía no es no-show.
        $this->assertFalse($this->service->isNoShow($booking, $this->at('2026-08-10 10:30:00')));
    }

    #[Test]
    public function pasado_el_margen_sin_recoger_hay_no_show(): void
    {
        $this->assertTrue(
            $this->service->isNoShow($this->booking(), $this->at('2026-08-10 10:31:00'))
        );
    }

    #[Test]
    public function el_margen_de_cortesia_sale_de_config(): void
    {
        config(['rentals.no_show_grace_minutes' => 90]);

        $this->assertFalse(
            app(BookingService::class)->isNoShow($this->booking(), $this->at('2026-08-10 11:00:00'))
        );
    }

    #[Test]
    public function una_recogida_registrada_cancela_el_no_show(): void
    {
        $booking = $this->booking(['picked_up_at' => '2026-08-10 10:25:00']);

        $this->assertFalse($this->service->isNoShow($booking, $this->at('2026-08-10 12:00:00')));
    }

    #[Test]
    public function el_alquiler_prepagado_entero_no_se_libera(): void
    {
        $booking = $this->booking([
            'status' => Booking::STATUS_CONFIRMED,
            'payment_status' => Booking::PAYMENT_CONFIRMED,
            'total_price' => 16,
            'deposit_amount' => 16,
        ]);

        $this->assertTrue($booking->isRentalFullyPaid());
        $this->assertFalse($this->service->isNoShow($booking, $this->at('2026-08-10 12:00:00')));
    }

    #[Test]
    public function la_senal_del_30_por_ciento_no_protege_hoy(): void
    {
        // Comportamiento ACTUAL, pendiente de decisión de producto.
        $booking = $this->booking([
            'status' => Booking::STATUS_CONFIRMED,
            'payment_status' => Booking::PAYMENT_CONFIRMED,
            'total_price' => 16,
            'deposit_amount' => 4.8,
        ]);

        $this->assertFalse($booking->isRentalFullyPaid());
        $this->assertTrue($this->service->isNoShow($booking, $this->at('2026-08-10 12:00:00')));
    }

    #[Test]
    public function una_reserva_cancelada_o_ya_liberada_no_vuelve_a_ser_no_show(): void
    {
        $cancelada = $this->booking(['status' => Booking::STATUS_CANCELLED]);
        $liberada = $this->booking(['no_show_at' => '2026-08-10 10:31:00']);

        $this->assertFalse($this->service->isNoShow($cancelada, $this->at('2026-08-10 12:00:00')));
        $this->assertFalse($this->service->isNoShow($liberada, $this->at('2026-08-10 12:00:00')));
    }

    #[Test]
    public function sin_ventana_no_se_puede_juzgar_el_no_show(): void
    {
        $booking = new Booking;
        $booking->status = Booking::STATUS_PENDING;

        $this->assertFalse($this->service->isNoShow($booking, $this->at('2026-08-10 12:00:00')));
    }

    #[Test]
    public function una_reserva_legacy_sin_pickup_usa_start_date(): void
    {
        $booking = new Booking;
        $booking->status = Booking::STATUS_PENDING;
        $booking->start_date = '2026-08-10 10:00:00';
        $booking->end_date = '2026-08-10 12:00:00';

        $this->assertFalse($this->service->isNoShow($booking, $this->at('2026-08-10 10:20:00')));
        $this->assertTrue($this->service->isNoShow($booking, $this->at('2026-08-10 10:31:00')));
    }

    #[Test]
    public function sin_referencia_temporal_se_usa_el_reloj_de_la_escuela(): void
    {
        $booking = $this->booking();

        Carbon::setTestNow(BusinessDateTime::parseInAppTimezone('2026-08-10 10:20:00'));
        $this->assertFalse($this->service->isNoShow($booking));

        Carbon::setTestNow(BusinessDateTime::parseInAppTimezone('2026-08-10 10:45:00'));
        $this->assertTrue($this->service->isNoShow($booking));
    }

    #[Test]
    public function el_barrido_automatico_sigue_desactivado(): void
    {
        // Guardia del despliegue: el cron no debe encenderse sin la decisión de pago.
        $this->assertFalse(config('rentals.no_show_release_enabled'));
        $this->assertFalse(app(BookingService::class)->isNoShowSweepEnabled());
    }

    #[Test]
    public function marcar_recogida_rechaza_sin_pago_confirmado(): void
    {
        // El guard lanza antes de tocar forceFill/save, así que no hace falta BD.
        $booking = $this->booking(['payment_status' => Booking::PAYMENT_PENDING]);

        $this->expectException(\InvalidArgumentException::class);

        $this->service->markPickedUp($booking, $this->at('2026-08-10 10:05:00'));
    }

    /**
     * Reserva sin persistir: pendiente, con señal sin cobrar y recogida a las 10:00.
     *
     * @param  array<string, mixed>  $attributes
     */
    private function booking(array $attributes = []): Booking
    {
        $booking = new Booking;
        $booking->forceFill(array_merge([
            'status' => Booking::STATUS_PENDING,
            'payment_status' => Booking::PAYMENT_PENDING,
            'total_price' => 16,
            'deposit_amount' => 4.8,
            'pickup_at' => '2026-08-10 10:00:00',
            'return_at' => '2026-08-10 12:00:00',
            'block_end' => '2026-08-10 12:30:00',
        ], $attributes));

        return $booking;
    }

    private function at(string $datetime): Carbon
    {
        return BusinessDateTime::parseInAppTimezone($datetime);
    }
}
