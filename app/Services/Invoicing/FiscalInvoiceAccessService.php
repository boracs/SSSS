<?php

declare(strict_types=1);

namespace App\Services\Invoicing;

use App\DTOs\Invoicing\FiscalInvoicePublicDto;
use App\Enums\FiscalInvoiceStatus;
use App\Models\Booking;
use App\Models\FiscalInvoice;
use App\Models\LessonUser;
use App\Models\PagoCuota;
use App\Models\Pedido;
use App\Models\User;
use App\Models\UserBono;

/**
 * Acceso cliente a facturas fiscales TicketBAI (identifier + QR + PDF).
 * Mismo criterio de ownership que PaymentReceiptAccessService.
 */
final class FiscalInvoiceAccessService
{
    /**
     * @param  list<array{type: string, id: int}>  $payables
     * @return array<string, FiscalInvoicePublicDto>
     */
    public function mapForPayables(array $payables): array
    {
        if ($payables === []) {
            return [];
        }

        $byType = collect($payables)->groupBy('type');
        $invoices = collect();

        foreach ($byType as $type => $items) {
            $ids = $items->pluck('id')->map(fn ($id) => (int) $id)->unique()->values()->all();
            if ($ids === []) {
                continue;
            }

            $chunk = FiscalInvoice::query()
                ->where('payable_type', (string) $type)
                ->whereIn('payable_id', $ids)
                ->get();

            $invoices = $invoices->concat($chunk);
        }

        return $invoices
            ->mapWithKeys(fn (FiscalInvoice $invoice) => [
                $this->cacheKey($invoice->payable_type, (int) $invoice->payable_id) => $this->toPublicDto($invoice),
            ])
            ->all();
    }

    public function forPayable(string $payableType, int $payableId): ?FiscalInvoicePublicDto
    {
        $invoice = FiscalInvoice::query()->forPayable($payableType, $payableId)->first();

        return $invoice !== null ? $this->toPublicDto($invoice) : null;
    }

    public function userCanView(User $user, FiscalInvoice $invoice): bool
    {
        if (($user->role ?? '') === 'admin') {
            return true;
        }

        $payable = $invoice->payable;
        if ($payable === null) {
            return false;
        }

        return match (true) {
            $payable instanceof LessonUser => (int) $payable->user_id === (int) $user->id,
            $payable instanceof Booking => (int) $payable->user_id === (int) $user->id,
            $payable instanceof UserBono => (int) $payable->user_id === (int) $user->id,
            $payable instanceof PagoCuota => (int) $payable->user_id === (int) $user->id,
            $payable instanceof Pedido => (int) $payable->user_id === (int) $user->id,
            default => false,
        };
    }

    public function toPublicDto(FiscalInvoice $invoice): FiscalInvoicePublicDto
    {
        $ready = $invoice->status === FiscalInvoiceStatus::Registered;
        $hasPdf = $ready && is_string($invoice->b2b_invoice_id) && $invoice->b2b_invoice_id !== '';

        return new FiscalInvoicePublicDto(
            id: (int) $invoice->id,
            status: $invoice->status,
            statusLabel: $invoice->status->label(),
            amountCents: (int) $invoice->amount_cents,
            tbaiIdentifier: $ready ? $invoice->tbai_identifier : null,
            qrImageSrc: $ready ? $this->normalizeQrSrc($invoice->qr_payload) : null,
            detailUrl: route('payments.fiscal-invoices.show', $invoice),
            pdfUrl: $hasPdf ? route('payments.fiscal-invoices.pdf', $invoice) : null,
            isReady: $ready,
        );
    }

    public function cacheKey(string $payableType, int $payableId): string
    {
        return $payableType.'#'.$payableId;
    }

    private function normalizeQrSrc(?string $qrPayload): ?string
    {
        if ($qrPayload === null || trim($qrPayload) === '') {
            return null;
        }

        $qr = trim($qrPayload);

        if (str_starts_with($qr, 'data:image/') || str_starts_with($qr, 'http://') || str_starts_with($qr, 'https://')) {
            return $qr;
        }

        // B2BRouter suele devolver PNG en base64 (con o sin prefijo data:).
        return 'data:image/png;base64,'.preg_replace('/\s+/', '', $qr);
    }
}
