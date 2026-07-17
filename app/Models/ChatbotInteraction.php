<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ChatbotInteractionStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatbotInteraction extends Model
{
    /** Turnos máximos conservados en `history` — controla el peso del JSON en MySQL. */
    public const MAX_HISTORY_TURNS = 24;

    protected $fillable = [
        'user_id',
        'session_token',
        'status',
        'history',
        'flag_reason',
        'ip_address',
        'contact_phone',
        'contact_phone_captured_at',
        'resolved_at',
    ];

    protected $casts = [
        'status' => ChatbotInteractionStatus::class,
        'history' => 'array',
        'resolved_at' => 'datetime',
        'contact_phone_captured_at' => 'datetime',
    ];

    protected $appends = ['case_reference', 'contact_phone_display'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @param Builder<ChatbotInteraction> $query */
    public function scopeRequiresHuman(Builder $query): Builder
    {
        return $query->where('status', ChatbotInteractionStatus::REQUIRES_HUMAN);
    }

    /** @param Builder<ChatbotInteraction> $query */
    public function scopeOpenFor(Builder $query, ?int $userId, ?string $sessionToken): Builder
    {
        return $query
            ->where('status', '!=', ChatbotInteractionStatus::RESOLVED->value)
            ->when(
                $userId !== null,
                fn (Builder $q) => $q->where('user_id', $userId),
                fn (Builder $q) => $q->whereNull('user_id')->where('session_token', $sessionToken),
            );
    }

    /** Identificador legible para el cliente y el panel admin (ej. "S4-000123"). */
    protected function caseReference(): Attribute
    {
        return Attribute::get(
            fn (): ?string => $this->exists ? sprintf('S4-%06d', $this->id) : null,
        );
    }

    protected function contactPhoneDisplay(): Attribute
    {
        return Attribute::get(function (): ?string {
            $digits = $this->contact_phone;
            if (! is_string($digits) || $digits === '') {
                return null;
            }

            if (str_starts_with($digits, '34') && strlen($digits) >= 11) {
                $local = substr($digits, 2, 9);

                return sprintf('+34 %s %s %s', substr($local, 0, 3), substr($local, 3, 3), substr($local, 6, 3));
            }

            return '+'.$digits;
        });
    }

    /**
     * Acota el historial a los últimos N turnos antes de guardarlo (eficiencia de almacenamiento).
     *
     * @param  list<array{role: string, text: string}>  $history
     * @return list<array{role: string, text: string}>
     */
    public static function trimHistory(array $history): array
    {
        return array_slice($history, -self::MAX_HISTORY_TURNS);
    }
}
