<?php

namespace App\Models;

use App\Services\Media\CatalogImageService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Surfboard extends Model
{
    use HasFactory;

    public const CATEGORY_SOFT = 'soft';
    public const CATEGORY_HARD_BASIC = 'hard_basic';
    public const CATEGORY_HARD_PRO = 'hard_pro';

    /** @var list<string> */
    public const CATEGORIES = [
        self::CATEGORY_SOFT,
        self::CATEGORY_HARD_BASIC,
        self::CATEGORY_HARD_PRO,
    ];

    private const CATEGORY_LABELS = [
        self::CATEGORY_SOFT => 'Softboards',
        self::CATEGORY_HARD_BASIC => 'Hard boards',
        self::CATEGORY_HARD_PRO => 'Premium boards',
    ];

    public static function categoryLabel(?string $category): string
    {
        return self::CATEGORY_LABELS[$category] ?? 'Tabla de alquiler';
    }

    protected $fillable = [
        'price_schema_id',
        'category',
        'is_active',
        'name',
        'slug',
        'image_url',
        'image_alt',
        'description',
        'altura',
        'ancho',
        'grosor',
        'volumen',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'volumen' => 'float',
    ];

    protected $appends = ['first_image_url', 'first_thumb_url'];

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

    public function getFirstThumbUrlAttribute(): ?string
    {
        $master = $this->firstStoredLocalPath();
        if ($master === null) {
            return $this->first_image_url;
        }

        return app(CatalogImageService::class)->publicThumbUrl($master);
    }

    private function firstStoredLocalPath(): ?string
    {
        if (empty($this->image_url)) {
            return null;
        }
        $paths = is_string($this->image_url) ? json_decode($this->image_url, true) : $this->image_url;
        if (! is_array($paths) || empty($paths)) {
            $single = is_string($this->image_url) ? $this->image_url : null;
            if ($single && ! str_starts_with($single, 'http')) {
                return ltrim($single, '/');
            }

            return null;
        }
        $first = $paths[0];
        if (! is_string($first) || str_starts_with($first, 'http')) {
            return null;
        }

        return ltrim($first, '/');
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
                app(CatalogImageService::class)->deletePair($path);
            }
        }
    }
}
