<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\AttendanceNote;
use App\Models\BonoConsumption;
use App\Models\LessonUser;
use App\Models\PackBono;
use App\Models\User;
use App\Models\UserBono;
use App\Services\BonoService;
use App\Support\LessonBonoCreditUnits;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class BonoController extends Controller
{
    public function __construct(protected BonoService $bonoService)
    {
    }

    public function index()
    {
        $user = auth()->user();
        if (! $user || ! (bool) ($user->is_vip ?? false)) {
            abort(403, 'Acceso restringido a usuarios VIP.');
        }

        $packs = PackBono::query()
            ->where('activo', true)
            ->orderBy('precio')
            ->get();

        $userBonos = UserBono::query()
            ->with('pack:id,nombre,num_clases,precio')
            ->where('user_id', $user?->id)
            ->orderByDesc('id')
            ->limit(30)
            ->get();

        $usageStates = $this->bonoService->resolveUsageStates($userBonos);

        $consumptionsByBonoId = [];
        $consumptionHistory = collect();

        if (Schema::hasTable('bono_consumptions')) {
            $consumptions = BonoConsumption::query()
                ->with([
                    'lesson:id,title,starts_at,level,modality,description,location',
                    'userBono.pack:id,num_clases',
                ])
                ->where('user_id', $user->id)
                ->whereIn('user_bono_id', $userBonos->pluck('id'))
                ->orderByDesc('consumed_at')
                ->limit(200)
                ->get();

            $detailsByLesson = $this->preloadConsumptionDetails($user, $consumptions);

            foreach ($consumptions->groupBy(fn (BonoConsumption $c) => $c->user_bono_id ?? 0) as $bonoId => $group) {
                if ((int) $bonoId <= 0) {
                    continue;
                }

                $ordered = $group->sortBy(fn (BonoConsumption $c) => $c->consumed_at?->timestamp ?? 0)->values();
                $packSize = (int) ($ordered->first()?->userBono?->pack?->num_clases ?? 0);
                $running = $packSize > 0 ? $packSize : null;
                $bonoRows = [];

                foreach ($ordered as $c) {
                    $bonoRows[] = $this->mapConsumptionRow($c, $detailsByLesson, $running);
                }

                $consumptionsByBonoId[(int) $bonoId] = collect($bonoRows)
                    ->sortByDesc(fn (array $r) => strtotime((string) ($r['date'] ?? '')))
                    ->values()
                    ->all();
            }

            $consumptionHistory = collect($consumptionsByBonoId)
                ->flatten(1)
                ->sortByDesc(fn (array $r) => strtotime((string) ($r['date'] ?? '')))
                ->values()
                ->take(50);
        }

        $myBonos = $userBonos
            ->map(function (UserBono $b) use ($usageStates, $consumptionsByBonoId) {
                $usage = $usageStates[(int) $b->id] ?? [
                    'usage_status' => 'unknown',
                    'usage_label' => 'Desconocido',
                ];

                return [
                    'id' => $b->id,
                    'pack' => $b->pack?->nombre,
                    'num_clases' => (int) ($b->pack?->num_clases ?? 0),
                    'precio' => (float) ($b->pack?->precio ?? 0),
                    'clases_restantes' => (int) $b->clases_restantes,
                    'status' => $b->status,
                    'usage_status' => $usage['usage_status'],
                    'usage_label' => $usage['usage_label'],
                    'purchased_at_human' => $b->created_at?->locale('es')->translatedFormat('d/m/Y H:i'),
                    'consumptions' => $consumptionsByBonoId[(int) $b->id] ?? [],
                    'proof_url' => $b->payment_proof_path ? Storage::url($b->payment_proof_path) : null,
                    'created_at' => $b->created_at?->toIso8601String(),
                    'admin_notes' => $b->admin_notes,
                ];
            })
            ->values();

        $waDigits = preg_replace('/\D+/', '', (string) config('services.academy.whatsapp_number', ''));

        return Inertia::render('Client/Bonos/Index', [
            'packs' => $packs,
            'myBonos' => $myBonos,
            'consumptionHistory' => $consumptionHistory,
            'paymentIban' => config('services.academy.iban', '[IBAN]'),
            'paymentBizumNumber' => config('services.academy.bizum_number', '[BIZUM_NUMBER]'),
            'whatsappHelpUrl' => $waDigits !== '' ? 'https://wa.me/'.$waDigits : null,
        ]);
    }

    public function requestPurchase(Request $request)
    {
        $user = auth()->user();
        if (! $user) {
            return back()->with('error', 'Debes iniciar sesión.');
        }
        if (! (bool) ($user->is_vip ?? false)) {
            return back()->with('error', 'Solo los usuarios VIP pueden comprar bonos.');
        }

        $validated = $request->validate([
            'pack_id' => 'required|integer|exists:pack_bonos,id',
            'proof' => 'required|file|mimes:jpeg,jpg,png,webp,pdf|max:10240',
        ]);

        $pack = PackBono::query()->where('activo', true)->findOrFail((int) $validated['pack_id']);
        $this->bonoService->requestBono($user, $pack, $request->file('proof'));

        return back()->with('success', 'Solicitud de compra enviada. La validaremos en breve.');
    }

    /**
     * @param  array<int, array{classmates: list<string>, monitor_comment: ?string, monitor_name: ?string}>  $detailsByLesson
     * @param  int|null  $running  Saldo recalculado por bono (referencia)
     * @return array<string, mixed>
     */
    private function mapConsumptionRow(BonoConsumption $c, array $detailsByLesson, ?int &$running): array
    {
        $lesson = $c->lesson;
        $lessonTitle = $lesson?->title ?: 'Clase de surf';
        $credits = LessonBonoCreditUnits::unitsFromModality($lesson?->modality);

        if ($running !== null) {
            $running = max(0, $running - $credits);
            $remaining = $running;
        } else {
            $remaining = (int) $c->remaining_after;
        }

        $lessonId = (int) ($c->lesson_id ?? 0);
        $extra = $detailsByLesson[$lessonId] ?? [
            'classmates' => [],
            'monitor_comment' => null,
            'monitor_name' => null,
        ];

        return [
            'id' => $c->id,
            'user_bono_id' => (int) ($c->user_bono_id ?? 0),
            'date' => $c->consumed_at?->toIso8601String(),
            'date_human' => $c->consumed_at?->locale('es')->translatedFormat('d/m/Y H:i'),
            'lesson_name' => $lessonTitle,
            'credits_consumed' => $credits,
            'remaining_after' => $remaining,
            'details' => [
                'level' => $lesson?->level ?: 'iniciacion',
                'level_label' => $this->mapLevelLabel($lesson?->level),
                'modality' => $lesson?->modality ?: 'grupal',
                'modality_label' => $this->mapModalityLabel($lesson?->modality),
                'location' => $lesson?->location ?: null,
                'objectives' => $this->sanitizeLessonObjectives($lesson?->description),
                'classmates' => $extra['classmates'],
                'monitor_comment' => $extra['monitor_comment'],
                'monitor_name' => $extra['monitor_name'],
            ],
        ];
    }

    /**
     * @param  Collection<int, BonoConsumption>  $consumptions
     * @return array<int, array{classmates: list<string>, monitor_comment: ?string, monitor_name: ?string}>
     */
    private function preloadConsumptionDetails(User $user, Collection $consumptions): array
    {
        $lessonIds = $consumptions->pluck('lesson_id')->filter()->unique()->values();
        if ($lessonIds->isEmpty()) {
            return [];
        }

        $userId = (int) $user->id;

        $enrollmentsByLesson = LessonUser::query()
            ->with('user:id,nombre,apellido')
            ->whereIn('lesson_id', $lessonIds)
            ->whereIn('status', [
                LessonUser::STATUS_ATTENDED,
                LessonUser::STATUS_CONFIRMED,
                LessonUser::STATUS_ENROLLED,
            ])
            ->get()
            ->groupBy('lesson_id');

        $ownEnrollments = LessonUser::query()
            ->where('user_id', $userId)
            ->whereIn('lesson_id', $lessonIds)
            ->get()
            ->keyBy('lesson_id');

        $lessonUserIds = $ownEnrollments->pluck('id')->filter()->values();

        $visibleNotes = $lessonUserIds->isEmpty()
            ? collect()
            : AttendanceNote::query()
                ->where('user_id', $userId)
                ->where('is_visible_to_student', true)
                ->where('reservation_type', 'lesson_user')
                ->whereIn('reservation_id', $lessonUserIds)
                ->with('admin:id,nombre,apellido')
                ->orderByDesc('updated_at')
                ->get()
                ->groupBy('reservation_id');

        $detailsByLesson = [];
        foreach ($lessonIds as $lessonId) {
            $lessonId = (int) $lessonId;
            $enrolls = $enrollmentsByLesson->get($lessonId, collect());

            $classmates = $enrolls
                ->filter(fn (LessonUser $e) => (int) $e->user_id !== $userId)
                ->map(function (LessonUser $e) {
                    $name = trim(($e->user->nombre ?? '').' '.($e->user->apellido ?? ''));

                    return $name !== '' ? $name : null;
                })
                ->filter()
                ->unique()
                ->values()
                ->all();

            $monitorComment = null;
            $monitorName = null;
            $ownLu = $ownEnrollments->get($lessonId);

            if ($ownLu !== null) {
                $notes = $visibleNotes->get($ownLu->id);
                if ($notes !== null && $notes->isNotEmpty()) {
                    $note = $notes->first();
                    $monitorComment = trim((string) $note->body) ?: null;
                    $admin = $note->admin;
                    $name = trim(($admin->nombre ?? '').' '.($admin->apellido ?? ''));
                    $monitorName = $name !== '' ? $name : null;
                } elseif ($this->isStudentFacingAdminNote($ownLu->admin_notes)) {
                    $monitorComment = trim((string) $ownLu->admin_notes);
                }
            }

            $detailsByLesson[$lessonId] = [
                'classmates' => $classmates,
                'monitor_comment' => $monitorComment,
                'monitor_name' => $monitorName,
            ];
        }

        return $detailsByLesson;
    }

    private function mapLevelLabel(?string $level): string
    {
        return match (strtolower((string) $level)) {
            'avanzado' => 'Avanzado',
            'intermedio' => 'Intermedio',
            'pro' => 'Pro',
            default => 'Iniciación',
        };
    }

    private function mapModalityLabel(?string $modality): string
    {
        return match (strtolower((string) $modality)) {
            'particular' => 'Particular',
            'semanal' => 'Curso semanal',
            default => 'Grupal',
        };
    }

    private function sanitizeLessonObjectives(?string $description): ?string
    {
        $text = trim((string) $description);
        if ($text === '') {
            return null;
        }

        $lower = strtolower($text);
        if (str_contains($lower, 'clase vip historica (seed)') || str_contains($lower, 'seed')) {
            return null;
        }

        return $text;
    }

    private function isStudentFacingAdminNote(?string $note): bool
    {
        $note = trim((string) $note);
        if ($note === '') {
            return false;
        }

        $lower = strtolower($note);
        if (str_starts_with($lower, 'bono seed')) {
            return false;
        }
        if (str_contains($lower, 'seed vip')) {
            return false;
        }
        if (str_contains($lower, 'pendiente de validación')) {
            return false;
        }

        return true;
    }
}

