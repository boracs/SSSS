<?php

declare(strict_types=1);

namespace App\DTOs\SurfConditions;

/**
 * Un día completo de la tabla de previsión: franjas horarias visibles
 * (06h-21h), eventos de marea (típicamente 2 altas + 2 bajas) y
 * coeficientes de subida/bajada del día.
 */
final readonly class SurfForecastDayDto
{
    /**
     * @param  list<SurfForecastSlotDto>  $slots
     * @param  list<SurfTideEventDto>  $tideEvents
     */
    public function __construct(
        public string $date,
        public string $dayLabel,
        public array $slots,
        public array $tideEvents,
        public ?float $tideRiseM = null,
        public ?float $tideFallM = null,
        /** Señal (4 colores) del slot con más `qualityStars`; badge de seguridad para el resumen fusionado. */
        public string $bestSignal = 'closed',
        /** Compat: estrellas del mejor slot para nivel intermedio (ver {@see $qualityStarsIntermedio}). */
        public int $qualityStars = 1,
        /** Estrellas 1–5 del mejor momento (por intermedio) para iniciación. */
        public int $qualityStarsIniciacion = 1,
        /** Estrellas 1–5 del mejor momento para intermedio. */
        public int $qualityStarsIntermedio = 1,
        /** Estrellas 1–5 del mejor momento para avanzado. */
        public int $qualityStarsAvanzado = 1,
        /** `time` del slot con más estrellas intermedio; el front lo usa para "a las HH:mm así estará". */
        public ?string $bestSlotTime = null,
    ) {}
}
