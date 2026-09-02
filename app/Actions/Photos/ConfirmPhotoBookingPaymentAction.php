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

            if ($locked->status === PhotoSessionBooking::STATUS_REJECTED
                || $locked->payment_status === PhotoSessionBooking::PAYMENT_REJECTED) {
                throw ValidationException::withMessages([
                    'booking' => ['No se puede confirmar una reserva rechazada.'],
                ]);
            }

            $resurrected = $locked->status === PhotoSessionBooking::STATUS_CANCELLED;
            $expiredWhilePending = $locked->status === PhotoSessionBooking::STATUS_PENDING
                && $locked->payment_status === PhotoSessionBooking::PAYMENT_PENDING
                && $locked->expires_at !== null
                && $locked->expires_at->isPast();

            $notes = (string) ($locked->admin_notes ?? '');
            if ($resurrected) {
                $stamp = BusinessDateTime::now()->toDateTimeString();
                $notes = trim($notes."\nResucitada {$stamp}: webhook con pago confirmado tras caducidad.");
            } elseif ($expiredWhilePending) {
                $stamp = BusinessDateTime::now()->toDateTimeString();
                $notes = trim($notes."\nConfirmada {$stamp}: pago llegó con reserva ya caducada.");
            }

            $locked->update([
                'payment_status' => PhotoSessionBooking::PAYMENT_CONFIRMED,
                'status' => PhotoSessionBooking::STATUS_CONFIRMED,
                'payment_method' => $paymentMethod ?? $locked->payment_method ?? 'card',
                'fecha_pago' => $locked->fecha_pago ?? BusinessDateTime::now(),
                'reviewed_at' => BusinessDateTime::now(),
                'expires_at' => null,
                'admin_notes' => $notes !== '' ? $notes : $locked->admin_notes,
            ]);

            return [
                'ok' => true,
                'message' => 'Pago de sesión de fotos confirmado.',
                'booking' => $locked->fresh(['session', 'user']),
            ];
        });
    }
}
