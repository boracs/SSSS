<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmergencyLockSetting extends Model
{
    protected $fillable = [
        'current_code',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public static function singleton(): self
    {
        return self::query()->orderBy('id')->firstOrFail();
    }
}
