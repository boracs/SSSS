<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Taquillas compartidas (descuento tienda sin casillero físico)
    |--------------------------------------------------------------------------
    |
    | Números que el administrador puede asignar manualmente a varios usuarios
    | (p. ej. VIP conocidos sin taquilla real). No bloquean ocupación entre sí.
    |
    */
    'shared_locker_numbers' => array_values(array_unique(array_map(
        'intval',
        array_filter(explode(',', (string) env('VIP_SHARED_LOCKER_NUMBERS', '500,600')))
    ))),

];
