<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\SecondHandStatus;
use App\Models\SecondHandBoard;
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
            ->available()
            ->orderByDesc('id')
            ->get()
            ->map(fn (SecondHandBoard $b) => $b->toPublicArray());

        return Inertia::render('SecondHand/Index', [
            'boards' => $boards,
        ]);
    }

    public function show(SecondHandBoard $secondHandBoard): Response
    {
        if ($secondHandBoard->status !== SecondHandStatus::AVAILABLE) {
            abort(404);
        }

        $currentId = (int) $secondHandBoard->id;

        $previousBoard = SecondHandBoard::query()
            ->available()
            ->where('id', '>', $currentId)
            ->orderBy('id')
            ->first(['id', 'name']);

        $nextBoard = SecondHandBoard::query()
            ->available()
            ->where('id', '<', $currentId)
            ->orderByDesc('id')
            ->first(['id', 'name']);

        return Inertia::render('SecondHand/Show', [
            'board' => $secondHandBoard->toPublicArray(),
            'navigation' => [
                'previous' => $previousBoard
                    ? ['id' => $previousBoard->id, 'name' => $previousBoard->name]
                    : null,
                'next' => $nextBoard
                    ? ['id' => $nextBoard->id, 'name' => $nextBoard->name]
                    : null,
            ],
        ]);
    }
}
