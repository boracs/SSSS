<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PedidoProducto extends Model
{
    use HasFactory;

    /**
     * Los atributos que son asignables en masa.
     *
     * @var array<string>
     */
    protected $fillable = [
        'id_pedido',
        'id_producto',
        'cantidad',
        'descuento_aplicado',
        'precio_pagado_cents',
    ];

    protected $casts = [
        'cantidad' => 'integer',
        'precio_pagado_cents' => 'integer',
    ];

    /**
     * Relación con la tabla de pedidos (un registro de pedido_producto pertenece a un pedido).
     */
    public function pedido()
    {
        return $this->belongsTo(Pedido::class, 'id_pedido');
    }

    /**
     * Relación con la tabla de productos (un registro de pedido_producto pertenece a un producto).
     */
    public function producto()
    {
        return $this->belongsTo(Producto::class, 'id_producto');
    }
}
