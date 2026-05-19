<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Lesson;

/**
 * Unidades de bono (créditos) consumidas por sesión asistida.
 * Regla de negocio: una clase particular equivale a dos grupales (2 unidades).
 */
final class LessonBonoCreditUnits
{
    /**
     * Créditos por sesión en historial de bono cuando solo se conoce la modalidad
     * (p. ej. consumos antiguos sin recomputar participantes).
     */
    public static function unitsFromModality(?string $lessonModality): int
    {
        $m = strtolower(trim((string) $lessonModality));

        if ($m === Lesson::MODALITY_PARTICULAR) {
            return 2;
        }

        return 1;
    }

    /**
     * Créditos a descontar al inscribir o contabilizar una asistencia:
     * particular = 2; grupal/semanal con una sola plaza ocupada = 2; en grupo = 1.
     *
     * @param  int  $participantPartyTotal  Suma de plazas (quantity/party_size) ya confirmadas en la clase,
     *                                      incluyendo la nueva inscripción.
     */
    public static function unitsForCharge(?string $lessonModality, int $participantPartyTotal): int
    {
        $m = strtolower(trim((string) $lessonModality));

        if ($m === Lesson::MODALITY_PARTICULAR) {
            return 2;
        }

        return $participantPartyTotal <= 1 ? 2 : 1;
    }
}
