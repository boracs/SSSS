<?php

namespace App\Console\Commands;

use App\Models\BonoConsumption;
use App\Models\CreditTransaction;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\UserBono;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class OperationalSanityCheckCommand extends Command
{
    protected $signature = 'ops:sanity-check';

    protected $description = 'Valida cordura operativa de bonos, stock y capacidad de clases.';

    public function handle(): int
    {
        $issues = [];

        $creditMismatches = UserBono::query()
            ->with('pack:id,num_clases')
            ->where('status', UserBono::STATUS_CONFIRMED)
            ->get()
            ->filter(function (UserBono $bono) {
                $packSize = (int) ($bono->pack->num_clases ?? 0);
                $consumed = (int) BonoConsumption::query()->where('user_bono_id', $bono->id)->count();
                $expected = max(0, $packSize - $consumed);
                return (int) $bono->clases_restantes !== $expected;
            })
            ->values();

        if ($creditMismatches->isNotEmpty()) {
            $issues[] = sprintf('Bonos con saldo inconsistente: %d', $creditMismatches->count());
        }

        $orphanConsumptions = BonoConsumption::query()
            ->whereDoesntHave('lesson')
            ->orWhereDoesntHave('user')
            ->count();
        if ($orphanConsumptions > 0) {
            $issues[] = "Consumos de bono huérfanos: {$orphanConsumptions}";
        }

        $stockIssues = Producto::query()
            ->where('unidades', '<', 0)
            ->count();
        if ($stockIssues > 0) {
            $issues[] = "Productos con stock negativo: {$stockIssues}";
        }

        $pedidoPivotMissing = Pedido::query()
            ->whereDoesntHave('productos')
            ->count();
        if ($pedidoPivotMissing > 0) {
            $issues[] = "Pedidos sin líneas de producto: {$pedidoPivotMissing}";
        }

        $capacityIssues = Lesson::query()
            ->with('enrollments:id,lesson_id,status,party_size,quantity')
            ->get()
            ->filter(function (Lesson $lesson) {
                $occupied = $lesson->enrollments
                    ->filter(fn (LessonUser $e) => in_array($e->status, [
                        LessonUser::STATUS_PENDING,
                        LessonUser::STATUS_CONFIRMED,
                        LessonUser::STATUS_ENROLLED,
                        LessonUser::STATUS_ATTENDED,
                    ], true))
                    ->sum(fn (LessonUser $e) => (int) ($e->quantity ?: $e->party_size ?: 1));

                $cap = (int) ($lesson->max_slots ?: 0);
                return $cap > 0 && $occupied > $cap;
            })
            ->count();
        if ($capacityIssues > 0) {
            $issues[] = "Clases con capacidad excedida: {$capacityIssues}";
        }

        $this->line('=== Operational Sanity Check ===');
        $this->line('Bonos confirmados: '.UserBono::query()->where('status', UserBono::STATUS_CONFIRMED)->count());
        $this->line('Consumos de bono: '.BonoConsumption::query()->count());
        $this->line('Transacciones de crédito: '.CreditTransaction::query()->count());
        $this->line('Pedidos: '.Pedido::query()->count());
        $this->line('Líneas pedido_producto: '.DB::table('pedido_producto')->count());
        $this->line('Lecciones: '.Lesson::query()->count());
        $this->line('Inscripciones lesson_user: '.LessonUser::query()->count());

        if (empty($issues)) {
            $this->info('Sin inconsistencias críticas detectadas.');
            return self::SUCCESS;
        }

        $this->warn('Se detectaron inconsistencias:');
        foreach ($issues as $issue) {
            $this->warn("- {$issue}");
        }

        return self::FAILURE;
    }
}
