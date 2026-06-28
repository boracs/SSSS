<?php

declare(strict_types=1);

namespace App\DTOs\Taquilla;

use App\Models\PlanTaquilla;
use App\Support\MoneyCents;

readonly class PlanTaquillaPublicDto
{
    /**
     * @param  list<string>  $beneficios
     */
    public function __construct(
        public int $id,
        public string $nombre,
        public int $duracionDias,
        public float $precioTotal,
        public string $periodoLabel,
        public string $periodoSub,
        public float $precioMensualEquivalente,
        public ?string $descripcion,
        public int $porcentajeDescuento,
        public bool $esVip,
        public array $beneficios,
    ) {}

    public static function fromModel(PlanTaquilla $plan): self
    {
        $duracionDias = (int) $plan->duracion_dias;
        $precioTotal = MoneyCents::centsToEuros((int) $plan->precio_total_cents);
        $meses = max(1, (int) round($duracionDias / 30));
        $esVip = (bool) ($plan->es_vip ?? stripos((string) $plan->nombre, 'vip') !== false);
        $descuento = (int) ($plan->porcentaje_descuento ?? ($esVip ? 50 : 45));
        [$periodoLabel, $periodoSub] = self::periodoLabels($duracionDias);

        return new self(
            id: (int) $plan->id,
            nombre: (string) $plan->nombre,
            duracionDias: $duracionDias,
            precioTotal: $precioTotal,
            periodoLabel: $periodoLabel,
            periodoSub: $periodoSub,
            precioMensualEquivalente: round($precioTotal / $meses, 2),
            descripcion: $plan->descripcion,
            porcentajeDescuento: $descuento,
            esVip: $esVip,
            beneficios: self::beneficiosForPlan($esVip, $descuento),
        );
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'duracion_dias' => $this->duracionDias,
            'precio_total' => $this->precioTotal,
            'periodo_label' => $this->periodoLabel,
            'periodo_sub' => $this->periodoSub,
            'precio_mensual_equivalente' => $this->precioMensualEquivalente,
            'descripcion' => $this->descripcion,
            'porcentaje_descuento' => $this->porcentajeDescuento,
            'es_vip' => $this->esVip,
            'beneficios' => $this->beneficios,
        ];
    }

    /** @return array{0: string, 1: string} */
    private static function periodoLabels(int $duracionDias): array
    {
        if ($duracionDias >= 360) {
            return ['Anual', '12 meses de membresia'];
        }
        if ($duracionDias >= 180) {
            return ['Semestral', '6 meses de membresia'];
        }
        if ($duracionDias >= 90) {
            return ['Trimestral', '3 meses de membresia'];
        }
        if ($duracionDias >= 30) {
            return ['Mensual', '1 mes de membresia'];
        }

        return ["{$duracionDias} dias", 'Periodo personalizado'];
    }

    /** @return list<string> */
    private static function beneficiosForPlan(bool $esVip, int $descuento): array
    {
        $beneficios = [
            '1 taquilla privada a pie de playa',
            '2 tablas en rack + 2 trajes en secadero',
            'Banos, duchas y zona de calentamiento',
            sprintf('Hasta %d%% de descuento en tienda', $descuento),
            'Acceso a reparacion de tablas y micro-servicios del club',
        ];

        if ($esVip) {
            $beneficios[] = 'Pase de invitados mensual y ventajas VIP';
        }

        return $beneficios;
    }
}
