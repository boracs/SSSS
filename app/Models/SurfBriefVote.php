<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class SurfBriefVote extends Model
{
    public const UP = 'up';

    public const DOWN = 'down';

    protected $fillable = [
        'surf_daily_brief_id',
        'reaction',
        'voter_key',
    ];

    public function brief(): BelongsTo
    {
        return $this->belongsTo(SurfDailyBrief::class, 'surf_daily_brief_id');
    }
}
