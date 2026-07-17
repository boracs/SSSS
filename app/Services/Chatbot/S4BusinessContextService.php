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
 * de Gemini. Los precios de bonos/taquillas se leen en vivo de MySQL (nunca
 * hardcodeados) para que el LLM nunca informe un precio caducado; el resto de
 * reglas (señales, plazos de cancelación) se ancla a la config oficial de la app.
 *
 * NOTA para quien detalle este informe más adelante: la sección de política de
 * cancelación/reembolso y el listado de tarifas de alquiler son un resumen
 * deliberadamente compacto (menos tokens = menos coste); si hace falta más
 * detalle, amplíese aquí, no en el `ChatbotAgentService`.
 */
final class S4BusinessContextService
{
    private const CACHE_KEY = 'chatbot:s4-business-context:v9';

    private const CACHE_TTL_SECONDS = 300;

    public function __construct(
        private readonly ChatbotArticleCatalogService $articleCatalog,
        private readonly ChatbotPageCatalogService $pageCatalog,
        private readonly ChatbotFaqCatalogService $faqCatalog,
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
5. Taller de Surf (artículos): si la pregunta encaja con un artículo del contexto, responde en 1-3 frases usando SOLO su resumen y menciona la ruta exacta /taller/... (sin inventar contenido). Si el bloque "ARTÍCULOS RELEVANTES" incluye uno, priorízalo.
6. Páginas explicativas (Nosotros, reparaciones, servicios, taquillas…): si encaja, resume con el texto del contexto y menciona la ruta exacta (ej. /nosotros, /servicios, /servicios/reparacion-neoprenos). Prioriza el bloque "PÁGINAS RELEVANTES" si existe.
7. Si no hay artículo, página ni dato de negocio suficiente, usa "[TRIGGER_FALLBACK]" como indica la regla 3.

=== CONTEXTO DE NEGOCIO S4 ===
{$businessBlock}
=== FIN DEL CONTEXTO ==={$personalization}
PROMPT;
    }

    /** Invalida la caché — útil tras editar bonos/planes desde el panel admin. */
    public function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
        $this->articleCatalog->forget();
        $this->pageCatalog->forget();
    }

    /**
     * Tarifario esquemático (como /servicios/surf): particulares → bonos → extras.
     * Usado por FAQ de precios de clases y de bonos.
     */
    public function surfPricingFaqText(): string
    {
        $lines = [
            '**Tarifas de clases de surf** — resumen:',
            '',
            '**① Clases particulares** (1,5 h, tabla y neopreno incluidos; atención personalizada):',
            '- **1 persona** → **80€** (total)',
            '- **2 personas** → **55€** por persona',
            '- **3 personas** → **40€** por persona',
            '- **4 personas** → **30€** por persona',
            '- **5 personas** → **30€** por persona',
            '- **6 personas** → **30€** por persona',
            '',
            '**② Bonos** (clases en grupo en Zurriola; compras el pack y surfeas cuando mejor esté el mar):',
            '- **Bono 5 clases** (1,5 h c/u) → **150€** · ≈30€/clase',
            '- **Bono 10 clases** (1,5 h c/u) → **250€** · ≈25€/clase (**mejor precio**)',
            '- **Bono 10 clases particulares** → **600€** (pack de particulares a precio reducido)',
        ];

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

        $lines[] = '';
        $lines[] = '**Menús opcionales** (complemento): menú del día **30€** · sidrería **50€** por persona.';
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
        $whatsapp = AcademyContact::whatsappDisplay();
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
        if ($whatsapp !== '') {
            $lines[] = '- **WhatsApp:** '.$whatsapp;
        }
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

        $lines[] = '## Clases de surf (Academia)';
        $lines[] = '- Modalidades: iniciación, intermedio, avanzado; grupal, particular, semanal.';
        $lines[] = '- Página tarifas: /servicios/surf.';
        $lines[] = '';
        $lines[] = '### ① Clases particulares (1,5 h, tabla y neopreno incluidos)';
        $lines[] = '- 1 persona: 80€ (total).';
        $lines[] = '- 2 personas: 55€ por persona.';
        $lines[] = '- 3 personas: 40€ por persona.';
        $lines[] = '- 4 personas: 30€ por persona.';
        $lines[] = '- 5 personas: 30€ por persona.';
        $lines[] = '- 6 personas: 30€ por persona.';
        $lines[] = '';
        $lines[] = '### ② Bonos de clases en grupo (Zurriola, flexibles según oleaje)';
        $lines[] = '- Bono 5 clases (1,5 h c/u): 150€ por persona (≈30€/clase).';
        $lines[] = '- Bono 10 clases (1,5 h c/u): 250€ por persona (≈25€/clase, mejor precio).';
        $lines[] = '- Bono 10 clases particulares: 600€ (pack particulares).';
        $lines[] = '- Organizados por niveles y horarios.';
        $lines[] = '';
        $lines[] = '### Menús opcionales (complemento)';
        $lines[] = '- Menú del día: 30€ por persona.';
        $lines[] = '- Menú sidrería: 50€ por persona.';
        $lines[] = '';
        $lines[] = sprintf(
            '- Señal de reserva online por tarjeta: máximo %s€ (el resto se abona en escuela); en clases sueltas el precio depende del número de personas.',
            $this->formatEuros((float) config('services.academy.class_reservation_deposit_eur', 30)),
        );
        $lines[] = sprintf(
            '- Cierre de inscripciones online: %d minutos antes del inicio.',
            (int) config('services.academy.enroll_cutoff_minutes', 30),
        );
        $lines[] = sprintf(
            '- Cancelación con devolución de clase/bono: solo si avisas con %d horas o más de antelación. Con menos tiempo o sin avisar, la clase puede no devolverse.',
            (int) config('services.academy.cancel_cutoff_hours', 4),
        );
        $lines[] = '- Si la escuela cancela por mal mar/tiempo: siempre se reprograma o se devuelve el importe/clase del bono.';
        $lines[] = '- Consumo de bono por clase: particular = 2 clases; grupal con solo 1 persona apuntada = 2 clases; grupal con varias personas = 1 clase por persona.';
        $lines[] = '';

        $lines[] = '## Bonos VIP (packs en web)';
        $bonos = $this->activeBonoPacks();
        if ($bonos->isEmpty()) {
            $lines[] = '- No hay packs de bono activos publicados actualmente.';
        } else {
            foreach ($bonos as $bono) {
                $lines[] = sprintf('- %s: %d clases por %s€.', $bono->nombre, $bono->num_clases, $this->formatEuros((float) $bono->precio));
            }
        }
        $lines[] = '- El saldo de clases del bono no caduca por fecha; solo se agota por uso.';
        $lines[] = '';

        $lines[] = '## Taquillas del club';
        $planes = $this->activeLockerPlans();
        if ($planes->isEmpty()) {
            $lines[] = '- No hay planes de taquilla activos publicados actualmente.';
        } else {
            foreach ($planes as $plan) {
                $lines[] = sprintf('- %s: %d días por %s€.', $plan->nombre, $plan->duracion_dias, $this->formatEuros($plan->precio_total));
            }
        }
        $lines[] = '';

        $lines[] = '## Alquiler de tablas';
        $lines[] = '- Tarifa según modelo de tabla y duración elegida (desde 1 hora hasta 1 semana); el precio exacto se calcula en la web al elegir fechas.';
        $lines[] = '- Señal de reserva: 30% del precio total; el resto se paga al recoger la tabla.';
        $lines[] = '- Reservas pendientes de pago caducan a los 7 días si no se completa el pago.';
        $lines[] = '- Catálogo y reserva: /tablas-alquiler.';
        $lines[] = '';

        $edy = config('services.repair.edy', []);
        $willy = config('services.repair.willy', []);
        $lines[] = '## Reparaciones en el club';
        $lines[] = '- Tablas: servicio de '.trim((string) ($edy['name'] ?? 'Edy Mulder')).' — pizarra + cinta azul en taquilla; devolución con pegatina de precio; pago Bizum o buzón. Guía: /servicios.';
        if (trim((string) ($edy['email'] ?? '')) !== '') {
            $lines[] = '- Contacto reparación tablas: '.trim((string) $edy['email']);
        }
        $lines[] = '- Neoprenos: servicio de '.trim((string) ($willy['name'] ?? 'Willy')).'; dejar traje en percha. Guía: /servicios/reparacion-neoprenos.';
        if (trim((string) ($willy['email'] ?? '')) !== '') {
            $lines[] = '- Contacto reparación neoprenos: '.trim((string) $willy['email']);
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

        $whatsapp = AcademyContact::whatsappDisplay();
        $lines[] = '## Contacto humano';
        $lines[] = $whatsapp !== ''
            ? sprintf('- WhatsApp de la escuela: %s (usar solo si el usuario lo pide explícitamente).', $whatsapp)
            : '- Contacto disponible por WhatsApp desde la web.';

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
