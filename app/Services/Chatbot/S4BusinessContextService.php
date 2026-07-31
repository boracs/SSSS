<?php

declare(strict_types=1);

namespace App\Services\Chatbot;

use App\Models\PackBono;
use App\Models\PlanTaquilla;
use App\Support\AcademyContact;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Construye el bloque de contexto de negocio inyectado como `systemInstruction`
 * de Gemini. Fuentes:
 * - JSON editable: `resources/chatbot/s4-business-knowledge.json` (políticas, edge cases, tarifario comercial)
 * - BD en vivo: packs VIP y planes de taquilla
 * - Config: logística/contacto academy.*, reparaciones
 * - Catálogos: páginas, artículos, samples FAQ
 */
final class S4BusinessContextService
{
    private const CACHE_KEY = 'chatbot:s4-business-context:v14';

    private const CACHE_TTL_SECONDS = 300;

    public function __construct(
        private readonly ChatbotArticleCatalogService $articleCatalog,
        private readonly ChatbotPageCatalogService $pageCatalog,
        private readonly ChatbotFaqCatalogService $faqCatalog,
        private readonly S4BusinessKnowledgeService $knowledge,
    ) {}

    public function buildSystemPrompt(?string $authenticatedDisplayName = null): string
    {
        $businessBlock = Cache::remember(self::CACHE_KEY, self::CACHE_TTL_SECONDS, fn (): string => $this->buildBusinessBlock());

        $personalization = '';
        if ($authenticatedDisplayName !== null && $authenticatedDisplayName !== '') {
            $personalization = "\n\nPERSONALIZACIÓN:\n"
                ."El usuario con el que conversas está logueado y se llama {$authenticatedDisplayName}. "
                .'Dirígete a él por su nombre de forma natural y sutil a lo largo de la conversación para transmitirle una sensación de que es conocido por la escuela, manteniendo un tono sincero y profesional.';
        }

        return <<<PROMPT
Eres el asistente inteligente oficial de S4 (San Sebastián Surf School), una escuela de surf en la playa de Zurriola, Donostia.

REGLAS ESTRICTAS:
1. Usa ÚNICAMENTE la información del bloque "CONTEXTO DE NEGOCIO S4" de abajo. No inventes precios, políticas ni datos que no estén ahí.
2. Si el usuario solo saluda, responde amablemente presentándote como el asistente de S4 e invita a preguntar sobre clases, bonos, taquillas o alquiler.
3. Si preguntan algo ajeno al surf/la escuela, o cuya respuesta exacta NO está en el contexto con total certeza, NO improvises ni asumas: responde EXACTA y ÚNICAMENTE con el texto "[TRIGGER_FALLBACK]" (sin comillas, sin nada más). El usuario puede usar distintas formas verbales (reparo/reparar, reservo/reservar); busca la intención en artículos y páginas del contexto.
4. Responde siempre en español, en tono cercano, en máximo 4 frases, sin bloques de código ni markdown de tablas.
5. WhatsApp: NUNCA cites el número de teléfono ni un enlace wa.me. NUNCA digas que hay un botón de WhatsApp visible desde el inicio. El botón solo aparece cuando el sistema deriva a humano tras no poder responder con certeza. Si piden contacto, orienta a la página Contacto o a reformular la duda.
6. Taller de Surf (artículos): si la pregunta encaja con un artículo del contexto, responde en 1-3 frases usando SOLO su resumen y enlaza con markdown [Título del artículo](/taller/slug) — NUNCA escribas la ruta suelta sin enlace.
7. Páginas explicativas (Nosotros, reparaciones, servicios, taquillas…): si encaja, resume con el texto del contexto y enlaza con markdown [Nombre de la página](/ruta) (ej. [Alquiler de tablas](/tablas-alquiler)). NUNCA dejes la ruta como texto plano. Prioriza el bloque "PÁGINAS RELEVANTES" si existe.
8. Si no hay artículo, página ni dato de negocio suficiente, usa "[TRIGGER_FALLBACK]" como indica la regla 3.

=== CONTEXTO DE NEGOCIO S4 ===
{$businessBlock}
=== FIN DEL CONTEXTO ==={$personalization}
PROMPT;
    }

    /** Invalida la caché — útil tras editar bonos/planes desde el panel admin. */
    public function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
        $this->knowledge->forget();
        $this->articleCatalog->forget();
        $this->pageCatalog->forget();
    }

    /**
     * Tarifario esquemático (como /servicios/surf): particulares → bonos → extras.
     * Usado por FAQ de precios de clases y de bonos.
     */
    public function surfPricingFaqText(): string
    {
        $fromJson = trim($this->knowledge->surfPricingFaqText());
        $lines = $fromJson !== ''
            ? [$fromJson]
            : ['**Tarifas de clases de surf** — consulta [/servicios/surf](/servicios/surf) o WhatsApp.'];

        $bonosVip = $this->activeBonoPacks();
        if ($bonosVip->isNotEmpty()) {
            $lines[] = '';
            $lines[] = '**③ Bonos VIP** (packs web, precio en vivo):';
            foreach ($bonosVip as $bono) {
                $lines[] = sprintf(
                    '- **%s** → %d clases por **%s€**',
                    $bono->nombre,
                    $bono->num_clases,
                    $this->formatEuros((float) $bono->precio),
                );
            }
        }

        $doc = $this->knowledge->document();
        $menus = is_array($doc['academy']['optional_menus'] ?? null) ? $doc['academy']['optional_menus'] : [];
        if ($menus !== []) {
            $parts = [];
            foreach ($menus as $menu) {
                if (! is_array($menu)) {
                    continue;
                }
                $name = trim((string) ($menu['name'] ?? ''));
                $price = (float) ($menu['price_eur'] ?? 0);
                if ($name !== '' && $price > 0) {
                    $parts[] = mb_strtolower($name).' **'.$this->formatEuros($price).'€**';
                }
            }
            if ($parts !== []) {
                $lines[] = '';
                $lines[] = '**Menús opcionales** (complemento): '.implode(' · ', $parts).' por persona.';
            }
        }

        $lines[] = '';
        $lines[] = 'Detalle y reserva: [**Clases de surf**](/servicios/surf) o **Academia** en la web.';

        return implode("\n", $lines);
    }

    /**
     * @deprecated alias — usar {@see self::surfPricingFaqText()}
     */
    public function bonoPricesFaqText(): string
    {
        return $this->surfPricingFaqText();
    }

    /** @deprecated alias — usar {@see self::surfPricingFaqText()} */
    public function classPricesFaqText(): string
    {
        return $this->surfPricingFaqText();
    }

    /**
     * Texto comercial listo para el FAQ local con los precios de taquilla en
     * vivo — misma fuente que {@see self::buildBusinessBlock()}.
     */
    public function lockerPlanPricesFaqText(): string
    {
        $planes = $this->activeLockerPlans();

        if ($planes->isEmpty()) {
            return 'Ahora mismo no hay **planes de taquilla** publicados. Consulta **Taquillas** en la web o pregúntanos por **WhatsApp**.';
        }

        $lines = $planes->map(fn (PlanTaquilla $plan): string => sprintf(
            '- **%s**: %d días por **%s€**.',
            $plan->nombre,
            $plan->duracion_dias,
            $this->formatEuros($plan->precio_total),
        ));

        return '**Planes de taquilla disponibles:**'."\n\n".$lines->implode("\n")
            ."\n\n".'Consulta el detalle y contrata en **Taquillas** dentro de la web.';
    }

    /** Logística y contacto público — fuente: config/services.php → academy.* */
    public function logisticsFaqText(): string
    {
        $location = trim((string) config('services.academy.location_label', ''));
        $hours = trim((string) config('services.academy.opening_hours', ''));
        $gettingHere = trim((string) config('services.academy.getting_here', ''));
        $email = AcademyContact::contactEmail();
        $mapsUrl = trim((string) config('services.academy.maps_url', ''));
        $instagram = trim((string) config('services.academy.instagram_handle', ''));

        $lines = ['**Dónde estamos y cómo llegar:**', ''];

        if ($location !== '') {
            $lines[] = '- **Ubicación:** '.$location;
        }
        if ($gettingHere !== '') {
            $lines[] = '- **Cómo llegar:** '.$gettingHere;
        }
        if ($hours !== '') {
            $lines[] = '- **Horario:** '.$hours;
        }
        if ($email !== '') {
            $lines[] = '- **Email:** '.$email;
        }
        $lines[] = '- **WhatsApp:** solo tras derivación a humano (botón en el chat). No cites el número ni digas que el botón está siempre visible.';
        if ($instagram !== '') {
            $lines[] = '- **Instagram:** '.$instagram;
        }
        if ($mapsUrl !== '' && ! str_contains($mapsUrl, 'TuUbicacion')) {
            $lines[] = '- **Mapa:** '.$mapsUrl;
        }

        $lines[] = '';
        $lines[] = 'Si es el día de tu clase y no encuentras el punto, escríbenos por **WhatsApp**.';

        return implode("\n", $lines);
    }

    private function buildBusinessBlock(): string
    {
        $lines = [];

        $lines[] = '## Logística y contacto';
        $lines[] = '- Ubicación: '.trim((string) config('services.academy.location_label', 'Playa de Zurriola, Donostia'));
        $lines[] = '- Cómo llegar: '.trim((string) config('services.academy.getting_here', 'Llega 10–15 min antes; punto de encuentro en Zurriola junto al club.'));
        $lines[] = '- Horario: '.trim((string) config('services.academy.opening_hours', 'Variable según temporada; confirmar por WhatsApp.'));
        $email = AcademyContact::contactEmail();
        if ($email !== '') {
            $lines[] = '- Email: '.$email;
        }
        $instagram = trim((string) config('services.academy.instagram_handle', ''));
        if ($instagram !== '') {
            $lines[] = '- Instagram: '.$instagram;
        }
        $mapsUrl = trim((string) config('services.academy.maps_url', ''));
        if ($mapsUrl !== '' && ! str_contains($mapsUrl, 'TuUbicacion')) {
            $lines[] = '- Mapa: '.$mapsUrl;
        }
        $lines[] = '';

        $policies = trim($this->knowledge->compileBusinessPoliciesBlock());
        if ($policies !== '') {
            $lines[] = $policies;
        }

        $lines[] = '## Bonos VIP (packs en web — precios en vivo)';
        $bonos = $this->activeBonoPacks();
        if ($bonos->isEmpty()) {
            $lines[] = '- No hay packs de bono activos publicados actualmente.';
        } else {
            foreach ($bonos as $bono) {
                $lines[] = sprintf('- %s: %d clases por %s€.', $bono->nombre, $bono->num_clases, $this->formatEuros((float) $bono->precio));
            }
        }
        $lines[] = '';

        $lines[] = '## Planes de taquilla (precios en vivo)';
        $planes = $this->activeLockerPlans();
        if ($planes->isEmpty()) {
            $lines[] = '- No hay planes de taquilla activos publicados actualmente.';
        } else {
            foreach ($planes as $plan) {
                $lines[] = sprintf('- %s: %d días por %s€.', $plan->nombre, $plan->duracion_dias, $this->formatEuros($plan->precio_total));
            }
        }
        $lines[] = '';

        $lines[] = '## Páginas explicativas de la web';
        $lines[] = $this->pageCatalog->geminiCatalogBlock();
        $lines[] = '';

        $faqSamples = $this->faqCatalog->geminiSampleQuestionsBlock();
        if ($faqSamples !== '') {
            $lines[] = '## Preguntas frecuentes de usuarios (intents FAQ)';
            $lines[] = '- El FAQ local resuelve estas intenciones por regex; las marcadas como cuenta requieren usuario logueado para datos personales (taquilla, bono).';
            $lines[] = $faqSamples;
            $lines[] = '';
        }

        $lines[] = '## Taller de Surf (artículos y guías)';
        $lines[] = '- Blog con guías prácticas; índice en /taller.';
        $lines[] = $this->articleCatalog->geminiCatalogBlock();
        $lines[] = '';

        $lines[] = '## Contacto humano';
        $lines[] = '- WhatsApp: el botón del chat SOLO aparece tras derivación a humano (2 fallos de certeza o escalación). NUNCA escribas el número ni digas que el botón está visible desde el inicio.';
        $lines[] = '- Si el usuario pide WhatsApp o teléfono: orienta a la página Contacto, o a reformular la duda; no inventes el número.';

        return implode("\n", $lines);
    }

    /** @return Collection<int, PackBono> */
    private function activeBonoPacks(): Collection
    {
        return PackBono::query()->where('activo', true)->orderBy('num_clases')->get(['nombre', 'num_clases', 'precio']);
    }

    /** @return Collection<int, PlanTaquilla> */
    private function activeLockerPlans(): Collection
    {
        return PlanTaquilla::query()->where('activo', true)->orderBy('duracion_dias')->get(['nombre', 'duracion_dias', 'precio_total_cents']);
    }

    private function formatEuros(float $amount): string
    {
        return rtrim(rtrim(number_format($amount, 2, ',', '.'), '0'), ',');
    }
}
