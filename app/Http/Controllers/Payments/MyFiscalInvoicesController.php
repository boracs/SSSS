<?php

declare(strict_types=1);

namespace App\Http\Controllers\Payments;

use App\Http\Controllers\Controller;
use App\Services\Invoicing\ClientFiscalInvoiceListService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * "Mis facturas": listado propio de facturas fiscales TicketBAI, filtrable
 * por categoría de negocio (tienda, bonos, taquillas, alquileres, clases).
 */
final class MyFiscalInvoicesController extends Controller
{
    public function __construct(
        private readonly ClientFiscalInvoiceListService $listService,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        $page = $this->listService->paginate(
            user: $request->user(),
            categoryValue: $request->query('category'),
            page: max(1, (int) $request->query('page', 1)),
        );

        return Inertia::render('Payments/MyInvoices', $page->toArray());
    }
}
