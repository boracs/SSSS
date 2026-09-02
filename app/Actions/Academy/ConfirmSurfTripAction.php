<?php

declare(strict_types=1);

namespace App\Actions\Academy;

use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\User;
use App\Services\CreditEngineService;
use App\Support\BusinessDateTime;

final class ConfirmSurfTripAction
{
    public function __construct(
        private readonly CreditEngineService $creditEngine,
    ) {}

    /**
     * @return array{ok: bool, message: string}
     */
    public function execute(?User $user, Lesson $lesson, bool $confirmed): array
    {
        $enrollment = $user === null
            ? null
            : $lesson->enrollments()->where('user_id', $user->id)->first();

        if ($enrollment === null) {
            return ['ok' => false, 'message' => 'No estás inscrito.'];
        }

        if (! (bool) $lesson->is_surf_trip) {
            return ['ok' => false, 'message' => 'Esta clase no tiene cambio de ubicación que confirmar.'];
        }

        if ($lesson->starts_at === null || BusinessDateTime::now()->gte($lesson->starts_at)) {
            return ['ok' => false, 'message' => 'La clase ya ha comenzado: habla con el club para resolverlo.'];
        }

        if ($enrollment->surf_trip_confirmed !== null) {
            return ['ok' => false, 'message' => 'Ya respondiste al cambio de ubicación de esta clase.'];
        }

        if (! in_array($enrollment->status, LessonUser::activeSeatStatuses(), true)) {
            return ['ok' => false, 'message' => 'Esta reserva ya no está activa.'];
        }

        $enrollment->update(['surf_trip_confirmed' => $confirmed]);
        if (! $confirmed) {
            $this->creditEngine->refundCredits($enrollment, 'Reembolso: no asistencia a playa secundaria');
        }

        return ['ok' => true, 'message' => $confirmed ? 'Asistencia confirmada.' : 'Reembolso solicitado.'];
    }
}
