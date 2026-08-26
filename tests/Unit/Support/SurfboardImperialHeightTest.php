<?php

declare(strict_types=1);

use App\Support\SurfboardImperialHeight;

test('convierte pies decimales a notación de tablas', function () {
    expect(SurfboardImperialHeight::label(5.83))->toBe("5'10\"")
        ->and(SurfboardImperialHeight::label(6.2))->toBe("6'2\"")
        ->and(SurfboardImperialHeight::label(6.0))->toBe("6'0\"")
        ->and(SurfboardImperialHeight::label(5.999))->toBe("6'0\"");
});

test('altura nula o inválida no se formatea', function () {
    expect(SurfboardImperialHeight::label(null))->toBeNull()
        ->and(SurfboardImperialHeight::label(-1))->toBeNull();
});
