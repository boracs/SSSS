<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\LessonUser;
use App\Models\User;
use App\Support\AcademyEnrollmentPolicy;
use App\Support\BusinessDateTime;

class LessonUserPolicy
{
    /**
     * @var list<string>
     */
    private const CANCELLABLE_STUDENT_STATUSES = [
        LessonUser::STATUS_PENDING,
        LessonUser::STATUS_PENDING_EXTRA_MONITOR,
        LessonUser::STATUS_CONFIRMED,
        LessonUser::STATUS_ENROLLED,
    ];

    public function view(User $user, LessonUser $enrollment): bool
    {
        return $this->isAcademyAdmin($user) || $enrollment->isOwnedBy($user);
    }

    /**
     * Subir o reemplazar comprobante: dueño y estado operativo "pendiente de pago / justificante".
     */
    public function uploadProof(User $user, LessonUser $enrollment): bool
    {
        if (! $enrollment->isOwnedBy($user)) {
            return false;
        }

        if (! $enrollment->awaitingProofUpload()) {
            return false;
        }

        $lesson = $enrollment->lesson;
        if ($lesson && $lesson->starts_at && $lesson->starts_at->lt(BusinessDateTime::now())) {
            return false;
        }

        return true;
    }

    /**
     * Cancelar: alumno dueño (si la lección no ha pasado y el estado lo permite) o administrador.
     */
    public function cancel(User $user, LessonUser $enrollment): bool
    {
        if ($this->isAcademyAdmin($user)) {
            return true;
        }

        if (! $enrollment->isOwnedBy($user)) {
            return false;
        }

        $lesson = $enrollment->lesson;
        if ($lesson && $lesson->starts_at && $lesson->starts_at->lt(BusinessDateTime::now())) {
            return false;
        }

        if (! AcademyEnrollmentPolicy::canCancelByTime($lesson)) {
            return false;
        }

        return in_array($enrollment->status, self::CANCELLABLE_STUDENT_STATUSES, true);
    }

    private function isAcademyAdmin(User $user): bool
    {
        return (string) ($user->role ?? '') === 'admin' || (bool) ($user->is_admin ?? false);
    }
}
