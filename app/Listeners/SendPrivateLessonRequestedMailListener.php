<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\PrivateLessonRequestedEvent;
use App\Services\AcademyLessonRequestMailService;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendPrivateLessonRequestedMailListener implements ShouldQueue
{
    public function __construct(
        private readonly AcademyLessonRequestMailService $academyLessonRequestMailService,
    ) {}

    public function handle(PrivateLessonRequestedEvent $event): void
    {
        $this->academyLessonRequestMailService->sendRequestReceived($event->enrollment);
    }
}
