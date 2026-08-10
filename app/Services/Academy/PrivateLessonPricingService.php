<?php

declare(strict_types=1);

namespace App\Services\Academy;

use App\DTOs\Academy\PrivateLessonQuoteDto;
use App\Models\PrivateLessonTariff;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

/**
 * Tarificación de clases particulares: precio total según nº de personas
 * (tarifa editable en BD, a la duración base) prorrateado por la duración
 * pedida, y señal online como porcentaje de ese total.
 */
final class PrivateLessonPricingService
{
    private const CACHE_KEY = 'academy:private_lesson_tariffs';

    public function quote(int $people, int $durationMinutes): PrivateLessonQuoteDto
    {
        if ($people < 1) {
            throw ValidationException::withMessages([
                'participants' => ['Indica al menos una persona para la clase particular.'],
            ]);
        }
        if ($durationMinutes < 1) {
            throw ValidationException::withMessages([
                'duration_minutes' => ['La duración de la clase no es válida.'],
            ]);
        }

        $baseCents = $this->baseTariffCentsFor($people);
        $baseMinutes = $this->baseMinutes();

        // Se redondea al euro para no publicar precios tipo 53,33 € al prorratear.
        $totalCents = (int) round($baseCents * ($durationMinutes / $baseMinutes) / 100) * 100;
        $depositCents = (int) round($totalCents * ($this->depositPercentage() / 100));
        $depositCents = max(0, min($depositCents, $totalCents));

        return new PrivateLessonQuoteDto(
            people: $people,
            durationMinutes: $durationMinutes,
            baseTariffCents: $baseCents,
            totalCents: $totalCents,
            depositCents: $depositCents,
        );
    }

    /**
     * Tarifa vigente por nº de personas (para mostrar precios o editarlos).
     * Cacheada: se consulta en cada carga de la academia.
     *
     * @return array<int, int> personas => precio total en céntimos
     */
    public function tariffTable(): array
    {
        return Cache::remember(self::CACHE_KEY, now()->addDay(), fn (): array => PrivateLessonTariff::query()
            ->where('activo', true)
            ->orderBy('people')
            ->pluck('price_cents', 'people')
            ->map(fn ($cents) => (int) $cents)
            ->all());
    }

    public function forgetTariffCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    public function baseMinutes(): int
    {
        return max(1, (int) config('services.academy.private_lesson_base_minutes', 90));
    }

    public function depositPercentage(): float
    {
        $pct = (float) config('services.academy.private_lesson_deposit_percentage', 30);

        return max(0.0, min(100.0, $pct));
    }

    /**
     * Precio del grupo a la duración base. Si no hay tarifa exacta para ese
     * número de personas, se usa la del grupo mayor configurado.
     */
    private function baseTariffCentsFor(int $people): int
    {
        $table = $this->tariffTable();
        if ($table === []) {
            throw ValidationException::withMessages([
                'participants' => ['No hay tarifa de clase particular configurada. Avisa a la escuela.'],
            ]);
        }

        if (isset($table[$people])) {
            return $table[$people];
        }

        $maxPeople = max(array_keys($table));

        return $people > $maxPeople
            ? $table[$maxPeople]
            : $table[min(array_keys($table))];
    }
}
