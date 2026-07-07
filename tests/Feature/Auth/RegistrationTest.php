<?php

test('registration screen can be rendered', function () {
    $response = $this->get('/register');

    $response->assertStatus(200);
});

test('new users can register', function () {
    $response = $this->post('/register', [
        'nombre' => 'Test',
        'apellido' => 'User',
        'email' => 'test@example.com',
        'telefono' => '600000000',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('Pag_principal', absolute: false));
});
