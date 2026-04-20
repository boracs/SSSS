<?php

namespace App\Services;

use App\Models\AttendanceNote;
use App\Models\LessonUser;
use App\Models\Booking;
use App\Models\User;
use App\Models\UserBono;
use App\Support\BusinessDateTime;

class VipStudentPerformanceService
{
    public const PROFILE_MODE_STUDENT = 'student';
    public const PROFILE_MODE_MANAGEMENT = 'management';

    /**
     * Punto único de entrada: siempre usa el modelo User del alumno objetivo (nunca auth()).
     * Lee exclusivamente datos reales de BD para ese usuario.
     *
     * @param  bool  $forAdminAnalysis  Incluye lesson_user_id y admin_note por fila del mapa.
     */
    public static function buildPerformanceDataForSubject(User $subjectUser, string $bonoMonth, bool $loadHistory, bool $forAdminAnalysis = false): array
    {
        return self::buildPerformanceData($subjectUser, $bonoMonth, $loadHistory, $forAdminAnalysis);
    }

    /**
     * Misma estructura que el dashboard VIP de Mis Reservas para un usuario dado.
     * Usar {@see buildPerformanceDataForSubject} desde controladores; este método solo consulta BD para ese User.
     *
     * @param  bool  $forAdminAnalysis  Incluye lesson_user_id y admin_note (cualquier nota) por fila del mapa.
     */
    public static function buildPerformanceData(User $user, string $bonoMonth, bool $loadHistory, bool $forAdminAnalysis = false): array
    {
        if (self::isAdminUser($user) && ! $forAdminAnalysis) {
            return self::buildManagementProfileData($user, $bonoMonth);
        }

        $confirmedBonos = UserBono::query()
            ->with('pack:id,nombre,num_clases,precio')
            ->where('user_id', $user->id)
            ->where('status', UserBono::STATUS_CONFIRMED)
            ->get();
        $confirmedBonosSorted = $confirmedBonos
            ->sortBy(function (UserBono $bono): string {
                return sprintf('%s-%010d', (string) ($bono->created_at?->format('YmdHisu') ?? '00000000000000000000'), (int) $bono->id);
            })
            ->values();
        $activeBono = $confirmedBonosSorted
            ->sortByDesc(function (UserBono $bono): string {
                return sprintf('%s-%010d', (string) ($bono->created_at?->format('YmdHisu') ?? '00000000000000000000'), (int) $bono->id);
            })
            ->first();

        $historyMapped = self::buildConfirmedLessonUserHistoryRows($user, $activeBono, null);

        if ($forAdminAnalysis) {
            $historyMapped = self::mergeLessonUsersIntoConsumptionStyleRows($user, $historyMapped, $activeBono);
        }

        $lastMonth = BusinessDateTime::now()->subDays(30);
        $lastMonthSessions = $historyMapped->filter(function ($h) use ($lastMonth) {
            $raw = $h['lesson']['starts_at'] ?? $h['consumed_at'] ?? null;
            return $raw ? strtotime((string) $raw) >= $lastMonth->timestamp : false;
        })->count();
        $weeklyRate = $lastMonthSessions > 0 ? ($lastMonthSessions / 4.2857) : 0;
        $confirmedCapacityUc = (int) $confirmedBonos->sum(fn (UserBono $b) => (int) ($b->pack?->num_clases ?? 0));
        $consumingStatuses = [
            LessonUser::STATUS_CONFIRMED,
            LessonUser::STATUS_ATTENDED,
            LessonUser::STATUS_CANCELLED_LATE_LOST,
        ];
        $consumedUcGlobal = self::calculateConsumedUcFromLessonUsers($user, $consumingStatuses, null);
        $globalRemainingUc = $confirmedCapacityUc - $consumedUcGlobal;
        $lastPackTotalUc = (int) ($activeBono?->pack?->num_clases ?? 0);
        $lastPackRemainingUc = $lastPackTotalUc;
        $lastPackConsumedUc = 0;
        $remainingConsumptionToAllocate = max(0, $consumedUcGlobal);
        foreach ($confirmedBonosSorted as $bonoSorted) {
            $packUc = (int) ($bonoSorted->pack?->num_clases ?? 0);
            if ($packUc <= 0) {
                continue;
            }
            $allocatedToThisPack = min($remainingConsumptionToAllocate, $packUc);
            $remainingConsumptionToAllocate -= $allocatedToThisPack;
            if ((int) $bonoSorted->id === (int) ($activeBono?->id ?? 0)) {
                $lastPackConsumedUc = (int) $allocatedToThisPack;
                $lastPackRemainingUc = (int) ($packUc - $allocatedToThisPack);
            }
        }
        $lastPackExtraConsumedUc = max(0, $remainingConsumptionToAllocate);
        $estimatedWeeks = ($weeklyRate > 0) ? ((int) ceil(max($globalRemainingUc, 0) / $weeklyRate)) : null;
        $estimatedEndDate = $estimatedWeeks ? BusinessDateTime::now()->addWeeks($estimatedWeeks)->format('d/m/Y') : null;

        $visibleNotes = AttendanceNote::query()
            ->where('user_id', $user->id)
            ->where('is_visible_to_student', true)
            ->where('reservation_type', 'lesson_user')
            ->whereNotNull('reservation_id')
            ->with('admin:id,nombre,apellido')
            ->orderByDesc('created_at')
            ->get();

        $allAdminNotes = $forAdminAnalysis
            ? AttendanceNote::query()
                ->where('user_id', $user->id)
                ->where('reservation_type', 'lesson_user')
                ->whereNotNull('reservation_id')
                ->orderByDesc('updated_at')
                ->get()
            : collect();

        $reservationIds = $visibleNotes->pluck('reservation_id')
            ->merge($allAdminNotes->pluck('reservation_id'))
            ->unique()
            ->filter()
            ->values();

        $lessonUserByReservationId = $reservationIds->isEmpty()
            ? collect()
            : LessonUser::query()
                ->with('lesson:id,starts_at')
                ->whereIn('id', $reservationIds)
                ->get()
                ->keyBy('id');

        $userId = (int) $user->id;

        $notesByLessonId = [];
        foreach ($visibleNotes as $n) {
            if (self::attendanceNoteLessonUserIsOrphan($n, $userId, $lessonUserByReservationId)) {
                continue;
            }
            $rid = (int) $n->reservation_id;
            $lu = $lessonUserByReservationId->get($rid);
            $lid = (int) ($lu?->lesson_id ?? 0);
            if ($lid === 0) {
                continue;
            }
            if (isset($notesByLessonId[$lid])) {
                continue;
            }
            $admin = $n->admin;
            $monitorName = trim(($admin->nombre ?? '').' '.($admin->apellido ?? '')) ?: 'Monitor';
            $notesByLessonId[$lid] = [
                'text' => $n->body,
                'monitor_name' => $monitorName,
            ];
        }

        $notesByDate = [];
        foreach ($visibleNotes as $n) {
            if (! self::attendanceNoteLessonUserIsOrphan($n, $userId, $lessonUserByReservationId)) {
                continue;
            }
            $d = self::attendanceNoteAnchorDateYmd($n, $lessonUserByReservationId);
            if ($d === null || $d === '') {
                continue;
            }
            if (isset($notesByDate[$d])) {
                continue;
            }
            $admin = $n->admin;
            $monitorName = trim(($admin->nombre ?? '').' '.($admin->apellido ?? '')) ?: 'Monitor';
            $notesByDate[$d] = [
                'text' => $n->body,
                'monitor_name' => $monitorName,
            ];
        }

        $adminNotesByEnrollmentId = [];
        $orphanAdminNotesByDate = [];
        if ($forAdminAnalysis) {
            foreach ($allAdminNotes as $n) {
                $rid = (int) $n->reservation_id;
                if ($rid === 0) {
                    continue;
                }
                if (self::attendanceNoteLessonUserIsOrphan($n, $userId, $lessonUserByReservationId)) {
                    $d = self::attendanceNoteAnchorDateYmd($n, $lessonUserByReservationId);
                    if ($d === null || $d === '') {
                        continue;
                    }
                    if (! isset($orphanAdminNotesByDate[$d]) || $n->updated_at > $orphanAdminNotesByDate[$d]->updated_at) {
                        $orphanAdminNotesByDate[$d] = $n;
                    }

                    continue;
                }
                if (isset($adminNotesByEnrollmentId[$rid])) {
                    continue;
                }
                $adminNotesByEnrollmentId[$rid] = [
                    'id' => $n->id,
                    'body' => $n->body,
                    'is_visible_to_student' => (bool) $n->is_visible_to_student,
                ];
            }
        }

        $attendanceMap = $historyMapped->map(function ($row) use ($notesByLessonId, $notesByDate, $forAdminAnalysis, $adminNotesByEnrollmentId, $orphanAdminNotesByDate, $user) {
            $date = $row['lesson']['starts_at'] ?: $row['consumed_at'];
            $ymd = $date ? date('Y-m-d', strtotime($date)) : null;
            $lessonId = (int) ($row['lesson']['id'] ?? 0);

            $lessonUserId = $ymd
                ? self::resolveLessonUserIdForAttendanceRow($user, $lessonId, $ymd)
                : 0;

            $note = null;
            if ($lessonId > 0 && isset($notesByLessonId[$lessonId])) {
                $note = $notesByLessonId[$lessonId];
            } elseif ($ymd && isset($notesByDate[$ymd])) {
                $note = $notesByDate[$ymd];
            }

            $adminNote = null;
            if ($forAdminAnalysis) {
                if ($lessonUserId > 0 && isset($adminNotesByEnrollmentId[$lessonUserId])) {
                    $adminNote = $adminNotesByEnrollmentId[$lessonUserId];
                } elseif ($ymd && isset($orphanAdminNotesByDate[$ymd])) {
                    $on = $orphanAdminNotesByDate[$ymd];
                    $adminNote = [
                        'id' => $on->id,
                        'body' => $on->body,
                        'is_visible_to_student' => (bool) $on->is_visible_to_student,
                    ];
                }
            }

            $out = [
                'date' => $ymd,
                'uc_cost' => $row['uc_cost'],
                'lesson' => $row['lesson'],
                'crew' => $row['crew'],
                'crew_overflow' => $row['crew_overflow'],
                'note' => $note,
            ];
            if ($forAdminAnalysis) {
                $out['lesson_user_id'] = $lessonUserId;
                $out['admin_note'] = $adminNote;
            }

            return $out;
        })->filter(fn ($r) => ! empty($r['date']))->values();

        $attendanceMap = $attendanceMap
            ->filter(fn ($r) => str_starts_with((string) ($r['date'] ?? ''), $bonoMonth))
            ->values();

        $historyMappedAll = self::recalculateRemainingAfter($historyMapped->values(), $confirmedCapacityUc);
        $historyMappedAll = self::applyVisualBonoGrouping(
            $historyMappedAll,
            $confirmedBonosSorted,
            (int) ($activeBono?->id ?? 0)
        );

        $totalHours = $historyMappedAll->sum(function ($r) {
            $start = ! empty($r['lesson']['starts_at']) ? strtotime($r['lesson']['starts_at']) : null;
            $end = ! empty($r['lesson']['ends_at']) ? strtotime($r['lesson']['ends_at']) : null;
            if (! $start || ! $end || $end <= $start) {
                return 1.5;
            }

            return round(($end - $start) / 3600, 2);
        });
        $soloUc = (int) $historyMappedAll->where('uc_cost', 2)->sum('uc_cost');
        $groupUc = (int) $historyMappedAll->where('uc_cost', 1)->sum('uc_cost');
        $totalUc = $soloUc + $groupUc;
        $soloRatio = $totalUc > 0 ? (int) round(($soloUc * 100) / $totalUc) : 0;

        $levelRank = ['iniciacion' => 1, 'intermedio' => 2, 'avanzado' => 3];
        $maxLevel = 'iniciacion';
        foreach ($historyMappedAll as $r) {
            $l = strtolower((string) ($r['lesson']['level'] ?? 'iniciacion'));
            if (($levelRank[$l] ?? 1) > ($levelRank[$maxLevel] ?? 1)) {
                $maxLevel = $l;
            }
        }

        $dynamicRemainingClasses = $globalRemainingUc;

        return [
            /** Siempre el alumno cuyos datos se están calculando (blindaje front / caché). */
            'subject_user_id' => (int) $user->id,
            'profile_mode' => self::PROFILE_MODE_STUDENT,
            'activeBono' => [
                'id' => $activeBono?->id,
                'name' => 'Saldo de Créditos VIP',
                'sku' => $activeBono?->sku,
                'num_classes' => $confirmedCapacityUc,
                'remaining' => $dynamicRemainingClasses,
                'remaining_uc' => $dynamicRemainingClasses,
                'last_pack_total_uc' => $lastPackTotalUc,
                'last_pack_remaining_uc' => $lastPackRemainingUc,
                'last_pack_consumed_uc' => $lastPackConsumedUc,
                'last_pack_extra_consumed_uc' => $lastPackExtraConsumedUc,
                'price' => (float) ($activeBono?->pack?->precio ?? 0),
            ],
            'history' => $loadHistory ? $historyMappedAll->all() : null,
            'history_loaded' => $loadHistory,
            'history_count' => (int) $historyMappedAll->count(),
            'attendanceMap' => $attendanceMap->all(),
            'prediction' => $estimatedEndDate
                ? "Al ritmo actual, tus créditos durarán hasta el {$estimatedEndDate}"
                : 'Necesitamos más sesiones para estimar tu ritmo.',
            'stats' => [
                'total_surfed_hours' => round((float) $totalHours, 1),
                'solo_ratio_percent' => $soloRatio,
                'level_progress' => ucfirst($maxLevel),
            ],
            'month' => $bonoMonth,
        ];
    }

    /**
     * Filas de reservas para Mis Reservas / espejo admin (mismo formato que MyReservationsController).
     *
     * @return array{classRows: \Illuminate\Support\Collection, rentalRows: \Illuminate\Support\Collection, bonoRows: \Illuminate\Support\Collection}
     */
    public static function buildReservationRows(User $user): array
    {
        if (self::isAdminUser($user)) {
            return [
                'classRows' => collect(),
                'rentalRows' => collect(),
                'bonoRows' => collect(),
            ];
        }

        $classRows = LessonUser::query()
            ->with(['lesson:id,title,starts_at,level,modality,location'])
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(120)
            ->get()
            ->map(function (LessonUser $row) {
                $startAt = $row->lesson?->starts_at;
                $isWithinCancellationWindow = $startAt ? BusinessDateTime::now()->diffInHours($startAt, false) <= 24 : false;
                $canCancel = $startAt ? BusinessDateTime::now()->diffInHours($startAt, false) > 24 : false;

                return [
                    'id' => $row->id,
                    'type' => 'class',
                    'title' => $row->lesson?->title ?: 'Clase de surf',
                    'level' => $row->lesson?->level,
                    'modality' => $row->lesson?->modality ?: 'grupal',
                    'location' => $row->lesson?->location ?: 'Zurriola',
                    'status' => $row->status,
                    'payment_status' => $row->payment_status ?: LessonUser::PAYMENT_PENDING,
                    'created_at' => $row->created_at?->toIso8601String(),
                    'start_time' => $startAt ? BusinessDateTime::toApi($startAt) : null,
                    'has_proof' => ! empty($row->payment_proof_path),
                    'can_cancel' => $canCancel,
                    'is_within_cancellation_window' => $isWithinCancellationWindow,
                    'cancel_block_reason' => $canCancel ? null : 'Fuera de plazo de cancelación (requiere 24h de antelación)',
                ];
            })
            ->values();

        $rentalRows = Booking::query()
            ->with(['surfboard:id,name'])
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(120)
            ->get()
            ->map(function (Booking $row) {
                $startAt = $row->start_date;
                $canCancel = $startAt ? BusinessDateTime::now()->diffInHours($startAt, false) > 24 : false;

                return [
                    'id' => $row->id,
                    'type' => 'rental',
                    'title' => $row->surfboard?->name ? 'Alquiler · '.$row->surfboard->name : 'Alquiler de tabla',
                    'status' => $row->status,
                    'payment_status' => $row->payment_status ?: Booking::PAYMENT_PENDING,
                    'created_at' => $row->created_at?->toIso8601String(),
                    'start_time' => $startAt ? BusinessDateTime::toApi($startAt) : null,
                    'end_time' => $row->end_date ? BusinessDateTime::toApi($row->end_date) : null,
                    'amount' => (float) ($row->deposit_amount ?? 0),
                    'has_proof' => ! empty($row->payment_proof_path),
                    'can_cancel' => $canCancel,
                    'cancel_block_reason' => $canCancel ? null : 'Fuera de plazo de cancelación (requiere 24h de antelación)',
                ];
            })
            ->values();

        $bonoRows = UserBono::query()
            ->with('pack:id,nombre,num_clases,precio')
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(120)
            ->get()
            ->map(fn (UserBono $row) => [
                'id' => $row->id,
                'type' => 'bono',
                'title' => $row->pack?->nombre ?: 'Recarga de Créditos VIP',
                'num_clases' => (int) ($row->pack?->num_clases ?? 0),
                'clases_restantes' => (int) $row->clases_restantes,
                'status' => $row->status,
                'created_at' => $row->created_at?->toIso8601String(),
                'price' => (float) ($row->pack?->precio ?? 0),
            ])
            ->values();

        return [
            'classRows' => $classRows,
            'rentalRows' => $rentalRows,
            'bonoRows' => $bonoRows,
        ];
    }

    /**
     * @param  \Illuminate\Support\Collection<int, LessonUser>  $lessonUserByReservationId
     */
    private static function attendanceNoteLessonUserIsOrphan(
        AttendanceNote $n,
        int $studentUserId,
        $lessonUserByReservationId
    ): bool {
        $rid = (int) ($n->reservation_id ?? 0);
        if ($rid <= 0) {
            return true;
        }
        $lu = $lessonUserByReservationId->get($rid);
        if ($lu === null) {
            return true;
        }

        return (int) $lu->user_id !== $studentUserId;
    }

    /**
     * Fecha calendario de la clase vinculada a la nota; si la matrícula no existe, cae a created_at.
     *
     * @param  \Illuminate\Support\Collection<int, LessonUser>  $lessonUserByReservationId
     */
    private static function attendanceNoteAnchorDateYmd(AttendanceNote $n, $lessonUserByReservationId): ?string
    {
        $rid = (int) ($n->reservation_id ?? 0);
        $tz = config('app.timezone');
        if ($rid > 0) {
            $lu = $lessonUserByReservationId->get($rid);
            if ($lu?->lesson?->starts_at) {
                return $lu->lesson->starts_at->copy()->timezone($tz)->toDateString();
            }
        }

        return $n->created_at?->copy()->timezone($tz)->toDateString();
    }

    /**
     * Añade sesiones desde matrículas (lesson_user) cuando no hay fila en bono_consumptions,
     * para que el análisis admin muestre el calendario y el historial alineados con las clases reales.
     *
     * @param  \Illuminate\Support\Collection<int, array<string, mixed>>  $historyMapped
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    private static function mergeLessonUsersIntoConsumptionStyleRows(User $user, $historyMapped, ?UserBono $activeBono)
    {
        $keys = [];
        foreach ($historyMapped as $r) {
            $lid = (int) ($r['lesson']['id'] ?? 0);
            $raw = $r['lesson']['starts_at'] ?? $r['consumed_at'] ?? null;
            if ($lid > 0 && $raw) {
                $keys[$lid.'|'.date('Y-m-d', strtotime((string) $raw))] = true;
            }
        }

        $lus = LessonUser::query()
            ->with([
                'lesson:id,title,starts_at,ends_at,level,location,modality,internal_notes',
                'lesson.enrollments' => function ($q) {
                    $q->with('user:id,nombre,apellido')
                        ->select('id', 'lesson_id', 'user_id', 'status');
                },
            ])
            ->where('user_id', $user->id)
            ->where('payment_status', LessonUser::PAYMENT_CONFIRMED)
            ->whereIn('status', [
                LessonUser::STATUS_CONFIRMED,
                LessonUser::STATUS_ENROLLED,
                LessonUser::STATUS_ATTENDED,
            ])
            ->whereHas('lesson', function ($q) {
                $q->whereNotNull('starts_at');
            })
            ->orderByDesc('id')
            ->limit(240)
            ->get();

        $extra = collect();
        $tz = config('app.timezone');

        foreach ($lus as $lu) {
            $lesson = $lu->lesson;
            if ($lesson === null || $lesson->starts_at === null) {
                continue;
            }
            $lid = (int) $lesson->id;
            $ymd = $lesson->starts_at->copy()->timezone($tz)->toDateString();
            $key = $lid.'|'.$ymd;
            if (isset($keys[$key])) {
                continue;
            }
            $keys[$key] = true;

            $participants = collect($lesson->enrollments ?? [])
                ->whereIn('status', [LessonUser::STATUS_CONFIRMED, LessonUser::STATUS_ENROLLED, LessonUser::STATUS_ATTENDED])
                ->values();
            $totalParticipants = (int) $participants->count();
            $ucCost = self::calculateUcCost($lesson->modality, $totalParticipants);
            $crew = $participants->map(function ($e) {
                $name = trim(($e->user->nombre ?? '').' '.($e->user->apellido ?? ''));
                $initials = collect(explode(' ', trim($name)))->filter()->take(2)->map(fn ($p) => mb_substr($p, 0, 1))->implode('');

                return [
                    'name' => $name ?: 'Alumno',
                    'initials' => strtoupper($initials ?: 'A'),
                ];
            })->values();

            $extra->push([
                'id' => -((int) $lu->id),
                'user_bono_id' => $activeBono ? (int) $activeBono->id : 0,
                'bono_name' => $activeBono?->pack?->nombre ?? 'Sin consumo UC registrado',
                'bono_num_classes' => (int) ($activeBono?->pack?->num_clases ?? 0),
                'bono_is_active' => (bool) $activeBono,
                'consumed_at' => BusinessDateTime::toApi($lesson->starts_at),
                'remaining_after' => $activeBono ? (int) $activeBono->clases_restantes : 0,
                'uc_cost' => $ucCost,
                'lesson' => [
                    'id' => $lesson->id,
                    'title' => $lesson->title ?: 'Sesión de surf',
                    'starts_at' => BusinessDateTime::toApi($lesson->starts_at),
                    'ends_at' => $lesson->ends_at ? BusinessDateTime::toApi($lesson->ends_at) : null,
                    'level' => $lesson->level ?: 'iniciacion',
                    'spot' => $lesson->location ?: 'Zurriola',
                    'monitor_note' => $lesson->internal_notes,
                    'participants_total' => $totalParticipants,
                ],
                'crew' => $crew,
                'crew_overflow' => 0,
            ]);
        }

        return $historyMapped->concat($extra)->sortByDesc(function ($row) {
            $raw = $row['lesson']['starts_at'] ?? $row['consumed_at'] ?? null;

            return $raw ? strtotime((string) $raw) : 0;
        })->values();
    }

    private static function resolveLessonUserIdForAttendanceRow(User $user, int $lessonId, string $dateYmd): int
    {
        if ($lessonId > 0) {
            $direct = (int) (LessonUser::query()
                ->where('user_id', $user->id)
                ->where('lesson_id', $lessonId)
                ->orderByDesc('id')
                ->value('id') ?? 0);
            if ($direct > 0) {
                return $direct;
            }
        }

        $candidates = LessonUser::query()
            ->where('user_id', $user->id)
            ->whereHas('lesson', function ($q) use ($dateYmd) {
                $q->whereDate('starts_at', $dateYmd);
            })
            ->orderByDesc('id')
            ->get(['id', 'lesson_id']);

        if ($candidates->isEmpty()) {
            return 0;
        }

        if ($lessonId > 0) {
            $match = $candidates->firstWhere('lesson_id', $lessonId);
            if ($match !== null) {
                return (int) $match->id;
            }
        }

        if ($candidates->count() === 1) {
            return (int) $candidates->first()->id;
        }

        // Si hay varias clases el mismo día y no se pudo emparejar por lesson_id,
        // vinculamos a la más reciente de ese día para evitar notas "huérfanas".
        return (int) $candidates->first()->id;
    }

    /**
     * Fallback cuando no hay bono_consumptions: usa lesson_user confirmadas para poblar historial y asistencia.
     *
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    private static function buildConfirmedLessonUserHistoryRows(User $user, ?UserBono $activeBono, $sinceDateTime = null)
    {
        $lus = LessonUser::query()
            ->with([
                'lesson:id,title,starts_at,ends_at,level,location,modality,internal_notes',
                'lesson.enrollments' => function ($q) {
                    $q->with('user:id,nombre,apellido')
                        ->select('id', 'lesson_id', 'user_id', 'status');
                },
            ])
            ->where('user_id', $user->id)
            ->whereIn('status', [
                LessonUser::STATUS_CONFIRMED,
                LessonUser::STATUS_ATTENDED,
                LessonUser::STATUS_CANCELLED_LATE_LOST,
            ])
            ->when($sinceDateTime, function ($q) use ($sinceDateTime) {
                $q->whereHas('lesson', function ($lq) use ($sinceDateTime) {
                    $lq->where('starts_at', '>=', $sinceDateTime);
                });
            })
            ->whereHas('lesson', function ($q) {
                $q->whereNotNull('starts_at');
            })
            ->orderByDesc('id')
            ->limit(240)
            ->get();

        return $lus->map(function (LessonUser $lu) use ($activeBono) {
            $lesson = $lu->lesson;
            $participants = collect($lesson?->enrollments ?? [])
                ->whereIn('status', [LessonUser::STATUS_CONFIRMED, LessonUser::STATUS_ENROLLED, LessonUser::STATUS_ATTENDED])
                ->values();
            $totalParticipants = (int) $participants->count();
            $ucCost = self::calculateUcCost($lesson?->modality, $totalParticipants);
            $crew = $participants->map(function ($e) {
                $name = trim(($e->user->nombre ?? '').' '.($e->user->apellido ?? ''));
                $initials = collect(explode(' ', trim($name)))->filter()->take(2)->map(fn ($p) => mb_substr($p, 0, 1))->implode('');

                return [
                    'name' => $name ?: 'Alumno',
                    'initials' => strtoupper($initials ?: 'A'),
                ];
            })->values();

            return [
                'id' => -((int) $lu->id),
                'user_bono_id' => $activeBono ? (int) $activeBono->id : 0,
                'bono_name' => $activeBono?->pack?->nombre ?? 'Sin consumo UC registrado',
                'bono_num_classes' => (int) ($activeBono?->pack?->num_clases ?? 0),
                'bono_is_active' => (bool) $activeBono,
                'consumed_at' => $lesson?->starts_at ? BusinessDateTime::toApi($lesson->starts_at) : null,
                'remaining_after' => 0,
                'uc_cost' => $ucCost,
                'lesson' => [
                    'id' => $lesson?->id,
                    'title' => $lesson?->title ?: 'Sesión de surf',
                    'starts_at' => $lesson?->starts_at ? BusinessDateTime::toApi($lesson->starts_at) : null,
                    'ends_at' => $lesson?->ends_at ? BusinessDateTime::toApi($lesson->ends_at) : null,
                    'level' => $lesson?->level ?: 'iniciacion',
                    'spot' => $lesson?->location ?: 'Zurriola',
                    'monitor_note' => $lesson?->internal_notes,
                    'participants_total' => $totalParticipants,
                ],
                'crew' => $crew,
                'crew_overflow' => 0,
            ];
        })->values();
    }

    /**
     * Recalcula remaining_after en orden cronológico para que cada fila sea:
     * saldo anterior - UC de esa sesión.
     *
     * @param  \Illuminate\Support\Collection<int, array<string, mixed>>  $rows
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    private static function recalculateRemainingAfter($rows, int $bonoTotalClasses)
    {
        if ($rows->isEmpty()) {
            return $rows;
        }

        $ordered = $rows->sortBy(function ($row) {
            $raw = $row['lesson']['starts_at'] ?? $row['consumed_at'] ?? null;

            return $raw ? strtotime((string) $raw) : 0;
        })->values();

        $running = max($bonoTotalClasses, 0);
        $recalculated = $ordered->map(function ($row) use (&$running) {
            $ucCost = max((int) ($row['uc_cost'] ?? 1), 1);
            $running = max($running - $ucCost, 0);
            $row['remaining_after'] = $running;

            return $row;
        });

        return $recalculated->sortByDesc(function ($row) {
            $raw = $row['lesson']['starts_at'] ?? $row['consumed_at'] ?? null;

            return $raw ? strtotime((string) $raw) : 0;
        })->values();
    }

    private static function calculateUcCost(?string $lessonModality, int $participantsTotal): int
    {
        $modality = strtolower((string) ($lessonModality ?? ''));
        if (in_array($modality, ['privada', 'private', 'particular', 'solo'], true)) {
            return 2;
        }

        return $participantsTotal <= 1 ? 2 : 1;
    }

    /**
     * Suma UC consumidas por estados que descuentan saldo.
     */
    private static function calculateConsumedUcFromLessonUsers(User $user, array $consumingStatuses, $sinceDateTime = null): int
    {
        $rows = LessonUser::query()
            ->with([
                'lesson:id,modality',
                'lesson.enrollments' => function ($q) {
                    $q->select('id', 'lesson_id', 'status');
                },
            ])
            ->where('user_id', $user->id)
            ->whereIn('status', $consumingStatuses)
            ->when($sinceDateTime, function ($q) use ($sinceDateTime) {
                $q->whereHas('lesson', function ($lq) use ($sinceDateTime) {
                    $lq->where('starts_at', '>=', $sinceDateTime);
                });
            })
            ->get();

        return (int) $rows->sum(function (LessonUser $row) {
            $participants = collect($row->lesson?->enrollments ?? [])
                ->whereIn('status', [LessonUser::STATUS_CONFIRMED, LessonUser::STATUS_ENROLLED, LessonUser::STATUS_ATTENDED])
                ->count();

            return self::calculateUcCost($row->lesson?->modality, (int) $participants);
        });
    }

    /**
     * Agrupa visualmente las filas del historial por bono con asignación FIFO.
     *
     * @param  \Illuminate\Support\Collection<int, array<string, mixed>>  $rowsDesc
     * @param  \Illuminate\Support\Collection<int, UserBono>  $confirmedBonosAsc
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    private static function applyVisualBonoGrouping($rowsDesc, $confirmedBonosAsc, int $activeBonoId)
    {
        if ($rowsDesc->isEmpty() || $confirmedBonosAsc->isEmpty()) {
            return $rowsDesc;
        }

        $buckets = $confirmedBonosAsc->map(function (UserBono $b) {
            return [
                'id' => (int) $b->id,
                'name' => $b->pack?->nombre ?: 'Bono',
                'sku' => (string) ($b->sku ?? ''),
                'num_classes' => (int) ($b->pack?->num_clases ?? 0),
                'remaining_uc' => (int) ($b->pack?->num_clases ?? 0),
            ];
        })->values();

        $chronological = $rowsDesc->sortBy(function ($row) {
            $raw = $row['lesson']['starts_at'] ?? $row['consumed_at'] ?? null;
            return $raw ? strtotime((string) $raw) : 0;
        })->values();

        $bucketIdx = 0;
        $assigned = $chronological->map(function ($row) use (&$bucketIdx, $buckets, $activeBonoId) {
            while ($bucketIdx < $buckets->count() && (int) ($buckets[$bucketIdx]['remaining_uc'] ?? 0) <= 0) {
                $bucketIdx++;
            }
            if ($bucketIdx >= $buckets->count()) {
                $bucketIdx = $buckets->count() - 1;
            }

            $bucket = $buckets[$bucketIdx];
            $ucCost = max((int) ($row['uc_cost'] ?? 1), 1);
            $bucket['remaining_uc'] = (int) $bucket['remaining_uc'] - $ucCost;
            $buckets[$bucketIdx] = $bucket;

            $row['user_bono_id'] = (int) $bucket['id'];
            $row['bono_name'] = $bucket['name'];
            $row['bono_sku'] = $bucket['sku'];
            $row['bono_num_classes'] = (int) $bucket['num_classes'];
            $row['bono_is_active'] = (int) $bucket['id'] === $activeBonoId;

            return $row;
        });

        return $assigned->sortByDesc(function ($row) {
            $raw = $row['lesson']['starts_at'] ?? $row['consumed_at'] ?? null;
            return $raw ? strtotime((string) $raw) : 0;
        })->values();
    }

    private static function isAdminUser(User $user): bool
    {
        return strtolower((string) ($user->role ?? '')) === 'admin';
    }

    private static function buildManagementProfileData(User $user, string $bonoMonth): array
    {
        return [
            'subject_user_id' => (int) $user->id,
            'profile_mode' => self::PROFILE_MODE_MANAGEMENT,
            'activeBono' => null,
            'history' => null,
            'history_loaded' => false,
            'history_count' => 0,
            'attendanceMap' => [],
            'prediction' => 'Panel de Gestión: Para reservar clases, usa tu cuenta de alumno',
            'stats' => [
                'total_surfed_hours' => 0,
                'solo_ratio_percent' => 0,
                'level_progress' => 'Gestión',
            ],
            'month' => $bonoMonth,
        ];
    }
}
