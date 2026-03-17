<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    /**
     * Atributos asignables en masa.
     */
    protected $fillable = [
        'role',
        'nombre',
        'apellido',
        'email',
        'telefono',
        'numeroTaquilla',
        'credits_balance',
        'password',
        'fecha_vencimiento_cuota',
        'id_plan_vigente',
    ];

    protected $attributes = [
        'role' => 'user',
    ];

    /**
     * Atributos ocultos para serialización.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Casteos.
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'fecha_vencimiento_cuota' => 'datetime',
    ];

    // ===================================
    // RELACIONES EXISTENTES
    // ===================================

    public function pedidos()
    {
        return $this->hasMany(Pedido::class, 'id_usuario');
    }

    public function carrito()
    {
        return $this->hasOne(Carrito::class, 'id_usuario');
    }

    public function productos()
    {
        return $this->belongsToMany(Producto::class)
                    ->withPivot('cantidad', 'descuento_aplicado', 'precio_pagado');
    }

    // ===================================
    // RELACIONES DEL SISTEMA DE TAQUILLA
    // ===================================

    /**
     * Relación explícita: Un usuario tiene muchos pagos de cuota.
     */
    public function pagosCuotas(): HasMany
    {
        return $this->hasMany(PagoCuota::class, 'user_id')->orderByDesc('periodo_fin');
    }

    /**
     * Relación: Plan vigente del usuario.
     */
    public function planVigente(): BelongsTo
    {
        return $this->belongsTo(PlanTaquilla::class, 'id_plan_vigente');
    }

    // ===================================
    // ACADEMIA: CRÉDITOS Y CLASES
    // ===================================

    public function lessons(): BelongsToMany
    {
        return $this->belongsToMany(Lesson::class, 'lesson_user')
            ->withPivot(['credits_locked', 'status', 'cancelled_at', 'surf_trip_confirmed'])
            ->withTimestamps();
    }

    public function lessonEnrollments(): HasMany
    {
        return $this->hasMany(LessonUser::class, 'user_id');
    }

    public function creditTransactions(): HasMany
    {
        return $this->hasMany(CreditTransaction::class, 'user_id');
    }

    public function staffAssignments(): HasMany
    {
        return $this->hasMany(StaffAssignment::class, 'user_id');
    }

    // ===================================
    // ACCESORES (LOGICA DE NEGOCIO)
    // ===================================

    /**
     * Comprueba si el usuario es socio (tiene taquilla asignada)
     */
    protected function esSocio(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->numeroTaquilla !== null,
        );
    }

    /**
     * Comprueba si el socio tiene cuota vigente
     */
    protected function cuotaVigente(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->es_socio &&
                          $this->fecha_vencimiento_cuota &&
                          $this->fecha_vencimiento_cuota->greaterThanOrEqualTo(Carbon::today()),
        );
    }

    // ===================================
    // SCOPES
    // ===================================

    /**
     * Socios con cuota vigente
     */
    public function scopeVigentes(Builder $query): void
    {
        $query->whereNotNull('numeroTaquilla')
              ->whereDate('fecha_vencimiento_cuota', '>=', Carbon::today());
    }

    /**
     * Socios con cuota vencida
     */
    public function scopeEnMora(Builder $query): void
    {
        $query->whereNotNull('numeroTaquilla')
              ->whereDate('fecha_vencimiento_cuota', '<', Carbon::today());
    }
}
