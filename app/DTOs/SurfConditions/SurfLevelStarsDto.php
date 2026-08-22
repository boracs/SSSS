<?php

declare(strict_types=1);

namespace App\DTOs\SurfConditions;

/** Notas 1–5 por nivel para una misma franja (tabla y parte Gemini). */
final readonly class SurfLevelStarsDto
{
    public function __construct(
        public int $iniciacion,
        public int $intermedio,
        public int $avanzado,
    ) {}
}
