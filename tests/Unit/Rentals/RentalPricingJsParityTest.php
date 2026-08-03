<?php

declare(strict_types=1);

namespace Tests\Unit\Rentals;

use App\Models\PriceSchema;
use App\Services\BookingService;
use Database\Factories\PriceSchemaFactory;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;
use Tests\TestCase;

/**
 * Paridad del precio de alquiler entre PHP (SSOT) y su espejo JS.
 *
 * tests/Fixtures/rental-pricing-cases.json es el contrato compartido: PHP lo
 * verifica siempre y, si hay Node disponible, además ejecuta
 * tests/Js/rental-pricing-parity.mjs para comparar con el cálculo real del
 * cliente. Tocar solo un lado (packs o algoritmo) rompe este test.
 */
class RentalPricingJsParityTest extends TestCase
{
    private BookingService $service;

    /** @var array{pricing_step_minutes: int, schema: array<string, float>, cases: list<array{minutes: int, expected: float}>} */
    private array $fixture;

    protected function setUp(): void
    {
        parent::setUp();

        $this->fixture = json_decode(
            (string) file_get_contents(base_path('tests/Fixtures/rental-pricing-cases.json')),
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        config(['rentals.pricing_step_minutes' => $this->fixture['pricing_step_minutes']]);

        $this->service = app(BookingService::class);
    }

    #[Test]
    public function el_fixture_usa_la_tarifa_y_el_paso_del_proyecto(): void
    {
        $this->assertSame(
            array_map('floatval', PriceSchemaFactory::SOFTBOARD_PACKS),
            array_map('floatval', $this->fixture['schema']),
            'El esquema del fixture debe seguir la tarifa de referencia de las factories.',
        );
        $this->assertSame(
            (int) config('rentals.pricing_step_minutes'),
            $this->fixture['pricing_step_minutes'],
        );
    }

    #[Test]
    public function php_calcula_los_precios_esperados_del_contrato(): void
    {
        $schema = $this->schema();

        foreach ($this->fixture['cases'] as $case) {
            $this->assertSame(
                (float) $case['expected'],
                $this->service->priceForMinutes($schema, (int) $case['minutes']),
                sprintf('%d min: %s', $case['minutes'], $case['why'] ?? ''),
            );
        }
    }

    #[Test]
    public function el_espejo_js_calcula_exactamente_lo_mismo(): void
    {
        $result = $this->runJsMirror();
        $schema = $this->schema();

        $this->assertSame(PriceSchema::MINUTE_PACKS, $result['minute_packs'], 'Packs de minutos desalineados.');
        $this->assertSame(PriceSchema::DAY_PACKS, $result['day_packs'], 'Packs de días desalineados.');
        $this->assertSame((int) config('rentals.pricing_step_minutes'), (int) $result['pricing_step_minutes']);
        $this->assertSame(
            $schema->getSellablePacksByMinutes(),
            array_map('floatval', $result['sellable_packs']),
        );

        foreach ($result['prices'] as $index => $row) {
            $minutes = (int) $row['minutes'];
            $this->assertSame(
                $this->service->priceForMinutes($schema, $minutes),
                (float) $row['price'],
                "El precio JS de {$minutes} min no coincide con PHP.",
            );
            $this->assertSame((int) $this->fixture['cases'][$index]['minutes'], $minutes);
        }
    }

    /**
     * @return array{pricing_step_minutes: int, minute_packs: array<int, string>, day_packs: array<int, string>, sellable_packs: array<int, float>, prices: list<array{minutes: int, price: float}>}
     */
    private function runJsMirror(): array
    {
        $node = (new ExecutableFinder)->find('node');

        if ($node === null) {
            $this->markTestSkipped('Node no disponible: la paridad JS queda sin comprobar en este entorno.');
        }

        $process = new Process([$node, base_path('tests/Js/rental-pricing-parity.mjs')], base_path());
        $process->setTimeout(60);
        $process->run();

        $this->assertTrue(
            $process->isSuccessful(),
            'No se pudo ejecutar el espejo JS: '.$process->getErrorOutput(),
        );

        return json_decode($process->getOutput(), true, flags: JSON_THROW_ON_ERROR);
    }

    private function schema(): PriceSchema
    {
        return PriceSchema::factory()->make($this->fixture['schema']);
    }
}
