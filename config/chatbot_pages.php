<?php

declare(strict_types=1);

/**
 * Páginas explicativas públicas de la web — fuente del catálogo FAQ/Gemini del chatbot.
 * Edita summary/keywords/patterns aquí; no hace falta tocar JSX ni código PHP.
 *
 * @return array{pages: list<array{
 *     key: string,
 *     title: string,
 *     path: string,
 *     summary: string,
 *     keywords: string,
 *     patterns: list<string>,
 *     priority?: int
 * }>}
 */
return [
    'pages' => [
        [
            'key' => 'nosotros',
            'title' => 'Nosotros — San Sebastián Surf School',
            'path' => '/nosotros',
            'summary' => 'Quiénes somos: escuela de surf en Zurriola, club a pie de playa con taquillas, secadero, duchas, zona de entrenamiento y comunidad de socios S4.',
            'keywords' => 'escuela historia club instalaciones taquillas duchas secadero zurriola donostia socios comunidad concha',
            'patterns' => [
                '/\b(quienes\s+sois|quien\s+sois|sobre\s+nosotros|historia\s+de\s+la\s+escuela)\b/u',
                '/\b(instalaciones|club\s+s4|la\s+concha|ocean\s+club)\b.*\b(surf|taquilla|ducha|secadero)\b/u',
                '/\b(nosotros|conocer\s+la\s+escuela|que\s+es\s+s4)\b/u',
            ],
            'priority' => 5,
        ],
        [
            'key' => 'reparacion-tablas',
            'title' => 'Reparación de tablas con Edy Mulder',
            'path' => '/servicios',
            'summary' => 'Servicio de reparación en el club: anota tu taquilla en la pizarra, marca toques con cinta azul, Edy recoge y devuelve la tabla con pegatina de precio; pagas por Bizum o buzón en el local.',
            'keywords' => 'edy mulder pizarra cinta azul buzon pegatina shaper taller tabla surfboard arreglo golpe',
            'patterns' => [
                '/\b(edy|mulder|pizarra|cinta\s+azul|buzon|pegatina)\b/u',
                '/\b(repar\w*|arregl\w*)\b.*\b(tabla|surfboard|tablas)\b.*\b(club|taquilla|servicio|edy)\b/u',
                '/\b(repar\w*|arregl\w*)\b.*\b(tabla|surfboard|tablas)\b/u',
                '/\b(servicio)\b.*\b(repar\w*|arregl\w*)\b.*\b(tabla|tablas)\b/u',
            ],
            'priority' => 10,
        ],
        [
            'key' => 'reparacion-neoprenos',
            'title' => 'Reparación de neoprenos (Willy)',
            'path' => '/servicios/reparacion-neoprenos',
            'summary' => 'Reparación de trajes de neopreno del club: deja el traje en la percha indicada; Willy recoge, repara y devuelve. Puedes consultarle antes por WhatsApp o email.',
            'keywords' => 'willy neopreno traje wetsuit percha reparacion costura rotura',
            'patterns' => [
                '/\b(willy|neopreno|traje|wetsuit)\b.*\b(repar\w*|arregl\w*|rotura|costura)\b/u',
                '/\b(repar\w*|arregl\w*)\b.*\b(neopreno|traje|wetsuit)\b/u',
                '/\b(percha)\b.*\b(neopreno|traje)\b/u',
            ],
            'priority' => 10,
        ],
        [
            'key' => 'clases-surf',
            'title' => 'Clases de surf',
            'path' => '/servicios/surf',
            'summary' => 'Información sobre clases de surf en Zurriola: niveles, modalidades y cómo empezar. Para reservar entra en Academia en la web.',
            'keywords' => 'clases surf zurriola iniciacion intermedio avanzado modalidades',
            'patterns' => [
                '/\b(clases?\s+de\s+surf|informacion\s+sobre\s+clases)\b/u',
                '/\b(servicio)\b.*\b(clases?\s+de\s+surf)\b/u',
            ],
            'priority' => 3,
        ],
        [
            'key' => 'auctions',
            'title' => 'Subastas S4',
            'path' => '/subastas',
            'summary' => 'Subastas de material surf para socios VIP o con taquilla: pujas online y pago con tarjeta al ganar.',
            'keywords' => 'subasta puja tabla neopreno equipamiento surf',
            'patterns' => [
                '/\b(subasta|subastas|puja|pujar)\b/u',
            ],
            'priority' => 5,
        ],
        [
            'key' => 'surf-skate',
            'title' => 'Surf Skate',
            'path' => '/servicios/surf-skate',
            'summary' => 'Entrenamiento en surf skate para mejorar técnica fuera del agua; sesiones en el club S4.',
            'keywords' => 'surf skate sk8 entrenamiento tierra carver',
            'patterns' => [
                '/\b(surf\s*skate|surfskate)\b/u',
            ],
            'priority' => 5,
        ],
        [
            'key' => 'surf-skate-guia',
            'title' => 'Guía surfskate · altura y peso',
            'path' => '/servicios/surf-skate/guia-equipamiento',
            'summary' => 'Guía para elegir surfskate YOW según altura, peso y estilo; tabla de medidas y modelos recomendados (S4).',
            'keywords' => 'surfskate guia tabla altura peso yow meraki wheelbase equipamiento',
            'patterns' => [
                '/\b(surfskate|surf\s*skate).*(guia|tabla|altura|peso|equipamiento|yow|meraki)\b/u',
                '/\b(que\s+surfskate|cual\s+surfskate|elegir\s+surfskate)\b/u',
            ],
            'priority' => 4,
        ],
        [
            'key' => 'surf-trips',
            'title' => 'Surf Trips',
            'path' => '/servicios/surf-trips',
            'summary' => 'Viajes y salidas de surf organizadas por la escuela; destinos y fechas según temporada.',
            'keywords' => 'surf trip viaje salida destino organizado',
            'patterns' => [
                '/\b(surf\s*trip|surf\s*trips|viaje\s+de\s+surf|salida\s+de\s+surf)\b/u',
            ],
            'priority' => 5,
        ],
        [
            'key' => 'fotografia',
            'title' => 'Fotografía en el agua',
            'path' => '/servicios/fotos',
            'summary' => 'Servicio de fotografía de surf en sesión; captura tu evolución en el agua.',
            'keywords' => 'fotos fotografia sesion water photographer',
            'patterns' => [
                '/\b(fotos?|fotografia|fotografo)\b.*\b(surf|sesion|agua)\b/u',
            ],
            'priority' => 4,
        ],
        [
            'key' => 'videograbaciones',
            'title' => 'Videograbaciones',
            'path' => '/servicios/videograbaciones',
            'summary' => 'Grabación en vídeo de tus olas y sesiones para análisis o recuerdo.',
            'keywords' => 'video videograbacion grabacion filmacion olas',
            'patterns' => [
                '/\b(video|videos|videograbacion|grabacion)\b.*\b(surf|olas|sesion)\b/u',
            ],
            'priority' => 4,
        ],
        [
            'key' => 'webcams',
            'title' => 'Webcams de la playa',
            'path' => '/servicios/webcams',
            'summary' => 'Cámaras en directo de Zurriola y alrededores para consultar el estado del mar antes de salir.',
            'keywords' => 'webcam camara directo zurriola estado mar oleaje',
            'patterns' => [
                '/\b(webcam|webcams|camara\s+en\s+vivo|camara\s+directo)\b/u',
                '/\b(ver\s+el\s+mar|estado\s+del\s+mar)\b.*\b(zurriola|playa|camara)\b/u',
            ],
            'priority' => 5,
        ],
        [
            'key' => 'taquillas',
            'title' => 'Planes y cuotas de taquillas',
            'path' => '/taquillas/planes-y-cuotas',
            'summary' => 'Planes de taquilla del club: guarda tu material en Zurriola, servicios para socios (secadero, duchas, reparaciones, café…).',
            'keywords' => 'taquilla taquillas plan socio cuota mensual anual rack guardar tabla',
            'patterns' => [
                '/\b(plan|planes|cuota|cuotas|hacerme\s+socio)\b.*\b(taquilla|taquillas)\b/u',
                '/\b(taquilla|taquillas)\b.*\b(plan|planes|socio|socios|contratar|info|informacion)\b/u',
                '/\b(que\s+incluye|servicios)\b.*\b(taquilla|socio)\b/u',
            ],
            'priority' => 6,
        ],
        [
            'key' => 'segunda-mano',
            'title' => 'Tablas de segunda mano',
            'path' => '/segunda-mano',
            'summary' => 'Catálogo público de tablas de surf de segunda mano publicadas por socios y la escuela.',
            'keywords' => 'segunda mano usada ocasion comprar vender tabla',
            'patterns' => [
                '/\b(segunda\s+mano|tabla\s+usada|tablas\s+usadas|ocasion)\b/u',
            ],
            'priority' => 5,
        ],
        [
            'key' => 'alquiler-tablas',
            'title' => 'Alquiler de tablas',
            'path' => '/tablas-alquiler',
            'summary' => 'Alquila tabla por horas o días; elige modelo y fechas en la web. Señal del 30% al reservar.',
            'keywords' => 'alquiler alquilar rentar tabla surfboard soft hard',
            'patterns' => [
                '/\b(alquiler|alquilar|rentar)\b.*\b(tabla|tablas|surfboard)\b/u',
                '/\b(tabla|tablas)\b.*\b(alquiler|alquilar|rentar)\b/u',
            ],
            'priority' => 4,
        ],
        [
            'key' => 'tienda',
            'title' => 'Tienda oficial S4',
            'path' => '/tienda',
            'summary' => 'Tienda online de productos oficiales de la escuela.',
            'keywords' => 'tienda comprar producto merchandising oficial',
            'patterns' => [
                '/\b(tienda|tienda\s+oficial|comprar\s+producto)\b/u',
            ],
            'priority' => 3,
        ],
        [
            'key' => 'contacto',
            'title' => 'Contacto',
            'path' => '/contacto',
            'summary' => 'Formulario de contacto y canales para escribir a la escuela si prefieres no usar el chat.',
            'keywords' => 'contacto formulario escribir mensaje',
            'patterns' => [
                '/\b(formulario\s+de\s+contacto|pagina\s+de\s+contacto|enviar\s+mensaje)\b/u',
            ],
            'priority' => 4,
        ],
        [
            'key' => 'comparador-surf',
            'title' => 'Comparador de maniobras (AutoCoach)',
            'path' => '/comparador-surf',
            'summary' => 'Herramienta para comparar tu vídeo con referencias de maniobras y posturas.',
            'keywords' => 'comparador autocoach maniobra video analisis postura',
            'patterns' => [
                '/\b(comparador|autocoach|comparar\s+maniobra)\b/u',
            ],
            'priority' => 4,
        ],
        [
            'key' => 'taller-index',
            'title' => 'Taller de Surf — blog y guías',
            'path' => '/taller',
            'summary' => 'Índice de artículos y guías prácticas sobre surf, material y seguridad.',
            'keywords' => 'taller blog guias articulos leer aprender',
            'patterns' => [
                '/\b(taller\s+de\s+surf|blog|guias\s+de\s+surf)\b/u',
                '/\b(articulos?|leer\s+sobre)\b.*\b(surf|tabla|olas)\b/u',
            ],
            'priority' => 2,
        ],
    ],
];
