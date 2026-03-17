<?php

namespace App\Listeners;

use App\Events\SoloStudentLocked;
use App\Notifications\SoloStudentLessonNotification;

class SendSoloStudentNotification
{
    public function handle(SoloStudentLocked $event): void
    {
        $event->enrollment->user->notify(new SoloStudentLessonNotification($event->lesson));
    }
}
