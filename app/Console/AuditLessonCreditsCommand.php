<?php

namespace App\Console;

use App\Models\Lesson;
use App\Services\CreditEngineService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class AuditLessonCreditsCommand extends Command
{
    protected $signature = 'academy:audit-lesson-credits';
    protected $description = 'Audita clases que empiezan en ~1h y aplica lock de créditos (1 o 2 según enrollments).';

    public function handle(CreditEngineService $engine): int
    {
        $oneHourFromNow = Carbon::now()->addHour();
        $windowStart = Carbon::now()->addMinutes(55);
        $windowEnd = Carbon::now()->addMinutes(65);

        $lessons = Lesson::query()
            ->where('status', Lesson::STATUS_SCHEDULED)
            ->whereBetween('starts_at', [$windowStart, $windowEnd])
            ->get();

        foreach ($lessons as $lesson) {
            $engine->runOneHourBeforeAudit($lesson);
        }

        $this->info('Audit completed: ' . $lessons->count() . ' lessons processed.');
        return self::SUCCESS;
    }
}
