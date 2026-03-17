<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreSurfboardRequest;
use App\Http\Requests\Admin\UpdateSurfboardRequest;
use App\Models\PriceSchema;
use App\Models\Surfboard;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SurfboardController extends Controller
{
    public function index(Request $request): Response
    {
        $surfboards = Surfboard::query()
            ->with('priceSchema')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Surfboards/Index', [
            'surfboards' => $surfboards,
        ]);
    }

    public function create(): Response
    {
        $priceSchemas = PriceSchema::query()->orderBy('name')->get();

        return Inertia::render('Admin/Surfboards/Create', [
            'priceSchemas' => $priceSchemas,
        ]);
    }

    public function store(StoreSurfboardRequest $request): RedirectResponse
    {
        $data = $request->validated();

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('surfboards', 'public');
            $data['image_url'] = json_encode([$path]);
        }

        Surfboard::create($data);

        return redirect()->route('admin.surfboards.index')->with('success', 'Tabla creada correctamente.');
    }

    public function edit(Surfboard $surfboard): Response
    {
        $surfboard->load('priceSchema');
        $priceSchemas = PriceSchema::query()->orderBy('name')->get();

        return Inertia::render('Admin/Surfboards/Edit', [
            'surfboard' => $surfboard,
            'priceSchemas' => $priceSchemas,
        ]);
    }

    public function update(UpdateSurfboardRequest $request, Surfboard $surfboard): RedirectResponse
    {
        $data = $request->validated();

        if ($request->hasFile('image')) {
            // borrar imágenes anteriores (paths locales) si existían
            $old = $surfboard->image_url;
            $paths = is_string($old) ? json_decode($old, true) : $old;
            if (! is_array($paths)) $paths = $old ? [$old] : [];
            foreach ($paths as $p) {
                if (is_string($p) && $p !== '' && ! str_starts_with($p, 'http')) {
                    Storage::disk('public')->delete($p);
                }
            }

            $path = $request->file('image')->store('surfboards', 'public');
            $data['image_url'] = json_encode([$path]);
        }

        $surfboard->update($data);

        return redirect()->route('admin.surfboards.index')->with('success', 'Tabla actualizada correctamente.');
    }

    public function destroy(Surfboard $surfboard): RedirectResponse
    {
        $surfboard->delete();

        return redirect()->route('admin.surfboards.index')->with('success', 'Tabla eliminada.');
    }
}
