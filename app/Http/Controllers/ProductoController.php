<?php

namespace App\Http\Controllers;
use Illuminate\Http\Request;
use App\Models\Producto;
use App\Models\Imagen;
use App\Enums\ProductTag;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProductoController extends Controller
{
    /**
     * @return array<string, mixed>
     */
    private function tagValidationRules(): array
    {
        return [
            'tags' => 'nullable|array',
            'tags.*' => ['string', Rule::in(ProductTag::values())],
        ];
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    private function productTagOptions(): array
    {
        return ProductTag::optionsForFrontend();
    }
    /**
     * Actualizar un producto existente
     */
public function update(Request $request, $id_producto)
    {
        // Usamos findOrFail con el nombre de variable consistente: $id_producto
        $producto = Producto::findOrFail($id_producto); 

        // 1. Validación
        $request->validate(array_merge([
            'nombre' => 'required|string|max:255',
            'precio' => 'required|numeric',
            'unidades' => 'required|integer',
            'descuento' => 'nullable|numeric',
            'eliminado' => 'nullable|boolean', 
            'imagenes' => 'nullable|array',
            'imagenes.*' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048',
        ], $this->tagValidationRules()));

        $producto->update([
            'nombre' => $request->input('nombre'),
            'precio' => $request->input('precio'),
            'unidades' => $request->input('unidades'),
            'descuento' => $request->input('descuento', 0),
            'eliminado' => $request->input('eliminado', $producto->eliminado),
        ]);
        $producto->syncTags($request->input('tags'));
        $producto->save();

        // 3. Procesar imágenes:
        // El bloque se ejecuta SOLO si hay archivos nuevos. 
        // Si no hay archivos, este bloque se salta y se mantienen las imágenes existentes.
        if ($request->hasFile('imagenes')) {

            // A. Eliminar imágenes antiguas (archivos y registros en DB)
            foreach ($producto->imagenes as $imagen) {
                // Eliminar el archivo del disco de almacenamiento
                if (Storage::disk('public')->exists($imagen->ruta)) {
                    Storage::disk('public')->delete($imagen->ruta);
                }
                // Eliminar el registro de la base de datos
                $imagen->delete();
            }

            // B. Subir imágenes nuevas
            foreach ($request->file('imagenes') as $index => $image) {
                $imagePath = $image->store('productos', 'public');

                $producto->imagenes()->create([
                    'nombre' => $image->getClientOriginalName(),
                    'ruta' => $imagePath,
                    // Si se sube una nueva tanda, la primera siempre será la principal
                    'es_principal' => $index === 0, 
                ]);
            }
        }

        // 4. Redirección
       return redirect()->back()
    ->with('success', 'Producto actualizado correctamente');
    }








    /**--------------------------------------------------------------------------------------------------------
     * ---------------------------Mostrar los 4 productos con mayor descuento ---------------------------------
       -------------------------------------------------------------------------------------------------------
     */
    public function index()
    {
        // Obtener los 4 productos con mayor descuento, con imágenes
        $productos = Producto::with('imagenes')
            ->orderBy('descuento', 'desc')
            ->take(4)
            ->get();

        // Pasar los productos al componente de Inertia
        return Inertia::render('Productos', [
            'productos' => $productos,
        ]);
    }

    /**
     * Mostrar todos los productos
     */


public function mostrarProductos(Request $request)
{
    // 🔑 CLAVE: Ahora el prop 'productos' está envuelto en un closure (función anónima)
    // Se ejecutará SÓLO si es la primera carga de la página O si se pide una recarga parcial con 'only: ["productos"]'.
    return Inertia::render('Productos', [
        'openCreateModal' => $request->boolean('create'),
        'productos' => fn () => Producto::with('imagenes')->get()->map(function ($producto) {
            $imagenPrincipal = $producto->imagenes->firstWhere('es_principal', 1);

            return [
                'id' => $producto->id,
                'nombre' => $producto->nombre,
                'precio' => $producto->precio,
                'unidades' => $producto->unidades,
                'descuento' => $producto->descuento,
                'eliminado' => $producto->eliminado,
                'tags' => $producto->normalizedTags(),
                'tag_labels' => ProductTag::labelsFor($producto->normalizedTags()),
                'imagen_principal' => $imagenPrincipal ? asset('storage/' . $imagenPrincipal->ruta) : null,
            ];
        }),
        'productTagOptions' => $this->productTagOptions(),
    ]);
}



    /**
     * Activar o desactivar un producto
     */

                //  Activar o desactivar un producto (Toggle el campo 'eliminado').
            /*
                    *  ESTRATEGIA DE SINCRONIZACIÓN:
                    * --------------------------------
                    * 1. PERSISTENCIA (BACKEND): Esta función realiza la actualización real del campo
                    * 'eliminado' en la base de datos (fuente de verdad).
                    *
                    * 2. LÓGICA DUPLICADA (FRONTEND): En el componente React, existe una **lógica duplicada**
                    * que actualiza el estado 'productos' de forma manual (setProductos) para darle
                    * inmediatez al usuario.
                    *
                    * 3. SINCRONIZACIÓN FORZADA: El 'return redirect()->route(...)' fuerza a Inertia a realizar
                    * una recarga COMPLETA, lo que garantiza que la lista de productos del frontend
                    * finalmente se sincronice con el estado correcto de la BD.
                    *
                    * ⚠️ RIESGO: Si la lógica de 'toggle' cambia aquí (por ejemplo, afecta a otros campos),
                    * es **IMPRESCINDIBLE** que la lógica de actualización manual en el frontend (setProductos)
                    * se modifique de la misma manera para evitar que la interfaz 'mienta' hasta que
                    * se produzca la recarga completa.
            */
            public function desactivarProducto($id)
            {
                $producto = Producto::findOrFail($id);

                // Cambiar el estado de "eliminado"
                $producto->eliminado = !$producto->eliminado;  // Cambia entre true y false
                $producto->save();

                // Retornar la redirección con el nombre del producto
                return redirect()->route('mostrar.productos');
            }

            /**
             * Mostrar la vista de crear producto
             */
            public function MostrarCrearProducto(Request $request)
            {
                // Validación y creación de un nuevo producto
                $producto = Producto::create($request->all());

                // Después de crear el producto, redirigimos a la vista de React
                return view('productos.crear', compact('producto'));
            }

     /**
      * Crear un nuevo producto con sus imagenenes
    */

    
public function store(Request $request)
{
    // Validar los campos del producto
    $request->validate(array_merge([
        'nombre' => 'required|string|max:255',
        'precio' => 'required|numeric',
        'unidades' => 'required|integer',
        'descuento' => 'nullable|numeric',
        'eliminado' => 'nullable|boolean',
        'imagenes.*' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048',
    ], $this->tagValidationRules()));

    $producto = new Producto();
    $producto->fill([
        'nombre' => $request->input('nombre'),
        'precio' => $request->input('precio'),
        'unidades' => $request->input('unidades'),
        'descuento' => $request->input('descuento', 0),
        'eliminado' => $request->input('eliminado', false),
    ]);
    $producto->syncTags($request->input('tags'));
    $producto->save();

    // Procesar múltiples imágenes (si existen)
    if ($request->hasFile('imagenes')) {
        foreach ($request->file('imagenes') as $index => $image) {
            $imagePath = $image->store('productos', 'public');

            $imagen = new Imagen();
            $imagen->nombre = $image->getClientOriginalName();
            $imagen->ruta = $imagePath;
            $imagen->producto_id = $producto->id;
            $imagen->es_principal = $index === 0; // la primera subida es la principal
            $imagen->save();
        }
    }

    // Redirigir a la lista de productos (Productos.jsx)
    return redirect()->route('mostrar.productos')->with('success', 'Producto creado correctamente');
}









    /**
     * Ver un producto en detalle
     */
public function ver($id)
{
    $producto = Producto::with('imagenes')->findOrFail($id);
    $usuario = auth()->user();

    $imagenes = $producto->imagenes->map(fn ($img) => [
        'id' => $img->id,
        'ruta' => asset('storage/'.$img->ruta),
        'es_principal' => (bool) $img->es_principal,
    ])->sortByDesc('es_principal')->values();

    $productoParaFrontend = [
        'id' => $producto->id,
        'nombre' => $producto->nombre,
        'precio' => $producto->precio,
        'unidades' => $producto->unidades,
        'descuento' => $producto->descuento,
        'tags' => $producto->normalizedTags(),
        'tag_labels' => ProductTag::labelsFor($producto->normalizedTags()),
        'imagenes' => $imagenes,
        'imagen_principal' => $imagenes->first()['ruta'] ?? asset('img/placeholder.jpg'),
    ];

    $currentTags = $producto->normalizedTags();

    $productosRelacionados = Producto::query()
        ->where('eliminado', 0)
        ->where('id', '!=', $producto->id)
        ->with(['imagenPrincipal:id,producto_id,ruta,nombre,es_principal'])
        ->get()
        ->map(static function (Producto $p): array {
            $ruta = $p->imagenPrincipal?->ruta ?? $p->imagenPrincipal?->nombre;

            return [
                'id' => $p->id,
                'nombre' => (string) $p->nombre,
                'precio' => $p->precio,
                'unidades' => (int) $p->unidades,
                'descuento' => $p->descuento,
                'tags' => $p->normalizedTags(),
                'imagen' => $ruta !== null && $ruta !== '' ? (string) $ruta : null,
                '_tag_score' => 0,
            ];
        })
        ->map(static function (array $row) use ($currentTags): array {
            if ($currentTags === []) {
                $row['_tag_score'] = 0;

                return $row;
            }

            $row['_tag_score'] = count(array_intersect($row['tags'], $currentTags));

            return $row;
        })
        ->sort(static function (array $a, array $b): int {
            if ($a['_tag_score'] !== $b['_tag_score']) {
                return $b['_tag_score'] <=> $a['_tag_score'];
            }

            return ((float) ($b['descuento'] ?? 0)) <=> ((float) ($a['descuento'] ?? 0));
        })
        ->take(12)
        ->map(static function (array $row): array {
            unset($row['_tag_score'], $row['tags']);

            return $row;
        })
        ->values()
        ->all();

    return Inertia::render('ProductoVer', [
        'producto' => $productoParaFrontend,
        'usuario' => $usuario,
        'productosRelacionados' => $productosRelacionados,
        'productTagOptions' => $this->productTagOptions(),
    ]);
}





    // CREAR PRODUCTO 

public function crear()
{
    return redirect()->route('mostrar.productos', ['create' => 1]);
}



//OBTENER IMAGENES DEL PRODUCTO SELECCIONADO
public function obtenerImagenes(Producto $producto)
{
    $imagenes = $producto->imagenes->map(fn($img) => [
        'id' => $img->id,
        'url' => asset('storage/' . $img->ruta),
        'es_principal' => $img->es_principal,
    ]);

    // Reordenamos para que la principal vaya al principio
    $imagenes = $imagenes->sortByDesc('es_principal')->values();

    return response()->json(['imagenes' => $imagenes]);
}


//CAMBIAR LA IMAGENE PRINCIPAL
public function cambiarImagenPrincipal(Request $request, Producto $producto)
{

     $request->validate([
        'imagen_id' => 'required|integer|exists:imagenes,id',
    ]);

    $imagenId = $request->input('imagen_id');

    // Resetear la principal actual
    $producto->imagenes()->update(['es_principal' => 0]);

    // Asignar nueva principal
    $producto->imagenes()->where('id', $imagenId)->update(['es_principal' => 1]);

    return response()->json(['success' => true]);
}













}