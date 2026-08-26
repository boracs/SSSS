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
     * Euskalmet — predicción marítima costa vasca (Open Data Euskadi).
     * XML público (sin API key) para pleamar/bajamar. Oleaje horario sigue en Open-Meteo.
     */
    'euskalmet' => [
        'enabled' => (bool) env('EUSKALMET_ENABLED', true),
        'sea_forecast_xml_url' => env(
            'EUSKALMET_SEA_FORECAST_XML_URL',
            'https://opendata.euskadi.eus/contenidos/prevision_maritima/sea_forecast/opendata/sea_forecast.xml',
        ),
        'timeout_seconds' => (int) env('EUSKALMET_TIMEOUT_SECONDS', 10),
        'cache_ttl_seconds' => (int) env('EUSKALMET_CACHE_TTL_SECONDS', 1800),
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

        // Índice UI "kJ" ≈ Surf-Forecast: factor × 0.5 × (H_m×height_scale en ft)² × T × period_boost.
        // factor 2.4: con H/T idénticos a SF (periodo corto) → mismo kJ (2.1 m/6 s → 341).
        'energy_kj_calibration_factor' => (float) env('ZURRIOLA_ENERGY_KJ_FACTOR', 2.4),
        // Open-Meteo Zurriola suele subestimar Hs vs SF (~×1.52 en el diag 2026-07-25). Solo energía.
        'energy_kj_height_scale' => (float) env('ZURRIOLA_ENERGY_HEIGHT_SCALE', 1.52),
        // Periodo largo SF suma más punch (1.0 si T≤6 s → boost_max si T≥10 s).
        'energy_kj_period_boost_max' => (float) env('ZURRIOLA_ENERGY_PERIOD_BOOST_MAX', 1.6),
        // Qué altura/periodo alimentar el kJ: wave (combinada), swell, o max_energy (el par con más punch).
        'energy_kj_height_source' => env('ZURRIOLA_ENERGY_HEIGHT_SOURCE', 'wave'),

        'level_thresholds' => [
            'iniciacion' => ['max_wave_height_m' => 0.8, 'max_wind_kmh_onshore' => 15, 'max_wind_kmh_offshore' => 30],
            'intermedio' => ['max_wave_height_m' => 1.6, 'max_wind_kmh_onshore' => 25, 'max_wind_kmh_offshore' => 40],
            'avanzado' => ['max_wave_height_m' => 3.5, 'max_wind_kmh_onshore' => 35, 'max_wind_kmh_offshore' => 55],
        ],

        // Badge público de 4 colores (good/espigon/caution/closed). Independiente
        // del nivel Gemini (iniciacion/…). El admin puede sobrescribirlo.
        'signal_thresholds' => [
            'good' => ['max_wave_height_m' => 0.5, 'max_wind_kmh_onshore' => 12, 'max_wind_kmh_offshore' => 25],
            'espigon' => ['max_wave_height_m' => 0.9, 'max_wind_kmh_onshore' => 18, 'max_wind_kmh_offshore' => 32],
            'caution' => ['max_wave_height_m' => 1.8, 'max_wind_kmh_onshore' => 28, 'max_wind_kmh_offshore' => 45],
        ],

        // Documento de verdad del spot (reglas de entrada, zonas, precauciones) que se
        // inyecta a Gemini como systemInstruction. Editable sin tocar código/desplegar.
        'guide_path' => env('ZURRIOLA_SURF_GUIDE_PATH', resource_path('surf-guide/zurriola-spot-guide.md')),

        // Reglas técnicas estructuradas del spot (viento por componente, energía en kJ
        // con zona/nivel recomendado, estrategia de marea, dirección de swell, periodo,
        // seguridad de corrientes...). Se inyecta junto a la guía como contexto adicional.
        'logistics_json_path' => env('ZURRIOLA_SURF_LOGISTICS_PATH', resource_path('surf-guide/zurriola-spot-logistics.json')),

        // Hechos GEO públicos (ubicación, temporada, material, FAQs citables). Editable sin deploy de lógica.
        'geo_facts_json_path' => env('ZURRIOLA_GEO_FACTS_PATH', resource_path('surf-guide/zurriola-geo-facts.json')),

        'surf_classes_faqs_json_path' => env(
            'SURF_CLASSES_FAQS_PATH',
            resource_path('surf-guide/surf-classes-faqs.json'),
        ),

        // Panel "Tiempo detallado" (horario+7 días, Open-Meteo forecast) bajo demanda en webcams.
        // false → ZurriolaWeatherForecastService devuelve ok:false sin tocar Open-Meteo.
        'weather_detail_enabled' => env('ZURRIOLA_WEATHER_DETAIL_ENABLED', true),

        'generation_hour' => env('ZURRIOLA_SURF_GENERATION_HOUR', '07:00'),

        // Tabla de previsión multi-día (distinta del "parte de hoy" de arriba).
        // Open-Meteo marine + weather: forecast_days máximo documentado = 16 (probado 16 OK, 17 → 400).
        // Default de producto = tope API; UI horizontal/scroll ya soporta N días. Override con ZURRIOLA_FORECAST_DAYS.
        'forecast_days' => (int) env('ZURRIOLA_FORECAST_DAYS', 16),
        // Tabla compacta (arriba): franjas diurnas cada 2h.
        'forecast_slot_hours' => [6, 8, 10, 12, 14, 16, 18, 20, 22],
        // Slider "cada 2h · todos los días" (fusiona oleaje+tiempo): día completo cada 2h.
        // Sin madrugada (0/2/4): nadie surfea; el slider empieza a las 06:00.
        'forecast_detailed_slot_hours' => [6, 8, 10, 12, 14, 16, 18, 20, 22],

        // Glassy = calma real (±5 km/h: sur −5 / 0 / norte +5). A 8 km/h ya no es glass.
        'wind_glassy_max_kmh' => env('ZURRIOLA_WIND_GLASSY_MAX_KMH', 5),

        // Rangos de color en la tabla de previsión.
        // Viento: 3 tonos alineados con wind_north_component (km/h).
        'forecast_wind_color_kmh' => [
            'green_max' => 10,  // norte 0–10: bien
            'yellow_max' => 15, // 10–15: empieza a picar; >15 rojo (mar roto)
        ],
        // Energía/kJ: escala granular (primera banda con max >= kJ gana). UI mapea tone → Tailwind.
        'forecast_energy_color_kj' => [
            'bands' => [
                ['max' => 0, 'tone' => 'e0'],       // transparente
                ['max' => 9, 'tone' => 'e1'],       // 1–9
                ['max' => 19, 'tone' => 'e2'],      // 10–19
                ['max' => 49, 'tone' => 'e3'],      // 20–49
                ['max' => 99, 'tone' => 'e4'],      // 50–99
                ['max' => 199, 'tone' => 'e5'],     // 100–199
                ['max' => 399, 'tone' => 'e6'],     // 200–399
                ['max' => 699, 'tone' => 'e7'],     // 400–699
                ['max' => 999, 'tone' => 'e8'],     // 700–999
                ['max' => 1299, 'tone' => 'e9'],    // 1000–1299 verde→ámbar
                ['max' => 1499, 'tone' => 'e10'],   // 1300–1499
                ['max' => 1999, 'tone' => 'e11'],   // 1500–1999
                ['max' => 2499, 'tone' => 'e12'],   // 2000–2499
                ['max' => 4999, 'tone' => 'e13'],   // 2500–4999
                ['max' => PHP_INT_MAX, 'tone' => 'e14'], // ≥5000
            ],
        ],
    ],

    'academy' => [
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
        /** Duración base a la que está tarifada la clase particular; otras duraciones se prorratean. */
        'private_lesson_base_minutes' => (int) env('ACADEMY_PRIVATE_LESSON_BASE_MINUTES', 90),
        /** % del total que se cobra online como señal de clase particular (el resto, en la escuela). */
        'private_lesson_deposit_percentage' => (float) env('ACADEMY_PRIVATE_LESSON_DEPOSIT_PERCENTAGE', 30),
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
        /**
         * URLs completas de redes (footer + JSON-LD sameAs).
         * Deja vacío en .env lo que aún no exista; no se muestra el icono.
         */
        'social' => [
            'instagram' => env('ACADEMY_SOCIAL_INSTAGRAM_URL'),
            'youtube' => env('ACADEMY_SOCIAL_YOUTUBE_URL', 'https://www.youtube.com/@sansebastiansurfschool'),
            'facebook' => env('ACADEMY_SOCIAL_FACEBOOK_URL', 'https://www.facebook.com/sansebastiansurfschool'),
            'tiktok' => env('ACADEMY_SOCIAL_TIKTOK_URL', 'https://www.tiktok.com/@sansebastiansurfschool'),
        ],
    ],

    /**
     * Conocimiento de negocio editable para Gemini (políticas, edge cases, tarifario comercial).
     * Packs VIP / planes taquilla siguen en BD; este JSON no los sustituye.
     */
    'chatbot' => [
        'knowledge_json_path' => env(
            'CHATBOT_KNOWLEDGE_JSON',
            resource_path('chatbot/s4-business-knowledge.json'),
        ),
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
        'key' => env('STRIPE_KEY'),
        'secret' => env('STRIPE_SECRET'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        'currency' => env('STRIPE_CURRENCY', 'eur'),
    ],

    // ── Datáfono (ingesta TPV firmada HMAC → ledger datafono_payments) ──────
    'datafono' => [
        'ingest_secret' => env('DATAFONO_INGEST_SECRET'),
        'default_terminal_codigo' => env('DATAFONO_DEFAULT_TERMINAL_CODIGO', 'datafono1'),
        'ingest_enabled' => env('DATAFONO_INGEST_ENABLED', true),
    ],

    'sponsors' => [
        'bunker' => [
            'name' => 'The Bunker Surf Shop',
            'url' => env('SPONSOR_BUNKER_URL', 'https://elbunkerbasquesurfing.com/'),
            'tagline' => 'Equipamiento y surf shop',
            'active' => env('SPONSOR_BUNKER_ACTIVE', true),
        ],
        'yow' => [
            'name' => 'YOW Surfskate',
            'url' => env('SPONSOR_YOW_URL', 'https://yowsurf.com'),
            'tagline' => 'Surfskate oficial',
            'active' => env('SPONSOR_YOW_ACTIVE', true),
        ],
        'gipuzkoa' => [
            'name' => 'Diputación Foral de Gipuzkoa',
            'url' => env('SPONSOR_GIPUZKOA_URL', 'https://www.gipuzkoa.eus/es/web/hondartzak/webcams/zurriola'),
            'tagline' => 'Webcam Zurriola',
            'active' => env('SPONSOR_GIPUZKOA_ACTIVE', true),
        ],
        'open_meteo' => [
            'name' => 'Open-Meteo',
            'url' => env('SPONSOR_OPEN_METEO_URL', 'https://open-meteo.com'),
            'tagline' => 'Datos de oleaje y viento',
            'active' => env('SPONSOR_OPEN_METEO_ACTIVE', true),
        ],
    ],

    /**
     * Badge CRO: reseñas Google del partner operativo (clases en Zurriola vía The Bunker).
     * Actualizar rating/review_count manualmente; URL = ficha Google del negocio.
     */
    'partner_google_reviews' => [
        'active' => env('PARTNER_GOOGLE_REVIEWS_ACTIVE', true),
        'business_name' => env('PARTNER_GOOGLE_REVIEWS_BUSINESS', 'The Bunker Surf Shop'),
        'legal_name' => env('PARTNER_GOOGLE_REVIEWS_LEGAL', 'El Bunker Surf Shop SL'),
        'rating' => (float) env('PARTNER_GOOGLE_REVIEWS_RATING', 5),
        'review_count' => (int) env('PARTNER_GOOGLE_REVIEWS_COUNT', 399),
        'reviews_url' => env(
            'PARTNER_GOOGLE_REVIEWS_URL',
            'https://www.google.com/maps/search/?api=1&query=El+Bunker+Surf+Shop+SL+Donostia'
        ),
        'partner_note' => env(
            'PARTNER_GOOGLE_REVIEWS_NOTE',
            'Las clases de San Sebastián Surf School se imparten en colaboración con The Bunker Surf Shop, en Zurriola.'
        ),
        'snippets_disclaimer' => env(
            'PARTNER_GOOGLE_REVIEWS_SNIPPETS_DISCLAIMER',
            'Fragmentos de opiniones publicadas en Google por clientes de The Bunker Surf Shop.'
        ),
        'snippets_json_path' => env(
            'PARTNER_GOOGLE_REVIEWS_JSON',
            resource_path('partner/bunker-google-reviews.json')
        ),
    ],
];
