<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Surfboard extends Model
{
    use HasFactory;

    public const CATEGORY_HARD = 'hard';
    public const CATEGORY_SOFT = 'soft';

    protected $fillable = [
        'price_schema_id',
        'category',
        'is_active',
        'name',
        'slug',
        'image_url',
        'image_alt',
        'description',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected $appends = ['first_image_url'];

    /**
     * URL pública de la primera imagen (Storage::url) para uso en frontend.
     */
    public function getFirstImageUrlAttribute(): ?string
    {
        if (empty($this->image_url)) {
            return null;
        }
        $paths = is_string($this->image_url) ? json_decode($this->image_url, true) : $this->image_url;
        if (! is_array($paths) || empty($paths)) {
            $single = is_string($this->image_url) ? $this->image_url : null;
            if ($single && ! str_starts_with($single, 'http')) {
                return Storage::disk('public')->url($single);
            }
            return $single;
        }
        $first = $paths[0];
        if (! is_string($first)) {
            return null;
        }
        if (str_starts_with($first, 'http')) {
            return $first;
        }
        return Storage::disk('public')->url($first);
    }

    protected static function booted(): void
    {
        static::deleting(function (Surfboard $surfboard) {
            $surfboard->deleteImagesFromDisk();
        });
    }

    public function priceSchema(): BelongsTo
    {
        return $this->belongsTo(PriceSchema::class, 'price_schema_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'surfboard_id');
    }

    /**
     * Elimina del disco public los archivos referenciados en image_url (paths locales).
     */
    protected function deleteImagesFromDisk(): void
    {
        if (empty($this->image_url)) {
            return;
        }

        $paths = is_string($this->image_url)
            ? json_decode($this->image_url, true)
            : $this->image_url;

        if (! is_array($paths)) {
            $paths = [$this->image_url];
        }

        foreach ($paths as $path) {
            if (is_string($path) && ! str_starts_with($path, 'http')) {
                Storage::disk('public')->delete($path);
            }
        }
    }
}
