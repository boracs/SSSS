<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\UniqueConstraintViolationException;

class Carrito extends Model
{
    use HasFactory;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
    ];

    public function usuario()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function productos()
    {
        return $this->belongsToMany(Producto::class, 'carrito_producto')->withPivot('cantidad')->withTimestamps();
    }

    /**
     * Un usuario = un carrito. Si $lock, requiere transacción abierta.
     */
    public static function forUser(int $userId, bool $lock = false): self
    {
        $query = static::query()->where('user_id', $userId);
        if ($lock) {
            $query->lockForUpdate();
        }

        $carrito = $query->first();
        if ($carrito) {
            return $carrito;
        }

        try {
            return static::query()->create(['user_id' => $userId]);
        } catch (UniqueConstraintViolationException) {
            $retry = static::query()->where('user_id', $userId);
            if ($lock) {
                $retry->lockForUpdate();
            }

            return $retry->firstOrFail();
        }
    }
}
