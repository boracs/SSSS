<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Booking;
use App\Models\PriceSchema;
use App\Models\Surfboard;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Fuente única para disponibilidad (evitar overbooking) y cálculo de precios
 * por hora/día de alquiler. Usar siempre este servicio en controladores y APIs.
 */
class BookingService
{
    /**
     * Duración en horas del esquema (clave => horas).
     */
    private const DURATION_HOURS = [1 => 1, 2 => 2, 4 => 4, 12 => 12, 24 => 24, 48 => 48, 72 => 72, 168 => 168];

    /**
     * Calcula el mejor precio para un rango de fechas según el esquema de precios.
     * Aplica la combinación de tarifas más barata (1h, 2h, 4h, 12h, 24h, 48h, 72h, semana).
     */
    public function calculateBestPrice(PriceSchema $schema, \DateTimeInterface $startDate, \DateTimeInterface $endDate): float
    {
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);
        $totalHours = (int) ceil($end->diffInSeconds($start) / 3600);

        if ($totalHours <= 0) {
            return 0.0;
        }

        $prices = $schema->getPricesByDuration();
        $minCost = [0 => 0.0];

        for ($h = 1; $h <= $totalHours; $h++) {
            $minCost[$h] = $h * ($prices[1] ?? 0.0); // fallback: precio por hora
            foreach (self::DURATION_HOURS as $key => $hours) {
                $price = $prices[$key] ?? 0.0;
                if ($hours <= $h && $price > 0) {
                    $candidate = $price + ($minCost[$h - $hours] ?? 0.0);
                    if ($candidate < $minCost[$h]) {
                        $minCost[$h] = $candidate;
                    }
                }
            }
        }

        return round($minCost[$totalHours], 2);
    }

    /**
     * Comprueba si la tabla está disponible en el rango dado.
     * No disponible si existe alguna reserva que bloquea (pending, confirmed, completed)
     * con solapamiento: (start_date <= $endDate) AND (end_date >= $startDate).
     */
    public function isAvailable(int $surfboardId, \DateTimeInterface $startDate, \DateTimeInterface $endDate, ?int $excludeBookingId = null): bool
    {
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        $query = Booking::query()
            ->where('surfboard_id', $surfboardId)
            ->blocking()
            ->where('start_date', '<=', $end)
            ->where('end_date', '>=', $start);

        if ($excludeBookingId !== null) {
            $query->where('id', '!=', $excludeBookingId);
        }

        return $query->doesntExist();
    }

    /**
     * Devuelve los rangos de fechas ocupados (que bloquean) para una tabla en el intervalo dado.
     *
     * @return array<int, array{start: string, end: string, status: string}>
     */
    public function getBlockedRanges(int $surfboardId, \DateTimeInterface $from, \DateTimeInterface $to): array
    {
        $fromC = Carbon::parse($from);
        $toC = Carbon::parse($to);

        return Booking::query()
            ->where('surfboard_id', $surfboardId)
            ->blocking()
            ->where('start_date', '<=', $toC)
            ->where('end_date', '>=', $fromC)
            ->orderBy('start_date')
            ->get()
            ->map(fn (Booking $b) => [
                'id' => $b->id,
                'start' => $b->start_date->toIso8601String(),
                'end' => $b->end_date->toIso8601String(),
                'status' => $b->status,
            ])
            ->values()
            ->all();
    }

    /**
     * Cancela reservas en estado 'pending' cuya fecha de expiración (expires_at) ha pasado.
     * Libera las tablas para nuevas reservas.
     *
     * @return Collection<int, Booking>
     */
    public function autoExpirePending(): Collection
    {
        $expired = Booking::query()->expiredPending()->get();
        foreach ($expired as $booking) {
            $booking->update(['status' => Booking::STATUS_CANCELLED]);
        }
        return $expired;
    }

    /**
     * Calcula el depósito (ej. 30% del total o cantidad fija).
     */
    public function calculateDeposit(float $totalPrice, float $percentage = 30.0): float
    {
        return round($totalPrice * ($percentage / 100), 2);
    }
}
