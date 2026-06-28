<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exceptions\EmergencyKeyNotEligibleException;
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

    public function show(Request $request): Response|RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->numeroTaquilla === null) {
            return redirect()
                ->route('taquillas.index.client')
                ->with('error', 'Necesitas una taquilla asignada para acceder a la llave de emergencia.');
        }

        $status = $this->emergencyKeyService->statusFor($user);

        return Inertia::render('Profile/MeQuedeSinLlave', [
            'lock' => $status->toArray(),
            'reveal' => session('emergency_key_reveal'),
        ]);
    }

    public function request(Request $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        try {
            $reveal = $this->emergencyKeyService->requestCode($user);
        } catch (EmergencyKeyNotEligibleException $e) {
            return redirect()
                ->route('emergency-key.show')
                ->with('error', $e->getMessage());
        }

        return redirect()
            ->route('emergency-key.show')
            ->with('emergency_key_reveal', $reveal->toArray());
    }
}
