<?php

declare(strict_types=1);

namespace App\DTOs\SurfConditions;

/**
 * Pico de marea (alta o baja) estimado a partir de los máximos/mínimos
 * locales de la curva horaria de nivel del mar de Open-Meteo.
 *
 * @param  float|null  $deltaM  Cambio desde el extremo opuesto anterior
 *                              (positivo al subir hacia una alta, negativo
 *                              al bajar hacia una baja). Null si no hay
 *                              extremo previo en la serie.
 */
final readonly class SurfTideEventDto
{
    public function __construct(
        public string $type,
        public string $time,
        public string $hourLabel,
        public float $heightM,
        public ?float $deltaM = null,
    ) {}
}
