<?php

declare(strict_types=1);

namespace App\Services\Seo;

/**
 * FAQPage JSON-LD desde listas question/answer (texto plano, sin markdown de enlaces).
 */
final class FaqPageJsonLdService
{
    /**
     * @param  list<array<string, mixed>>  $faqs
     * @return list<array<string, mixed>>
     */
    public function nodes(array $faqs, string $pageUrl): array
    {
        $filtered = array_values(array_filter(
            $faqs,
            static fn (array $f): bool => trim((string) ($f['question'] ?? '')) !== ''
                && trim((string) ($f['answer'] ?? '')) !== '',
        ));

        if ($filtered === []) {
            return [];
        }

        return [[
            '@context' => 'https://schema.org',
            '@type' => 'FAQPage',
            'url' => $pageUrl,
            'mainEntity' => array_map(fn (array $f): array => [
                '@type' => 'Question',
                'name' => (string) $f['question'],
                'acceptedAnswer' => [
                    '@type' => 'Answer',
                    'text' => $this->plainAnswer((string) $f['answer']),
                ],
            ], $filtered),
        ]];
    }

    private function plainAnswer(string $answer): string
    {
        $plain = preg_replace('/\[([^\]]+)\]\(([^)]+)\)/', '$1', $answer) ?? $answer;
        $plain = preg_replace('/\s+/u', ' ', $plain) ?? $plain;

        return trim($plain);
    }
}
