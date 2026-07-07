<?php

declare(strict_types=1);

namespace App\Actions\Academy;

use App\Models\LessonUser;
use App\Support\BusinessDateTime;

final class DenyEnrollmentQuotaAction
{
    /**
     * @return array{ok: bool, message: string}
     */
    public function execute(LessonUser $enrollment, ?string $adminNotes = null): array
    {
        if ($enrollment->status !== LessonUser::STATUS_PENDING_EXTRA_MONITOR) {
            return ['ok' => false, 'message' => 'Solo se pueden denegar solicitudes pendientes de cupo extra.'];
        }

        $note = trim((string) ($adminNotes ?? ''));
        if ($note === '') {
            $note = 'Solicitud de cupo extra denegada por administración.';
        }

        $enrollment->update([
            'status' => LessonUser::STATUS_CANCELLED,
            'cancelled_at' => BusinessDateTime::now(),
            'admin_notes' => $note,
        ]);

        return ['ok' => true, 'message' => 'Solicitud denegada y eliminada de la lista.'];
    }
}
