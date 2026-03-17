<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\ReservationConfirmedMail;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\StaffAssignment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class AcademyController extends Controller
{
    /**
     * Consola del Comandante: gestión del día, trigger Surf-Trip, marcar olas óptimas.
     */
    public function index(Request $request)
    {
        $date = $request->has('date')
            ? Carbon::parse($request->input('date'))
            : Carbon::today();

        $lessons = Lesson::query()
            ->whereDate('starts_at', $date)
            ->with(['staffAssignments.user', 'enrollments.user'])
            ->orderBy('starts_at')
            ->get()
            ->map(fn (Lesson $l) => [
                'id' => $l->id,
                'starts_at' => $l->starts_at->toIso8601String(),
                'ends_at' => $l->ends_at->toIso8601String(),
                'level' => $l->level,
                'max_slots' => $l->max_slots,
                'location' => $l->location,
                'is_surf_trip' => $l->is_surf_trip,
                'is_optimal_waves' => $l->is_optimal_waves,
                'status' => $l->status,
                'is_private' => (bool) ($l->is_private ?? false),
                'enrollments' => $l->enrollments->map(fn ($e) => [
                    'id' => $e->id,
                    'user_id' => $e->user_id,
                    'status' => $e->status,
                    'party_size' => (int) ($e->party_size ?? 1),
                    'created_at' => $e->created_at?->toIso8601String(),
                    'has_proof' => ! empty($e->payment_proof_path),
                    'user' => $l->is_private ? null : ($e->user ? ['id' => $e->user->id, 'nombre' => $e->user->nombre ?? $e->user->name] : null),
                ]),
                'staff' => $l->staffAssignments->map(fn ($s) => [
                    'role' => $s->role,
                    'user' => $s->user ? ['id' => $s->user->id, 'nombre' => $s->user->nombre ?? $s->user->name] : null,
                ]),
            ]);

        $staff = User::query()->where('role', 'admin')->get(['id', 'nombre', 'email']);

        return Inertia::render('Admin/Academy/Commander', [
            'lessons' => $lessons,
            'selectedDate' => $date->format('Y-m-d'),
            'staff' => $staff,
        ]);
    }

    /**
     * Marcar/desmarcar día con olas óptimas para una lección.
     */
    public function toggleOptimalWaves(Lesson $lesson)
    {
        $lesson->update(['is_optimal_waves' => ! $lesson->is_optimal_waves]);
        return back()->with('success', 'Olas óptimas actualizadas.');
    }

    /**
     * Trigger Surf-Trip: cambia ubicación a Playa Secundaria (Furgoneta).
     */
    public function triggerSurfTrip(Lesson $lesson)
    {
        $lesson->update([
            'is_surf_trip' => true,
            'location' => 'Playa Secundaria (Furgoneta)',
            'surf_trip_triggered_at' => now(),
        ]);
        return back()->with('success', 'Surf-Trip activado. Los alumnos deben confirmar asistencia.');
    }

    /**
     * Cancelar clase por Mal Mar (Observer devolverá créditos).
     */
    public function cancelMalMar(Lesson $lesson)
    {
        $lesson->update([
            'status' => Lesson::STATUS_CANCELLED,
            'cancellation_reason' => Lesson::CANCELLATION_MAL_MAR,
        ]);
        return back()->with('success', 'Clase cancelada por mal mar. Créditos devueltos.');
    }

    /**
     * Asignar o quitar monitor/fotógrafo. Si user_id viene vacío, se elimina la asignación.
     */
    public function assignStaff(Request $request)
    {
        $request->validate([
            'lesson_id' => 'required|exists:lessons,id',
            'role' => 'required|in:monitor,fotografo',
            'user_id' => 'nullable|exists:users,id',
        ]);

        $lessonId = $request->input('lesson_id');
        $userId = $request->input('user_id');
        $role = $request->input('role');

        $assignment = StaffAssignment::where('lesson_id', $lessonId)->where('role', $role)->first();

        if (! $userId) {
            if ($assignment) {
                $assignment->delete();
            }
            return back()->with('success', 'Staff desasignado.');
        }

        StaffAssignment::updateOrCreate(
            ['lesson_id' => $lessonId, 'role' => $role],
            ['user_id' => $userId]
        );
        return back()->with('success', 'Staff asignado.');
    }

    /**
     * Crear clase (formulario/store).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'starts_at' => 'required|date',
            'ends_at' => 'required|date|after:starts_at',
            'level' => 'in:iniciacion,pro',
            'max_slots' => 'integer|min:1|max:12',
            'description' => 'nullable|string|max:500',
            'location' => 'nullable|string|max:150',
        ]);

        Lesson::create([
            'starts_at' => $validated['starts_at'],
            'ends_at' => $validated['ends_at'],
            'level' => $validated['level'] ?? Lesson::LEVEL_INICIACION,
            'max_slots' => $validated['max_slots'] ?? 6,
            'description' => $validated['description'] ?? null,
            'location' => $validated['location'] ?? 'Zurriola',
        ]);
        return back()->with('success', 'Clase creada.');
    }

    /**
     * Actualizar clase (description, location, etc.).
     */
    public function update(Request $request, Lesson $lesson)
    {
        $validated = $request->validate([
            'description' => 'nullable|string|max:500',
            'location' => 'nullable|string|max:150',
            'internal_notes' => 'nullable|string|max:1000',
        ]);

        $lesson->update(array_filter($validated, fn ($v) => $v !== null));
        return back()->with('success', 'Clase actualizada.');
    }

    /**
     * Confirmar solicitud (pending → confirmed). Admin comprueba pago.
     */
    public function confirmEnrollment(int $enrollmentId)
    {
        $enrollment = LessonUser::with('user', 'lesson')->findOrFail($enrollmentId);
        if ($enrollment->status !== LessonUser::STATUS_PENDING) {
            return back()->with('error', 'Solo se pueden confirmar solicitudes pendientes.');
        }
        $enrollment->update([
            'status' => LessonUser::STATUS_CONFIRMED,
            'confirmed_at' => now(),
        ]);
        if ($enrollment->user && $enrollment->user->email) {
            Mail::to($enrollment->user->email)->send(new ReservationConfirmedMail($enrollment, $enrollment->lesson));
        }
        return back()->with('success', 'Solicitud confirmada.');
    }

    /**
     * Ver comprobante de pago (solo Admin). Archivos en storage privado.
     */
    public function showProof(int $enrollmentId)
    {
        $enrollment = LessonUser::findOrFail($enrollmentId);
        if (empty($enrollment->payment_proof_path)) {
            abort(404);
        }
        if (! Storage::disk('local')->exists($enrollment->payment_proof_path)) {
            abort(404);
        }
        $path = Storage::disk('local')->path($enrollment->payment_proof_path);
        $mime = Storage::disk('local')->mimeType($enrollment->payment_proof_path);

        return response()->file($path, ['Content-Type' => $mime]);
    }

    /**
     * Reactivar solicitud EXPIRED: +1h para pagar (status → PENDING, expires_at = now + 1h).
     */
    public function reactivateEnrollment(int $enrollmentId)
    {
        $enrollment = LessonUser::findOrFail($enrollmentId);
        if ($enrollment->status !== LessonUser::STATUS_EXPIRED) {
            return back()->with('error', 'Solo se pueden reactivar solicitudes expiradas.');
        }
        $enrollment->update([
            'status' => LessonUser::STATUS_PENDING,
            'expires_at' => Carbon::now('UTC')->addHour(),
        ]);
        return back()->with('success', 'Solicitud reactivada 1h más.');
    }

    /**
     * Eliminar en lote solicitudes pendientes con más de 48h (garbage collector).
     */
    public function bulkDeleteStale(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:lesson_user,id',
        ]);

        $cutoff = now()->subHours(48);
        $deleted = LessonUser::query()
            ->whereIn('id', $validated['ids'])
            ->where('status', LessonUser::STATUS_PENDING)
            ->where('created_at', '<', $cutoff)
            ->delete();

        return back()->with('success', "Se eliminaron {$deleted} solicitudes antiguas.");
    }
}
