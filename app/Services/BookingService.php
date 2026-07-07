<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PaymentStatus;
use App\Exceptions\TransactionRequiredException;
use App\Models\Booking;
use App\Models\PriceSchema;
use App\Models\Surfboard;
use App\Support\BusinessDateTime;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Fuente única (SSOT) para disponibilidad, precios y reservas de alquiler.
 */
class BookingService
{
    /**
     * Duración en horas del esquema (clave => horas).
     */
    private const DURATION_HOURS = [1 => 1, 2 => 2, 4 => 4, 12 => 12, 24 => 24, 48 => 48, 72 => 72, 168 => 168];

    /**
     * @return array{total_price: float, deposit_amount: float}
     */
    public function resolvePricing(PriceSchema $schema, \DateTimeInterface $startDate, \DateTimeInterface $endDate, float $depositPercentage = 30.0): array
    {
        $totalPrice = $this->calculateBestPrice($schema, $startDate, $endDate);
        $depositAmount = $this->calculateDeposit($totalPrice, $depositPercentage);

        return [
            'total_price' => $totalPrice,
            'deposit_amount' => $depositAmount,
        ];
    }

    /**
     * Calcula el mejor precio para un rango de fechas según el esquema de precios.
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
            $minCost[$h] = $h * ($prices[1] ?? 0.0);
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
     * Comprobación de disponibilidad para UI/API (envuelve transacción de lectura).
     */
    public function checkAvailability(int $surfboardId, \DateTimeInterface $startDate, \DateTimeInterface $endDate, ?int $excludeBookingId = null): bool
    {
        return DB::transaction(fn () => $this->isAvailable($surfboardId, $startDate, $endDate, $excludeBookingId));
    }

    /**
     * Comprueba solapamiento bajo transacción activa (anti-overbooking).
     */
    public function isAvailable(int $surfboardId, \DateTimeInterface $startDate, \DateTimeInterface $endDate, ?int $excludeBookingId = null): bool
    {
        $this->assertActiveTransaction(__FUNCTION__);

        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        $query = Booking::query()
            ->where('surfboard_id', $surfboardId)
            ->blocking()
            ->lockForUpdate()
            ->where('start_date', '<=', $end)
            ->where('end_date', '>=', $start);

        if ($excludeBookingId !== null) {
            $query->where('id', '!=', $excludeBookingId);
        }

        return $query->doesntExist();
    }

    /**
     * @return array{start: string, end: string, status: string, id?: int, display_status?: string}[]
     */
    public function getBlockedRanges(int $surfboardId, \DateTimeInterface $from, \DateTimeInterface $to): array
    {
        $fromC = $from instanceof Carbon ? $from : Carbon::parse($from);
        $toC = $to instanceof Carbon ? $to : Carbon::parse($to);

        return Booking::query()
            ->where('surfboard_id', $surfboardId)
            ->blocking()
            ->where('start_date', '<=', $toC)
            ->where('end_date', '>=', $fromC)
            ->orderBy('start_date')
            ->get()
            ->map(fn (Booking $b) => [
                'id' => $b->id,
                'start' => $b->start_date ? BusinessDateTime::toApi($b->start_date) : '',
                'end' => $b->end_date ? BusinessDateTime::toApi($b->end_date) : '',
                'status' => $b->status,
                'display_status' => $b->payment_status === Booking::PAYMENT_CONFIRMED
                    ? 'ocupado'
                    : 'pendiente',
            ])
            ->values()
            ->all();
    }

    /**
     * Crea reserva en estado pending + pago pending (pasarela o validación manual).
     *
     * @param  array<string, mixed>  $clientData
     */
    public function createPendingBooking(
        Surfboard $surfboard,
        \DateTimeInterface $startDate,
        \DateTimeInterface $endDate,
        array $clientData,
        ?UploadedFile $proofFile = null,
        ?int $userId = null,
    ): Booking {
        return DB::transaction(function () use ($surfboard, $startDate, $endDate, $clientData, $proofFile, $userId) {
            Surfboard::query()->whereKey($surfboard->id)->lockForUpdate()->firstOrFail();

            if (! $this->isAvailable((int) $surfboard->id, $startDate, $endDate)) {
                throw new InvalidArgumentException('La tabla no está disponible en el rango solicitado.');
            }

            $schema = $surfboard->priceSchema;
            if ($schema === null) {
                throw new InvalidArgumentException('La tabla no tiene esquema de precios configurado.');
            }

            $pricing = $this->resolvePricing($schema, $startDate, $endDate);
            $proofPath = null;
            $proofUploadedAt = null;

            if ($proofFile !== null) {
                $proofPath = $proofFile->storeAs(
                    'payment-proofs/rentals',
                    Str::uuid()->toString().'.'.$proofFile->getClientOriginalExtension(),
                    'local'
                );
                if ($proofPath === false || $proofPath === null) {
                    throw new InvalidArgumentException('No se pudo almacenar el justificante de pago.');
                }
                $proofUploadedAt = now();
            }

            return Booking::query()->create([
                'surfboard_id' => $surfboard->id,
                'user_id' => $userId,
                'client_name' => (string) ($clientData['client_name'] ?? ''),
                'client_email' => $clientData['client_email'] ?? null,
                'client_phone' => $clientData['client_phone'] ?? null,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'expires_at' => Carbon::now()->addDays(7),
                'status' => Booking::STATUS_PENDING,
                'payment_status' => PaymentStatus::Pending->value,
                'payment_proof_path' => $proofPath,
                'proof_uploaded_at' => $proofUploadedAt,
                'payment_method' => $clientData['payment_method'] ?? null,
                'total_price' => $pricing['total_price'],
                'deposit_amount' => $pricing['deposit_amount'],
                'payment_proof_note' => null,
            ]);
        });
    }

    /**
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

    public function calculateDeposit(float $totalPrice, float $percentage = 30.0): float
    {
        return round($totalPrice * ($percentage / 100), 2);
    }

    private function assertActiveTransaction(string $method): void
    {
        if (DB::transactionLevel() < 1) {
            throw TransactionRequiredException::forMethod(self::class, $method);
        }
    }
}
