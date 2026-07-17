<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\FiscalInvoiceStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Factura fiscal emitida vía proveedor TicketBAI (B2BRouter) tras un pago Stripe confirmado.
 *
 * @see \App\Listeners\Payments\DispatchB2BRouterInvoiceListener
 * @see \App\Actions\Invoicing\IssueFiscalInvoiceAction
 * @see \App\Actions\Invoicing\SyncFiscalTaxReportAction
 */
class FiscalInvoice extends Model
{
    protected $fillable = [
        'payable_type',
        'payable_id',
        'stripe_checkout_session_id',
        'amount_cents',
        'currency',
        'provider',
        'status',
        'b2b_invoice_id',
        'b2b_tax_report_id',
        'tbai_identifier',
        'qr_payload',
        'pdf_url',
        'last_error',
        'submitted_at',
        'issued_at',
    ];

    protected $casts = [
        'status'        => FiscalInvoiceStatus::class,
        'amount_cents'  => 'integer',
        'submitted_at'  => 'datetime',
        'issued_at'     => 'datetime',
    ];

    public function payable(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'payable_type', 'payable_id');
    }

    /** @param Builder<FiscalInvoice> $query */
    public function scopeForPayable(Builder $query, string $payableType, int $payableId): Builder
    {
        return $query
            ->where('payable_type', $payableType)
            ->where('payable_id', $payableId);
    }
}
