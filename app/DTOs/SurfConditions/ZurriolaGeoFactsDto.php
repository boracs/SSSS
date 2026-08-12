<?php

declare(strict_types=1);

namespace App\DTOs\SurfConditions;

/**
 * Hechos GEO públicos Zurriola/S4 listos para Inertia (sin lógica).
 *
 * @phpstan-type Season array{id: string, title: string, body: string}
 * @phpstan-type Window array{label: string, range: string}
 * @phpstan-type EnergyBand array{range_label: string, iniciacion: string, intermedio: string, avanzado: string}
 * @phpstan-type Faq array{question: string, answer: string}
 */
readonly class ZurriolaGeoFactsDto
{
    /**
     * @param  list<Season>  $seasons
     * @param  list<Window>  $summerWindows
     * @param  list<EnergyBand>  $energyBands
     * @param  list<string>  $materialIncluded
     * @param  list<string>  $materialBring
     * @param  list<Faq>  $faqs
     */
    public function __construct(
        public string $description,
        public string $beachName,
        public string $locality,
        public string $orientationLabel,
        public string $breakType,
        public string $breakNote,
        public int $schoolToBeachMeters,
        public string $schoolToBeachLabel,
        public string $consistencyNote,
        public array $seasons,
        public array $summerWindows,
        public string $levelsIntro,
        public array $energyBands,
        public string $energyBandsNote,
        public int $arriveMinutesBefore,
        public string $operationsText,
        public array $materialIncluded,
        public array $materialBring,
        public string $materialText,
        public ?string $cancellationPolicy,
        public array $faqs,
        public string $disclaimer,
    ) {}

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'description' => $this->description,
            'place' => [
                'beach_name' => $this->beachName,
                'locality' => $this->locality,
                'orientation_label' => $this->orientationLabel,
                'break_type' => $this->breakType,
                'break_note' => $this->breakNote,
            ],
            'school_to_beach' => [
                'meters' => $this->schoolToBeachMeters,
                'label' => $this->schoolToBeachLabel,
            ],
            'consistency_note' => $this->consistencyNote,
            'seasons' => $this->seasons,
            'summer_windows' => $this->summerWindows,
            'levels_intro' => $this->levelsIntro,
            'energy_bands' => $this->energyBands,
            'energy_bands_note' => $this->energyBandsNote,
            'operations' => [
                'arrive_minutes_before' => $this->arriveMinutesBefore,
                'text' => $this->operationsText,
            ],
            'material' => [
                'included' => $this->materialIncluded,
                'bring' => $this->materialBring,
                'text' => $this->materialText,
            ],
            'cancellation_policy' => $this->cancellationPolicy,
            'faqs' => $this->faqs,
            'disclaimer' => $this->disclaimer,
        ];
    }
}
