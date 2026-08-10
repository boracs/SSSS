<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\MoneyCents;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

/**
 * Precio total de una clase particular según el número de personas, a la
 * duración base. Editable desde el admin (Catálogo → Clases particulares).
 */
class PrivateLessonTariff extends Model
{
    protected $table = 'private_lesson_tariffs';

    protected $fillable = [
        'people',
        'price_cents',
        'activo',
    ];

    protected $casts = [
        'people' => 'integer',
        'price_cents' => 'integer',
        'activo' => 'boolean',
    ];

    protected function precio(): Attribute
    {
        return Attribute::make(
            get: fn (): float => MoneyCents::centsToEuros((int) ($this->price_cents ?? 0)),
        );
    }
}
