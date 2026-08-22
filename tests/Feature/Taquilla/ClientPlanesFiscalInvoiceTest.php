<?php

declare(strict_types=1);

use App\Enums\FiscalInvoiceStatus;
use App\Models\FiscalInvoice;
use App\Models\PagoCuota;
use App\Models\PlanTaquilla;
use App\Models\User;

test('planes de taquilla del socio enlazan factura y TicketBAI', function () {
    $user = User::factory()->create([
        'role' => 'user',
        'numeroTaquilla' => 40,
        'fecha_vencimiento_cuota' => now()->subDays(15),
    ]);
    $plan = PlanTaquilla::factory()->create(['nombre' => 'Taquilla Mensual', 'duracion_dias' => 30]);
    $pago = PagoCuota::query()->create([
        'user_id' => $user->id,
        'id_plan_pagado' => $plan->id,
        'monto_pagado_cents' => 6000,
        'status' => PagoCuota::STATUS_CONFIRMED,
        'payment_method' => 'card',
        'periodo_inicio' => '2026-07-06',
        'periodo_fin' => '2026-08-04',
        'fecha_pago' => '2026-07-06',
    ]);
    $invoice = FiscalInvoice::query()->create([
        'payable_type' => PagoCuota::class,
        'payable_id' => $pago->id,
        'stripe_checkout_session_id' => 'cs_test_taquilla_planes_fiscal',
        'amount_cents' => 6000,
        'status' => FiscalInvoiceStatus::Registered,
        'b2b_invoice_id' => 'inv_taquilla_1',
        'tbai_identifier' => 'TBAI-TEST-1',
    ]);

    $this->actingAs($user)
        ->get(route('taquillas.index.client'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('PlanesTaquillasClient')
            ->where('userData.historial_pagos.0.id', $pago->id)
            ->where('userData.historial_pagos.0.fiscal_invoice_ready', true)
            ->where(
                'userData.historial_pagos.0.fiscal_invoice_url',
                route('payments.fiscal-invoices.show', $invoice),
            )
            ->where(
                'userData.historial_pagos.0.fiscal_invoice_pdf_url',
                route('payments.fiscal-invoices.pdf', $invoice),
            ));
});
