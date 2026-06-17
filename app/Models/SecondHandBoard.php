<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SecondHandStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SecondHandBoard extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'brand',
        'description',
        'height',
        'width',
        'thickness',
        'volume',
        'purchase_price',
        'sale_price',
        'discount_pct',
        'status',
        'images',
        'purchased_at',
        'sold_at',
    ];

    protected $casts = [
        'status'         => SecondHandStatus::class,
        'images'         => 'array',
        'purchased_at'   => 'datetime',
        'sold_at'        => 'datetime',
        'height'         => 'float',
        'width'          => 'float',
        'thickness'      => 'float',
        'volume'         => 'float',
        'purchase_price' => 'integer',
        'sale_price'     => 'integer',
        'discount_pct'   => 'integer',
    ];

    // Scopes

    public function scopeAvailable(Builder $query): Builder
    {
        return $query->where('status', SecondHandStatus::AVAILABLE->value);
    }

    public function scopeReserved(Builder $query): Builder
    {
        return $query->where('status', SecondHandStatus::RESERVED->value);
    }

    public function scopeSold(Builder $query): Builder
    {
        return $query->where('status', SecondHandStatus::SOLD->value);
    }

    public function scopePublicCatalog(Builder $query): Builder
    {
        return $query->orderByRaw("FIELD(status, 'available', 'reserved', 'sold')")
                     ->orderBy('id', 'desc');
    }

    // Helpers

    public function effectiveSalePrice(): int
    {
        if ($this->discount_pct <= 0) {
            return $this->sale_price;
        }
        return (int) round($this->sale_price * (1 - $this->discount_pct / 100));
    }

    public function firstImage(): ?string
    {
        $images = $this->images ?? [];
        return $images[0] ?? null;
    }

    /**
     * DTO sanitizado para el catalogo publico.
     * Excluye purchase_price y datos de auditoria financiera.
     *
     * @return array<string, mixed>
     */
    public function toPublicArray(): array
    {
        return [
            'id'              => $this->id,
            'name'            => $this->name,
            'brand'           => $this->brand,
            'description'     => $this->description,
            'height'          => $this->height,
            'width'           => $this->width,
            'thickness'       => $this->thickness,
            'volume'          => $this->volume,
            'sale_price'      => $this->sale_price,
            'discount_pct'    => $this->discount_pct,
            'effective_price' => $this->effectiveSalePrice(),
            'status'          => $this->status->value,
            'status_label'    => $this->status->label(),
            'images'          => array_map(
                fn (string $p) => asset('storage/' . $p),
                $this->images ?? []
            ),
            'first_image'     => $this->firstImage()
                ? asset('storage/' . $this->firstImage())
                : null,
            'sold_at'         => $this->sold_at?->toDateString(),
        ];
    }
}