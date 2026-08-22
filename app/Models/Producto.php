<?php

namespace App\Models;

use App\Enums\ProductTag;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Producto extends Model
{
    use HasFactory;

    /**
     * Los atributos que son asignables en masa.
     *
     * @var array<string>
     */
    protected $fillable = [
        'nombre',
        'precio',
        'unidades',
        'descuento',
        'tags',
        'eliminado',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'eliminado' => 'boolean',
        ];
    }

    /**
     * @param  list<string|null>|null  $tags
     */
    public function syncTags(?array $tags): void
    {
        $this->tags = ProductTag::normalize($tags);
    }

    /**
     * @return list<string>
     */
    public function normalizedTags(): array
    {
        return ProductTag::normalize($this->tags);
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public function tagOptionsForFrontend(): array
    {
        return array_map(
            static fn (string $slug) => [
                'value' => $slug,
                'label' => ProductTag::from($slug)->label(),
            ],
            $this->normalizedTags()
        );
    }

    /**
     * URL pública de una imagen de producto (misma regla en tienda, home y ficha).
     */
    public static function publicImageUrl(?string $ruta): ?string
    {
        if ($ruta === null || trim($ruta) === '') {
            return null;
        }

        $ruta = trim($ruta);

        if (str_starts_with($ruta, 'http://') || str_starts_with($ruta, 'https://')) {
            return $ruta;
        }

        if (str_starts_with($ruta, '/storage/')) {
            return asset(ltrim($ruta, '/'));
        }

        if (str_starts_with($ruta, '/')) {
            return asset(ltrim($ruta, '/'));
        }

        return asset('storage/'.ltrim($ruta, '/'));
    }

    /**
     * Payload mínimo para listados de tienda / home.
     *
     * @return array<string, mixed>
     */
    public function toStorePayload(?string $imagenRuta = null): array
    {
        $imagenUrl = self::publicImageUrl($imagenRuta);

        return [
            'id' => $this->id,
            'nombre' => (string) $this->nombre,
            'precio' => $this->precio,
            'unidades' => (int) $this->unidades,
            'descuento' => $this->descuento,
            'tags' => $this->normalizedTags(),
            'tag_labels' => ProductTag::labelsFor($this->normalizedTags()),
            'imagen' => $imagenUrl,
            'imagenPrincipal' => $imagenUrl,
            'imagen_principal' => $imagenUrl,
        ];
    }

    /**
     * Relación con la tabla pedido_producto (un producto puede estar en muchos pedidos).
     */
    public function pedidoProductos()
    {
        return $this->hasMany(PedidoProducto::class, 'id_producto');
    }

    /**
     * Relación con la tabla carrito_producto (un producto puede estar en muchos carritos).
     */
    public function carritos()
    {
        return $this->belongsToMany(Carrito::class, 'carrito_producto', 'producto_id', 'carrito_id')
                    ->withPivot('cantidad')
                    ->withTimestamps();
    }

    /**
     * Relación directa con los pedidos a través de pedido_producto.
     */
    public function pedidos()
    {
        return $this->belongsToMany(Pedido::class, 'pedido_producto', 'id_producto', 'id_pedido')
                    ->withPivot('cantidad', 'precio_pagado', 'descuento_aplicado')
                    ->withTimestamps();
    }

    /**
     * Relación con imágenes (un producto puede tener muchas imágenes).
     */
    public function imagenes()
    {
        return $this->hasMany(Imagen::class, 'producto_id');
    }
    

    // Para obtener directamente la principal
    public function imagenPrincipal()
    {
        return $this->hasOne(Imagen::class)->where('es_principal', true);
    }
}