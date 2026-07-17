<?php

declare(strict_types=1);

namespace App\Services\Chatbot;

use App\Models\User;
use App\Models\UserBono;
use App\Services\Taquilla\LockerPaymentIndexBuilder;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Respuestas FAQ con datos personales del usuario (taquilla, bono…).
 * Solo lectura; sin lógica de negocio duplicada — reutiliza servicios de taquilla.
 */
final class ChatbotUserAccountFaqService
{
    public function __construct(
        private readonly LockerPaymentIndexBuilder $lockerPaymentIndex,
    ) {}

    public function lockerStatusReply(int $userId): string
    {
        $user = User::query()
            ->select(['id', 'nombre', 'numeroTaquilla', 'fecha_vencimiento_cuota'])
            ->find($userId);

        if ($user === null) {
            return 'No encuentro tu cuenta. Prueba a **cerrar sesión y volver a entrar**, o escríbenos por **WhatsApp**.';
        }

        if (! $user->hasActiveLocker()) {
            return 'En tu cuenta **no aparece una taquilla activa** ahora mismo. '
                .'Si quieres contratar una, mira los planes en [**Taquillas**](/taquillas). '
                .'Si crees que deberías tenerla, escríbenos por **WhatsApp** con tu nombre.';
        }

        $lockerLabel = '**#'.$user->numeroTaquilla.'**';

        if ($user->hasSharedLocker()) {
            return 'Tienes asignada la taquilla compartida '.$lockerLabel.' (beneficio VIP sin cuota de casillero físico). '
                .'Para dudas de acceso o material, **WhatsApp**.';
        }

        $availability = $this->lockerAvailabilityForUser($userId);

        if ($availability === null || $availability['final_expires_at'] === null) {
            $legacyExpiry = $user->fecha_vencimiento_cuota;
            if ($legacyExpiry !== null && $legacyExpiry->greaterThanOrEqualTo(Carbon::today())) {
                return sprintf(
                    'Tu taquilla es la %s. Según tu ficha, la cuota vigente llega hasta el **%s**.',
                    $lockerLabel,
                    $legacyExpiry->locale('es')->translatedFormat('j \d\e F \d\e Y'),
                );
            }

            return 'Tienes la taquilla '.$lockerLabel.', pero **no veo un periodo de cuota vigente**. '
                .'Renueva en [**Taquillas**](/taquillas) o contacta por **WhatsApp** si acabas de pagar.';
        }

        $finalDate = $this->formatSpanishDate($availability['final_expires_at']);
        $totalDays = $availability['total_days_remaining'];
        $currentDays = $availability['current_days_remaining'];
        $prepaid = $availability['prepaid_extra_days'];

        $lines = [
            'Tu taquilla es la '.$lockerLabel.'.',
        ];

        if ($currentDays !== null && $currentDays >= 0 && $availability['current_expires_at'] !== null) {
            $currentDate = $this->formatSpanishDate($availability['current_expires_at']);
            $lines[] = sprintf(
                '**Periodo actual:** te quedan **%d día%s** (hasta el **%s**).',
                $currentDays,
                $currentDays === 1 ? '' : 's',
                $currentDate,
            );
        }

        if ($prepaid > 0) {
            $lines[] = sprintf(
                'Además tienes **%d día%s** de planes **apilados** al final del periodo actual.',
                $prepaid,
                $prepaid === 1 ? '' : 's',
            );
        }

        if ($totalDays !== null && $totalDays >= 0) {
            $lines[] = sprintf(
                '**En total** (periodo actual + apilados): **%d día%s** hasta el **%s**.',
                $totalDays,
                $totalDays === 1 ? '' : 's',
                $finalDate,
            );
        } else {
            $lines[] = 'Tu cuota **parece vencida**. Renueva en [**Taquillas**](/taquillas) o escríbenos por **WhatsApp**.';
        }

        $lines[] = '';
        $lines[] = 'Detalle completo en **Mis reservas** con tu usuario.';

        return implode("\n", $lines);
    }

    public function bonoBalanceReply(int $userId): string
    {
        $bonos = UserBono::query()
            ->where('user_id', $userId)
            ->where('status', UserBono::STATUS_CONFIRMED)
            ->where('clases_restantes', '>', 0)
            ->with('pack:id,nombre,num_clases')
            ->orderByDesc('id')
            ->get(['id', 'pack_id', 'clases_restantes']);

        if ($bonos->isEmpty()) {
            return 'No veo un **bono activo con clases** en tu cuenta. '
                .'Si acabas de comprar uno, puede estar **pendiente de confirmación** — mira **Mis reservas** → **Bonos**. '
                .'Para comprar un pack: **Academia** o [**Clases de surf**](/servicios/surf).';
        }

        $lines = ['**Tus bonos con saldo:**', ''];

        foreach ($bonos as $bono) {
            $packName = trim((string) ($bono->pack?->nombre ?? 'Bono'));
            $remaining = (int) $bono->clases_restantes;
            $lines[] = sprintf(
                '- **%s**: **%d clase%s** restante%s.',
                $packName,
                $remaining,
                $remaining === 1 ? '' : 's',
                $remaining === 1 ? '' : 's',
            );
        }

        $lines[] = '';
        $lines[] = 'El saldo **no caduca por fecha** — solo se gasta al reservar. Historial en **Mis reservas** → **Bonos**.';

        return implode("\n", $lines);
    }

    /**
     * @return array{
     *     total_days_remaining: int|null,
     *     current_days_remaining: int|null,
     *     prepaid_extra_days: int,
     *     current_expires_at: string|null,
     *     final_expires_at: string|null
     * }|null
     */
    private function lockerAvailabilityForUser(int $userId): ?array
    {
        return Cache::remember(
            'chatbot:locker-avail:'.$userId,
            60,
            function () use ($userId): ?array {
                $map = $this->lockerPaymentIndex->computeAvailabilityMap([$userId]);

                return $map[$userId] ?? null;
            },
        );
    }

    private function formatSpanishDate(string $isoDate): string
    {
        return Carbon::parse($isoDate)
            ->locale('es')
            ->translatedFormat('j \d\e F \d\e Y');
    }
}
