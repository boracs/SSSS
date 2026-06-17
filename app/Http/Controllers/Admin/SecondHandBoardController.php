<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\SecondHandStatus;
use App\Enums\SecondHandBoardType;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSecondHandBoardRequest;
use App\Http\Requests\UpdateSecondHandBoardRequest;
use App\Models\SecondHandBoard;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * CRUD admin — expone datos financieros completos incluyendo purchase_price.
 * Protegido por middleware VerificarAdmin en rutas.
 */
class SecondHandBoardController extends Controller
{
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
                ...$b->toPublicArray(),
                'purchase_price' => $b->purchase_price,
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
            foreach ($request->file('images') as $file) {
                $imagePaths[] = $file->store('segunda-mano', 'public');
            }
        }

        SecondHandBoard::create([...$data, 'images' => $imagePaths ?: null]);

        return redirect()->route('admin.second-hand.index')
            ->with('success', 'Tabla de segunda mano creada correctamente.');
    }

    public function edit(SecondHandBoard $secondHandBoard): Response
    {
        return Inertia::render('Admin/SecondHand/Edit', [
            'board'    => [
                ...$secondHandBoard->toPublicArray(),
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

        if ($request->hasFile('images')) {
            // Borrar imágenes anteriores del disco
            foreach ($secondHandBoard->images ?? [] as $oldPath) {
                Storage::disk('public')->delete($oldPath);
            }
            $newPaths = [];
            foreach ($request->file('images') as $file) {
                $newPaths[] = $file->store('segunda-mano', 'public');
            }
            $data['images'] = $newPaths;
        }

        $secondHandBoard->update($data);

        return redirect()->route('admin.second-hand.index')
            ->with('success', 'Tabla actualizada correctamente.');
    }

    public function destroy(SecondHandBoard $secondHandBoard): RedirectResponse
    {
        foreach ($secondHandBoard->images ?? [] as $path) {
            Storage::disk('public')->delete($path);
        }
        $secondHandBoard->delete();

        return redirect()->route('admin.second-hand.index')
            ->with('success', 'Tabla eliminada.');
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
