<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\SecondHandBoard;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Cat뿯½logo p뿯½blico de tablas de segunda mano.
 * No expone datos financieros internos (purchase_price, margen).
 */
class SecondHandBoardController extends Controller
{
    public function index(): Response
    {
        $boards = SecondHandBoard::query()
            ->publicCatalog()
            ->get()
            ->map(fn (SecondHandBoard $b) => $b->toPublicArray());

        return Inertia::render('SecondHand/Index', [
            'boards' => $boards,
        ]);
    }

    public function show(SecondHandBoard $secondHandBoard): Response
    {
        return Inertia::render('SecondHand/Show', [
            'board' => $secondHandBoard->toPublicArray(),
        ]);
    }
}
