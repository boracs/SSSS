<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PriceSchema extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'price_1h',
        'price_2h',
        'price_4h',
        'price_12h',
        'price_24h',
        'price_48h',
        'price_72h',
        'price_week',
    ];

    protected $casts = [
        'price_1h' => 'decimal:2',
        'price_2h' => 'decimal:2',
        'price_4h' => 'decimal:2',
        'price_12h' => 'decimal:2',
        'price_24h' => 'decimal:2',
        'price_48h' => 'decimal:2',
        'price_72h' => 'decimal:2',
        'price_week' => 'decimal:2',
    ];

    public function surfboards(): HasMany
    {
        return $this->hasMany(Surfboard::class, 'price_schema_id');
    }

    /**
     * Precios indexados por duración en horas (para cálculo progresivo).
     */
    public function getPricesByDuration(): array
    {
        return [
            1   => (float) $this->price_1h,
            2   => (float) $this->price_2h,
            4   => (float) $this->price_4h,
            12  => (float) $this->price_12h,
            24  => (float) $this->price_24h,
            48  => (float) $this->price_48h,
            72  => (float) $this->price_72h,
            168 => (float) $this->price_week, // 7 días
        ];
    }
}
