<?php

declare(strict_types=1);

use App\Models\PhotoSession;
use App\Models\PhotoSessionBooking;
use App\Support\BusinessDateTime;
use Stripe\ApiRequestor;
use Stripe\HttpClient\ClientInterface;

beforeEach(function () {
    config([
        'services.academy.business_timezone' => 'Europe/Madrid',
        'services.stripe.secret' => 'sk_test_fake',
    ]);

    $this->session = PhotoSession::query()->create([
        'nombre' => 'Pack fotos test',
        'descripcion' => 'Test Stripe redirect',
        'precio_cents' => 5000,
        'plus_por_persona_cents' => 0,
        'duracion_minutos' => 60,
        'capacidad_maxima' => 5,
        'fotografo_user_id' => null,
        'activo' => true,
    ]);
});

afterEach(function () {
    ApiRequestor::setHttpClient(null);
});

function fakePhotoStripeCheckout(string $url): void
{
    ApiRequestor::setHttpClient(new class($url) implements ClientInterface
    {
        public function __construct(private string $url) {}

        public function request($method, $absUrl, $headers, $params, $hasFile, $apiMode = 'v1', $maxNetworkRetries = null)
        {
            return [
                json_encode([
                    'id' => 'cs_test_fotos',
                    'object' => 'checkout.session',
                    'url' => $this->url,
                ]),
                200,
                [],
            ];
        }
    });
}

/**
 * @return array<string, mixed>
 */
function photoBookPayload(int $sessionId): array
{
    return [
        'photo_session_id' => $sessionId,
        'fecha_inicio' => BusinessDateTime::now()->addDay()->setTime(10, 0)->toDateTimeString(),
        'party_size' => 1,
        'guest_first_name' => 'Ana',
        'guest_email' => 'ana@example.test',
    ];
}

test('reserva de fotos redirige a Stripe en petición clásica', function () {
    fakePhotoStripeCheckout('https://checkout.stripe.test/c/pay/cs_test_fotos');

    $this->post(route('servicios.fotos.book'), photoBookPayload($this->session->id))
        ->assertRedirect('https://checkout.stripe.test/c/pay/cs_test_fotos');

    expect(PhotoSessionBooking::query()->count())->toBe(1);
});

test('reserva de fotos devuelve X-Inertia-Location para Inertia', function () {
    fakePhotoStripeCheckout('https://checkout.stripe.test/c/pay/cs_test_fotos_inertia');

    $this->post(route('servicios.fotos.book'), photoBookPayload($this->session->id), [
        'X-Inertia' => 'true',
    ])
        ->assertStatus(409)
        ->assertHeader('X-Inertia-Location', 'https://checkout.stripe.test/c/pay/cs_test_fotos_inertia');
});
