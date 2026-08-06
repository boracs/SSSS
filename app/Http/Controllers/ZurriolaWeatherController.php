<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\SurfConditions\ZurriolaWeatherForecastService;
use Illuminate\Http\JsonResponse;

/**
 * GET público bajo demanda del panel "Tiempo detallado" en `/servicios/webcams`.
 * Sin auth; cero lógica de parseo aquí (delegada al service + cliente).
 */
final class ZurriolaWeatherController extends Controller
{
    public function __invoke(ZurriolaWeatherForecastService $service): JsonResponse
    {
        return response()->json($service->publicPayload());
    }
}
