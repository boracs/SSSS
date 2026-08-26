<?php

declare(strict_types=1);

namespace App\DTOs\Store;

use App\Enums\SecondHandBoardType;
use Illuminate\Http\Request;

/**
 * Filtros públicos del catálogo de segunda mano (query string).
 */
readonly class SecondHandCatalogFilters
{
    public const HEIGHT_ALL = 'all';

    public const VOLUME_ALL = 'all';

    public const PRICE_ALL = 'all';

    public const TYPE_ALL = 'all';

    /**
     * @param  'all'|'short'|'mid-short'|'mid-long'|'long'  $height
     * @param  'all'|'low'|'mid-low'|'mid'|'high'  $volume
     * @param  'all'|'under300'|'300-450'|'450-600'|'over600'  $price
     * @param  'all'|'softboard'|'hardboard'  $type
     * @param  'asc'|'desc'|null  $sort
     */
    public function __construct(
        public string $q,
        public string $height,
        public string $volume,
        public string $price,
        public string $type,
        public ?string $sort,
    ) {}

    public static function fromRequest(Request $request): self
    {
        $q = trim($request->string('q')->toString());
        if (mb_strlen($q) > 80) {
            $q = mb_substr($q, 0, 80);
        }

        $height = $request->string('altura')->toString();
        if (! in_array($height, array_column(self::heightOptions(), 'value'), true)) {
            $height = self::HEIGHT_ALL;
        }

        $volume = $request->string('volumen')->toString();
        if (! in_array($volume, array_column(self::volumeOptions(), 'value'), true)) {
            $volume = self::VOLUME_ALL;
        }

        $price = $request->string('precio')->toString();
        if (! in_array($price, array_column(self::priceOptions(), 'value'), true)) {
            $price = self::PRICE_ALL;
        }

        $type = $request->string('tipo')->toString();
        $validTypes = array_merge(
            [self::TYPE_ALL],
            array_map(fn (SecondHandBoardType $c) => $c->value, SecondHandBoardType::cases()),
        );
        if (! in_array($type, $validTypes, true)) {
            $type = self::TYPE_ALL;
        }

        $sortRaw = $request->string('orden')->toString();
        $sort = in_array($sortRaw, ['asc', 'desc'], true) ? $sortRaw : null;

        return new self(
            q: $q,
            height: $height,
            volume: $volume,
            price: $price,
            type: $type,
            sort: $sort,
        );
    }

    public function isActive(): bool
    {
        return $this->q !== ''
            || $this->height !== self::HEIGHT_ALL
            || $this->volume !== self::VOLUME_ALL
            || $this->price !== self::PRICE_ALL
            || $this->type !== self::TYPE_ALL
            || $this->sort !== null;
    }

    /**
     * Query string para Inertia (omite valores por defecto).
     *
     * @return array<string, string>
     */
    public function toQuery(): array
    {
        $query = [];

        if ($this->q !== '') {
            $query['q'] = $this->q;
        }
        if ($this->height !== self::HEIGHT_ALL) {
            $query['altura'] = $this->height;
        }
        if ($this->volume !== self::VOLUME_ALL) {
            $query['volumen'] = $this->volume;
        }
        if ($this->price !== self::PRICE_ALL) {
            $query['precio'] = $this->price;
        }
        if ($this->type !== self::TYPE_ALL) {
            $query['tipo'] = $this->type;
        }
        if ($this->sort !== null) {
            $query['orden'] = $this->sort;
        }

        return $query;
    }

    /**
     * Estado controlado para los selects del catálogo.
     *
     * @return array{q: string, altura: string, volumen: string, precio: string, tipo: string, orden: string|null}
     */
    public function toFrontend(): array
    {
        return [
            'q' => $this->q,
            'altura' => $this->height,
            'volumen' => $this->volume,
            'precio' => $this->price,
            'tipo' => $this->type,
            'orden' => $this->sort,
        ];
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function heightOptions(): array
    {
        return [
            ['value' => self::HEIGHT_ALL, 'label' => 'Todas las alturas'],
            ['value' => 'short', 'label' => "Hasta 5'8\""],
            ['value' => 'mid-short', 'label' => "5'8\" – 6'0\""],
            ['value' => 'mid-long', 'label' => "6'0\" – 6'4\""],
            ['value' => 'long', 'label' => "Más de 6'4\""],
        ];
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function volumeOptions(): array
    {
        return [
            ['value' => self::VOLUME_ALL, 'label' => 'Todos los volúmenes'],
            ['value' => 'low', 'label' => 'Menos de 30 L'],
            ['value' => 'mid-low', 'label' => '30 – 34 L'],
            ['value' => 'mid', 'label' => '34 – 38 L'],
            ['value' => 'high', 'label' => 'Más de 38 L'],
        ];
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function priceOptions(): array
    {
        return [
            ['value' => self::PRICE_ALL, 'label' => 'Todos los precios'],
            ['value' => 'under300', 'label' => 'Hasta 300 €'],
            ['value' => '300-450', 'label' => '300 – 450 €'],
            ['value' => '450-600', 'label' => '450 – 600 €'],
            ['value' => 'over600', 'label' => 'Más de 600 €'],
        ];
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function typeOptions(): array
    {
        $options = [
            ['value' => self::TYPE_ALL, 'label' => 'Todos los tipos'],
        ];

        foreach (SecondHandBoardType::cases() as $type) {
            $options[] = [
                'value' => $type->value,
                'label' => $type->shortLabel(),
            ];
        }

        return $options;
    }
}
