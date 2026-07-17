<?php

declare(strict_types=1);

namespace App\Services\Chatbot;

use App\Enums\ChatbotInteractionStatus;
use App\Models\ChatbotInteraction;
use App\Models\User;
use App\Support\AcademyContact;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class ChatbotContactPhoneService
{
    /** Normaliza móvil español a dígitos E.164 sin '+'. */
    public function normalizeDigits(string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', $phone);
        if ($digits === '') {
            return null;
        }

        if (strlen($digits) === 9 && in_array($digits[0], ['6', '7', '8', '9'], true)) {
            $digits = '34'.$digits;
        }

        if (! str_starts_with($digits, '34') || strlen($digits) < 11 || strlen($digits) > 15) {
            return null;
        }

        return $digits;
    }

    public function displayPhone(?string $digits): ?string
    {
        if ($digits === null || $digits === '') {
            return null;
        }

        if (str_starts_with($digits, '34') && strlen($digits) >= 11) {
            $local = substr($digits, 2, 9);

            return sprintf('+34 %s %s %s', substr($local, 0, 3), substr($local, 3, 3), substr($local, 6, 3));
        }

        return '+'.$digits;
    }

    /**
     * Guarda el teléfono en el caso abierto del visitante (anónimo o logueado).
     */
    public function register(
        ?int $userId,
        ?string $sessionToken,
        string $rawPhone,
        ?string $caseReference = null,
    ): ChatbotInteraction {
        $normalized = $this->normalizeDigits($rawPhone);
        if ($normalized === null) {
            throw new RuntimeException('Número de móvil no válido.');
        }

        return DB::transaction(function () use ($userId, $sessionToken, $normalized, $caseReference): ChatbotInteraction {
            $interaction = $this->resolveInteraction($userId, $sessionToken, $caseReference);

            if ($interaction === null) {
                throw new RuntimeException('No hay un caso de chatbot abierto para asociar el teléfono.');
            }

            $interaction->update([
                'contact_phone' => $normalized,
                'contact_phone_captured_at' => now(),
            ]);

            return $interaction->fresh();
        });
    }

    /** Copia el teléfono del perfil del usuario al caso si aún no hay uno guardado. */
    public function syncFromUserProfile(ChatbotInteraction $interaction): void
    {
        if ($interaction->contact_phone !== null || $interaction->user_id === null) {
            return;
        }

        $user = User::query()->find($interaction->user_id);
        if ($user === null) {
            return;
        }

        $normalized = $this->normalizeDigits((string) ($user->telefono ?? ''));
        if ($normalized === null) {
            return;
        }

        $interaction->update([
            'contact_phone' => $normalized,
            'contact_phone_captured_at' => now(),
        ]);
    }

    public function adminReplyWhatsappUrl(ChatbotInteraction $interaction): ?string
    {
        $phone = $interaction->contact_phone;
        if ($phone === null || $phone === '') {
            return null;
        }

        $case = $interaction->case_reference ?? 'S4';
        $message = "Hola, te escribimos desde San Sebastian Surf School respecto a tu caso {$case}.";

        return AcademyContact::urlForPhone($phone, $message);
    }

    private function resolveInteraction(
        ?int $userId,
        ?string $sessionToken,
        ?string $caseReference,
    ): ?ChatbotInteraction {
        if ($caseReference !== null && preg_match('/^S4-(\d{6})$/', $caseReference, $m) === 1) {
            $byId = ChatbotInteraction::query()
                ->where('id', (int) $m[1])
                ->lockForUpdate()
                ->first();

            if ($byId !== null && $this->interactionBelongsToCaller($byId, $userId, $sessionToken)) {
                return $byId;
            }
        }

        return ChatbotInteraction::query()
            ->openFor($userId, $sessionToken)
            ->where('status', ChatbotInteractionStatus::REQUIRES_HUMAN)
            ->lockForUpdate()
            ->latest('id')
            ->first();
    }

    private function interactionBelongsToCaller(
        ChatbotInteraction $interaction,
        ?int $userId,
        ?string $sessionToken,
    ): bool {
        if ($userId !== null) {
            return (int) $interaction->user_id === $userId;
        }

        return $interaction->user_id === null
            && $sessionToken !== null
            && $interaction->session_token === $sessionToken;
    }
}
