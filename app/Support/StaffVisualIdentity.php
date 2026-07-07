<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\User;

/**
 * Identidad visual de staff (monitores/fotógrafos) para UI del gestor de clases.
 * Colores vivos y distinguibles; asignación estable por pool de monitores del mes.
 */
final class StaffVisualIdentity
{
    /** @var list<array{bg: string, text: string}> */
    private const PALETTE = [
        ['bg' => '#3f3f46', 'text' => '#fafafa'],  // gris oscuro
        ['bg' => '#00b4ff', 'text' => '#061018'],  // azul fosforito
        ['bg' => '#32ff6a', 'text' => '#052e16'],  // verde fosforito
        ['bg' => '#ff4da6', 'text' => '#2a0618'],  // rosa fosforito
        ['bg' => '#facc15', 'text' => '#422006'],  // ámbar
        ['bg' => '#c084fc', 'text' => '#1e0a3c'],  // violeta
    ];

    private const UNASSIGNED = ['bg' => '#52525b', 'text' => '#fafafa', 'initials' => '?'];

    /** @var list<string> */
    private const NAME_COLOR_HINTS = [
        'borja' => 1,
        'willy' => 2,
    ];

    /**
     * @param  list<int>|null  $staffPoolIds  IDs ordenados del pool visible (evita colores repetidos)
     * @return array{id: int|null, initials: string, color: string, text_color: string}
     */
    public static function forUser(?User $user, ?array $staffPoolIds = null): array
    {
        if (! $user) {
            return [
                'id' => null,
                'initials' => self::UNASSIGNED['initials'],
                'color' => self::UNASSIGNED['bg'],
                'text_color' => self::UNASSIGNED['text'],
            ];
        }

        $swatch = self::resolveSwatch($user, $staffPoolIds);

        return [
            'id' => (int) $user->id,
            'initials' => self::initials($user->nombre, $user->apellido),
            'color' => $swatch['bg'],
            'text_color' => $swatch['text'],
        ];
    }

    public static function initials(?string $nombre, ?string $apellido): string
    {
        $first = trim((string) ($nombre ?? ''));
        $last = trim((string) ($apellido ?? ''));

        if ($first !== '' && $last !== '') {
            return mb_strtoupper(mb_substr($first, 0, 1).mb_substr($last, 0, 1));
        }

        if ($first !== '') {
            $parts = preg_split('/\s+/u', $first) ?: [];
            if (count($parts) >= 2) {
                return mb_strtoupper(mb_substr($parts[0], 0, 1).mb_substr($parts[1], 0, 1));
            }

            return mb_strtoupper(mb_substr($first, 0, min(2, mb_strlen($first))));
        }

        return self::UNASSIGNED['initials'];
    }

    /** @param  list<int>|null  $staffPoolIds */
    private static function resolveSwatch(User $user, ?array $staffPoolIds): array
    {
        $label = mb_strtolower(trim((string) (($user->nombre ?? '').' '.($user->apellido ?? ''))));
        foreach (self::NAME_COLOR_HINTS as $needle => $paletteIndex) {
            if ($needle !== '' && str_contains($label, $needle)) {
                return self::PALETTE[$paletteIndex] ?? self::PALETTE[0];
            }
        }

        if ($staffPoolIds !== null && $staffPoolIds !== []) {
            $pos = array_search((int) $user->id, $staffPoolIds, true);
            if ($pos !== false) {
                return self::PALETTE[$pos % count(self::PALETTE)];
            }
        }

        return self::PALETTE[abs((int) $user->id) % count(self::PALETTE)];
    }
}
