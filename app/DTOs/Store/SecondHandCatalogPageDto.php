<?php

declare(strict_types=1);

namespace App\DTOs\Store;

readonly class SecondHandCatalogPageDto
{
    /**
     * @param  list<array<string, mixed>>  $boards
     * @param  array{q: string, altura: string, volumen: string, precio: string, tipo: string, orden: string|null}  $filters
     * @param  array{height: list<array{value: string, label: string}>, volume: list<array{value: string, label: string}>, price: list<array{value: string, label: string}>, type: list<array{value: string, label: string}>}  $filterOptions
     */
    public function __construct(
        public array $boards,
        public array $filters,
        public array $filterOptions,
        public int $total,
        public int $matched,
        public bool $filtersActive,
    ) {}

    /**
     * @return array{
     *     boards: list<array<string, mixed>>,
     *     filters: array{q: string, altura: string, volumen: string, precio: string, tipo: string, orden: string|null},
     *     filterOptions: array{height: list<array{value: string, label: string}>, volume: list<array{value: string, label: string}>, price: list<array{value: string, label: string}>, type: list<array{value: string, label: string}>},
     *     catalogMeta: array{total: int, matched: int, filtersActive: bool}
     * }
     */
    public function toInertia(): array
    {
        return [
            'boards' => $this->boards,
            'filters' => $this->filters,
            'filterOptions' => $this->filterOptions,
            'catalogMeta' => [
                'total' => $this->total,
                'matched' => $this->matched,
                'filtersActive' => $this->filtersActive,
            ],
        ];
    }
}
