<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\SecondHandStatus;
use App\Enums\SecondHandBoardType;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSecondHandBoardRequest;
use App\Http\Requests\UpdateSecondHandBoardRequest;
use App\Models\SecondHandBoard;
use App\Services\Media\CatalogImageService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * CRUD admin — expone datos financieros completos incluyendo purchase_price.
 * Protegido por middleware VerificarAdmin en rutas.
 */
class SecondHandBoardController extends Controller
{
    public function __construct(
        private readonly CatalogImageService $catalogImages,
    ) {}

    public function index(Request $request): Response
    {
        $dateType = trim((string) $request->query('date_type', 'created'));
        if (! in_array($dateType, ['created', 'sold'], true)) {
            $dateType = 'created';
        }

        $filters = [
            'search'     => trim((string) $request->query('search', '')),
            'status'     => trim((string) $request->query('status', '')),
            'board_type' => trim((string) $request->query('board_type', '')),
            'date_type'  => $dateType,
            'date_from'  => trim((string) $request->query('date_from', '')),
            'date_to'    => trim((string) $request->query('date_to', '')),
        ];

        $boards = SecondHandBoard::query()
            ->adminFilters($filters)
            ->orderByRaw("FIELD(status, 'available', 'reserved', 'sold')")
            ->orderBy('id', 'desc')
            ->get()
            ->map(fn (SecondHandBoard $b) => [
                ...$b->toPublicArray(images: $this->catalogImages),
                'purchase_price' => $b->purchase_price,
                'purchased_at'   => $b->purchased_at?->toDateString()
                    ?? $b->created_at?->toDateString(),
                'created_at'     => $b->created_at?->toDateString(),
                'profit_cents'   => $b->status === SecondHandStatus::SOLD
                    ? $b->effectiveSalePrice() - $b->purchase_price
                    : null,
            ]);

        return Inertia::render('Admin/SecondHand/Index', [
            'boards'     => $boards,
            'filters'    => $filters,
            'boardTypes' => collect(SecondHandBoardType::cases())->map(fn ($t) => [
                'value' => $t->value,
                'label' => $t->label(),
            ]),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/SecondHand/Create', [
            'statuses' => collect(SecondHandStatus::cases())->map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ]),
            'boardTypes' => collect(SecondHandBoardType::cases())->map(fn ($t) => [
                'value' => $t->value,
                'label' => $t->label(),
            ]),
        ]);
    }

    public function store(StoreSecondHandBoardRequest $request): RedirectResponse
    {
        $data = $request->safe()->except('images');
        $data['discount_pct'] = $data['discount_pct'] ?? 0;

        $imagePaths = [];
        if ($request->hasFile('images')) {
            $imagePaths = $this->catalogImages->storeMany($request->file('images') ?? [], 'segunda-mano');
        }

        SecondHandBoard::create([...$data, 'images' => $imagePaths ?: null]);

        return redirect()->route('admin.second-hand.index')
            ->with('success', 'Tabla de segunda mano creada correctamente.');
    }

    public function edit(SecondHandBoard $secondHandBoard): Response
    {
        return Inertia::render('Admin/SecondHand/Edit', [
            'board'    => [
                ...$secondHandBoard->toPublicArray(images: $this->catalogImages),
                'purchase_price' => $secondHandBoard->purchase_price,
            ],
            'statuses' => collect(SecondHandStatus::cases())->map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ]),
            'boardTypes' => collect(SecondHandBoardType::cases())->map(fn ($t) => [
                'value' => $t->value,
                'label' => $t->label(),
            ]),
        ]);
    }

    public function update(UpdateSecondHandBoardRequest $request, SecondHandBoard $secondHandBoard): RedirectResponse
    {
        $data = $request->safe()->except('images');

        $oldImages = null;
        if ($request->hasFile('images')) {
            // Subir y persistir primero: si falla a mitad de lote, las fotos
            // antiguas siguen intactas en disco y en BD (nada que borrar aún).
            $oldImages = $secondHandBoard->images;
            $data['images'] = $this->catalogImages->storeMany($request->file('images') ?? [], 'segunda-mano');
        }

        $secondHandBoard->update($data);

        if ($oldImages !== null) {
            $this->catalogImages->deletePairs($oldImages);
        }

        return redirect()->route('admin.second-hand.index')
            ->with('success', 'Tabla actualizada correctamente.');
    }

    /**
     * Soft-delete: retira del catálogo una tabla que NO se vendió (nos la quedamos,
     * regalo, etc.). Las vendidas son historial contable y no se pueden retirar.
     */
    public function destroy(SecondHandBoard $secondHandBoard): RedirectResponse
    {
        if ($secondHandBoard->status === SecondHandStatus::SOLD) {
            return redirect()->route('admin.second-hand.index')
                ->with('error', 'Una tabla vendida no se puede retirar: forma parte del historial de ventas.');
        }

        $secondHandBoard->delete();

        return redirect()->route('admin.second-hand.index')
            ->with('success', "«{$secondHandBoard->name}» retirada del catálogo. Puedes reactivarla desde el filtro Desactivadas.");
    }

    /**
     * Reactiva una tabla soft-deleted (vuelve al catálogo según su status).
     */
    public function restore(int $secondHandBoard): RedirectResponse
    {
        $board = SecondHandBoard::withTrashed()->findOrFail($secondHandBoard);

        if (! $board->trashed()) {
            return redirect()->route('admin.second-hand.index')
                ->with('success', "«{$board->name}» ya estaba activa.");
        }

        $board->restore();

        return redirect()->route('admin.second-hand.index')
            ->with('success', "«{$board->name}» reactivada.");
    }
    /**
     * Actualiza únicamente el estado de una tabla (cambio rápido desde el listado admin).
     * Automáticamente registra sold_at cuando el estado pasa a SOLD.
     */
    public function updateStatus(Request $request, SecondHandBoard $secondHandBoard): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::enum(SecondHandStatus::class)],
        ]);

        $newStatus = SecondHandStatus::from($validated['status']);

        $secondHandBoard->update([
            'status'  => $newStatus,
            'sold_at' => $newStatus === SecondHandStatus::SOLD
                ? ($secondHandBoard->sold_at ?? now())
                : null,
        ]);

        return redirect()->route('admin.second-hand.index')
            ->with('success', "Estado de «{$secondHandBoard->name}» actualizado a {$newStatus->label()}.");
    }
}
