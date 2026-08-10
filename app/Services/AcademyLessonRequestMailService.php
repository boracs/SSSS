<?php

declare(strict_types=1);

namespace App\Services;

use App\Mail\RequestReceivedMail;
use App\Models\LessonUser;
use Illuminate\Support\Facades\Mail;

/**
 * Envío de correos transversales para solicitudes de clase (grupal o particular).
 */
final class AcademyLessonRequestMailService
{
    public function sendRequestReceived(LessonUser $enrollment): void
    {
        $enrollment->loadMissing('user', 'lesson');
        $user = $enrollment->user;
        $lesson = $enrollment->lesson;

        if (! $user || ! $lesson || ! $user->email) {
            return;
        }

        Mail::to($user->email)->send(new RequestReceivedMail(
            $enrollment,
            $lesson,
            url()->route('academy.lessons.index')
        ));
    }
}
