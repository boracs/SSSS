<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\DTOs\Store\StoreProductWriteDto;
use App\Enums\ProductTag;
use App\Models\Producto;
use App\Services\Store\ProductDetailPageService;
use App\Services\Store\StoreProductCatalogService;
use App\Services\Store\StorePromoBannerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ProductoController extends Controller
{
    public function __construct(
        private readonly StoreProductCatalogService $catalog,
    ) {}

    public function mostrarProductos(Request $request): InertiaResponse
    {
        return Inertia::render('Productos', [
            'openCreateModal' => $request->boolean('create'),
            'productos' => fn () => $this->catalog->adminIndexRows(),
            'productTagOptions' => ProductTag::optionsForFrontend(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateProduct($request);
        $this->catalog->create(
            StoreProductWriteDto::fromValidated($validated),
            $request->file('imagenes', []) ?? [],
        );

        return redirect()->route('mostrar.productos')->with('success', 'Producto creado correctamente');
    }

    public function update(Request $request, int $id_producto): RedirectResponse
    {
        $producto = Producto::query()->findOrFail($id_producto);
        $validated = $this->validateProduct($request, requireImagesArray: true);
        $this->catalog->update(
            $producto,
            StoreProductWriteDto::fromValidated($validated, (bool) $producto->eliminado),
            $request->file('imagenes', []) ?? [],
        );

        return redirect()->back()->with('success', 'Producto actualizado correctamente');
    }

    public function desactivarProducto(int $id): RedirectResponse
    {
        $this->catalog->toggleEliminado(Producto::query()->findOrFail($id));

        return redirect()->route('mostrar.productos');
    }

    public function crear(): RedirectResponse
    {
        return redirect()->route('mostrar.productos', ['create' => 1]);
    }

    public function ver(
        int $id,
        Request $request,
        ProductDetailPageService $pageService,
        StorePromoBannerService $promoBanner,
    ): InertiaResponse {
        $producto = Producto::query()->with('imagenes')->findOrFail($id);
        $page = $pageService->forInertia($producto);

        return Inertia::render('ProductoVer', [
            'producto' => $page['producto'],
            'productosRelacionados' => $page['productosRelacionados'],
            'storePromoSlides' => $promoBanner->slidesForInertia(
                excludeProductId: (int) $producto->id,
                viewerUserId: $request->user()?->id,
            ),
            'seo' => $page['seo'],
        ]);
    }

    public function obtenerImagenes(Producto $producto): JsonResponse
    {
        return response()->json(['imagenes' => $this->catalog->imagesForJson($producto)]);
    }

    public function cambiarImagenPrincipal(Request $request, Producto $producto): JsonResponse
    {
        $request->validate([
            'imagen_id' => 'required|integer|exists:imagenes,id',
        ]);

        try {
            $this->catalog->setPrincipalImage($producto, (int) $request->input('imagen_id'));
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['success' => true]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateProduct(Request $request, bool $requireImagesArray = false): array
    {
        $imageRules = $requireImagesArray
            ? [
                'imagenes' => 'nullable|array',
                'imagenes.*' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            ]
            : [
                'imagenes.*' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            ];

        return $request->validate(array_merge([
            'nombre' => 'required|string|max:255',
            'precio' => 'required|numeric',
            'unidades' => 'required|integer',
            'descuento' => 'nullable|numeric',
            'eliminado' => 'nullable|boolean',
            'tags' => 'nullable|array',
            'tags.*' => ['string', Rule::in(ProductTag::values())],
        ], $imageRules));
    }
}
