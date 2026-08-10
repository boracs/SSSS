<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdatePrivateLessonTariffRequest;
use App\Models\PrivateLessonTariff;
use App\Services\Academy\PrivateLessonPricingService;
use App\Services\Chatbot\S4BusinessContextService;
use App\Support\MoneyCents;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Tarifa de clases particulares: precio total del grupo a la duración base.
 * El resto de duraciones se prorratean y la señal online es un % del total.
 */
final class PrivateLessonTariffController extends Controller
{
    public function __construct(
        private readonly PrivateLessonPricingService $pricing,
        private readonly S4BusinessContextService $chatbotBusinessContext,
    ) {}

    public function index(): Response
    {
        $rows = PrivateLessonTariff::query()
            ->orderBy('people')
            ->get()
            ->map(fn (PrivateLessonTariff $t): array => [
                'people' => (int) $t->people,
                'price_eur' => MoneyCents::centsToEuros((int) $t->price_cents),
                'activo' => (bool) $t->activo,
            ])
            ->all();

        return Inertia::render('Admin/Catalog/PrivateLessonTariffs', [
            'tariffs' => $rows,
            'baseMinutes' => $this->pricing->baseMinutes(),
            'depositPercentage' => $this->pricing->depositPercentage(),
        ]);
    }

    public function update(UpdatePrivateLessonTariffRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            foreach ($request->tariffRows() as $row) {
                PrivateLessonTariff::query()->updateOrCreate(
                    ['people' => $row['people']],
                    [
                        'price_cents' => MoneyCents::eurosToCents($row['price_eur']),
                        'activo' => $row['activo'],
                    ],
                );
            }
        });

        $this->pricing->forgetTariffCache();
        $this->chatbotBusinessContext->forget();

        return back()->with('success', 'Tarifa de clases particulares actualizada.');
    }
}
