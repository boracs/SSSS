<?php

namespace App\Events;

use App\Models\Lesson;
use App\Models\LessonUser;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SoloStudentLocked
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Lesson $lesson,
        public LessonUser $enrollment
    ) {}
}
