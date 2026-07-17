<?php

declare(strict_types=1);

namespace App\Exceptions\SurfConditions;

use RuntimeException;

/**
 * Open-Meteo caído, sin datos para el punto configurado, o respuesta inválida.
 * {@see \App\Services\SurfConditions\SurfDailyBriefService} la captura y
 * mantiene el último parte válido en vez de romper el job/la web.
 */
final class SurfConditionsUnavailableException extends RuntimeException {}
