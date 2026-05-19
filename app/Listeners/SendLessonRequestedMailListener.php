<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\LessonRequestedEvent;
use App\Services\AcademyLessonRequestMailService;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendLessonRequestedMailListener implements ShouldQueue
{
    public function __construct(
        private readonly AcademyLessonRequestMailService $academyLessonRequestMailService,
    ) {}

    public function handle(LessonRequestedEvent $event): void
    {
        $this->academyLessonRequestMailService->sendRequestReceived($event->enrollment);
    }
}
