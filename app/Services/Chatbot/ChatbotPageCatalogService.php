<?php

declare(strict_types=1);

namespace App\Services\Chatbot;

use App\Support\ChatbotQueryNormalizer;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Catálogo de páginas explicativas públicas (Nosotros, reparaciones, servicios…)
 * para FAQ local y contexto Gemini. Fuente: config/chatbot_pages.php.
 * Respuestas largas de dominio (reparaciones, surfskate, fotos) salen del JSON
 * vía {@see S4BusinessKnowledgeService}.
 */
final class ChatbotPageCatalogService
{
    private const CACHE_KEY = 'chatbot:page-catalog:v5';

    private const CACHE_TTL_SECONDS = 300;

    private const MIN_TOKEN_SCORE = 3;

    public function __construct(
        private readonly S4BusinessKnowledgeService $knowledge,
    ) {
    }

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
            $fromJson = trim($this->knowledge->faqRepairTablesReply());
            if ($fromJson !== '') {
                return $fromJson;
            }
            Log::warning('ChatbotPageCatalogService: FAQ tablas sin datos en JSON knowledge.');
        }

        if ($top['key'] === 'reparacion-neoprenos') {
            $fromJson = trim($this->knowledge->faqRepairWetsuitsReply());
            if ($fromJson !== '') {
                return $fromJson;
            }
            Log::warning('ChatbotPageCatalogService: FAQ neoprenos sin datos en JSON knowledge.');
        }

        if ($top['key'] === 'surf-skate-guia') {
            $fromJson = trim($this->knowledge->faqSurfskateGuideReply());
            if ($fromJson !== '') {
                return $fromJson;
            }
            Log::warning('ChatbotPageCatalogService: FAQ surfskate sin datos en JSON knowledge.');
        }

        if ($top['key'] === 'fotografia') {
            $fromJson = trim($this->knowledge->faqPhotographyReply());
            if ($fromJson !== '') {
                return $fromJson;
            }
            Log::warning('ChatbotPageCatalogService: FAQ fotografía sin datos en JSON knowledge.');
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
        $text = $this->linkifyInternalPaths($geminiText);

        if ($matches === []) {
            return $text;
        }

        foreach (array_slice($matches, 0, 2) as $match) {
            if (str_contains($text, $match['page']['path'])) {
                return $this->linkifyInternalPaths($text);
            }
        }

        $lines = [trim($text), '', '**Más información en la web:**'];

        foreach (array_slice($matches, 0, 2) as $match) {
            $page = $match['page'];
            $lines[] = sprintf('- [**%s**](%s)', $page['title'], $page['path']);
        }

        return implode("\n", $lines);
    }

    /**
     * Convierte rutas sueltas (/tablas-alquiler) en enlaces markdown [Título](/ruta).
     * No toca las que ya van como ](/ruta).
     */
    public function linkifyInternalPaths(string $text): string
    {
        $map = [];
        foreach ($this->pages() as $page) {
            $path = trim((string) ($page['path'] ?? ''));
            $title = trim((string) ($page['title'] ?? ''));
            if ($path === '' || $path === '/' || $title === '') {
                continue;
            }
            $map[$path] = $title;
        }

        uksort($map, static fn (string $a, string $b): int => strlen($b) <=> strlen($a));

        foreach ($map as $path => $title) {
            $quoted = preg_quote($path, '/');
            $text = preg_replace(
                '/(?<!\]\()'.$quoted.'(?=[\s.,;:!?)]|$)/u',
                '[**'.$title.'**]('.$path.')',
                $text,
            ) ?? $text;
        }

        return $text;
    }

    public function normalizeQuery(string $query): string
    {
        return ChatbotQueryNormalizer::forMatching($query);
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
