<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\SurfConditions\SurfBriefReactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

final class SurfBriefReactionController extends Controller
{
    public function __construct(
        private readonly SurfBriefReactionService $reactions,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reaction' => ['required', 'in:up,down'],
        ]);

        try {
            $state = $this->reactions->voteForToday(
                $validated['reaction'],
                $this->reactions->voterKey($request),
            );
        } catch (InvalidArgumentException|RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (Throwable) {
            return response()->json(['message' => 'No se pudo registrar tu voto.'], 500);
        }

        return response()->json($state->toArray());
    }
}
