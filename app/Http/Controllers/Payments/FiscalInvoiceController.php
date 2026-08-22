<?php

declare(strict_types=1);

namespace App\Http\Controllers\Payments;

use App\Contracts\Invoicing\FiscalInvoiceIssuerInterface;
use App\Enums\FiscalInvoiceStatus;
use App\Http\Controllers\Controller;
use App\Models\FiscalInvoice;
use App\Services\Invoicing\FiscalInvoiceAccessService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Throwable;

/**
 * Vista cliente de factura fiscal TicketBAI (identifier + QR + PDF).
 */
final class FiscalInvoiceController extends Controller
{
    public function __construct(
        private readonly FiscalInvoiceAccessService $access,
        private readonly FiscalInvoiceIssuerInterface $issuer,
    ) {}

    public function show(Request $request, FiscalInvoice $fiscalInvoice): InertiaResponse
    {
        $user = $request->user();
        if ($user === null || ! $this->access->userCanView($user, $fiscalInvoice)) {
            abort(403);
        }

        $dto = $this->access->toPublicDto($fiscalInvoice);

        $pendingMessage = match ($fiscalInvoice->status) {
            FiscalInvoiceStatus::Processing => 'Hacienda aún no ha sellado el TicketBAI (código y QR). El PDF de la factura ya lo tienes en Mis facturas.',
            FiscalInvoiceStatus::Pending => 'La factura fiscal se está preparando. El PDF aparecerá en Mis facturas en cuanto se emita.',
            FiscalInvoiceStatus::Failed => 'No pudimos registrar el TicketBAI automáticamente. El pago está confirmado; el PDF de Mis facturas sigue siendo válido. Contacta con la escuela si necesitas el sello.',
            default => null,
        };

        return Inertia::render('Payments/FiscalInvoice', [
            'invoice' => $dto->toArray(),
            'pending_message' => $pendingMessage,
            'back_url' => route('my-invoices.index'),
            'back_label' => 'Volver a mis facturas',
        ]);
    }

    public function pdf(Request $request, FiscalInvoice $fiscalInvoice): Response
    {
        $user = $request->user();
        if ($user === null || ! $this->access->userCanView($user, $fiscalInvoice)) {
            abort(403);
        }

        if (! is_string($fiscalInvoice->b2b_invoice_id) || $fiscalInvoice->b2b_invoice_id === '') {
            abort(404, 'PDF aún no disponible.');
        }

        try {
            $binary = $this->issuer->downloadInvoicePdf($fiscalInvoice->b2b_invoice_id);
        } catch (Throwable $e) {
            Log::error('FiscalInvoiceController::pdf fallo', [
                'fiscal_invoice_id' => $fiscalInvoice->id,
                'error' => $e->getMessage(),
            ]);
            abort(502, 'No se pudo descargar el PDF de la factura.');
        }

        return response($binary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="factura-s4-'.$fiscalInvoice->id.'.pdf"',
        ]);
    }
}
