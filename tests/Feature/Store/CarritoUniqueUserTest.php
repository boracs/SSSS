<?php

declare(strict_types=1);

use App\Models\Carrito;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;

test('un usuario no puede tener dos carritos', function () {
    $user = User::factory()->create();
    Carrito::query()->create(['user_id' => $user->id]);

    expect(fn () => Carrito::query()->create(['user_id' => $user->id]))
        ->toThrow(UniqueConstraintViolationException::class);
});

test('forUser reutiliza el único carrito del usuario', function () {
    $user = User::factory()->create();

    $primero = Carrito::forUser((int) $user->id);
    $segundo = Carrito::forUser((int) $user->id);

    expect($primero->id)->toBe($segundo->id)
        ->and(Carrito::query()->where('user_id', $user->id)->count())->toBe(1);
});
