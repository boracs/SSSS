<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PackBono;
use App\Services\Chatbot\S4BusinessContextService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class BonoController extends Controller
{
    public function __construct(
        private readonly S4BusinessContextService $chatbotBusinessContext,
    ) {}

    public function index()
    {
        return Inertia::render('Admin/Bonos/Index', [
            'packs' => PackBono::query()->orderByDesc('id')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:120',
            'num_clases' => 'required|integer|min:1|max:500',
            'precio' => 'required|numeric|min:0',
            'activo' => 'nullable|boolean',
        ]);

        PackBono::create([
            'nombre' => $validated['nombre'],
            'num_clases' => (int) $validated['num_clases'],
            'precio' => $validated['precio'],
            'activo' => (bool) ($validated['activo'] ?? true),
        ]);

        $this->chatbotBusinessContext->forget();

        return back()->with('success', 'Pack bono creado.');
    }

    public function update(Request $request, PackBono $packBono)
    {
        abort(403, 'Edición directa deshabilitada. Para cambiar tarifa, desactiva el pack y crea una nueva versión.');
    }

    public function destroy(PackBono $packBono)
    {
        abort(403, 'Eliminación física deshabilitada para preservar la integridad histórica.');
    }

    public function toggleActive(Request $request, PackBono $packBono)
    {
        $actor = $request->user();
        $old = (bool) $packBono->activo;
        $packBono->update([
            'activo' => ! $old,
        ]);

        $this->chatbotBusinessContext->forget();

        if ($old && ! (bool) $packBono->activo) {
            Log::info('[PackBono] desactivado', [
                'pack_id' => $packBono->id,
                'pack_nombre' => $packBono->nombre,
                'admin_id' => $actor?->id,
                'admin_email' => $actor?->email,
                'at' => now()->toDateTimeString(),
            ]);
        }

        return back()->with('success', $packBono->activo ? 'Pack activado.' : 'Pack desactivado.');
    }
}

