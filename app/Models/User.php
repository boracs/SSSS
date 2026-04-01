<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    /**
     * Atributos asignables en masa.
     */
    protected $fillable = [
        'role',
        'is_vip',
        'nombre',
        'apellido',
        'email',
        'telefono',
        'numeroTaquilla',
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
        'is_vip' => 'boolean',
        'fecha_vencimiento_cuota' => 'datetime',
    ];

    // ===================================
    // RELACIONES EXISTENTES
    // ===================================

    public function pedidos()
    {
        return $this->hasMany(Pedido::class, 'user_id');
    }

    public function carrito()
    {
        return $this->hasOne(Carrito::class, 'user_id');
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

    public function userBonos(): HasMany
    {
        return $this->hasMany(UserBono::class, 'user_id');
    }

    public function attendanceNotes(): HasMany
    {
        return $this->hasMany(AttendanceNote::class, 'user_id')->orderByDesc('created_at');
    }

    public function latestAttendanceNote(): HasOne
    {
        return $this->hasOne(AttendanceNote::class, 'user_id')->latestOfMany();
    }

    /**
     * VIP con bono confirmado y pocas clases restantes (alerta renovación).
     */
    public function scopeNeedsRenewal(Builder $query): void
    {
        $query->where('is_vip', true)
            ->whereHas('userBonos', function (Builder $q) {
                $q->where('status', UserBono::STATUS_CONFIRMED)
                    ->where('clases_restantes', '<=', 3);
            });
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

    /**
     * Regla de negocio de tienda: solo compra finalizable con taquilla activa.
     */
    public function hasActiveLocker(): bool
    {
        return ! empty($this->numeroTaquilla);
    }

    /**
     * Verificación estricta para semáforos visuales (no bloqueante).
     * true => tiene pago confirmado y fecha vigente.
     */
    public function isLockerPaymentUpToDate(): bool
    {
        if (empty($this->numeroTaquilla) || empty($this->fecha_vencimiento_cuota)) {
            return false;
        }

        $expiresAt = $this->fecha_vencimiento_cuota instanceof Carbon
            ? $this->fecha_vencimiento_cuota
            : Carbon::parse((string) $this->fecha_vencimiento_cuota);

        $hasConfirmedPayment = $this->pagosCuotas()
            ->where('status', PagoCuota::STATUS_CONFIRMED)
            ->whereDate('periodo_fin', '>=', Carbon::today())
            ->exists();

        return $hasConfirmedPayment && ($expiresAt->isSameDay(Carbon::today()) || $expiresAt->isFuture());
    }
}
