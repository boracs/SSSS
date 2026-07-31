<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\SecondHandStatus;
use App\Models\SecondHandBoard;
use App\Services\Seo\PublicPageSeoService;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Catálogo público de tablas de segunda mano.
 * No expone datos financieros internos (purchase_price, margen).
 */
class SecondHandBoardController extends Controller
{
    public function index(PublicPageSeoService $pageSeo): Response
    {
        $boards = SecondHandBoard::query()
            ->available()
            ->orderByDesc('id')
            ->get()
            ->map(fn (SecondHandBoard $b) => $b->toPublicArray());

        return Inertia::render('SecondHand/Index', [
            'boards' => $boards,
            'seo' => $pageSeo->segundaManoIndex()->toArray(),
        ]);
    }

    public function show(SecondHandBoard $secondHandBoard, PublicPageSeoService $pageSeo): Response
    {
        if ($secondHandBoard->status !== SecondHandStatus::AVAILABLE) {
            abort(404);
        }

        $currentId = (int) $secondHandBoard->id;
        $public = $secondHandBoard->toPublicArray();

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
            'board' => $public,
            'navigation' => [
                'previous' => $previousBoard
                    ? ['id' => $previousBoard->id, 'name' => $previousBoard->name]
                    : null,
                'next' => $nextBoard
                    ? ['id' => $nextBoard->id, 'name' => $nextBoard->name]
                    : null,
            ],
            'seo' => $pageSeo->segundaManoShow($public)->toArray(),
        ]);
    }
}
