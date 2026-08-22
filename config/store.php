<?php

declare(strict_types=1);

return [
    /*
    | Pedidos de tienda no pagados (checkout Stripe abandonado).
    | Por defecto 24 h: coincide con la caducidad típica de la sesión Stripe,
    | para no devolver stock mientras el cliente aún puede pagar.
    */
    'unpaid_hold_minutes' => (int) env('STORE_UNPAID_HOLD_MINUTES', 1440),

    /*
    | Slide fijo del banner promo (bono recomendado). Copy y precio editables
    | sin tocar el service.
    */
    'promo_bono' => [
        'eyebrow' => 'Oferta recomendados',
        'title_template' => '10 clases de 1,5 h por {price}',
        'subtitle' => 'Si vienes recomendado por un socio o alumno. Pregúntanos y te lo preparamos.',
        'cta_label' => 'Consultar oferta',
        'price_cents' => (int) env('STORE_PROMO_BONO_CENTS', 25000),
        'image' => '/img/store/promo-bono.webp',
        'route' => 'contacto',
    ],

    'promo_images' => [
        'auction' => '/img/store/promo-subasta.webp',
        'product' => '/img/store/promo-producto.webp',
    ],
];
