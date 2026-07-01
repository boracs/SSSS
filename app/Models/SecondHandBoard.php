<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SecondHandStatus;
use App\Enums\SecondHandBoardType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SecondHandBoard extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'brand',
        'model',
        'board_type',
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
        'board_type'     => SecondHandBoardType::class,
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
        return $query
            ->whereIn('status', [
                SecondHandStatus::AVAILABLE->value,
                SecondHandStatus::RESERVED->value,
            ])
            ->orderByRaw("FIELD(status, 'available', 'reserved')")
            ->orderBy('id', 'desc');
    }

    /**
     * Filtros combinados del listado admin (search, status, board_type, rango de fechas).
     *
     * @param  array<string, mixed>  $filters
     */
    public function scopeAdminFilters(Builder $query, array $filters): Builder
    {
        $search    = trim((string) ($filters['search'] ?? ''));
        $status    = trim((string) ($filters['status'] ?? ''));
        $boardType = trim((string) ($filters['board_type'] ?? ''));
        $dateType  = trim((string) ($filters['date_type'] ?? 'created'));
        $dateFrom  = trim((string) ($filters['date_from'] ?? ''));
        $dateTo    = trim((string) ($filters['date_to'] ?? ''));

        if (! in_array($dateType, ['created', 'sold'], true)) {
            $dateType = 'created';
        }

        return $query
            ->when($search !== '', function (Builder $q) use ($search): void {
                $term = '%' . $search . '%';
                $q->where(function (Builder $sub) use ($term): void {
                    $sub->where('brand', 'like', $term)
                        ->orWhere('model', 'like', $term);
                });
            })
            ->when(
                $status !== '' && SecondHandStatus::tryFrom($status) !== null,
                fn (Builder $q) => $q->where('status', $status)
            )
            ->when(
                $boardType !== '' && SecondHandBoardType::tryFrom($boardType) !== null,
                fn (Builder $q) => $q->where('board_type', $boardType)
            )
            ->when(
                $dateFrom !== '' && strtotime($dateFrom) !== false,
                function (Builder $q) use ($dateFrom, $dateType): void {
                    if ($dateType === 'sold') {
                        $q->whereDate('sold_at', '>=', $dateFrom);
                    } else {
                        $q->whereRaw('COALESCE(DATE(purchased_at), DATE(created_at)) >= ?', [$dateFrom]);
                    }
                }
            )
            ->when(
                $dateTo !== '' && strtotime($dateTo) !== false,
                function (Builder $q) use ($dateTo, $dateType): void {
                    if ($dateType === 'sold') {
                        $q->whereDate('sold_at', '<=', $dateTo);
                    } else {
                        $q->whereRaw('COALESCE(DATE(purchased_at), DATE(created_at)) <= ?', [$dateTo]);
                    }
                }
            );
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
            'model'           => $this->model,
            'board_type'      => $this->board_type?->value,
            'board_type_label'=> $this->board_type?->label(),
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
                fn (string $p) => self::publicImageUrl($p),
                $this->images ?? []
            ),
            'first_image'     => $this->firstImage()
                ? self::publicImageUrl($this->firstImage())
                : null,
            'sold_at'         => $this->sold_at?->toDateString(),
        ];
    }

    public static function publicImageUrl(string $path): string
    {
        $path = ltrim($path, '/');

        if (str_starts_with($path, 'img/') || str_starts_with($path, 'images/')) {
            return asset($path);
        }

        return asset('storage/' . $path);
    }
}