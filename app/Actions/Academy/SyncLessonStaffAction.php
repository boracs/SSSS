<?php

declare(strict_types=1);

namespace App\Actions\Academy;

use App\Models\Lesson;
use App\Models\StaffAssignment;
use InvalidArgumentException;

final class SyncLessonStaffAction
{
    public function execute(Lesson $lesson, array $validated): void
    {
        $monitorId = $this->nullableUserId($validated['monitor_id'] ?? null);
        $monitor2Id = $this->nullableUserId($validated['monitor_2_id'] ?? null);
        $photographerId = $this->nullableUserId($validated['photographer_id'] ?? null);
        $hasPhotographer = (bool) ($validated['has_photographer'] ?? false);

        if ($monitorId !== null && $monitor2Id !== null && $monitorId === $monitor2Id) {
            throw new InvalidArgumentException('El 1º y el 2º monitor no pueden ser la misma persona.');
        }

        if ($monitorId !== null && $monitorId === $photographerId) {
            throw new InvalidArgumentException('El fotógrafo no puede ser el mismo que el 1º monitor.');
        }

        if ($monitor2Id !== null && $monitor2Id === $photographerId) {
            throw new InvalidArgumentException('El fotógrafo no puede ser el mismo que el 2º monitor.');
        }

        $this->syncRole($lesson, StaffAssignment::ROLE_MONITOR, $monitorId);
        $this->syncRole($lesson, StaffAssignment::ROLE_MONITOR_SECOND, $monitor2Id);

        if ($hasPhotographer && $photographerId !== null) {
            StaffAssignment::updateOrCreate(
                ['lesson_id' => $lesson->id, 'role' => StaffAssignment::ROLE_FOTOGRAFO],
                ['user_id' => $photographerId]
            );
        } else {
            StaffAssignment::query()
                ->where('lesson_id', $lesson->id)
                ->where('role', StaffAssignment::ROLE_FOTOGRAFO)
                ->delete();
        }
    }

    private function syncRole(Lesson $lesson, string $role, ?int $userId): void
    {
        if ($userId !== null) {
            StaffAssignment::updateOrCreate(
                ['lesson_id' => $lesson->id, 'role' => $role],
                ['user_id' => $userId]
            );

            return;
        }

        StaffAssignment::query()
            ->where('lesson_id', $lesson->id)
            ->where('role', $role)
            ->delete();
    }

    private function nullableUserId(mixed $value): ?int
    {
        if ($value === null || $value === '' || $value === false) {
            return null;
        }

        $id = (int) $value;

        return $id > 0 ? $id : null;
    }
}
