<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PhotoSession extends Model
{
    protected $fillable = [
        'nombre',
        'descripcion',
        'precio_cents',
        'plus_por_persona_cents',
        'duracion_minutos',
        'capacidad_maxima',
        'fotografo_user_id',
        'activo',
    ];

    protected $casts = [
        'precio_cents' => 'integer',
        'plus_por_persona_cents' => 'integer',
        'duracion_minutos' => 'integer',
        'capacidad_maxima' => 'integer',
        'activo' => 'boolean',
    ];

    /** Precio total congelable: base + (personas × plus). */
    public function quotePriceCents(int $partySize): int
    {
        $n = max(1, $partySize);

        return (int) $this->precio_cents + ($n * (int) $this->plus_por_persona_cents);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(PhotoSessionBooking::class, 'photo_session_id');
    }

    public function fotografo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fotografo_user_id');
    }

    public function scopeActive($query)
    {
        return $query->where('activo', true);
    }
}
