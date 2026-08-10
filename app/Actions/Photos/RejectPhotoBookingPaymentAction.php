<?php

declare(strict_types=1);

namespace App\Actions\Photos;

use App\Models\PhotoSessionBooking;
use App\Support\BusinessDateTime;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class RejectPhotoBookingPaymentAction
{
    /**
     * @return array{ok: bool, message: string, booking: PhotoSessionBooking}
     */
    public function execute(PhotoSessionBooking $booking, ?string $adminNotes = null): array
    {
        return DB::transaction(function () use ($booking, $adminNotes) {
            $locked = PhotoSessionBooking::query()->whereKey($booking->id)->lockForUpdate()->firstOrFail();

            if ($locked->payment_status === PhotoSessionBooking::PAYMENT_CONFIRMED) {
                throw ValidationException::withMessages([
                    'booking' => ['No se puede rechazar un pago ya confirmado.'],
                ]);
            }

            $locked->update([
                'payment_status' => PhotoSessionBooking::PAYMENT_REJECTED,
                'status' => PhotoSessionBooking::STATUS_REJECTED,
                'reviewed_at' => BusinessDateTime::now(),
                'admin_notes' => $adminNotes ?? $locked->admin_notes,
            ]);

            return [
                'ok' => true,
                'message' => 'Pago de sesión de fotos rechazado.',
                'booking' => $locked->fresh(['session', 'user']),
            ];
        });
    }
}
