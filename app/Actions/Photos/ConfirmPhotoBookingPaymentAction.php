<?php

declare(strict_types=1);

namespace App\Actions\Photos;

use App\Models\PhotoSessionBooking;
use App\Support\BusinessDateTime;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class ConfirmPhotoBookingPaymentAction
{
    /**
     * @return array{ok: bool, message: string, booking: PhotoSessionBooking}
     */
    public function execute(PhotoSessionBooking $booking, ?string $paymentMethod = null): array
    {
        return DB::transaction(function () use ($booking, $paymentMethod) {
            $locked = PhotoSessionBooking::query()->whereKey($booking->id)->lockForUpdate()->firstOrFail();

            if ($locked->payment_status === PhotoSessionBooking::PAYMENT_CONFIRMED
                && $locked->status === PhotoSessionBooking::STATUS_CONFIRMED) {
                return [
                    'ok' => true,
                    'message' => 'La reserva de fotos ya estaba confirmada.',
                    'booking' => $locked->fresh(['session', 'user']),
                ];
            }

            if (in_array($locked->status, [
                PhotoSessionBooking::STATUS_CANCELLED,
                PhotoSessionBooking::STATUS_REJECTED,
            ], true)) {
                throw ValidationException::withMessages([
                    'booking' => ['No se puede confirmar una reserva cancelada o rechazada.'],
                ]);
            }

            if ($locked->payment_status === PhotoSessionBooking::PAYMENT_REJECTED) {
                throw ValidationException::withMessages([
                    'booking' => ['No se puede confirmar un pago rechazado.'],
                ]);
            }

            if ($locked->expires_at !== null
                && $locked->expires_at->isPast()
                && $locked->payment_status === PhotoSessionBooking::PAYMENT_PENDING
                && $locked->status === PhotoSessionBooking::STATUS_PENDING) {
                $locked->update([
                    'status' => PhotoSessionBooking::STATUS_CANCELLED,
                    'admin_notes' => trim((string) (($locked->admin_notes ?? '')."\nCaducada: pago no completado")),
                ]);

                throw ValidationException::withMessages([
                    'booking' => ['La reserva ha caducado (pago no completado a tiempo).'],
                ]);
            }

            $locked->update([
                'payment_status' => PhotoSessionBooking::PAYMENT_CONFIRMED,
                'status' => PhotoSessionBooking::STATUS_CONFIRMED,
                'payment_method' => $paymentMethod ?? $locked->payment_method ?? 'card',
                'fecha_pago' => $locked->fecha_pago ?? BusinessDateTime::now(),
                'reviewed_at' => BusinessDateTime::now(),
                'expires_at' => null,
            ]);

            return [
                'ok' => true,
                'message' => 'Pago de sesión de fotos confirmado.',
                'booking' => $locked->fresh(['session', 'user']),
            ];
        });
    }
}
