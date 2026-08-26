<?php

declare(strict_types=1);

namespace App\Services\Seo;

use App\Support\MoneyCents;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * FAQs de clases de surf (/servicios/surf) desde JSON editable + precios desde config.
 */
final class SurfClassesFaqService
{
    private const CACHE_KEY = 'seo.surf_classes_faqs.v1';

    private const CACHE_TTL_SECONDS = 3600;

    public function __construct(
        private readonly FaqPageJsonLdService $faqJsonLd,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function faqJsonLdNodes(string $pageUrl): array
    {
        return $this->faqJsonLd->nodes($this->resolvedFaqs(), $pageUrl);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function resolvedFaqs(): array
    {
        $faqs = $this->loadFaqsFromJson();

        return array_map(function (array $faq): array {
            if (($faq['id'] ?? '') === 'pricing') {
                $faq['answer'] = $this->pricingAnswer();
            }

            return $faq;
        }, $faqs);
    }

    private function pricingAnswer(): string
    {
        $bono5Cents = max(0, (int) config('store.bonos_public.bono5_cents', 15000));
        $bono10GroupCents = max(0, (int) config('store.promo_bono.price_cents', 25000));
        $bono10PrivateCents = max(0, (int) config('store.bonos_public.bono10_particulares_cents', 60000));

        $bono5Label = MoneyCents::formatEurosLabel($bono5Cents);
        $bono5PerClass = MoneyCents::formatEurosLabel((int) round($bono5Cents / 5));
        $bono10GroupLabel = MoneyCents::formatEurosLabel($bono10GroupCents);
        $bono10GroupPerClass = MoneyCents::formatEurosLabel((int) round($bono10GroupCents / 10));
        $bono10PrivateLabel = MoneyCents::formatEurosLabel($bono10PrivateCents);
        $bono10PrivatePerClass = MoneyCents::formatEurosLabel((int) round($bono10PrivateCents / 10));

        return sprintf(
            'Bonos de 5 clases desde %s (%s por clase), bono grupal de 10 clases de 1,5 h desde %s (%s por clase) y bono de 10 clases particulares desde %s (%s por clase). Material incluido; precios visibles en la página de clases de surf.',
            $bono5Label,
            $bono5PerClass,
            $bono10GroupLabel,
            $bono10GroupPerClass,
            $bono10PrivateLabel,
            $bono10PrivatePerClass,
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function loadFaqsFromJson(): array
    {
        $path = (string) config(
            'services.zurriola_surf.surf_classes_faqs_json_path',
            resource_path('surf-guide/surf-classes-faqs.json'),
        );

        if (! is_readable($path)) {
            Log::warning('Surf classes FAQ JSON no legible', ['path' => $path]);

            return [];
        }

        $cacheKey = self::CACHE_KEY.'.'.(int) filemtime($path);

        return Cache::remember(
            $cacheKey,
            self::CACHE_TTL_SECONDS,
            function () use ($path): array {
                /** @var array<string, mixed>|null $raw */
                $raw = json_decode((string) file_get_contents($path), true);
                if (! is_array($raw) || ! is_array($raw['faqs'] ?? null)) {
                    Log::warning('Surf classes FAQ JSON inválido', ['path' => $path]);

                    return [];
                }

                $out = [];
                foreach ($raw['faqs'] as $row) {
                    if (is_array($row)) {
                        $out[] = $row;
                    }
                }

                return $out;
            },
        );
    }
}
