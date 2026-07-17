<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // ====================================================================
    // Gemini — usado por App\Services\Chatbot\GoogleAIService
    // ====================================================================
    'gemini' => [
        'key' => env('GEMINI_API_KEY'),
        // Modelo estable recomendado a fecha 2026; si Google lo retira, cambia
        // solo esta variable de entorno (sin tocar código).
        'model' => env('GEMINI_MODEL', 'gemini-2.5-flash'),
    ],

    /**
     * Parte S4 de Zurriola (oleaje/viento/energía + resumen diario por IA).
     *
     * ⚠️ ENTORNO DE PRUEBA: coordenadas y umbrales son un borrador de partida,
     * calibrado solo con 1 comprobación manual contra la webcam. Antes de
     * tratar esto como criterio oficial de la escuela, validar con el equipo
     * S4 al menos una semana de datos reales.
     */
    'zurriola_surf' => [
        // Punto marino frente a Zurriola (ajustado para que Open-Meteo no devuelva ceros
        // por precisión de coordenada — ver docs/surf-conditions/README.md si se recalibra).
        'latitude' => env('ZURRIOLA_SURF_LAT', 43.325),
        'longitude' => env('ZURRIOLA_SURF_LON', -1.975),
        'timezone' => env('ZURRIOLA_SURF_TZ', 'Europe/Madrid'),

        // Zurriola abre al N/NW: viento offshore (limpio) sopla aprox. desde el S.
        'offshore_wind_center_deg' => env('ZURRIOLA_OFFSHORE_WIND_CENTER_DEG', 180),
        'offshore_wind_arc_deg' => env('ZURRIOLA_OFFSHORE_WIND_ARC_DEG', 90),

        'energy_bands' => [
            ['max' => 3, 'label' => 'Suave'],
            ['max' => 8, 'label' => 'Moderado'],
            ['max' => 16, 'label' => 'Fuerte'],
            ['max' => PHP_FLOAT_MAX, 'label' => 'Muy fuerte'],
        ],

        'level_thresholds' => [
            'iniciacion' => ['max_wave_height_m' => 0.8, 'max_wind_kmh_onshore' => 15, 'max_wind_kmh_offshore' => 30],
            'intermedio' => ['max_wave_height_m' => 1.6, 'max_wind_kmh_onshore' => 25, 'max_wind_kmh_offshore' => 40],
            'avanzado' => ['max_wave_height_m' => 3.5, 'max_wind_kmh_onshore' => 35, 'max_wind_kmh_offshore' => 55],
        ],

        // Documento de verdad del spot (reglas de entrada, zonas, precauciones) que se
        // inyecta a Gemini como systemInstruction. Editable sin tocar código/desplegar.
        'guide_path' => env('ZURRIOLA_SURF_GUIDE_PATH', resource_path('surf-guide/zurriola-spot-guide.md')),

        // Reglas técnicas estructuradas del spot (viento por componente, energía en kJ
        // con zona/nivel recomendado, estrategia de marea, dirección de swell, periodo,
        // seguridad de corrientes...). Se inyecta junto a la guía como contexto adicional.
        'logistics_json_path' => env('ZURRIOLA_SURF_LOGISTICS_PATH', resource_path('surf-guide/zurriola-spot-logistics.json')),

        'generation_hour' => env('ZURRIOLA_SURF_GENERATION_HOUR', '07:00'),

        // Tabla de previsión multi-día (distinta del "parte de hoy" de arriba):
        // franjas horarias visibles (antes de la primera / después de la última es de noche,
        // no aporta para surfear) y días hacia adelante que soporta Open-Meteo con margen de fiabilidad.
        'forecast_days' => env('ZURRIOLA_FORECAST_DAYS', 3),
        'forecast_slot_hours' => [6, 9, 12, 15, 18, 21],

        // Viento por debajo de este umbral se considera "glassy" (sin apenas efecto),
        // sea cual sea su dirección.
        'wind_glassy_max_kmh' => env('ZURRIOLA_WIND_GLASSY_MAX_KMH', 8),

        // Rangos de color en la tabla de previsión (verde / amarillo / rojo).
        // Viento alineado con wind_north_component del JSON de logística (nudos → km/h).
        // Energía alineada con energy_kj del mismo JSON.
        'forecast_wind_color_kmh' => [
            'green_max' => 9,   // ≤ ~5 nudos
            'yellow_max' => 19, // ≤ ~10 nudos
        ],
        'forecast_energy_color_kj' => [
            'green_max' => 400,  // Pequeño a Medio e inferior
            'yellow_max' => 800, // Medio a Considerable
        ],
    ],

    'academy' => [
        'bizum_number' => env('ACADEMY_BIZUM_NUMBER', '[BIZUM_NUMBER]'),
        'iban' => env('ACADEMY_IBAN', '[IBAN]'),
        'whatsapp_number' => env('ACADEMY_WHATSAPP_NUMBER', '34600000000'),
        /** Texto mostrado en plantillas/UI (si vacío, se formatea whatsapp_number). */
        'whatsapp_display' => env('ACADEMY_WHATSAPP_DISPLAY'),
        /** Email de contacto público (chatbot FAQ, marketing). */
        'contact_email' => env('ACADEMY_CONTACT_EMAIL', 'info@sansebastiansurfschool.com'),
        'maps_url' => env('ACADEMY_MAPS_URL', 'https://maps.app.goo.gl/TuUbicacion'),
        /** Reloj de pared de la escuela (columnas naive starts_at/ends_at); independiente de APP_TIMEZONE. */
        'business_timezone' => env('ACADEMY_BUSINESS_TIMEZONE', 'Europe/Madrid'),
        /** Señal máxima para formalizar reserva de clase (el resto puede pagarse en escuela). */
        'class_reservation_deposit_eur' => (float) env('ACADEMY_CLASS_RESERVATION_DEPOSIT_EUR', 30),
        /** Hora de recogida/devolución por defecto en alquileres (reloj de pared Madrid) cuando solo llega Y-m-d. */
        'rental_handoff_hour' => (int) env('ACADEMY_RENTAL_HANDOFF_HOUR', 10),
        /** Cierre de inscripciones (minutos antes del inicio). */
        'enroll_cutoff_minutes' => (int) env('ACADEMY_ENROLL_CUTOFF_MINUTES', 30),
        /** Antelación mínima para cancelar (horas). */
        'cancel_cutoff_hours' => (int) env('ACADEMY_CANCEL_CUTOFF_HOURS', 4),
        /** Alumnos por monitor antes de requerir aprobación admin (7.º en adelante). */
        'standard_monitor_capacity' => (int) env('ACADEMY_STANDARD_MONITOR_CAPACITY', 6),
        /** Ubicación pública para chatbot / Gemini (editable sin tocar código). */
        'location_label' => env('ACADEMY_LOCATION_LABEL', 'Playa de Zurriola, Donostia — instalaciones del club'),
        /** Horario de apertura / atención (texto libre; confirmar en producción). */
        'opening_hours' => env('ACADEMY_OPENING_HOURS', 'Horario variable según temporada; confirma por WhatsApp el día de tu clase.'),
        /** Cómo llegar / punto de encuentro (texto libre). */
        'getting_here' => env('ACADEMY_GETTING_HERE', 'Llega 10–15 minutos antes de tu clase. Punto de encuentro en Zurriola, junto a las instalaciones del club.'),
        /** Instagram público (opcional). */
        'instagram_handle' => env('ACADEMY_INSTAGRAM_HANDLE', '@sansebastiansurfschool'),
    ],

    'contact_form' => [
        'to' => env('CONTACT_FORM_TO', env('MAIL_FROM_ADDRESS', 'hello@example.com')),
    ],

    /** Reparación de tablas — contacto directo del shaper (Edy Mulder). */
    'repair' => [
        'edy' => [
            'name' => env('REPAIR_EDY_NAME', 'Edy Mulder'),
            'phone' => env('REPAIR_EDY_PHONE', '34600000000'),
            'phone_display' => env('REPAIR_EDY_PHONE_DISPLAY'),
            'email' => env('REPAIR_EDY_EMAIL', 'edy.mulder@s4surf.com'),
        ],
        'willy' => [
            'name' => env('REPAIR_WILLY_NAME', 'Willy'),
            'phone' => env('REPAIR_WILLY_PHONE', '34600000001'),
            'phone_display' => env('REPAIR_WILLY_PHONE_DISPLAY'),
            'email' => env('REPAIR_WILLY_EMAIL', 'willy@s4surf.com'),
        ],
    ],

    // ── Stripe (pasarela de pagos) ──────────────────────────────────────────
    'stripe' => [
        'key'             => env('STRIPE_KEY'),
        'secret'          => env('STRIPE_SECRET'),
        'webhook_secret'  => env('STRIPE_WEBHOOK_SECRET'),
        'currency'        => env('STRIPE_CURRENCY', 'eur'),
    ],

    'sponsors' => [
        'bunker' => [
            'name' => 'The Bunker Surf Shop',
            'url' => env('SPONSOR_BUNKER_URL'),
            'tagline' => 'Equipamiento y surf shop',
            'active' => env('SPONSOR_BUNKER_ACTIVE', true),
        ],
    ],
];
