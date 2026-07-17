<?php

declare(strict_types=1);

namespace App\Services\Chatbot;

use App\Models\Article;
use App\Support\ChatbotQueryNormalizer;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Catálogo del Taller de Surf (blog) para el chatbot: enlaces a artículos cuando
 * la pregunta encaja con un tema publicado. Fuente: tabla `articles` (live).
 */
final class ChatbotArticleCatalogService
{
    private const CACHE_KEY = 'chatbot:article-catalog:v3';

    private const CACHE_TTL_SECONDS = 300;

    private const MIN_TOKEN_SCORE = 3;

    /** Score mínimo con patrón de tema (+10) para responder con contenido inline. */
    private const HIGH_CONFIDENCE_SCORE = 13;

    /**
     * Patrones de intención por slug — refuerzan el matching semántico sobre tokens.
     *
     * @var array<string, list<string>>
     */
    private const TOPIC_PATTERNS_BY_SLUG = [
        'el-kit-del-surfista-guia-esencial-de-equipamiento' => [
            '/\b(kit|equipamiento|material|neopreno|invento|leash|parafina|quillas)\b/u',
        ],
        'guia-practica-como-reparar-una-tabla-de-surf' => [
            '/\b(repar\w*|arregl\w*|solarez|toque|golpe|fisura|resina)\b.*\b(tabla|surfboard|tablas)\b/u',
            '/\b(tabla|tablas)\b.*\b(repar\w*|arregl\w*|rota|partida|golpe)\b/u',
            '/\b(como)\b.*\b(repar\w*|arregl\w*)\b.*\b(tabla|tablas|surf)\b/u',
        ],
        'manual-de-surf-seguridad-convivencia-y-localismo' => [
            '/\b(localismo|convivencia|normas?|prioridad|saltar\s+olas?|codigo\s+de\s+conducta)\b/u',
            '/\b(seguridad)\b.*\b(surf|mar|agua|pico)\b/u',
        ],
        'cual-es-la-tabla-de-surf-ideal-para-aprender' => [
            '/\b(primera\s+tabla|tabla\s+ideal|softboard|espuma|empezar)\b.*\b(tabla|surf)\b/u',
            '/\b(tabla)\b.*\b(aprender|principiante|empezar|iniciacion)\b/u',
            '/\b(traer|llevar|usar)\b.*\b(mi|propia|personal)\b.*\b(tabla|surfboard)\b/u',
        ],
        'como-saber-si-tu-tabla-de-surf-se-ha-quedado-pequena' => [
            '/\b(tabla)\b.*\b(pequena|pequeno|cambiar\s+tabla|quedado\s+pequena)\b/u',
        ],
        'que-debo-tener-en-cuenta-al-reservar-una-clase-de-surf' => [
            '/\b(reservar|reserva)\b.*\b(clase|surf)\b.*\b(tener\s+en\s+cuenta|consejo|antes)\b/u',
        ],
        'guia-de-corrientes-en-la-playa-como-detectarlas-utilizarlas-y-surfear-seguro' => [
            '/\b(corriente|corrientes|rip\s*current|bañadera)\b/u',
        ],
        'que-aprendere-en-mi-primera-clase-de-surf-y-guia-de-preguntas-frecuentes' => [
            '/\b(primera\s+clase|primer\s+dia|primer\s+dia)\b/u',
            '/\b(que\s+(se\s+da|aprendo|aprendere|imparte|ensena|ensenan|voy\s+a\s+aprender))\b/u',
            '/\b(materia|contenido)\b.*\b(primera\s+clase|clase\s+de\s+surf)\b/u',
            '/\b(articulo|articulos|taller)\b.*\b(primera\s+clase|primer\s+dia)\b/u',
        ],
        'de-que-materiales-esta-hecha-una-tabla-de-surf-guia-de-componentes' => [
            '/\b(epoxi|poliester|fibra|foam|materiales?)\b.*\b(tabla|surfboard)\b/u',
        ],
        'a-que-edad-puede-un-nino-comenzar-a-surfear-etapas-y-consejos' => [
            '/\b(nino|ninos|peques|menores|edad)\b.*\b(surf|surfear)\b/u',
        ],
        'guia-completa-partes-de-una-tabla-de-surf-y-sus-funciones' => [
            '/\b(partes?|componentes?|deck|cola|quillas?)\b.*\b(tabla|surfboard)\b/u',
        ],
        'medidas-de-las-tablas-de-surf-la-guia-definitiva-para-elegir-tu-tabla' => [
            '/\b(medidas?|volumen|litros?|pulgadas?|longitud)\b.*\b(tabla|surfboard|surf)\b/u',
            '/\b(tabla|tablas)\b.*\b(medidas?|volumen|litros?|pulgadas?)\b/u',
            '/\b(como\s+funcionan?)\b.*\b(medidas?|volumen)\b/u',
        ],
        'guia-de-olas-y-rompientes-tipos-fondos-y-factores-que-influyen-en-el-surf' => [
            '/\b(olas?|rompiente|rompientes?|fondo|reef|beachbreak)\b/u',
        ],
        'donde-colocarse-en-el-agua-para-coger-mas-olas-guia-de-posicionamiento' => [
            '/\b(posicion|colocarse|donde\s+situarme|line\s*up|pico)\b.*\b(olas?|surf)\b/u',
        ],
        'que-titulacion-se-necesita-para-impartir-clases-de-surf-en-espana' => [
            '/\b(titulacion|titulo|monitor|profesor|enseñar)\b.*\b(surf|clases?)\b/u',
        ],
        'como-hacer-el-pato-en-surf-duck-dive' => [
            '/\b(pato|duck\s*dive|remar\s+bajo)\b/u',
        ],
        'como-interpretar-el-parte-de-olas-guia-avanzada-para-surfistas' => [
            '/\b(parte\s+de\s+olas?|forecast|prevision|swell|oleaje)\b/u',
        ],
        'como-saber-en-que-direccion-rompe-una-ola' => [
            '/\b(direccion|derecha|izquierda)\b.*\b(ola|rompe|rompiente)\b/u',
        ],
    ];

    /**
     * Texto FAQ con enlaces markdown si hay artículos relevantes; null si no aplica.
     */
    public function faqReplyForQuery(string $normalizedQuery): ?string
    {
        $matches = $this->rankArticles($normalizedQuery);

        if ($matches === []) {
            return null;
        }

        $top = $matches[0];
        $article = $top['article'];

        if ($top['score'] < self::HIGH_CONFIDENCE_SCORE
            && ! ($top['patternMatched'] ?? false)
            && preg_match('/\b(articulo|articulos|taller|guias?|leer|blog)\b/u', $normalizedQuery) !== 1) {
            return null;
        }

        if ($top['score'] >= self::HIGH_CONFIDENCE_SCORE) {
            $inline = $this->inlineAnswerFor($article);
            if ($inline !== '') {
                return $inline;
            }
        }

        $lines = ['Tenemos artículos en el **Taller de Surf** que te pueden ayudar:'];

        foreach (array_slice($matches, 0, 3) as $match) {
            $article = $match['article'];
            $summary = $this->summaryFor($article);
            $lines[] = sprintf(
                '- [**%s**](%s)%s',
                $article->title,
                $this->articlePath((string) $article->slug),
                $summary !== '' ? ' — '.$summary : '',
            );
        }

        $lines[] = '';
        $lines[] = 'Explora más en [**Taller de Surf**](/taller).';

        return implode("\n", $lines);
    }

    /**
     * Bloque compacto para el system prompt de Gemini (rutas relativas /taller/...).
     */
    public function geminiCatalogBlock(): string
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL_SECONDS, function (): string {
            $articles = $this->loadArticles();

            if ($articles->isEmpty()) {
                return '- No hay artículos publicados en el Taller de Surf.';
            }

            $lines = [];
            foreach ($articles as $article) {
                $lines[] = sprintf(
                    '- %s → %s — %s',
                    $article->title,
                    $this->articlePath((string) $article->slug),
                    $this->geminiSummaryFor($article),
                );
            }

            return implode("\n", $lines);
        });
    }

    public function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Bloque dinámico (no cacheado) con los artículos más relevantes para la
     * pregunta actual — se inyecta al system prompt de Gemini en cada turno.
     */
    public function geminiFocusBlockForQuery(string $rawQuery): string
    {
        $normalized = $this->normalizeQuery($rawQuery);
        $matches = $this->rankArticles($normalized);

        if ($matches === []) {
            $matches = $this->rankArticlesLoose($normalized);
        }

        if ($matches === []) {
            return '';
        }

        $lines = [];
        foreach (array_slice($matches, 0, 2) as $match) {
            $article = $match['article'];
            $lines[] = sprintf(
                '- %s | %s | Resumen: %s',
                $article->title,
                $this->articlePath((string) $article->slug),
                $this->geminiSummaryFor($article),
            );
        }

        return implode("\n", $lines);
    }

    /**
     * Si Gemini no citó /taller/, añade enlaces markdown de artículos relacionados.
     */
    public function enrichGeminiReply(string $geminiText, string $rawQuery): string
    {
        if (str_contains($geminiText, '/taller/')) {
            return $geminiText;
        }

        $normalized = $this->normalizeQuery($rawQuery);
        $matches = $this->rankArticles($normalized);

        if ($matches === []) {
            return $geminiText;
        }

        $lines = [trim($geminiText), '', '**En el Taller de Surf puedes leer más:**'];

        foreach (array_slice($matches, 0, 2) as $match) {
            $article = $match['article'];
            $lines[] = sprintf(
                '- [**%s**](%s)',
                $article->title,
                $this->articlePath((string) $article->slug),
            );
        }

        return implode("\n", $lines);
    }

    /**
     * Rescate cuando FAQ general y Gemini fallan: artículo con patrón de tema claro.
     */
    public function rescueReplyForQuery(string $rawQuery): ?string
    {
        $normalized = $this->normalizeQuery($rawQuery);
        $matches = $this->rankArticles($normalized, patternOnly: true);

        if ($matches === []) {
            return null;
        }

        $inline = $this->inlineAnswerFor($matches[0]['article']);

        return $inline !== '' ? $inline : null;
    }

    public function normalizeQuery(string $query): string
    {
        return ChatbotQueryNormalizer::forMatching($query);
    }

    /**
     * @return list<array{article: Article, score: int, patternMatched: bool}>
     */
    private function rankArticles(string $normalizedQuery, bool $patternOnly = false): array
    {
        if ($normalizedQuery === '') {
            return [];
        }

        $articles = $this->loadArticles();
        $ranked = [];

        foreach ($articles as $article) {
            $slug = (string) $article->slug;
            $score = $this->tokenScore($normalizedQuery, $article);
            $patternMatched = false;

            foreach (self::TOPIC_PATTERNS_BY_SLUG[$slug] ?? [] as $pattern) {
                if (preg_match($pattern, $normalizedQuery) === 1) {
                    $score += 10;
                    $patternMatched = true;
                }
            }

            if ($patternMatched) {
                $score = max($score, self::HIGH_CONFIDENCE_SCORE);
            }

            if ($patternOnly && ! $patternMatched) {
                continue;
            }

            if ($score >= self::MIN_TOKEN_SCORE || $patternMatched) {
                $ranked[] = [
                    'article' => $article,
                    'score' => $score,
                    'patternMatched' => $patternMatched,
                ];
            }
        }

        if ($ranked === [] && preg_match('/\b(articulo|articulos|taller|guias?|leer|blog)\b/u', $normalizedQuery) === 1) {
            foreach ($articles->take(3) as $article) {
                $ranked[] = ['article' => $article, 'score' => 1];
            }
        }

        usort($ranked, static fn (array $a, array $b): int => $b['score'] <=> $a['score']);

        return $ranked;
    }

    /**
     * Ranking permisivo para inyectar contexto a Gemini cuando el match estricto falla.
     *
     * @return list<array{article: Article, score: int, patternMatched: bool}>
     */
    private function rankArticlesLoose(string $normalizedQuery): array
    {
        if ($normalizedQuery === '') {
            return [];
        }

        $articles = $this->loadArticles();
        $ranked = [];

        foreach ($articles as $article) {
            $slug = (string) $article->slug;
            $score = $this->tokenScore($normalizedQuery, $article);
            $patternMatched = false;

            foreach (self::TOPIC_PATTERNS_BY_SLUG[$slug] ?? [] as $pattern) {
                if (preg_match($pattern, $normalizedQuery) === 1) {
                    $score += 10;
                    $patternMatched = true;
                }
            }

            if ($patternMatched || $score >= 1) {
                $ranked[] = [
                    'article' => $article,
                    'score' => $patternMatched ? max($score, self::HIGH_CONFIDENCE_SCORE) : $score,
                    'patternMatched' => $patternMatched,
                ];
            }
        }

        usort($ranked, static fn (array $a, array $b): int => $b['score'] <=> $a['score']);

        return $ranked;
    }

    private function tokenScore(string $normalizedQuery, Article $article): int
    {
        $queryTokens = $this->tokenize($normalizedQuery);
        $articleTokens = $this->tokenize(
            (string) $article->title.' '.$this->keywordsFor($article).' '.$this->summaryFor($article),
        );

        return count(array_intersect($queryTokens, $articleTokens));
    }

    /**
     * @return Collection<int, Article>
     */
    private function loadArticles(): Collection
    {
        return Article::query()
            ->select(['id', 'title', 'slug', 'excerpt', 'meta_keywords', 'chatbot_summary', 'chatbot_keywords'])
            ->orderBy('id')
            ->get();
    }

    private function geminiSummaryFor(Article $article): string
    {
        $summary = trim((string) ($article->chatbot_summary ?? ''));

        if ($summary === '') {
            $summary = trim(preg_replace('/\s+/u', ' ', strip_tags((string) $article->excerpt)) ?? '');
        }

        if ($summary === '') {
            return '';
        }

        return mb_strlen($summary) > 280 ? mb_substr($summary, 0, 277).'…' : $summary;
    }

    private function summaryFor(Article $article): string
    {
        $summary = trim((string) ($article->chatbot_summary ?? ''));

        if ($summary !== '') {
            return $this->shortExcerpt($summary);
        }

        return $this->shortExcerpt((string) $article->excerpt);
    }

    private function keywordsFor(Article $article): string
    {
        $keywords = trim((string) ($article->chatbot_keywords ?? ''));

        return $keywords !== '' ? $keywords : (string) ($article->meta_keywords ?? '');
    }

    private function articlePath(string $slug): string
    {
        return '/taller/'.$slug;
    }

    private function shortExcerpt(string $excerpt): string
    {
        $text = trim(preg_replace('/\s+/u', ' ', strip_tags($excerpt)) ?? '');

        if ($text === '') {
            return '';
        }

        return mb_strlen($text) > 110 ? mb_substr($text, 0, 107).'…' : $text;
    }

    private function inlineAnswerFor(Article $article): string
    {
        $summary = trim((string) ($article->chatbot_summary ?? ''));

        if ($summary === '') {
            $summary = trim(preg_replace('/\s+/u', ' ', strip_tags((string) $article->excerpt)) ?? '');
        }

        if ($summary === '') {
            return '';
        }

        $body = mb_strlen($summary) > 520 ? mb_substr($summary, 0, 517).'…' : $summary;

        return sprintf(
            "**%s**\n\n%s\n\n📖 Artículo completo: [**Leer más**](%s)",
            $article->title,
            $body,
            $this->articlePath((string) $article->slug),
        );
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
            'donostia', 'sebastian', 'zurriola', 'guia', 'articulo',
        ];

        return array_values(array_diff($matches[0] ?? [], $stopWords));
    }
}
