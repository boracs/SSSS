<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\Academy\AdminGuestEnrollmentAction;
use App\Actions\Academy\ApproveEnrollmentQuotaAction;
use App\Actions\Academy\DenyEnrollmentQuotaAction;
use App\DTOs\Academy\AdminGuestEnrollmentDto;
use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\LessonUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class ClassManagerEnrollmentController extends Controller
{
    public function __construct(
        private readonly AdminGuestEnrollmentAction $guestEnrollmentAction,
        private readonly ApproveEnrollmentQuotaAction $approveQuotaAction,
        private readonly DenyEnrollmentQuotaAction $denyQuotaAction,
    ) {}

    public function store(Request $request, Lesson $lesson): RedirectResponse
    {
        $validated = $this->validateGuestPayload($request);

        try {
            $this->guestEnrollmentAction->add($lesson, AdminGuestEnrollmentDto::fromArray($validated));
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['guest' => $e->getMessage()]);
        }

        return back()->with('success', 'Persona añadida a la clase.');
    }

    public function update(Request $request, LessonUser $enrollment): RedirectResponse
    {
        $validated = $this->validateGuestPayload($request);

        try {
            $this->guestEnrollmentAction->update($enrollment, AdminGuestEnrollmentDto::fromArray($validated));
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['guest' => $e->getMessage()]);
        }

        return back()->with('success', 'Datos actualizados.');
    }

    public function destroy(LessonUser $enrollment): RedirectResponse
    {
        try {
            $this->guestEnrollmentAction->remove($enrollment);
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['guest' => $e->getMessage()]);
        }

        return back()->with('success', 'Persona eliminada de la clase.');
    }

    public function updatePayment(Request $request, LessonUser $enrollment): RedirectResponse
    {
        $validated = $request->validate([
            'payment_status' => 'required|in:pending,confirmed,rejected',
        ]);

        try {
            $this->guestEnrollmentAction->setPaymentStatus($enrollment, (string) $validated['payment_status']);
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['payment_status' => $e->getMessage()]);
        }

        $labels = [
            'pending' => 'pendiente',
            'confirmed' => 'pagado',
            'rejected' => 'rechazado',
        ];
        $label = $labels[$validated['payment_status']] ?? $validated['payment_status'];

        return back()->with('success', "Pago marcado como {$label}.");
    }

    public function approveQuota(LessonUser $enrollment): RedirectResponse
    {
        $result = $this->approveQuotaAction->execute($enrollment);

        return $result['ok']
            ? back()->with('success', $result['message'])
            : back()->withErrors(['quota' => $result['message']]);
    }

    public function denyQuota(Request $request, LessonUser $enrollment): RedirectResponse
    {
        $validated = $request->validate([
            'admin_notes' => 'nullable|string|max:2000',
        ]);

        $result = $this->denyQuotaAction->execute(
            $enrollment,
            isset($validated['admin_notes']) ? (string) $validated['admin_notes'] : null
        );

        return $result['ok']
            ? back()->with('success', $result['message'])
            : back()->withErrors(['quota' => $result['message']]);
    }

    public function updateBooker(Request $request, Lesson $lesson): RedirectResponse
    {
        $validated = $request->validate([
            'booker_first_name' => 'nullable|string|max:80',
            'booker_last_name' => 'nullable|string|max:80',
            'booker_phone' => 'nullable|string|max:40',
        ]);

        $lesson->update([
            'booker_first_name' => trim((string) ($validated['booker_first_name'] ?? '')) ?: null,
            'booker_last_name' => trim((string) ($validated['booker_last_name'] ?? '')) ?: null,
            'booker_phone' => trim((string) ($validated['booker_phone'] ?? '')) ?: null,
        ]);

        return back()->with('success', 'Datos de contacto actualizados.');
    }

    /** @return array<string, mixed> */
    private function validateGuestPayload(Request $request): array
    {
        return $request->validate([
            'first_name' => 'required|string|max:80',
            'last_name' => 'required|string|max:80',
            'phone' => 'nullable|string|max:40',
            'email' => 'nullable|email|max:120',
            'payment_status' => 'nullable|in:pending,confirmed,rejected',
            'payment_method' => 'nullable|in:bizum,transferencia',
        ]);
    }
}
