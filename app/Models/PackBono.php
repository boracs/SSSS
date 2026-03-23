<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PackBono extends Model
{
    protected $table = 'pack_bonos';

    protected $fillable = [
        'nombre',
        'num_clases',
        'precio',
        'activo',
    ];

    protected $casts = [
        'precio' => 'decimal:2',
        'activo' => 'boolean',
    ];

    public function userBonos(): HasMany
    {
        return $this->hasMany(UserBono::class, 'pack_id');
    }
}

