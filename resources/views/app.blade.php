<!DOCTYPE html>
<html lang="es">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <title inertia>{{ config('app.name', 'Laravel') }}</title>
        <meta name="theme-color" content="#071326">
        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">
        <link rel="manifest" href="/site.webmanifest">

        {{-- Fuentes: preconnect + carga no bloqueante (system-ui hasta que lleguen). --}}
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800&family=Poppins:wght@400;500;600&display=swap"
            rel="stylesheet"
            media="print"
            onload="this.media='all'"
        >
        <noscript>
            <link
                href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800&family=Poppins:wght@400;500;600&display=swap"
                rel="stylesheet"
            >
        </noscript>

        {{-- LCP home: preload en HTML inicial (Inertia Head solo hidrata tras JS). --}}
        @if (request()->routeIs('Pag_principal'))
            <link
                rel="preload"
                as="image"
                href="/img/zurriola-surf-sunset-960.webp"
                type="image/webp"
                imagesrcset="/img/zurriola-surf-sunset-960.webp 960w, /img/zurriola-surf-sunset-1280.webp 1280w, /img/zurriola-surf-sunset-1920.webp 1920w"
                imagesizes="100vw"
                media="(max-width: 767px)"
                fetchpriority="high"
            >
            <link
                rel="preload"
                as="image"
                href="/img/zurriola-surf-sunset-1280.webp"
                type="image/webp"
                imagesrcset="/img/zurriola-surf-sunset-960.webp 960w, /img/zurriola-surf-sunset-1280.webp 1280w, /img/zurriola-surf-sunset-1920.webp 1920w"
                imagesizes="100vw"
                media="(min-width: 768px)"
                fetchpriority="high"
            >
        @endif

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.jsx'])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
