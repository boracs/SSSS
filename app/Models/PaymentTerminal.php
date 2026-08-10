<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentTerminal extends Model
{
    protected $fillable = [
        'codigo',
        'nombre',
        'activo',
        'emite_ticketbai_propio',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'emite_ticketbai_propio' => 'boolean',
    ];

    public function payments(): HasMany
    {
        return $this->hasMany(DatafonoPayment::class, 'payment_terminal_id');
    }

    public function scopeActive($query)
    {
        return $query->where('activo', true);
    }
}
