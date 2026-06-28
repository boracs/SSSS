<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateEmergencyLockCodeRequest;
use App\Models\EmergencyKeyRequest;
use App\Models\EmergencyLockSetting;
use App\Models\User;
use App\Services\EmergencyKeyService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmergencyKeyController extends Controller
{
    public function __construct(
        private readonly EmergencyKeyService $emergencyKeyService,
    ) {}

    public function index(): Response
    {
        $settings = EmergencyLockSetting::singleton();

        $requests = EmergencyKeyRequest::query()
            ->with('user:id,nombre,apellido,email,numeroTaquilla')
            ->orderByDesc('requested_at')
            ->limit(100)
            ->get()
            ->map(fn (EmergencyKeyRequest $r) => $r->toAdminArray());

        return Inertia::render('Admin/EmergencyKeys/Index', [
            'lock' => [
                'is_active'    => (bool) $settings->is_active,
                'current_code' => (string) $settings->current_code,
            ],
            'requests' => $requests,
        ]);
    }

    public function updateCode(UpdateEmergencyLockCodeRequest $request): RedirectResponse
    {
        $this->emergencyKeyService->updateLockCode($request->validated('current_code'));

        return redirect()
            ->route('admin.emergency-keys.index')
            ->with('success', 'Codigo del candado actualizado. El candado vuelve a estar disponible (ON).');
    }

    public function markKeyDeactivated(Request $request, EmergencyKeyRequest $emergencyKeyRequest): RedirectResponse
    {
        /** @var User $admin */
        $admin = $request->user();

        $this->emergencyKeyService->markKeyDeactivated($emergencyKeyRequest, $admin);

        return redirect()
            ->route('admin.emergency-keys.index')
            ->with('success', 'Solicitud marcada: llave anterior desactivada por extravio definitivo.');
    }
}
