<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\MoneyCents;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Representa los planes maestros de la taquilla.
 * Corresponde a la tabla 'planes_taquilla'.
 */
class PlanTaquilla extends Model
{
    use HasFactory;

    protected $table = 'planes_taquilla';

    protected $fillable = [
        'nombre',
        'duracion_dias',
        'precio_total_cents',
        'descripcion',
        'porcentaje_descuento',
        'es_vip',
        'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'es_vip' => 'boolean',
        'duracion_dias' => 'integer',
        'precio_total_cents' => 'integer',
        'porcentaje_descuento' => 'integer',
    ];

    protected function precioTotal(): Attribute
    {
        return Attribute::make(
            get: fn (): float => MoneyCents::centsToEuros((int) ($this->precio_total_cents ?? 0)),
        );
    }

    public function usuariosVigentes()
    {
        return $this->hasMany(User::class, 'id_plan_vigente');
    }

    public function pagosHistoricos()
    {
        return $this->hasMany(PagoCuota::class, 'id_plan_pagado');
    }
}
