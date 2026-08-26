<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreSurfboardRequest;
use App\Http\Requests\Admin\UpdateSurfboardRequest;
use App\Models\PriceSchema;
use App\Models\Surfboard;
use App\Services\Media\CatalogImageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SurfboardController extends Controller
{
    public function __construct(
        private readonly CatalogImageService $catalogImages,
    ) {}

    public function index(Request $request): Response
    {
        $surfboards = Surfboard::query()
            ->select([
                'id',
                'name',
                'category',
                'is_active',
                'price_schema_id',
                'image_url',
                'image_alt',
            ])
            ->with(['priceSchema:id,name,price_1d'])
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Surfboards/Index', [
            'surfboards' => $surfboards,
        ]);
    }

    /**
     * Detalle ligero para edición inline en el listado (JSON, carga perezosa).
     */
    public function detalle(Surfboard $surfboard): JsonResponse
    {
        return response()->json([
            'surfboard' => [
                'id' => $surfboard->id,
                'name' => $surfboard->name,
                'category' => $surfboard->category,
                'is_active' => (bool) $surfboard->is_active,
                'price_schema_id' => $surfboard->price_schema_id,
                'description' => $surfboard->description,
                'altura' => $surfboard->altura,
                'ancho' => $surfboard->ancho,
                'grosor' => $surfboard->grosor,
                'volumen' => $surfboard->volumen,
                'image_url' => $surfboard->image_url,
                'image_alt' => $surfboard->image_alt,
                'first_image_url' => $surfboard->first_image_url,
                'first_thumb_url' => $surfboard->first_thumb_url,
            ],
            'priceSchemas' => PriceSchema::query()
                ->orderBy('name')
                ->get(['id', 'name']),
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
            $stored = $this->catalogImages->storeFromUpload($request->file('image'), 'surfboards');
            $data['image_url'] = json_encode([$stored->masterPath]);
        }

        Surfboard::create($data);

        return redirect()->route('admin.surfboards.index')->with('success', 'Tabla creada correctamente.');
    }

    public function update(UpdateSurfboardRequest $request, Surfboard $surfboard): RedirectResponse
    {
        $data = $request->validated();

        $oldPaths = null;
        if ($request->hasFile('image')) {
            // Subir y persistir primero: si falla, la foto antigua sigue intacta.
            $old = $surfboard->image_url;
            $paths = is_string($old) ? json_decode($old, true) : $old;
            if (! is_array($paths)) {
                $paths = $old ? [$old] : [];
            }
            $oldPaths = array_filter($paths, 'is_string');

            $stored = $this->catalogImages->storeFromUpload($request->file('image'), 'surfboards');
            $data['image_url'] = json_encode([$stored->masterPath]);
        }

        $surfboard->update($data);

        if ($oldPaths !== null) {
            $this->catalogImages->deletePairs($oldPaths);
        }

        return redirect()->route('admin.surfboards.index')->with('success', 'Tabla actualizada correctamente.');
    }

    public function destroy(Surfboard $surfboard): RedirectResponse
    {
        $surfboard->delete();

        return redirect()->route('admin.surfboards.index')->with('success', 'Tabla eliminada.');
    }
}
