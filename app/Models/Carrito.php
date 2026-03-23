<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Carrito extends Model
{
    use HasFactory;

    /**
     * Los atributos que son asignables en masa.
     *
     * @var array<string>
     */
    protected $fillable = [
        'user_id',
    ];

    /**
     * Relación con la tabla de usuarios (un carrito pertenece a un usuario).
     */
    public function usuario()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Relación con la tabla de productos (un carrito puede contener muchos productos).
     */

    
    public function productos()
    {
        return $this->belongsToMany(Producto::class, 'carrito_producto')->withPivot('cantidad')->withTimestamps();
    }

    
}





