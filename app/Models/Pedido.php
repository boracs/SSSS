<?php

namespace App\Models;

use App\Support\MoneyCents;
use Illuminate\Database\Eloquent\Casts\Attribute;
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
        'guest_name',
        'guest_email',
        'precio_total_cents',
        'pagado',
        'entregado',
        'payment_proof_path',
        'payment_method',
        'proof_uploaded_at',
        'fecha_entrega',
    ];

    protected $casts = [
        'proof_uploaded_at' => 'datetime',
        'precio_total_cents' => 'integer',
    ];

    /**
     * Expone el total en euros (cálculo exacto desde céntimos) para la API y el front.
     */
    protected function precioTotal(): Attribute
    {
        return Attribute::get(fn (): float => MoneyCents::centsToEuros((int) ($this->precio_total_cents ?? 0)));
    }

    /**
     * Relación con la tabla de usuarios (un pedido pertenece a un usuario).
     */
    public function usuario()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function displayName(): string
    {
        $guest = trim((string) ($this->guest_name ?? ''));
        if ($guest !== '') {
            return $guest;
        }

        $usuario = $this->usuario;

        return trim((string) (($usuario?->nombre ?? '').' '.($usuario?->apellido ?? '')));
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
            ->withPivot('cantidad', 'descuento_aplicado', 'precio_pagado_cents') // Incluye las columnas adicionales de la tabla pivote
            ->withTimestamps(); // Registra las marcas de tiempo en la tabla pivote
    }
}
