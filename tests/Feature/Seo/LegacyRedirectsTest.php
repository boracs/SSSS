<?php

declare(strict_types=1);

/**
 * Las URLs públicas antiguas deben redirigir con 301 permanente: con 302 Google
 * mantiene la vieja indexada y no consolida las señales en la nueva, justo lo
 * contrario de lo que busca el plan de migración de dominio.
 */
dataset('legacy_urls', [
    ['/tienda-oficial', '/tienda'],
    ['/webcams', '/servicios/webcams'],
    ['/clases-de-surf', '/servicios/surf'],
    ['/surftrips', '/servicios/surf-trips'],
    ['/surfskate', '/servicios/surf-skate'],
    ['/surfskate/guia', '/servicios/surf-skate/guia-equipamiento'],
    ['/taquillas', '/servicios/taquillas'],
    ['/taquillas/planes-y-cuotas', '/servicios/taquillas'],
]);

test('las URLs legacy redirigen con 301 al destino actual', function (string $from, string $to) {
    $this->get($from)
        ->assertStatus(301)
        ->assertRedirect($to);
})->with('legacy_urls');
