<?php

namespace App\Models;

use App\Casts\BusinessWallClockDatetime;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Booking extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_CONFIRMED = 'confirmed';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';

    public const PAYMENT_PENDING = 'pending';
    public const PAYMENT_CONFIRMED = 'confirmed';
    public const PAYMENT_REJECTED = 'rejected';
    public const REFUND_PENDING = 'pending';
    public const REFUND_COMPLETED = 'completed';

    protected $fillable = [
        'surfboard_id',
        'user_id',
        'client_name',
        'client_email',
        'client_phone',
        'mode',
        'start_date',
        'end_date',
        'pickup_at',
        'return_at',
        'block_end',
        'pack_minutes',
        'pack_days',
        'picked_up_at',
        'no_show_at',
        'expires_at',
        'status',
        'payment_status',
        'payment_proof_path',
        'proof_uploaded_at',
        'reviewed_at',
        'refund_status',
        'payment_method',
        'admin_notes',
        'total_price',
        'deposit_amount',
        'payment_proof_note',
    ];

    protected $casts = [
        // Ventana del alquiler: la BD guarda el reloj de pared de la escuela,
        // así que se lee en la zona de negocio (no en APP_TIMEZONE) para que las
        // comparaciones de tiempo real y lo que ve el cliente coincidan.
        'start_date' => BusinessWallClockDatetime::class,
        'end_date'   => BusinessWallClockDatetime::class,
        'pickup_at' => BusinessWallClockDatetime::class,
        'return_at' => BusinessWallClockDatetime::class,
        'block_end' => BusinessWallClockDatetime::class,
        // Se escriben con BusinessDateTime::now(), así que se leen igual.
        'picked_up_at' => BusinessWallClockDatetime::class,
        'no_show_at' => BusinessWallClockDatetime::class,
        'pack_minutes' => 'integer',
        'pack_days' => 'integer',
        'expires_at' => 'datetime',
        'proof_uploaded_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'total_price' => 'decimal:2',
        'deposit_amount' => 'decimal:2',
    ];

    public function surfboard(): BelongsTo
    {
        return $this->belongsTo(Surfboard::class, 'surfboard_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function attendanceNotes(): MorphMany
    {
        return $this->morphMany(AttendanceNote::class, 'reservation');
    }

    /**
     * Reservas que bloquean la tabla (no canceladas).
     */
    public function scopeBlocking(Builder $query): Builder
    {
        return $query->whereIn('status', [self::STATUS_PENDING, self::STATUS_CONFIRMED, self::STATUS_COMPLETED]);
    }

    /**
     * Reservas pendientes que han superado el plazo de expiración (ej. 7 días).
     */
    public function scopeExpiredPending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING)
            ->where(function (Builder $q) {
                $q->whereNotNull('expires_at')->where('expires_at', '<', now());
            });
    }

    /**
     * Alquiler cobrado íntegro. `deposit_amount` es el importe que se cobra online
     * (es la línea que se envía a Stripe), así que cubrir el total significa
     * prepago completo; con la señal del 30 % esto es false.
     */
    public function isRentalFullyPaid(): bool
    {
        if ($this->payment_status !== self::PAYMENT_CONFIRMED) {
            return false;
        }

        $total = (float) $this->total_price;

        return $total > 0 && (float) $this->deposit_amount >= $total - 0.01;
    }

    /**
     * Reservas con la tabla pagada entera: el no-show NO las libera.
     */
    public function scopeFullyPaid(Builder $query): Builder
    {
        return $query
            ->where('payment_status', self::PAYMENT_CONFIRMED)
            ->where('total_price', '>', 0)
            ->whereColumn('deposit_amount', '>=', 'total_price');
    }

    /**
     * Reservas vivas sin recoger cuyo margen de cortesía venció (candidatas a no-show).
     * Quedan fuera las que ya pagaron el alquiler completo.
     * `$notBefore` acota la ventana para no tocar reservas históricas.
     */
    public function scopeNoShowCandidates(Builder $query, \DateTimeInterface $cutoff, ?\DateTimeInterface $notBefore = null): Builder
    {
        $query
            ->whereIn('status', [self::STATUS_PENDING, self::STATUS_CONFIRMED])
            ->whereNull('picked_up_at')
            ->whereNull('no_show_at')
            ->whereNotNull('pickup_at')
            ->where('pickup_at', '<', $cutoff)
            // Negación explícita de fullyPaid(): con NULL en payment_status el
            // NOT(...) de SQL descartaría filas que sí son candidatas.
            ->where(function (Builder $notPaid) {
                $notPaid
                    ->whereNull('payment_status')
                    ->orWhere('payment_status', '!=', self::PAYMENT_CONFIRMED)
                    ->orWhere('total_price', '<=', 0)
                    ->orWhereColumn('deposit_amount', '<', 'total_price');
            });

        if ($notBefore !== null) {
            $query->where('pickup_at', '>=', $notBefore);
        }

        return $query;
    }

    /**
     * Hay ingreso o comprobante asociado: si el cliente cancela, el admin debe revisar devolución.
     */
    public function needsRefundReviewAfterCancellation(): bool
    {
        if ($this->payment_status === self::PAYMENT_CONFIRMED) {
            return true;
        }

        return ($this->payment_status ?? '') === self::PAYMENT_PENDING
            && ! empty($this->payment_proof_path);
    }

    /**
     * Marca la reserva cancelada y, si aplica, vuelve a dejarla sin revisar para que el badge rojo
     * del menú admin cuente la devolución pendiente (reviewed_at = null).
     */
    public function applyCancellationWithRefundQueue(): void
    {
        $needsQueue = $this->needsRefundReviewAfterCancellation();

        $this->status = self::STATUS_CANCELLED;
        if ($needsQueue) {
            $this->reviewed_at = null;
            $this->refund_status = self::REFUND_PENDING;
        } elseif ($this->refund_status !== null) {
            $this->refund_status = null;
        }
        $this->save();
    }
}
