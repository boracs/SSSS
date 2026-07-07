<?php

return [
    /** Minutos antes de borrar subidas de usuario (cron). */
    'upload_ttl_minutes' => (int) env('AUTOCOACH_UPLOAD_TTL_MINUTES', 30),

    /** Máximo de archivos por petición de subida. */
    'max_files_per_batch' => (int) env('AUTOCOACH_MAX_FILES_PER_BATCH', 10),

    /** Tamaño máximo por clip (bytes) — clips cortos de ola. */
    'max_file_bytes' => (int) env('AUTOCOACH_MAX_FILE_BYTES', 25 * 1024 * 1024),

    /** Cuota de almacenamiento por sesión de visitante (bytes). */
    'max_session_bytes' => (int) env('AUTOCOACH_MAX_SESSION_BYTES', 120 * 1024 * 1024),

    /** Subidas permitidas por IP en la ventana temporal. */
    'ip_upload_quota' => (int) env('AUTOCOACH_IP_UPLOAD_QUOTA', 40),

    /** Ventana de cuota IP (minutos). */
    'ip_quota_window_minutes' => (int) env('AUTOCOACH_IP_QUOTA_WINDOW_MINUTES', 5),

    /** Límite total de disco para todas las subidas temporales (bytes). */
    'max_total_upload_bytes' => (int) env('AUTOCOACH_MAX_TOTAL_UPLOAD_BYTES', 2 * 1024 * 1024 * 1024),

    /** Cookie segura (HTTPS). En producción conviene true. */
    'cookie_secure' => (bool) env('AUTOCOACH_COOKIE_SECURE', env('APP_ENV') === 'production'),

    'allowed_extensions' => ['mp4', 'mov', 'webm'],
    'allowed_mimes' => ['video/mp4', 'video/quicktime', 'video/webm'],

    /**
     * Ruta opcional con vídeos de referencia para `autocoach:sync-reference-videos`.
     * Si es null y storage ya tiene clips, el comando termina OK.
     */
    'reference_videos_source' => env('AUTOCOACH_REFERENCE_VIDEOS_SOURCE'),
];
