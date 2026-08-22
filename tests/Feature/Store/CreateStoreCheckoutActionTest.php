<?php

declare(strict_types=1);

use App\Actions\Store\CreateStoreCheckoutAction;
use App\Contracts\Payments\StartsCheckout;
use App\DTOs\Payments\InitiatePaymentDto;
use App\DTOs\Store\CreateStoreCheckoutDto;
use App\Models\Carrito;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\User;

test('si Stripe abre sesión se vacía el carrito y queda el pedido pendiente', function () {
    $this->app->instance(StartsCheckout::class, new class implements StartsCheckout
    {
        public function execute(InitiatePaymentDto $dto): string
        {
            return 'https://checkout.stripe.test/ok';
        }
    });

    $user = User::factory()->create();
    $producto = Producto::factory()->create([
        'unidades' => 3,
        'precio' => 10,
        'descuento' => 0,
        'eliminado' => false,
    ]);
    $carrito = Carrito::query()->create(['user_id' => $user->id]);
    $carrito->productos()->attach($producto->id, ['cantidad' => 1]);

    $url = app(CreateStoreCheckoutAction::class)->execute(new CreateStoreCheckoutDto(
        userId: (int) $user->id,
        cartLines: [['id' => $producto->id, 'cantidad' => 1]],
        quotedTotalEuros: 10,
    ));

    expect($url)->toBe('https://checkout.stripe.test/ok')
        ->and(Carrito::query()->where('user_id', $user->id)->exists())->toBeFalse()
        ->and(Pedido::query()->where('user_id', $user->id)->where('pagado', false)->count())->toBe(1)
        ->and((int) $producto->fresh()->unidades)->toBe(2);
});

test('rechaza checkout si las líneas no coinciden con el carrito del usuario', function () {
    $this->app->instance(StartsCheckout::class, new class implements StartsCheckout
    {
        public function execute(InitiatePaymentDto $dto): string
        {
            return 'https://checkout.stripe.test/ok';
        }
    });

    $user = User::factory()->create();
    $enCarrito = Producto::factory()->create([
        'unidades' => 3,
        'precio' => 10,
        'descuento' => 0,
        'eliminado' => false,
    ]);
    $otro = Producto::factory()->create([
        'unidades' => 3,
        'precio' => 12,
        'descuento' => 0,
        'eliminado' => false,
    ]);
    $carrito = Carrito::query()->create(['user_id' => $user->id]);
    $carrito->productos()->attach($enCarrito->id, ['cantidad' => 1]);

    expect(fn () => app(CreateStoreCheckoutAction::class)->execute(new CreateStoreCheckoutDto(
        userId: (int) $user->id,
        cartLines: [['id' => $otro->id, 'cantidad' => 1]],
        quotedTotalEuros: 12,
    )))->toThrow(InvalidArgumentException::class, 'carrito');
});

test('rechaza checkout si la cantidad no coincide con el carrito', function () {
    $user = User::factory()->create();
    $producto = Producto::factory()->create([
        'unidades' => 5,
        'precio' => 10,
        'descuento' => 0,
        'eliminado' => false,
    ]);
    $carrito = Carrito::query()->create(['user_id' => $user->id]);
    $carrito->productos()->attach($producto->id, ['cantidad' => 1]);

    expect(fn () => app(CreateStoreCheckoutAction::class)->execute(new CreateStoreCheckoutDto(
        userId: (int) $user->id,
        cartLines: [['id' => $producto->id, 'cantidad' => 2]],
        quotedTotalEuros: 20,
    )))->toThrow(InvalidArgumentException::class, 'carrito');
});

test('si Stripe falla se libera el stock y el carrito sigue', function () {
    $this->app->instance(StartsCheckout::class, new class implements StartsCheckout
    {
        public function execute(InitiatePaymentDto $dto): string
        {
            throw new RuntimeException('stripe down');
        }
    });

    $user = User::factory()->create();
    $producto = Producto::factory()->create([
        'unidades' => 2,
        'precio' => 8,
        'descuento' => 0,
        'eliminado' => false,
    ]);
    $carrito = Carrito::query()->create(['user_id' => $user->id]);
    $carrito->productos()->attach($producto->id, ['cantidad' => 1]);

    expect(fn () => app(CreateStoreCheckoutAction::class)->execute(new CreateStoreCheckoutDto(
        userId: (int) $user->id,
        cartLines: [['id' => $producto->id, 'cantidad' => 1]],
        quotedTotalEuros: 8,
    )))->toThrow(RuntimeException::class);

    expect((int) $producto->fresh()->unidades)->toBe(2)
        ->and(Carrito::query()->where('user_id', $user->id)->exists())->toBeTrue()
        ->and(Pedido::query()->where('user_id', $user->id)->exists())->toBeFalse();
});
