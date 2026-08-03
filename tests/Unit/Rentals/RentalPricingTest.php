<?php

declare(strict_types=1);

namespace Tests\Unit\Rentals;

use App\Models\PriceSchema;
use App\Services\BookingService;
use App\Support\BusinessDateTime;
use Database\Factories\PriceSchemaFactory;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Contrato de precios del alquiler: el DP de BookingService cubre los minutos
 * cobrados con la combinación de packs más barata. Sin BD: el esquema se
 * construye en memoria para que la tarifa del test no dependa del seeder.
 */
class RentalPricingTest extends TestCase
{
    private BookingService $service;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'rentals.pricing_step_minutes' => 30,
            'rentals.deposit_percentage' => 30,
            'services.academy.business_timezone' => 'Europe/Madrid',
        ]);

        $this->service = app(BookingService::class);
    }

    /** @return array<string, array{int, float}> */
    public static function packsDeMinutos(): array
    {
        return [
            '1 h' => [60, 10.0],
            '1,5 h' => [90, 13.0],
            '2 h' => [120, 16.0],
            '3 h' => [180, 20.0],
            '4 h' => [240, 24.0],
            '6 h' => [360, 30.0],
        ];
    }

    /** @return array<string, array{int, float}> */
    public static function packsDeDias(): array
    {
        return [
            '1 día' => [1, 35.0],
            '2 días' => [2, 60.0],
            '3 días' => [3, 80.0],
            '4 días' => [4, 95.0],
            '5 días' => [5, 110.0],
            'semana' => [7, 140.0],
        ];
    }

    #[Test]
    #[DataProvider('packsDeMinutos')]
    public function cada_pack_de_minutos_cuesta_su_tarifa(int $minutes, float $expected): void
    {
        $this->assertSame($expected, $this->service->priceForMinutes($this->softSchema(), $minutes));
    }

    #[Test]
    #[DataProvider('packsDeDias')]
    public function cada_pack_de_dias_cuesta_su_tarifa(int $days, float $expected): void
    {
        $this->assertSame(
            $expected,
            $this->service->priceForMinutes($this->softSchema(), $days * PriceSchema::MINUTES_PER_DAY),
        );
    }

    #[Test]
    public function un_tramo_suelto_paga_el_pack_completo(): void
    {
        $schema = $this->softSchema();

        // Regla de mostrador: el pack sobra pero se cobra entero.
        $this->assertSame(10.0, $this->service->priceForMinutes($schema, 30));
        $this->assertSame(10.0, $this->service->priceForMinutes($schema, 45));
        $this->assertSame(16.0, $this->service->priceForMinutes($schema, 100));
    }

    #[Test]
    public function el_pack_largo_gana_cuando_componer_sale_mas_caro(): void
    {
        $schema = $this->softSchema();

        // 5 h: 6 h (30 €) por debajo de 4 h + 1 h (34 €).
        $this->assertSame(30.0, $this->service->priceForMinutes($schema, 300));
        // 7 h: el día completo (35 €) por debajo de 6 h + 1 h (40 €).
        $this->assertSame(35.0, $this->service->priceForMinutes($schema, 420));
        // 6 días: la semana (140 €) por debajo de 5 d + 1 d (145 €).
        $this->assertSame(140.0, $this->service->priceForMinutes($schema, 6 * PriceSchema::MINUTES_PER_DAY));
    }

    #[Test]
    public function mas_de_una_semana_compone_semana_mas_dias(): void
    {
        $this->assertSame(
            175.0,
            $this->service->priceForMinutes($this->softSchema(), 8 * PriceSchema::MINUTES_PER_DAY),
        );
    }

    #[Test]
    public function un_pack_a_cero_no_se_oferta(): void
    {
        // Solo hay pack de 1 h: 2,5 h se cubren con tres packs de 1 h.
        $schema = PriceSchema::factory()->onlyPacks(['price_60m' => 10])->make();

        $this->assertSame([60 => 10.0], $schema->getSellablePacksByMinutes());
        $this->assertSame(30.0, $this->service->priceForMinutes($schema, 150));
    }

    #[Test]
    public function sin_packs_vendibles_o_sin_minutos_el_precio_es_cero(): void
    {
        $this->assertSame(0.0, $this->service->priceForMinutes(PriceSchema::factory()->onlyPacks([])->make(), 120));
        $this->assertSame(0.0, $this->service->priceForMinutes($this->softSchema(), 0));
        $this->assertSame(0.0, $this->service->priceForMinutes($this->softSchema(), -60));
    }

    #[Test]
    public function calculate_best_price_redondea_al_alza_los_minutos_del_rango(): void
    {
        $schema = $this->softSchema();
        $start = BusinessDateTime::parseInAppTimezone('2026-08-10 10:00:00');

        $this->assertSame(16.0, $this->service->calculateBestPrice($schema, $start, $start->copy()->addMinutes(120)));
        // Un minuto de más ya es un tramo cobrable: el pack de 1 h.
        $this->assertSame(10.0, $this->service->calculateBestPrice($schema, $start, $start->copy()->addMinute()));
    }

    #[Test]
    public function la_senal_es_el_porcentaje_configurado_del_total(): void
    {
        $start = BusinessDateTime::parseInAppTimezone('2026-08-10 10:00:00');

        $pricing = $this->service->resolvePricing($this->softSchema(), $start, $start->copy()->addMinutes(120));

        $this->assertSame(16.0, $pricing['total_price']);
        $this->assertSame(4.8, $pricing['deposit_amount']);
    }

    /** Tarifa Softboards en memoria (misma que el seeder y las factories). */
    private function softSchema(): PriceSchema
    {
        return PriceSchema::factory()->make(PriceSchemaFactory::SOFTBOARD_PACKS);
    }
}
