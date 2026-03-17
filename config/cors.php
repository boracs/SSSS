<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | This file is intentionally present to ensure predictable CORS behavior.
    | It's especially important when using cookie-based auth (Sanctum) from a
    | frontend served on another origin (e.g. Vite dev server).
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [env('APP_URL', 'http://127.0.0.1:8000'), 'http://localhost:5173', 'http://127.0.0.1:5173'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['set-cookie', 'x-xsrf-token'],

    'max_age' => 0,

    // CRÍTICO: permite que viajen cookies (sesión / XSRF-TOKEN) en peticiones cross-origin
    'supports_credentials' => true,
];

