<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Parte S4 de Zurriola de un día: snapshot de oleaje/viento + texto generado por
 * IA (o plantilla de respaldo) + override manual de la escuela.
 *
 * `admin_override_status`, si no es null, manda sobre `level_recommendation` en
 * toda la UI (web/home/chatbot futuro) — es la "verdad operativa" de la escuela.
 */
final class SurfDailyBrief extends Model
{
    use HasFactory;

    public const OVERRIDE_CLOSED = 'closed';

    public const OVERRIDE_CAUTION = 'caution';

    public const OVERRIDE_GOOD = 'good';

    public const SOURCE_GEMINI = 'gemini';

    public const SOURCE_FALLBACK = 'fallback_template';

    public const SOURCE_PENDING = 'pending';

    protected $fillable = [
        'report_date',
        'wave_height_m',
        'wave_period_s',
        'wave_direction_deg',
        'swell_height_m',
        'swell_period_s',
        'swell_direction_deg',
        'wind_speed_kmh',
        'wind_direction_deg',
        'energy_index',
        'energy_label',
        'level_recommendation',
        'ai_summary',
        'summary_source',
        'generated_at',
        'admin_override_status',
        'admin_override_note',
        'admin_override_by',
        'admin_override_at',
        'fetched_at',
        'likes_count',
        'dislikes_count',
    ];

    protected $casts = [
        'report_date' => 'date',
        'wave_height_m' => 'float',
        'wave_period_s' => 'float',
        'wave_direction_deg' => 'integer',
        'swell_height_m' => 'float',
        'swell_period_s' => 'float',
        'swell_direction_deg' => 'integer',
        'wind_speed_kmh' => 'float',
        'wind_direction_deg' => 'integer',
        'energy_index' => 'float',
        'generated_at' => 'datetime',
        'admin_override_at' => 'datetime',
        'fetched_at' => 'datetime',
        'likes_count' => 'integer',
        'dislikes_count' => 'integer',
    ];

    public function overrideBy()
    {
        return $this->belongsTo(User::class, 'admin_override_by');
    }

    public function hasOverride(): bool
    {
        return $this->admin_override_status !== null;
    }
}
