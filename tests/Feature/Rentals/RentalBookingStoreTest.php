<?php

declare(strict_types=1);

use App\Models\Booking;
use App\Models\PriceSchema;
use App\Models\Surfboard;
use App\Models\User;
use App\Services\BookingService;
use App\Support\BusinessDateTime;
use Stripe\ApiRequestor;
use Stripe\HttpClient\ClientInterface;

/**
 * Integridad del alta de reservas: ni tablas retiradas ni reservas fantasma
 * bloqueando inventario cuando el cobro no llega a abrirse.
 */
beforeEach(function () {
    config([
        'services.academy.business_timezone' => 'Europe/Madrid',
        'services.stripe.secret' => 'sk_test_fake',
        'rentals.turnover_buffer_minutes' => 30,
        'rentals.pickup_window_start' => '09:00',
        'rentals.pickup_window_end' => '19:00',
        'rentals.pricing_step_minutes' => 30,
        'rentals.deposit_percentage' => 30,
    ]);

    $this->board = Surfboard::factory()->create();
});

afterEach(function () {
    ApiRequestor::setHttpClient(null);
});

/**
 * @return array<string, mixed>
 */
function rentalStorePayload(int $surfboardId): array
{
    return [
        'surfboard_id' => $surfboardId,
        'client_name' => 'Ane Test',
        'client_email' => 'ane@example.com',
        'mode' => 'hour',
        'pack_minutes' => 120,
        'pickup_at' => '2026-08-12T10:00',
        'start_date' => '2026-08-12',
    ];
}

/** Stripe responde una sesión de Checkout válida sin salir a la red. */
function fakeStripeCheckout(string $url): void
{
    ApiRequestor::setHttpClient(new class($url) implements ClientInterface
    {
        public function __construct(private string $url) {}

        public function request($method, $absUrl, $headers, $params, $hasFile, $apiMode = 'v1', $maxNetworkRetries = null)
        {
            return [
                json_encode([
                    'id' => 'cs_test_reserva',
                    'object' => 'checkout.session',
                    'url' => $this->url,
                ]),
                200,
                [],
            ];
        }
    });
}

// ── Tablas retiradas del alquiler ─────────────────────────────

test('la ficha pública de una tabla retirada no existe', function () {
    $retirada = Surfboard::factory()->create(['is_active' => false]);

    $this->get(route('rentals.surfboards.show', $this->board))->assertOk();
    $this->get(route('rentals.surfboards.show', $retirada))->assertNotFound();
});

test('el formulario público no acepta una tabla retirada', function () {
    $retirada = Surfboard::factory()->create(['is_active' => false]);

    $this->post(route('rentals.bookings.store'), rentalStorePayload($retirada->id))
        ->assertSessionHasErrors('surfboard_id');

    expect(Booking::query()->count())->toBe(0);
});

test('el mostrador tampoco reserva una tabla retirada', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $retirada = Surfboard::factory()->create(['is_active' => false]);

    $this->actingAs($admin)
        ->post(route('admin.bookings.store'), rentalStorePayload($retirada->id))
        ->assertSessionHasErrors('surfboard_id');

    expect(Booking::query()->count())->toBe(0);
});

test('el servicio rechaza la reserva si la tabla se retira mientras el cliente rellena el formulario', function () {
    $service = app(BookingService::class);
    $window = $service->normalizeHourWindow(BusinessDateTime::parseInAppTimezone('2026-08-12 10:00:00'), 120);

    // La ficha del cliente ya está cargada (is_active true en memoria) cuando el
    // admin retira la tabla: la guarda vive dentro del lock, no en el modelo.
    Surfboard::query()->whereKey($this->board->id)->update(['is_active' => false]);

    expect(fn () => $service->createPendingBooking($this->board, $window, ['client_name' => 'Ane Test']))
        ->toThrow(InvalidArgumentException::class, 'Esta tabla está retirada del alquiler.');

    expect(Booking::query()->count())->toBe(0);
});

// ── Fallo de pasarela ─────────────────────────────────────────

test('si falla la pasarela la reserva no se queda bloqueando la tabla', function () {
    // Stripe sin configurar: createCheckoutSession lanza RuntimeException.
    config(['services.stripe.secret' => '']);

    $this->post(route('rentals.bookings.store'), rentalStorePayload($this->board->id))
        ->assertSessionHasErrors('payment');

    $booking = Booking::query()->sole();
    expect($booking->status)->toBe(Booking::STATUS_CANCELLED);
    expect($booking->admin_notes)->toContain('Stripe');
    expect(Booking::query()->blocking()->count())->toBe(0);

    expect(app(BookingService::class)->checkAvailability(
        $this->board->id,
        BusinessDateTime::parseInAppTimezone('2026-08-12 10:00:00'),
        BusinessDateTime::parseInAppTimezone('2026-08-12 12:30:00'),
    ))->toBeTrue();
});

test('una tarifa sin precio no deja reservas fantasma', function () {
    $sinTarifa = Surfboard::factory()->create([
        'price_schema_id' => PriceSchema::factory()->onlyPacks([])->create()->id,
    ]);

    $this->post(route('rentals.bookings.store'), rentalStorePayload($sinTarifa->id))
        ->assertSessionHasErrors('start_date');

    expect(Booking::query()->blocking()->count())->toBe(0);
});

// ── Camino feliz ──────────────────────────────────────────────

test('con la pasarela disponible la reserva queda pendiente y bloquea la tabla', function () {
    fakeStripeCheckout('https://checkout.stripe.test/c/pay/cs_test_reserva');

    $this->post(route('rentals.bookings.store'), rentalStorePayload($this->board->id))
        ->assertRedirect('https://checkout.stripe.test/c/pay/cs_test_reserva');

    $booking = Booking::query()->sole();
    expect($booking->status)->toBe(Booking::STATUS_PENDING);
    expect($booking->payment_status)->toBe(Booking::PAYMENT_PENDING);
    expect((float) $booking->total_price)->toBe(16.0);
    expect((float) $booking->deposit_amount)->toBe(4.8);
    expect($booking->pickup_at->format('Y-m-d H:i'))->toBe('2026-08-12 10:00');
    expect($booking->block_end->format('H:i'))->toBe('12:30');
    expect(Booking::query()->blocking()->count())->toBe(1);

    // Va directa a Stripe: caducidad corta, no los 7 días del flujo manual de admin.
    $minutesUntilExpiry = BusinessDateTime::now()->diffInMinutes($booking->expires_at, false);
    expect($minutesUntilExpiry)->toBeGreaterThanOrEqual(44)->toBeLessThanOrEqual(45);
});
