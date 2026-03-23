<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pedido extends Model
{
    use HasFactory;

    /**
     * Los atributos que son asignables en masa.
     *
     * @var array<string>
     */
    protected $fillable = [
        'user_id',
        'precio_total',
        'pagado',
        'entregado',
    ];

    /**
     * Relación con la tabla de usuarios (un pedido pertenece a un usuario).
     */
    public function usuario()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Relación con la tabla de pedido_producto (un pedido puede contener muchos productos).
     */
    public function pedidoProductos()
    {
        return $this->hasMany(PedidoProducto::class, 'id_pedido');
    }

    /**
     * Relación de muchos a muchos con productos a través de la tabla pivote pedido_producto.
     */
    public function productos()
    {
        return $this->belongsToMany(Producto::class, 'pedido_producto', 'id_pedido', 'id_producto')
            ->withPivot('cantidad', 'descuento_aplicado', 'precio_pagado') // Incluye las columnas adicionales de la tabla pivote
            ->withTimestamps(); // Registra las marcas de tiempo en la tabla pivote
    }
}