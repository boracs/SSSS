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
    // 💡 AGREGADO PARA GEMINI
    // ====================================================================
    'gemini' => [
        // El controlador lo buscará con Config::get('services.gemini.key')
        'key' => env('GEMINI_API_KEY'),
    ],

    'academy' => [
        'bizum_number' => env('ACADEMY_BIZUM_NUMBER', '[BIZUM_NUMBER]'),
        'iban' => env('ACADEMY_IBAN', '[IBAN]'),
        'whatsapp_number' => env('ACADEMY_WHATSAPP_NUMBER', '34600000000'),
        /** Texto mostrado en plantillas/UI (si vacío, se formatea whatsapp_number). */
        'whatsapp_display' => env('ACADEMY_WHATSAPP_DISPLAY'),
        'maps_url' => env('ACADEMY_MAPS_URL', 'https://maps.app.goo.gl/TuUbicacion'),
        /** Reloj de pared de la escuela (columnas naive starts_at/ends_at); independiente de APP_TIMEZONE. */
        'business_timezone' => env('ACADEMY_BUSINESS_TIMEZONE', 'Europe/Madrid'),
        /** Señal máxima para formalizar reserva de clase (el resto puede pagarse en escuela). */
        'class_reservation_deposit_eur' => (float) env('ACADEMY_CLASS_RESERVATION_DEPOSIT_EUR', 30),
        /** Hora de recogida/devolución por defecto en alquileres (reloj de pared Madrid) cuando solo llega Y-m-d. */
        'rental_handoff_hour' => (int) env('ACADEMY_RENTAL_HANDOFF_HOUR', 10),
    ],

    'contact_form' => [
        'to' => env('CONTACT_FORM_TO', env('MAIL_FROM_ADDRESS', 'hello@example.com')),
    ],
];
