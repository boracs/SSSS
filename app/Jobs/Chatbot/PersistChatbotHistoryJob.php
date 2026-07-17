<?php

declare(strict_types=1);

namespace App\Jobs\Chatbot;

use App\Enums\ChatbotInteractionStatus;
use App\Models\ChatbotInteraction;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

/**
 * Persiste de forma asíncrona el turno de un usuario autenticado en
 * `chatbot_interactions` para trazabilidad/panel admin. No bloquea la
 * respuesta HTTP (la respuesta del FAQ ya se calculó de forma síncrona).
 */
final class PersistChatbotHistoryJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * @param  list<array{role: string, text: string}>  $historySnapshot  Historial completo tras el turno actual.
     */
    public function __construct(
        private readonly int $userId,
        private readonly array $historySnapshot,
        private readonly string $ip,
    ) {}

    public function handle(): void
    {
        DB::transaction(function () {
            $interaction = ChatbotInteraction::query()
                ->openFor($this->userId, null)
                ->lockForUpdate()
                ->latest('id')
                ->first();

            $history = ChatbotInteraction::trimHistory($this->historySnapshot);

            if ($interaction === null) {
                ChatbotInteraction::create([
                    'user_id' => $this->userId,
                    'status' => ChatbotInteractionStatus::ACTIVE,
                    'history' => $history,
                    'ip_address' => $this->ip,
                ]);

                return;
            }

            $interaction->update([
                'history' => $history,
                'ip_address' => $this->ip,
            ]);
        });
    }
}
