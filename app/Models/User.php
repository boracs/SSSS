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
use App\Support\VipVirtualLocker;
use Illuminate\Contracts\Auth\MustVerifyEmail as MustVerifyEmailContract;
use Illuminate\Auth\MustVerifyEmail;
use App\Notifications\VerifyEmail as VerifyEmailNotification;

class User extends Authenticatable implements MustVerifyEmailContract
{
    use HasFactory, Notifiable, MustVerifyEmail;

    /**
     * Envía la notificación de verificación de email encolada.
     */
    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new VerifyEmailNotification());
    }

    /**
     * Atributos asignables en masa.
     */
    protected $fillable = [
        'role',
        'is_vip',
        'nombre',
        'apellido',
        'email',
        'google_id',
        'telefono',
        'numeroTaquilla',
        'taquilla_baja_solicitada_at',
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
        'taquilla_baja_solicitada_at' => 'datetime',
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

    public function emergencyKeyRequests(): HasMany
    {
        return $this->hasMany(EmergencyKeyRequest::class, 'user_id')->orderByDesc('requested_at');
    }

    public function latestAttendanceNote(): HasOne
    {
        return $this->hasOne(AttendanceNote::class, 'user_id')->latestOfMany();
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
     * Taquilla física en el club (excluye taquillas compartidas #500, #600…).
     */
    public function hasPhysicalLocker(): bool
    {
        $numero = $this->numeroTaquilla;

        if ($numero === null || $numero === '' || $numero === '0' || $numero === 0) {
            return false;
        }

        return ! VipVirtualLocker::isShared($numero);
    }

    /**
     * Taquilla compartida asignada manualmente (descuento tienda sin cuota de casillero).
     */
    public function hasSharedLocker(): bool
    {
        return VipVirtualLocker::isShared($this->numeroTaquilla);
    }

    /** @deprecated Usar hasSharedLocker */
    public function hasVirtualLockerOnly(): bool
    {
        return $this->hasSharedLocker();
    }

    /**
     * Puede comprar en tienda con descuento de socio.
     */
    public function canAccessStoreWithMemberDiscount(): bool
    {
        if ($this->hasSharedLocker()) {
            return true;
        }

        return $this->hasPhysicalLocker() && $this->isLockerPaymentUpToDate();
    }

    /**
     * Número de taquilla asignado (físico o compartido).
     */
    public function hasActiveLocker(): bool
    {
        return $this->hasPhysicalLocker() || $this->hasSharedLocker();
    }

    /**
     * Subastas S4: acceso para socios VIP o con taquilla asignada.
     */
    public function canAccessAuctions(): bool
    {
        return (bool) $this->is_vip || $this->hasActiveLocker();
    }

    /**
     * Verificación estricta para semáforos visuales (no bloqueante).
     * true => tiene pago confirmado y fecha vigente.
     */
    public function isLockerPaymentUpToDate(): bool
    {
        if ($this->hasSharedLocker()) {
            return true;
        }

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
