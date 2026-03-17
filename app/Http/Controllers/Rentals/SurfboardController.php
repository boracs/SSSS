<?php

namespace App\Http\Controllers\Rentals;

use App\Http\Controllers\Controller;
use App\Models\Surfboard;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SurfboardController extends Controller
{
    public function index(Request $request, ?string $category = null): Response
    {
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
        ]);
    }

    public function show(Surfboard $surfboard): Response
    {
        $surfboard->load('priceSchema');

        return Inertia::render('Rentals/Surfboards/Show', [
            'surfboard' => $surfboard,
        ]);
    }
}

