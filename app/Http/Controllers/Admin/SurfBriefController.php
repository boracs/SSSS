<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SurfDailyBrief;
use App\Services\SurfConditions\SurfDailyBriefService;
use App\Services\SurfConditions\SurfForecastTableService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Override manual del "Parte S4 de Zurriola": la escuela puede marcar el día
 * como cerrado/precaución/bien por encima del cálculo automático, y forzar
 * una regeneración sin esperar al cron. Sin página propia — se controla desde
 * la propia página pública `Servicios_Webcams` (bloque visible solo a admin).
 */
final class SurfBriefController extends Controller
{
    public function __construct(
        private readonly SurfDailyBriefService $service,
        private readonly SurfForecastTableService $forecastService,
    ) {}

    public function override(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in([SurfDailyBrief::OVERRIDE_CLOSED, SurfDailyBrief::OVERRIDE_CAUTION, SurfDailyBrief::OVERRIDE_GOOD])],
            'note' => ['nullable', 'string', 'max:280'],
        ]);

        $this->service->setOverride(
            $request->user(),
            $validated['status'] ?? null,
            $validated['note'] ?? null,
        );

        return back()->with('success', $validated['status'] !== null ? 'Aviso manual guardado.' : 'Aviso manual retirado.');
    }

    public function regenerate(): RedirectResponse
    {
        $this->service->generateForToday(force: true);
        $this->forecastService->forget();

        return back()->with('success', 'Parte de Zurriola regenerado.');
    }
}
