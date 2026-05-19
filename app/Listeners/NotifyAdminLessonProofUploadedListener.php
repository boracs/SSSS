<?php declare(strict_types=1);

namespace App\Listeners;

use App\Events\LessonProofUploadedEvent;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;

class NotifyAdminLessonProofUploadedListener implements ShouldQueue
{
    public function handle(LessonProofUploadedEvent $event): void
    {
        $enrollment = $event->enrollment->loadMissing('lesson', 'user');

        Log::info('Nuevo justificante de pago subido y pendiente de revisión', [
            'enrollment_id' => $enrollment->id,
            'lesson_id' => $enrollment->lesson_id,
            'user_id' => $enrollment->user_id,
            'payment_method' => $enrollment->payment_method,
            'proof_uploaded_at' => optional($enrollment->proof_uploaded_at)?->toIso8601String(),
        ]);
    }
}
