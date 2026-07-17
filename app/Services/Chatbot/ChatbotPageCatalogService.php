<?php

declare(strict_types=1);

namespace App\Services\Chatbot;

use App\Support\AcademyContact;
use App\Support\ChatbotQueryNormalizer;
use Illuminate\Support\Facades\Cache;

/**
 * Catálogo de páginas explicativas públicas (Nosotros, reparaciones, servicios…)
 * para FAQ local y contexto Gemini. Fuente: config/chatbot_pages.php.
 */
final class ChatbotPageCatalogService
{
    private const CACHE_KEY = 'chatbot:page-catalog:v2';

    private const CACHE_TTL_SECONDS = 300;

    private const MIN_TOKEN_SCORE = 3;

    /**
     * FAQ con enlaces markdown a páginas relevantes; null si no aplica.
     */
    public function faqReplyForQuery(string $normalizedQuery): ?string
    {
        $matches = $this->rankPages($normalizedQuery);

        if ($matches === []) {
            return null;
        }

        $top = $matches[0]['page'];

        if ($top['key'] === 'reparacion-tablas') {
            return $this->repairBoardsFaqReply();
        }

        if ($top['key'] === 'reparacion-neoprenos') {
            return $this->repairWetsuitFaqReply();
        }

        $lines = ['Estas páginas de la web te pueden ayudar:'];

        foreach (array_slice($matches, 0, 3) as $match) {
            $page = $match['page'];
            $lines[] = sprintf(
                '- [**%s**](%s) — %s',
                $page['title'],
                $page['path'],
                $this->shortSummary($page['summary']),
            );
        }

        return implode("\n", $lines);
    }

    /** Bloque compacto para el system prompt de Gemini. */
    public function geminiCatalogBlock(): string
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL_SECONDS, function (): string {
            $lines = [];
            foreach ($this->pages() as $page) {
                $lines[] = sprintf(
                    '- %s → %s — %s',
                    $page['title'],
                    $page['path'],
                    $this->geminiSummary($page['summary']),
                );
            }

            return implode("\n", $lines);
        });
    }

    public function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /** Bloque dinámico con las páginas más relevantes para la pregunta actual. */
    public function geminiFocusBlockForQuery(string $rawQuery): string
    {
        $normalized = $this->normalizeQuery($rawQuery);
        $matches = $this->rankPages($normalized);

        if ($matches === []) {
            $matches = $this->rankPagesLoose($normalized);
        }

        if ($matches === []) {
            return '';
        }

        $lines = [];
        foreach (array_slice($matches, 0, 2) as $match) {
            $page = $match['page'];
            $lines[] = sprintf(
                '- %s | %s | Resumen: %s',
                $page['title'],
                $page['path'],
                $this->geminiSummary($page['summary']),
            );
        }

        return implode("\n", $lines);
    }

    /** Si Gemini no citó la ruta, añade enlaces a páginas relacionadas. */
    public function enrichGeminiReply(string $geminiText, string $rawQuery): string
    {
        $normalized = $this->normalizeQuery($rawQuery);
        $matches = $this->rankPages($normalized);

        if ($matches === []) {
            return $geminiText;
        }

        foreach (array_slice($matches, 0, 2) as $match) {
            if (str_contains($geminiText, $match['page']['path'])) {
                return $geminiText;
            }
        }

        $lines = [trim($geminiText), '', '**Más información en la web:**'];

        foreach (array_slice($matches, 0, 2) as $match) {
            $page = $match['page'];
            $lines[] = sprintf('- [**%s**](%s)', $page['title'], $page['path']);
        }

        return implode("\n", $lines);
    }

    public function normalizeQuery(string $query): string
    {
        return ChatbotQueryNormalizer::forMatching($query);
    }

    private function repairBoardsFaqReply(): string
    {
        $edy = config('services.repair.edy', []);
        $name = trim((string) ($edy['name'] ?? 'Edy Mulder'));
        $phone = $this->formatRepairContactPhone($edy);
        $email = trim((string) ($edy['email'] ?? ''));

        $lines = [
            '**Reparación de tablas en el club** (servicio de **'.$name.'**):',
            '',
            '1. Anota tu **número de taquilla** en la **pizarra** del local.',
            '2. Marca cada toque con **cinta azul** en la tabla.',
            '3. '.$name.' recoge las tablas marcadas, repara en taller (~1 semana) y las devuelve al rack con **pegatina de precio**.',
            '4. Revisas el arreglo y pagas por **Bizum** o en el **buzón** del local (sobre con nombre y nº de taquilla).',
            '',
            'Guía paso a paso: [**Reparación de tablas**](/servicios).',
        ];

        if ($phone !== '' || $email !== '') {
            $lines[] = '';
            $lines[] = '**Contacto '.$name.':**';
            if ($phone !== '') {
                $lines[] = '- Teléfono: '.$phone;
            }
            if ($email !== '') {
                $lines[] = '- Email: '.$email;
            }
        }

        return implode("\n", $lines);
    }

    private function repairWetsuitFaqReply(): string
    {
        $willy = config('services.repair.willy', []);
        $name = trim((string) ($willy['name'] ?? 'Willy'));
        $phone = $this->formatRepairContactPhone($willy);
        $email = trim((string) ($willy['email'] ?? ''));

        $lines = [
            '**Reparación de neoprenos** (servicio de **'.$name.'** en el club):',
            '',
            'Deja el traje en la **percha** indicada en el local. '.$name.' lo recoge, repara y lo devuelve.',
            'Si tienes dudas sobre si merece la pena reparar o quieres fijar un tope de precio, escríbele antes.',
            '',
            'Detalle del servicio: [**Reparación de neoprenos**](/servicios/reparacion-neoprenos).',
        ];

        if ($phone !== '' || $email !== '') {
            $lines[] = '';
            $lines[] = '**Contacto '.$name.':**';
            if ($phone !== '') {
                $lines[] = '- Teléfono: '.$phone;
            }
            if ($email !== '') {
                $lines[] = '- Email: '.$email;
            }
        }

        $whatsapp = AcademyContact::whatsappDisplay();
        if ($whatsapp !== '') {
            $lines[] = '- Escuela (WhatsApp general): '.$whatsapp;
        }

        return implode("\n", $lines);
    }

    /**
     * @return list<array{key: string, title: string, path: string, summary: string, keywords: string, patterns: list<string>, priority: int}>
     */
    private function pages(): array
    {
        /** @var list<array{key: string, title: string, path: string, summary: string, keywords: string, patterns: list<string>, priority?: int}> $pages */
        $pages = config('chatbot_pages.pages', []);

        return array_map(static function (array $page): array {
            $page['priority'] = (int) ($page['priority'] ?? 0);

            return $page;
        }, $pages);
    }

    /**
     * @return list<array{page: array{key: string, title: string, path: string, summary: string, keywords: string, patterns: list<string>, priority: int}, score: int}>
     */
    private function rankPages(string $normalizedQuery): array
    {
        if ($normalizedQuery === '') {
            return [];
        }

        $ranked = [];

        foreach ($this->pages() as $page) {
            $score = $this->tokenScore($normalizedQuery, $page);

            foreach ($page['patterns'] as $pattern) {
                if (preg_match($pattern, $normalizedQuery) === 1) {
                    $score += 10 + $page['priority'];
                }
            }

            if ($score >= self::MIN_TOKEN_SCORE) {
                $ranked[] = ['page' => $page, 'score' => $score];
            }
        }

        usort($ranked, static fn (array $a, array $b): int => $b['score'] <=> $a['score']);

        return $ranked;
    }

    /**
     * @return list<array{page: array{key: string, title: string, path: string, summary: string, keywords: string, patterns: list<string>, priority: int}, score: int}>
     */
    private function rankPagesLoose(string $normalizedQuery): array
    {
        if ($normalizedQuery === '') {
            return [];
        }

        $ranked = [];

        foreach ($this->pages() as $page) {
            $score = $this->tokenScore($normalizedQuery, $page);
            $patternMatched = false;

            foreach ($page['patterns'] as $pattern) {
                if (preg_match($pattern, $normalizedQuery) === 1) {
                    $score += 10 + $page['priority'];
                    $patternMatched = true;
                }
            }

            if ($patternMatched || $score >= 1) {
                $ranked[] = ['page' => $page, 'score' => $score];
            }
        }

        usort($ranked, static fn (array $a, array $b): int => $b['score'] <=> $a['score']);

        return $ranked;
    }

    /**
     * @param  array{title: string, summary: string, keywords: string}  $page
     */
    private function tokenScore(string $normalizedQuery, array $page): int
    {
        $queryTokens = $this->tokenize($normalizedQuery);
        $pageTokens = $this->tokenize($page['title'].' '.$page['keywords'].' '.$page['summary']);

        return count(array_intersect($queryTokens, $pageTokens));
    }

  /**
     * @param  array{phone?: string, phone_display?: string}  $contact
     */
    private function formatRepairContactPhone(array $contact): string
    {
        $display = trim((string) ($contact['phone_display'] ?? ''));
        if ($display !== '') {
            return $display;
        }

        $digits = preg_replace('/\D+/', '', (string) ($contact['phone'] ?? ''));
        if ($digits === '') {
            return '';
        }

        if (str_starts_with($digits, '34') && strlen($digits) >= 11) {
            $local = substr($digits, 2, 9);

            return sprintf(
                '+34 %s %s %s',
                substr($local, 0, 3),
                substr($local, 3, 3),
                substr($local, 6, 3),
            );
        }

        return '+'.$digits;
    }

    private function shortSummary(string $summary): string
    {
        $text = trim($summary);

        return mb_strlen($text) > 110 ? mb_substr($text, 0, 107).'…' : $text;
    }

    private function geminiSummary(string $summary): string
    {
        $text = trim($summary);

        return mb_strlen($text) > 280 ? mb_substr($text, 0, 277).'…' : $text;
    }

    /**
     * @return list<string>
     */
    private function tokenize(string $text): array
    {
        $normalized = mb_strtolower($text);
        $normalized = strtr($normalized, [
            'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n',
        ]);

        preg_match_all('/[a-z0-9]{4,}/u', $normalized, $matches);

        $stopWords = [
            'para', 'como', 'donde', 'sobre', 'puede', 'debe', 'esta', 'este', 'surf', 'escuela',
            'donostia', 'sebastian', 'zurriola', 'pagina', 'servicio',
        ];

        return array_values(array_diff($matches[0] ?? [], $stopWords));
    }
}
