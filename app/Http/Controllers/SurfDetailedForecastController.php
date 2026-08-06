<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\SurfConditions\SurfForecastTableService;
use Illuminate\Http\JsonResponse;

/**
 * GET público bajo demanda del slider "cada 2h · todos los días" en
 * `/servicios/webcams` (fusión oleaje + tiempo). Sin auth; cero lógica de
 * parseo aquí (delegada al service).
 */
final class SurfDetailedForecastController extends Controller
{
    public function __invoke(SurfForecastTableService $service): JsonResponse
    {
        return response()->json($service->detailedPayload());
    }
}
