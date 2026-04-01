<?php

namespace App\Services;

use App\Models\AttendanceNote;
use App\Models\BonoConsumption;
use App\Models\LessonUser;

/**
 * Re-asocia notas de evolución lesson_user cuya reservation_id no apunta a una matrícula válida del alumno,
 * usando la fecha de la clase (consumo o matrícula del mismo día) como heurística.
 */
class AttendanceNoteRelinker
{
    /**
     * @return int Número de notas actualizadas
     */
    public static function relinkOrphanLessonUserNotes(?int $onlyUserId = null): int
    {
        $q = AttendanceNote::query()
            ->where('reservation_type', 'lesson_user')
            ->whereNotNull('reservation_id');

        if ($onlyUserId !== null) {
            $q->where('user_id', $onlyUserId);
        }

        $notes = $q->orderBy('id')->get();
        if ($notes->isEmpty()) {
            return 0;
        }

        $updated = 0;

        foreach ($notes as $note) {
            $userId = (int) $note->user_id;
            $rid = (int) $note->reservation_id;
            if ($userId < 1 || $rid < 1) {
                continue;
            }

            $lu = LessonUser::query()->find($rid);
            if ($lu !== null && (int) $lu->user_id === $userId) {
                continue;
            }

            $targetLuId = self::guessLessonUserIdForNote($note, $userId);
            if ($targetLuId === null || $targetLuId === $rid) {
                continue;
            }

            $note->reservation_id = $targetLuId;
            $note->save();
            $updated++;
        }

        return $updated;
    }

    private static function guessLessonUserIdForNote(AttendanceNote $note, int $userId): ?int
    {
        $rid = (int) $note->reservation_id;
        $anchorDate = null;

        if ($rid > 0) {
            $broken = LessonUser::query()->with('lesson:id,starts_at')->find($rid);
            if ($broken?->lesson?->starts_at) {
                $anchorDate = $broken->lesson->starts_at->copy()->timezone(config('app.timezone'))->toDateString();
            }
        }

        if ($anchorDate === null && $note->created_at) {
            $anchorDate = $note->created_at->copy()->timezone(config('app.timezone'))->toDateString();
        }

        if ($anchorDate === null) {
            return null;
        }

        $consumption = BonoConsumption::query()
            ->where('user_id', $userId)
            ->whereHas('lesson', function ($q) use ($anchorDate) {
                $q->whereDate('starts_at', $anchorDate);
            })
            ->orderByDesc('consumed_at')
            ->first();

        if ($consumption && $consumption->lesson_id) {
            $match = LessonUser::query()
                ->where('user_id', $userId)
                ->where('lesson_id', (int) $consumption->lesson_id)
                ->orderByDesc('id')
                ->value('id');
            if ($match) {
                return (int) $match;
            }
        }

        $candidates = LessonUser::query()
            ->where('user_id', $userId)
            ->whereHas('lesson', function ($q) use ($anchorDate) {
                $q->whereDate('starts_at', $anchorDate);
            })
            ->orderByDesc('id')
            ->pluck('id');

        if ($candidates->count() === 1) {
            return (int) $candidates->first();
        }

        return null;
    }
}
