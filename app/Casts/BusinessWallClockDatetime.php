<?php

namespace App\Casts;

use App\Support\BusinessDateTime;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * DATETIME naive en BD = hora de negocio en {@see BusinessDateTime::businessTimezone()},
 * sin depender de APP_TIMEZONE (p. ej. UTC) que desplazaría la hora al leer.
 */
final class BusinessWallClockDatetime implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof CarbonInterface) {
            return $value->copy()->timezone(BusinessDateTime::businessTimezone());
        }

        $tz = BusinessDateTime::businessTimezone();

        if (is_string($value) && preg_match('/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/', $value, $m)) {
            return Carbon::createFromFormat('Y-m-d H:i:s', $m[1].' '.$m[2], $tz);
        }

        return Carbon::parse((string) $value, $tz)->timezone($tz);
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $tz = BusinessDateTime::businessTimezone();

        $c = $value instanceof CarbonInterface
            ? $value->copy()
            : BusinessDateTime::parseInAppTimezone((string) $value);

        return $c->timezone($tz)->format('Y-m-d H:i:s');
    }
}
