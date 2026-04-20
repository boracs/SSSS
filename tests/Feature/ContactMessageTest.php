<?php

use Illuminate\Support\Facades\Mail;

test('contact form validates required fields', function () {
    $response = $this->from('/contacto')->post(route('contacto.store'), [
        'name' => '',
        'email' => 'correo-invalido',
        'message' => 'corto',
    ]);

    $response->assertRedirect('/contacto');
    $response->assertSessionHasErrors(['name', 'email', 'message']);
});

test('contact form blocks honeypot spam', function () {
    $response = $this->from('/contacto')->post(route('contacto.store'), [
        'name' => 'Usuario Legitimo',
        'email' => 'usuario@gmail.com',
        'message' => 'Este mensaje debería fallar por honeypot.',
        'website' => 'https://spam.example',
    ]);

    $response->assertRedirect('/contacto');
    $response->assertSessionHasErrors(['website']);
});

test('contact form sends successfully with valid payload', function () {
    Mail::fake();

    $response = $this->from('/contacto')->post(route('contacto.store'), [
        'name' => 'Usuario Legitimo',
        'email' => 'usuario@gmail.com',
        'message' => 'Hola, quiero informacion sobre vuestros servicios premium de surf.',
        'website' => '',
    ]);

    $response->assertRedirect('/contacto');
    $response->assertSessionHasNoErrors();
    $response->assertSessionHas('success');
});

test('contact form enforces strict ip email rate limit', function () {
    Mail::fake();

    $payload = [
        'name' => 'Usuario Legitimo',
        'email' => 'usuario@gmail.com',
        'message' => 'Mensaje de prueba suficientemente largo para pasar validacion.',
        'website' => '',
    ];

    $this->post(route('contacto.store'), $payload)->assertRedirect();
    $this->post(route('contacto.store'), $payload)->assertRedirect();
    $this->post(route('contacto.store'), $payload)->assertRedirect();
    $this->post(route('contacto.store'), $payload)->assertStatus(429);
});
