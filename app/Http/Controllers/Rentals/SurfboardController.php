<?php

declare(strict_types=1);

namespace App\Http\Controllers\Rentals;

use App\Http\Controllers\Controller;
use App\Models\Surfboard;
use App\Services\Rentals\RentalPolicyService;
use App\Services\Rentals\RentalTariffTableService;
use App\Services\Seo\PublicPageSeoService;
use App\Support\AcademyContact;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SurfboardController extends Controller
{
    public function index(
        Request $request,
        PublicPageSeoService $pageSeo,
        RentalTariffTableService $tariffTable,
        RentalPolicyService $rentalPolicy,
        ?string $category = null,
    ): Response {
        $query = Surfboard::query()
            ->with('priceSchema')
            ->where('is_active', true)
            ->orderBy('name');

        if ($category && in_array($category, Surfboard::CATEGORIES, true)) {
            $query->where('category', $category);
        }

        $surfboards = $query->get();

        return Inertia::render('Rentals/Surfboards/Index', [
            'category' => $category,
            'surfboards' => $surfboards,
            'tariffTable' => $tariffTable->build()->toArray(),
            'rentalPolicy' => $rentalPolicy->current()->toArray(),
            'whatsappHelpUrl' => AcademyContact::whatsappBaseUrl(),
            'seo' => $pageSeo->rentalsIndex($category)->toArray(),
        ]);
    }

    public function show(
        Surfboard $surfboard,
        PublicPageSeoService $pageSeo,
        RentalPolicyService $rentalPolicy,
    ): Response {
        // Una tabla retirada del alquiler no tiene ficha pública: la ficha monta
        // el formulario de reserva, así que mostrarla la ofrecería como reservable.
        abort_if(! $surfboard->is_active, 404);

        $surfboard->load('priceSchema');

        $seoBoard = [
            'id' => (int) $surfboard->id,
            'name' => (string) $surfboard->name,
            'description' => $surfboard->description,
            'category' => $surfboard->category,
            'image_url' => $surfboard->first_image_url,
            'price_day_eur' => $surfboard->priceSchema?->price_1d,
            'is_active' => (bool) $surfboard->is_active,
        ];

        return Inertia::render('Rentals/Surfboards/Show', [
            'surfboard' => $surfboard,
            'rentalPolicy' => $rentalPolicy->current()->toArray(),
            'whatsappHelpUrl' => AcademyContact::whatsappBaseUrl(),
            'seo' => $pageSeo->rentalsShow($seoBoard)->toArray(),
        ]);
    }
}
