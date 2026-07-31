<?php

declare(strict_types=1);

namespace App\Http\Controllers\Rentals;

use App\Http\Controllers\Controller;
use App\Models\Surfboard;
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
        ?string $category = null,
    ): Response {
        $query = Surfboard::query()
            ->with('priceSchema')
            ->where('is_active', true)
            ->orderBy('name');

        if ($category && in_array($category, [Surfboard::CATEGORY_SOFT, Surfboard::CATEGORY_HARD], true)) {
            $query->where('category', $category);
        }

        $surfboards = $query->get();

        return Inertia::render('Rentals/Surfboards/Index', [
            'category' => $category,
            'surfboards' => $surfboards,
            'paymentIban' => config('services.academy.iban', '[IBAN]'),
            'paymentBizumNumber' => config('services.academy.bizum_number', '[BIZUM_NUMBER]'),
            'whatsappHelpUrl' => AcademyContact::whatsappBaseUrl(),
            'seo' => $pageSeo->rentalsIndex($category)->toArray(),
        ]);
    }

    public function show(Surfboard $surfboard, PublicPageSeoService $pageSeo): Response
    {
        $surfboard->load('priceSchema');

        $seoBoard = [
            'id' => (int) $surfboard->id,
            'name' => (string) $surfboard->name,
            'description' => $surfboard->description,
            'category' => $surfboard->category,
            'image_url' => $surfboard->first_image_url,
            'price_24h_eur' => $surfboard->priceSchema?->price_24h,
            'is_active' => (bool) $surfboard->is_active,
        ];

        return Inertia::render('Rentals/Surfboards/Show', [
            'surfboard' => $surfboard,
            'paymentIban' => config('services.academy.iban', '[IBAN]'),
            'paymentBizumNumber' => config('services.academy.bizum_number', '[BIZUM_NUMBER]'),
            'whatsappHelpUrl' => AcademyContact::whatsappBaseUrl(),
            'seo' => $pageSeo->rentalsShow($seoBoard)->toArray(),
        ]);
    }
}
