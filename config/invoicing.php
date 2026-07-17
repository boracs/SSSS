<?php

declare(strict_types=1);

use App\Models\Booking;
use App\Models\LessonUser;
use App\Models\PagoCuota;
use App\Models\Pedido;
use App\Models\UserBono;

return [

    /*
    |--------------------------------------------------------------------------
    | Facturación fiscal (TicketBAI vía B2BRouter)
    |--------------------------------------------------------------------------
    |
    | Kill-switch global. Con INVOICING_ENABLED=false (por defecto) el listener
    | DispatchB2BRouterInvoiceListener no encola ningún Job: cero llamadas HTTP,
    | cero filas en fiscal_invoices. El cobro Stripe funciona exactamente igual.
    |
    */
    'enabled' => (bool) env('INVOICING_ENABLED', false),

    /** Driver activo. Hoy solo 'b2brouter' (bind en AppServiceProvider). */
    'driver' => env('INVOICING_DRIVER', 'b2brouter'),

    /*
    |--------------------------------------------------------------------------
    | B2BRouter (TicketBAI)
    |--------------------------------------------------------------------------
    |
    | La firma XAdES, el certificado ante Hacienda, el encadenamiento de facturas
    | y el envío REST a la Hacienda Foral los gestiona B2BRouter — nuestro código
    | NUNCA genera ni firma XML TicketBAI (ver docs/invoicing/B2BROUTER-TICKETBAI.md).
    |
    | Entornos B2BRouter (ver docs/invoicing/B2BROUTER-TICKETBAI.md §5):
    | - Sandbox (recomendado para desarrollo diario): misma URL que producción
    |   (https://api.b2brouter.net); el enrutamiento lo decide el PREFIJO de la
    |   API key (test_...). Gratis, inmediato, sin ticket de soporte.
    | - Staging (https://api-staging.b2brouter.net): dominio propio, requiere
    |   registro en app-staging.b2brouter.net + ticket de soporte. Solo necesario
    |   para validar el envío real contra el entorno de pruebas de la Hacienda Foral.
    | - Production: https://api.b2brouter.net con clave prod_... (o sin prefijo, legacy).
    |
    | B2BROUTER_DELEGATION es solo informativo: la delegación foral (Gipuzkoa/
    | Araba/Bizkaia) y el resto de tax_report_settings de TicketBAI se configuran
    | en el panel/API de la cuenta B2BRouter, NO aquí.
    |
    */
    'b2brouter' => [
        'base_url'     => env('B2BROUTER_BASE_URL', 'https://api.b2brouter.net'),
        'api_key'      => env('B2BROUTER_API_KEY'),
        'api_version'  => env('B2BROUTER_API_VERSION', '2025-10-13'),
        'account_id'   => env('B2BROUTER_ACCOUNT_ID'),
        'delegation'   => env('B2BROUTER_DELEGATION', 'gipuzkoa'),
        'timeout'      => (int) env('B2BROUTER_HTTP_TIMEOUT', 15),
    ],

    /*
    |--------------------------------------------------------------------------
    | Payables facturables
    |--------------------------------------------------------------------------
    |
    | Whitelist explícita: FiscalInvoiceBuilderService::build() solo admite estos
    | payable_type. Los 5 dominios de negocio (tienda, bonos de clases, alquileres,
    | clases sueltas, taquillas) tienen ya su rama implementada en el builder.
    |
    | Esto NO activa la emisión real: mientras 'enabled' (arriba) sea false —como
    | hoy, entorno de prueba— DispatchB2BRouterInvoiceListener no encola nada para
    | ningún payable_type, aunque esté aquí a true. Ver FiscalInvoiceCategory::isEnabled()
    | (exige AMBOS: 'enabled' true Y su payable_type true) para el estado real
    | mostrado en el panel cliente "Mis facturas".
    |
    */
    'payable_types' => [
        Pedido::class     => true,
        UserBono::class   => true,
        Booking::class    => true,
        LessonUser::class => true,
        PagoCuota::class  => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | IVA por defecto
    |--------------------------------------------------------------------------
    |
    | Aplicado uniformemente en esta iteración. TODO iteración 2: derivar el tipo
    | real por producto/servicio si en el futuro conviven tipos distintos.
    |
    */
    'default_vat_percent'  => (float) env('INVOICING_DEFAULT_VAT_PERCENT', 21.0),
    'default_vat_category' => env('INVOICING_DEFAULT_VAT_CATEGORY', 'S'),

    /*
    |--------------------------------------------------------------------------
    | Sondeo de tax_reports
    |--------------------------------------------------------------------------
    |
    | PollB2BRouterTaxReportJob se reencola a sí mismo con este backoff hasta que
    | el tax_report llegue a 'registered'/'error' o se agoten los intentos.
    |
    */
    'poll' => [
        'max_attempts' => (int) env('INVOICING_POLL_MAX_ATTEMPTS', 8),
        'backoff'      => [10, 20, 40, 60, 90, 120, 180, 300],
    ],
];
