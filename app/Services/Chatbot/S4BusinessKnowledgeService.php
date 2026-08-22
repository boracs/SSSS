<?php

declare(strict_types=1);

namespace App\Services\Chatbot;

use Illuminate\Support\Facades\Log;
use App\Services\Academy\PrivateLessonPricingService;
use App\Support\AcademyContact;
use App\Support\MoneyCents;

/**
 * Carga y compila `resources/chatbot/s4-business-knowledge.json` a texto
 * acotado para Gemini / FAQ. No envía el JSON crudo entero: solo secciones
 * relevantes, mezclando valores vivos de config donde aplica.
 */
final class S4BusinessKnowledgeService
{
    /** @var array<string, mixed>|null */
    private ?array $decoded = null;

    /**
     * Tarifa viva de particulares (tabla editable en admin), con el JSON como
     * respaldo si aún no hay tarifa en BD.
     *
     * @return list<array{people: int, total_eur: float, per_person_eur: float}>
     */
    private function privateLessonRows(): array
    {
        $tariff = app(PrivateLessonPricingService::class)->tariffTable();

        if ($tariff !== []) {
            $rows = [];
            foreach ($tariff as $people => $totalCents) {
                $rows[] = [
                    'people' => (int) $people,
                    'total_eur' => MoneyCents::centsToEuros((int) $totalCents),
                    'per_person_eur' => MoneyCents::centsToEuros((int) round($totalCents / max(1, (int) $people))),
                ];
            }

            return $rows;
        }

        $academy = is_array($this->document()['academy'] ?? null) ? $this->document()['academy'] : [];
        $rows = [];
        foreach ($academy['private_lessons'] ?? [] as $row) {
            if (! is_array($row)) {
                continue;
            }
            $people = (int) ($row['people'] ?? 0);
            $perPerson = (float) ($row['price_eur_per_person'] ?? 0);
            if ($people < 1 || $perPerson <= 0) {
                continue;
            }
            $rows[] = [
                'people' => $people,
                'total_eur' => $perPerson * $people,
                'per_person_eur' => $perPerson,
            ];
        }

        return $rows;
    }

    /**
     * @return array<string, mixed>
     */
    public function document(): array
    {
        if ($this->decoded !== null) {
            return $this->decoded;
        }

        $path = (string) config('services.chatbot.knowledge_json_path', '');
        if ($path === '' || ! is_readable($path)) {
            Log::warning('S4BusinessKnowledgeService: JSON de conocimiento no legible.', ['path' => $path]);
            $this->decoded = [];

            return $this->decoded;
        }

        $raw = file_get_contents($path);
        if ($raw === false || trim($raw) === '') {
            $this->decoded = [];

            return $this->decoded;
        }

        $data = json_decode($raw, true);
        if (! is_array($data)) {
            Log::warning('S4BusinessKnowledgeService: JSON inválido.', ['path' => $path]);
            $this->decoded = [];

            return $this->decoded;
        }

        $this->decoded = $data;

        return $this->decoded;
    }

    public function forget(): void
    {
        $this->decoded = null;
    }

    /**
     * Bloque markdown compacto para systemInstruction (sin packs/planes BD).
     */
    public function compileBusinessPoliciesBlock(): string
    {
        $doc = $this->document();
        if ($doc === []) {
            return '';
        }

        $lines = [];
        $meta = is_array($doc['meta'] ?? null) ? $doc['meta'] : [];
        $status = trim((string) ($meta['status'] ?? ''));
        if ($status !== '') {
            $lines[] = '## Estado del conocimiento';
            $lines[] = '- Documento de políticas: '.$status
                .'. Precios comerciales del tarifario pueden no ser oficiales hasta confirmación de la escuela.';
            $lines[] = '- Packs VIP y planes de taquilla: siempre prioriza los listados "en vivo" más abajo.';
            $lines[] = '';
        }

        $lines = array_merge($lines, $this->compileAcademySection($doc));
        $lines = array_merge($lines, $this->compileVipSection($doc));
        $lines = array_merge($lines, $this->compileLockersSection($doc));
        $lines = array_merge($lines, $this->compileRentalsSection($doc));
        $lines = array_merge($lines, $this->compileStoreSection($doc));
        $lines = array_merge($lines, $this->compileRepairsSection($doc));
        $lines = array_merge($lines, $this->compileSurfskateGuideSection($doc));
        $lines = array_merge($lines, $this->compilePhotographySection($doc));
        $lines = array_merge($lines, $this->compileSecondHandAuctions($doc));
        $lines = array_merge($lines, $this->compileEdgeCases($doc));
        $lines = array_merge($lines, $this->compileWhatsappPlaybook($doc));
        $lines = array_merge($lines, $this->compileEscalation($doc));

        return implode("\n", $lines);
    }

    /** Tarifario comercial (FAQ precios clases/bonos grupo) desde JSON. */
    public function surfPricingFaqText(): string
    {
        $doc = $this->document();
        $academy = is_array($doc['academy'] ?? null) ? $doc['academy'] : [];

        $lines = [
            '**Tarifas de clases de surf** — resumen:',
            '',
            '**① Clases particulares** (1,5 h, tabla y neopreno incluidos; atención personalizada):',
        ];

        foreach ($this->privateLessonRows() as $row) {
            $lines[] = sprintf(
                '- **%d persona%s** → **%s€** en total%s',
                $row['people'],
                $row['people'] === 1 ? '' : 's',
                $this->formatEuros($row['total_eur']),
                $row['people'] === 1 ? '' : ' ('.$this->formatEuros($row['per_person_eur']).'€ por persona)',
            );
        }

        $lines[] = '';
        $lines[] = '**② Bonos** (clases en grupo en Zurriola; compras el pack y surfeas cuando mejor esté el mar):';
        foreach ($academy['group_bonos'] ?? [] as $bono) {
            if (! is_array($bono)) {
                continue;
            }
            $name = trim((string) ($bono['name'] ?? ''));
            $price = (float) ($bono['price_eur'] ?? 0);
            if ($name === '' || $price <= 0) {
                continue;
            }
            $extra = ! empty($bono['best_value']) ? ' (**mejor precio**)' : '';
            $approx = isset($bono['approx_per_class_eur'])
                ? ' · ≈'.$this->formatEuros((float) $bono['approx_per_class_eur']).'€/clase'
                : '';
            $lines[] = sprintf('- **%s** → **%s€**%s%s', $name, $this->formatEuros($price), $approx, $extra);
        }

        return implode("\n", $lines);
    }

    /** FAQ reparación de tablas desde JSON + contacto config. */
    public function faqRepairTablesReply(): string
    {
        $doc = $this->document();
        $repairs = is_array($doc['repairs'] ?? null) ? $doc['repairs'] : [];
        $tables = is_array($repairs['tables'] ?? null) ? $repairs['tables'] : [];
        if ($tables === []) {
            return '';
        }

        $edy = config('services.repair.edy', []);
        $fallback = trim((string) ($tables['provider_name_fallback'] ?? 'Edy Mulder'));
        $name = trim((string) ($edy['name'] ?? '')) !== '' ? trim((string) $edy['name']) : $fallback;
        $page = trim((string) ($tables['page_path'] ?? '/servicios'));

        $lines = [
            '**Reparación de tablas en el club** (servicio de **'.$name.'**):',
            '',
        ];

        $client = $this->stringList($tables['client_does'] ?? null);
        $provider = $this->stringList($tables['provider_does'] ?? null);
        $n = 1;
        foreach ($client as $item) {
            if ($n <= 2) {
                $lines[] = $n.'. '.$item;
                $n++;
            }
        }
        if ($provider !== []) {
            $sla = trim((string) ($tables['sla_note'] ?? ''));
            $slaBit = $sla !== '' ? ' ('.mb_strtolower(rtrim($sla, '.')).')' : '';
            $lines[] = $n.'. '.$name.' recoge las tablas marcadas, repara'.$slaBit
                .' y las devuelve al rack con pegatina de precio.';
            $n++;
        }
        $payment = is_array($tables['payment'] ?? null) ? $tables['payment'] : [];
        $methods = $this->stringList($payment['methods'] ?? null);
        if ($methods !== []) {
            $lines[] = $n.'. Revisas el arreglo y pagas: '.implode('; ', $methods).'.';
        }

        $summary = trim((string) ($tables['summary'] ?? ''));
        if ($summary !== '' && count($lines) < 5) {
            $lines[] = $summary;
        }

        $lines[] = '';
        $lines[] = 'Guía paso a paso: [**Reparación de tablas**]('.$page.').';
        $lines = array_merge($lines, $this->faqRepairContactLines($name, $edy));

        return implode("\n", $lines);
    }

    /** FAQ reparación de neoprenos desde JSON + contacto config. */
    public function faqRepairWetsuitsReply(): string
    {
        $doc = $this->document();
        $repairs = is_array($doc['repairs'] ?? null) ? $doc['repairs'] : [];
        $suits = is_array($repairs['wetsuits'] ?? null) ? $repairs['wetsuits'] : [];
        if ($suits === []) {
            return '';
        }

        $willy = config('services.repair.willy', []);
        $fallback = trim((string) ($suits['provider_name_fallback'] ?? 'Willy'));
        $name = trim((string) ($willy['name'] ?? '')) !== '' ? trim((string) $willy['name']) : $fallback;
        $page = trim((string) ($suits['page_path'] ?? '/servicios/reparacion-neoprenos'));

        $lines = [
            '**Reparación de neoprenos** (servicio de **'.$name.'** en el club):',
            '',
        ];

        $n = 1;
        foreach ($this->stringList($suits['client_does'] ?? null) as $item) {
            $lines[] = $n.'. '.$item;
            $n++;
        }
        $sla = trim((string) ($suits['sla_note'] ?? ''));
        if ($sla !== '') {
            $lines[] = '- Plazos: '.$sla;
        }

        $lines[] = '';
        $lines[] = 'Detalle del servicio: [**Reparación de neoprenos**]('.$page.').';
        $lines = array_merge($lines, $this->faqRepairContactLines($name, $willy));

        if (AcademyContact::whatsappDisplay() !== '') {
            $lines[] = '- Escuela (WhatsApp general): disponible con el botón del chat; no citar el número en texto.';
        }

        return implode("\n", $lines);
    }

    /** FAQ guía surfskate desde JSON. */
    public function faqSurfskateGuideReply(): string
    {
        $doc = $this->document();
        $guide = is_array($doc['surfskate_guide'] ?? null) ? $doc['surfskate_guide'] : [];
        if ($guide === []) {
            return '';
        }

        $brand = trim((string) ($guide['brand_reference'] ?? 'YOW Meraki'));
        $page = trim((string) ($guide['page_path'] ?? '/servicios/surf-skate/guia-equipamiento'));
        $classes = trim((string) ($guide['classes_page_path'] ?? '/servicios/surf-skate'));

        $lines = [
            '**Guía de surfskate · altura y peso** (referencia '.$brand.'):',
            '',
            'Lo que más importa es la **distancia entre ejes (wheelbase)**, no solo la longitud total de la tabla.',
            '',
            '**Tabla rápida orientativa:**',
        ];

        foreach (is_array($guide['selection_table'] ?? null) ? $guide['selection_table'] : [] as $row) {
            if (! is_array($row)) {
                continue;
            }
            $height = trim((string) ($row['height'] ?? ''));
            $weight = trim((string) ($row['weight'] ?? ''));
            $length = trim((string) ($row['length'] ?? ''));
            $wheelbase = trim((string) ($row['wheelbase'] ?? ''));
            $examples = trim((string) ($row['examples'] ?? ''));
            if ($height === '') {
                continue;
            }
            $lines[] = '- **'.$height.' / '.$weight.'** → '.$length.', ejes '.$wheelbase
                .($examples !== '' ? ' (ej. '.$examples.')' : '');
        }

        foreach (is_array($guide['before_choosing'] ?? null) ? $guide['before_choosing'] : [] as $pillar) {
            if (! is_array($pillar)) {
                continue;
            }
            if (trim((string) ($pillar['title'] ?? '')) === 'Peso') {
                $detail = trim((string) ($pillar['detail'] ?? ''));
                if ($detail !== '') {
                    $lines[] = '';
                    $lines[] = $detail;
                }
                break;
            }
        }

        $protection = is_array($guide['protection'] ?? null) ? $guide['protection'] : [];
        if (($protection['available_in_class'] ?? false) === true) {
            $names = [];
            foreach (is_array($protection['items'] ?? null) ? $protection['items'] : [] as $item) {
                if (! is_array($item)) {
                    continue;
                }
                $name = trim((string) ($item['name'] ?? ''));
                if ($name !== '') {
                    $names[] = mb_strtolower($name);
                }
            }
            if ($names !== []) {
                $lines[] = 'En clase puedes **probar el equipo** y usar protección ('.implode(', ', $names).') si quieres.';
            }
        }

        $lines[] = '';
        $lines[] = 'Guía completa: [**Guía surfskate · altura y peso**]('.$page.').';
        $lines[] = 'Clases: [**Surf Skate**]('.$classes.').';

        return implode("\n", $lines);
    }

    /** FAQ fotografía desde JSON. */
    public function faqPhotographyReply(): string
    {
        $doc = $this->document();
        $photo = is_array($doc['photography'] ?? null) ? $doc['photography'] : [];
        if ($photo === []) {
            return '';
        }

        $page = trim((string) ($photo['page_path'] ?? '/servicios/fotos'));
        $video = trim((string) ($photo['related_video_path'] ?? '/servicios/videograbaciones'));
        $cta = trim((string) (is_array($photo['booking'] ?? null) ? ($photo['booking']['cta_path'] ?? '/contacto') : '/contacto'));
        $status = trim((string) ($photo['pricing_status'] ?? ''));

        $lines = [
            '**Fotografía de surf en la Zurriola** (bonos con reportaje incluido):',
            '',
        ];

        foreach (is_array($photo['packages'] ?? null) ? $photo['packages'] : [] as $pack) {
            if (! is_array($pack)) {
                continue;
            }
            $name = trim((string) ($pack['name'] ?? ''));
            if ($name === '') {
                continue;
            }
            $price = $pack['price_eur'] ?? null;
            $per = trim((string) ($pack['per'] ?? ''));
            $rec = (($pack['recommended'] ?? false) === true) ? ' · recomendado' : '';
            $details = $this->stringList($pack['details'] ?? null);
            $chunk = '- **'.$name.'**';
            if (is_numeric($price)) {
                $chunk .= ' — '.$this->formatEuros((float) $price).' €';
                if ($per !== '') {
                    $chunk .= '/'.$per;
                }
            }
            if ($details !== []) {
                $chunk .= ' · '.implode(' · ', array_slice($details, 0, 2));
            }
            $chunk .= $rec;
            $lines[] = $chunk;
        }

        $coverage = trim((string) ($photo['coverage_note'] ?? ''));
        if ($coverage !== '') {
            $lines[] = '';
            $lines[] = '**Importante:** '.$coverage;
        }

        $lines[] = '';
        if ($status === 'unconfirmed') {
            $lines[] = 'Precios según la web (pueden requerir confirmación de la escuela). Reserva por [**contacto**]('.$cta.') (no hay compra online de este servicio).';
        } else {
            $lines[] = 'Reserva por [**contacto**]('.$cta.') (no hay compra online de este servicio).';
        }
        $lines[] = 'Detalle: [**Fotografía en el agua**]('.$page.'). Si quieres vídeo: [**Videograbaciones**]('.$video.').';

        return implode("\n", $lines);
    }

    /**
     * @param  array<string, mixed>  $contact
     * @return list<string>
     */
    private function faqRepairContactLines(string $name, array $contact): array
    {
        $phone = $this->formatRepairContactPhone($contact);
        $email = trim((string) ($contact['email'] ?? ''));
        if ($phone === '' && $email === '') {
            return [];
        }

        $lines = ['', '**Contacto '.$name.':**'];
        if ($phone !== '') {
            $lines[] = '- Teléfono: '.$phone;
        }
        if ($email !== '') {
            $lines[] = '- Email: '.$email;
        }

        return $lines;
    }

    /**
     * @param  array<string, mixed>  $contact
     */
    private function formatRepairContactPhone(array $contact): string
    {
        $display = trim((string) ($contact['phone_display'] ?? ''));
        if ($display !== '') {
            return $display;
        }

        $raw = trim((string) ($contact['phone'] ?? ''));
        if ($raw === '') {
            return '';
        }

        $digits = preg_replace('/\D+/', '', $raw) ?? '';
        if (str_starts_with($digits, '34') && strlen($digits) >= 11) {
            $local = substr($digits, 2, 9);

            return sprintf(
                '+34 %s %s %s',
                substr($local, 0, 3),
                substr($local, 3, 3),
                substr($local, 6, 3),
            );
        }

        return $raw;
    }

    /** @param array<string, mixed> $doc */
    private function compileAcademySection(array $doc): array
    {
        $academy = is_array($doc['academy'] ?? null) ? $doc['academy'] : [];
        if ($academy === []) {
            return [];
        }

        $deposit = (float) config('services.academy.class_reservation_deposit_eur', 30);
        $enrollCutoff = (int) config('services.academy.enroll_cutoff_minutes', 30);
        $cancelCutoff = (int) config('services.academy.cancel_cutoff_hours', 4);
        $capacity = (int) config(
            'services.academy.standard_monitor_capacity',
            (int) ($academy['capacity_per_monitor'] ?? 6),
        );

        $lines = [
            '## Clases de surf (Academia)',
            '- Modalidades: iniciación, intermedio, avanzado; grupal, particular, semanal (y calendario VIP para socios VIP).',
            '- Página tarifas: '.trim((string) ($academy['page_path'] ?? '/servicios/surf')).'.',
            '- Duración habitual de marketing: '.(string) ($academy['duration_hours_marketing'] ?? 1.5).' h; incluye tabla y neopreno.',
            '- Punto de encuentro: '.trim((string) ($academy['meeting_point'] ?? '')),
            '- Aforo orientativo: '.$capacity.' alumnos por monitor. '
                .trim((string) ($academy['capacity_note'] ?? '')),
            '',
            '### Tarifario comercial (puede estar pendiente de confirmación oficial)',
        ];

        foreach ($this->privateLessonRows() as $row) {
            $lines[] = sprintf(
                '- Particular %d persona%s: %s€ en total.',
                $row['people'],
                $row['people'] === 1 ? '' : 's',
                $this->formatEuros($row['total_eur']),
            );
        }

        foreach ($academy['group_bonos'] ?? [] as $bono) {
            if (! is_array($bono)) {
                continue;
            }
            $name = trim((string) ($bono['name'] ?? ''));
            $price = (float) ($bono['price_eur'] ?? 0);
            if ($name === '' || $price <= 0) {
                continue;
            }
            $lines[] = sprintf('- %s: %s€.', $name, $this->formatEuros($price));
        }

        foreach ($academy['optional_menus'] ?? [] as $menu) {
            if (! is_array($menu)) {
                continue;
            }
            $name = trim((string) ($menu['name'] ?? ''));
            $price = (float) ($menu['price_eur'] ?? 0);
            if ($name === '' || $price <= 0) {
                continue;
            }
            $lines[] = sprintf('- %s: %s€ por persona.', $name, $this->formatEuros($price));
        }

        $lines[] = '';
        $lines[] = '- Señal de reserva online por tarjeta: máximo '.$this->formatEuros($deposit)
            .'€ (el resto se abona en escuela). '
            .trim((string) ($academy['online_payment_note'] ?? ''));
        $lines[] = '- Cierre de inscripciones online: '.$enrollCutoff.' minutos antes del inicio.';
        $lines[] = '- '.trim((string) ($academy['cancel_student_policy'] ?? ''))
            .' (cutoff actual: '.$cancelCutoff.' h).';
        $lines[] = '- '.trim((string) ($academy['mal_mar_policy'] ?? ''));
        $concha = trim((string) ($academy['la_concha_recommendation'] ?? ''));
        if ($concha !== '') {
            $lines[] = '- Playas: '.$concha;
        }

        foreach ($academy['bono_credit_rules'] ?? [] as $rule) {
            if (! is_array($rule)) {
                continue;
            }
            $text = trim((string) ($rule['text'] ?? ''));
            if ($text !== '') {
                $lines[] = '- Consumo bono: '.$text;
            }
        }
        $lines[] = '';

        return $lines;
    }

    /** @param array<string, mixed> $doc */
    private function compileVipSection(array $doc): array
    {
        $vip = is_array($doc['vip'] ?? null) ? $doc['vip'] : [];
        if ($vip === []) {
            return [];
        }

        return [
            '## VIP y packs web',
            '- '.trim((string) ($vip['non_vip_note'] ?? '')),
            '- El saldo de clases del bono VIP no caduca por fecha; solo se agota por uso.',
            '- Taquillas virtuales VIP (números compartidos): ver sección taquillas.',
            '',
        ];
    }

    /** @param array<string, mixed> $doc */
    private function compileLockersSection(array $doc): array
    {
        $lockers = is_array($doc['lockers'] ?? null) ? $doc['lockers'] : [];
        if ($lockers === []) {
            return [];
        }

        $virtual = is_array($lockers['vip_virtual_lockers'] ?? null) ? $lockers['vip_virtual_lockers'] : [];
        $numbers = $virtual['numbers'] ?? [500, 600];
        $numbersLabel = is_array($numbers)
            ? implode('/', array_map('strval', $numbers))
            : '500/600';

        $lines = [
            '## Taquillas del club (reglas)',
            '- Página: '.trim((string) ($lockers['page_path'] ?? '/taquillas')).'.',
            '- '.trim((string) ($lockers['stacking_note'] ?? '')),
            '- '.trim((string) ($lockers['physical_required_for_plan'] ?? '')),
            '- Taquillas virtuales VIP '.$numbersLabel.':',
        ];

        foreach ($virtual['effects'] ?? [] as $effect) {
            $effect = trim((string) $effect);
            if ($effect !== '') {
                $lines[] = '  - '.$effect;
            }
        }

        $key = is_array($lockers['emergency_key'] ?? null) ? $lockers['emergency_key'] : [];
        if ($key !== []) {
            $lines[] = '- Llave de emergencia: '.trim((string) ($key['note'] ?? ''))
                .' Requiere taquilla física y cuota al día.';
        }
        $lines[] = '- '.trim((string) ($lockers['payment_queue_note'] ?? ''));
        $lines[] = '';

        return $lines;
    }

    /** @param array<string, mixed> $doc */
    private function compileRentalsSection(array $doc): array
    {
        $rentals = is_array($doc['rentals'] ?? null) ? $doc['rentals'] : [];
        if ($rentals === []) {
            return [];
        }

        $deposit = (int) ($rentals['deposit_percent'] ?? 30);
        $days = (int) ($rentals['pending_expires_days'] ?? 7);

        return [
            '## Alquiler de tablas',
            '- '.trim((string) ($rentals['pricing_note'] ?? '')),
            '- Señal de reserva: '.$deposit.'% del precio total; el resto se paga al recoger la tabla.',
            '- Reservas pendientes de pago caducan a los '.$days.' días si no se completa el pago.',
            '- Catálogo y reserva: '.trim((string) ($rentals['page_path'] ?? '/tablas-alquiler')).'.',
            '',
        ];
    }

    /** @param array<string, mixed> $doc */
    private function compileStoreSection(array $doc): array
    {
        $store = is_array($doc['store'] ?? null) ? $doc['store'] : [];
        if ($store === []) {
            return [];
        }

        return [
            '## Tienda',
            '- '.trim((string) ($store['note'] ?? '')),
            '',
        ];
    }

    /** @param array<string, mixed> $doc */
    private function compileRepairsSection(array $doc): array
    {
        $repairs = is_array($doc['repairs'] ?? null) ? $doc['repairs'] : [];
        if ($repairs === []) {
            return [];
        }

        $shared = is_array($repairs['shared'] ?? null) ? $repairs['shared'] : [];
        $edy = config('services.repair.edy', []);
        $willy = config('services.repair.willy', []);
        $tables = is_array($repairs['tables'] ?? null) ? $repairs['tables'] : [];
        $suits = is_array($repairs['wetsuits'] ?? null) ? $repairs['wetsuits'] : [];

        $lines = ['## Reparaciones en el club'];
        if (trim((string) ($shared['audience_base'] ?? '')) !== '') {
            $lines[] = '- '.trim((string) $shared['audience_base']);
        }
        if (($shared['outside_stripe'] ?? false) === true) {
            $lines[] = '- Pago de reparaciones fuera de Stripe (directo al reparador tras validar el trabajo).';
        }
        if (trim((string) ($shared['bot_guidance'] ?? '')) !== '') {
            $lines[] = '- Guía bot: '.trim((string) $shared['bot_guidance']);
        }

        $edyFallback = trim((string) ($tables['provider_name_fallback'] ?? 'Edy Mulder'));
        $edyName = trim((string) ($edy['name'] ?? '')) !== '' ? trim((string) $edy['name']) : $edyFallback;
        $lines = array_merge($lines, $this->compileRepairFlowBlock(
            label: 'Tablas',
            providerName: $edyName,
            block: $tables,
            defaultPage: '/servicios',
            contactEmail: trim((string) ($edy['email'] ?? '')),
        ));

        $willyFallback = trim((string) ($suits['provider_name_fallback'] ?? 'Willy'));
        $willyName = trim((string) ($willy['name'] ?? '')) !== '' ? trim((string) $willy['name']) : $willyFallback;
        $lines = array_merge($lines, $this->compileRepairFlowBlock(
            label: 'Neoprenos',
            providerName: $willyName,
            block: $suits,
            defaultPage: '/servicios/reparacion-neoprenos',
            contactEmail: trim((string) ($willy['email'] ?? '')),
        ));

        $lines[] = '';

        return $lines;
    }

    /**
     * @param  array<string, mixed>  $block
     * @return list<string>
     */
    private function compileRepairFlowBlock(
        string $label,
        string $providerName,
        array $block,
        string $defaultPage,
        string $contactEmail,
    ): array {
        if ($block === []) {
            return [];
        }

        $lines = [];
        $page = trim((string) ($block['page_path'] ?? $defaultPage));
        $summary = trim((string) ($block['summary'] ?? ''));
        $role = trim((string) ($block['provider_role'] ?? ''));
        $audience = trim((string) ($block['audience'] ?? ''));
        $sla = trim((string) ($block['sla_note'] ?? ''));

        $lines[] = '### '.$label.' ('.$providerName.')';
        if ($summary !== '') {
            $lines[] = '- Resumen: '.$summary;
        }
        if ($role !== '') {
            $lines[] = '- Rol del proveedor: '.$role;
        }
        if ($audience !== '') {
            $lines[] = '- Quién lo usa: '.$audience;
        }

        $stepLines = $this->formatRepairSteps($block['steps'] ?? []);
        if ($stepLines !== '') {
            $lines[] = '- Pasos: '.$stepLines;
        }

        $clientDoes = $this->stringList($block['client_does'] ?? null);
        if ($clientDoes !== []) {
            $lines[] = '- El cliente hace: '.implode('; ', $clientDoes).'.';
        }

        $providerDoes = $this->stringList($block['provider_does'] ?? null);
        if ($providerDoes !== []) {
            $lines[] = '- '.$providerName.' hace: '.implode('; ', $providerDoes).'.';
        }

        $payment = is_array($block['payment'] ?? null) ? $block['payment'] : [];
        $payMethods = $this->stringList($payment['methods'] ?? null);
        if ($payMethods !== []) {
            $when = trim((string) ($payment['when'] ?? ''));
            $payNote = trim((string) ($payment['note'] ?? ''));
            $payLine = '- Pago: '.implode('; ', $payMethods);
            if ($when !== '') {
                $payLine .= ' ('.$when.')';
            }
            if ($payNote !== '') {
                $payLine .= '. '.$payNote;
            }
            $lines[] = $payLine;
        }

        if ($sla !== '') {
            $lines[] = '- Plazos: '.$sla;
        }
        if ($page !== '') {
            $lines[] = '- Guía: '.$page.'.';
        }
        if ($contactEmail !== '') {
            $lines[] = '- Contacto reparación '.$label.': '.$contactEmail;
        }

        return $lines;
    }

    /**
     * @param  mixed  $steps
     */
    private function formatRepairSteps(mixed $steps): string
    {
        if (! is_array($steps) || $steps === []) {
            return '';
        }

        $parts = [];
        foreach ($steps as $step) {
            if (is_string($step) && trim($step) !== '') {
                $parts[] = trim($step);
                continue;
            }
            if (! is_array($step)) {
                continue;
            }
            $n = (int) ($step['n'] ?? 0);
            $title = trim((string) ($step['title'] ?? ''));
            $detail = trim((string) ($step['detail'] ?? ''));
            $actor = trim((string) ($step['actor'] ?? ''));
            if ($title === '') {
                continue;
            }
            $prefix = $n > 0 ? $n.'. ' : '';
            $actorLabel = match ($actor) {
                'client' => 'cliente',
                'provider' => 'proveedor',
                default => '',
            };
            $chunk = $prefix.$title;
            if ($actorLabel !== '') {
                $chunk .= ' ['.$actorLabel.']';
            }
            if ($detail !== '') {
                $chunk .= ': '.$detail;
            }
            $parts[] = $chunk;
        }

        return implode(' | ', $parts);
    }

    /**
     * @return list<string>
     */
    private function stringList(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $out = [];
        foreach ($value as $item) {
            $text = trim((string) $item);
            if ($text !== '') {
                $out[] = $text;
            }
        }

        return $out;
    }

    /** @param array<string, mixed> $doc */
    private function compileSurfskateGuideSection(array $doc): array
    {
        $guide = is_array($doc['surfskate_guide'] ?? null) ? $doc['surfskate_guide'] : [];
        if ($guide === []) {
            return [];
        }

        $lines = ['## Guía surfskate (equipamiento)'];
        $summary = trim((string) ($guide['summary'] ?? ''));
        if ($summary !== '') {
            $lines[] = '- Resumen: '.$summary;
        }
        $brand = trim((string) ($guide['brand_reference'] ?? ''));
        if ($brand !== '') {
            $lines[] = '- Referencia: '.$brand;
        }
        $page = trim((string) ($guide['page_path'] ?? '/servicios/surf-skate/guia-equipamiento'));
        $classes = trim((string) ($guide['classes_page_path'] ?? '/servicios/surf-skate'));
        if ($page !== '') {
            $lines[] = '- Guía: '.$page;
        }
        if ($classes !== '') {
            $lines[] = '- Clases de surfskate: '.$classes;
        }

        $before = is_array($guide['before_choosing'] ?? null) ? $guide['before_choosing'] : [];
        $beforeParts = [];
        foreach ($before as $item) {
            if (! is_array($item)) {
                continue;
            }
            $title = trim((string) ($item['title'] ?? ''));
            $detail = trim((string) ($item['detail'] ?? ''));
            if ($title === '') {
                continue;
            }
            $beforeParts[] = $title.($detail !== '' ? ': '.$detail : '');
        }
        if ($beforeParts !== []) {
            $lines[] = '- Antes de elegir: '.implode(' | ', $beforeParts);
        }

        $factors = is_array($guide['board_factors'] ?? null) ? $guide['board_factors'] : [];
        foreach ($factors as $factor) {
            if (! is_array($factor)) {
                continue;
            }
            $title = trim((string) ($factor['title'] ?? ''));
            if ($title === '') {
                continue;
            }
            $detail = trim((string) ($factor['detail'] ?? ''));
            $notes = $this->stringList($factor['notes'] ?? null);
            $chunk = '- Factor '.$title;
            if ($detail !== '') {
                $chunk .= ': '.$detail;
            }
            if ($notes !== []) {
                $chunk .= ' — '.implode('; ', $notes);
            }
            $lines[] = $chunk;
        }

        $profiles = is_array($guide['profiles'] ?? null) ? $guide['profiles'] : [];
        foreach ($profiles as $profile) {
            if (! is_array($profile)) {
                continue;
            }
            $label = trim((string) ($profile['label'] ?? ''));
            if ($label === '') {
                continue;
            }
            $common = (($profile['most_common'] ?? false) === true) ? ' [más habitual]' : '';
            $lines[] = '- Perfil '.$label.$common.': '
                .trim((string) ($profile['height'] ?? '')).' / '
                .trim((string) ($profile['weight'] ?? ''))
                .'; wheelbase '.trim((string) ($profile['wheelbase'] ?? ''))
                .'; · modelos '.trim((string) ($profile['models'] ?? ''))
                .'; · '.trim((string) ($profile['style'] ?? ''));
        }

        $table = is_array($guide['selection_table'] ?? null) ? $guide['selection_table'] : [];
        if ($table !== []) {
            $rows = [];
            foreach ($table as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $rows[] = trim((string) ($row['height'] ?? '')).' / '
                    .trim((string) ($row['weight'] ?? ''))
                    .' → longitud '.trim((string) ($row['length'] ?? ''))
                    .', ejes '.trim((string) ($row['wheelbase'] ?? ''))
                    .' (ej. '.trim((string) ($row['examples'] ?? '')).')';
            }
            if ($rows !== []) {
                $lines[] = '- Tabla rápida: '.implode(' | ', $rows);
            }
        }

        $mistake = is_array($guide['common_mistake'] ?? null) ? $guide['common_mistake'] : [];
        if ($mistake !== []) {
            $lines[] = '- Error común: '.trim((string) ($mistake['title'] ?? '')).' — '
                .trim((string) ($mistake['detail'] ?? ''));
            $examples = is_array($mistake['examples'] ?? null) ? $mistake['examples'] : [];
            foreach ($examples as $ex) {
                if (! is_array($ex)) {
                    continue;
                }
                $lines[] = '- Ejemplo: '.trim((string) ($ex['model'] ?? ''))
                    .' ('.trim((string) ($ex['length'] ?? '')).', ejes '.trim((string) ($ex['wheelbase'] ?? '')).'): '
                    .trim((string) ($ex['for_whom'] ?? ''));
            }
        }

        $client = $this->stringList($guide['client_should'] ?? null);
        if ($client !== []) {
            $lines[] = '- El cliente debería: '.implode('; ', $client).'.';
        }
        $school = $this->stringList($guide['school_does'] ?? null);
        if ($school !== []) {
            $lines[] = '- En S4 / clase: '.implode('; ', $school).'.';
        }

        $protection = is_array($guide['protection'] ?? null) ? $guide['protection'] : [];
        if ($protection !== []) {
            $items = is_array($protection['items'] ?? null) ? $protection['items'] : [];
            $names = [];
            foreach ($items as $item) {
                if (! is_array($item)) {
                    continue;
                }
                $name = trim((string) ($item['name'] ?? ''));
                if ($name === '') {
                    continue;
                }
                if (($item['optional'] ?? false) === true) {
                    $name .= ' (opcional)';
                }
                $names[] = $name;
            }
            if ($names !== []) {
                $mandatory = (($protection['mandatory'] ?? false) === true) ? 'obligatoria' : 'opcional en clase';
                $lines[] = '- Protección ('.$mandatory.'): '.implode(', ', $names).'.';
            }
            $tip = trim((string) ($protection['tip'] ?? ''));
            if ($tip !== '') {
                $lines[] = '- Tip protección: '.$tip;
            }
        }

        $bot = trim((string) ($guide['bot_guidance'] ?? ''));
        if ($bot !== '') {
            $lines[] = '- Guía bot: '.$bot;
        }
        $lines[] = '';

        return $lines;
    }

    /** @param array<string, mixed> $doc */
    private function compilePhotographySection(array $doc): array
    {
        $photo = is_array($doc['photography'] ?? null) ? $doc['photography'] : [];
        if ($photo === []) {
            return [];
        }

        $lines = ['## Fotografía de surf'];
        $summary = trim((string) ($photo['summary'] ?? ''));
        if ($summary !== '') {
            $lines[] = '- Resumen: '.$summary;
        }
        $location = trim((string) ($photo['location'] ?? ''));
        if ($location !== '') {
            $lines[] = '- Lugar: '.$location;
        }
        $page = trim((string) ($photo['page_path'] ?? '/servicios/fotos'));
        if ($page !== '') {
            $lines[] = '- Página: '.$page;
        }
        $video = trim((string) ($photo['related_video_path'] ?? ''));
        if ($video !== '') {
            $lines[] = '- Relacionado (vídeo): '.$video;
        }

        $status = trim((string) ($photo['pricing_status'] ?? ''));
        if ($status !== '') {
            $lines[] = '- Estado tarifas fotos: '.$status;
        }

        $booking = is_array($photo['booking'] ?? null) ? $photo['booking'] : [];
        if ($booking !== []) {
            $how = trim((string) ($booking['how'] ?? ''));
            $online = (($booking['online_checkout'] ?? false) === true) ? 'sí' : 'no';
            $cta = trim((string) ($booking['cta_path'] ?? '/contacto'));
            $lines[] = '- Reserva online checkout: '.$online.($how !== '' ? ' — '.$how : '').' ('.$cta.').';
        }

        $coverage = trim((string) ($photo['coverage_note'] ?? ''));
        if ($coverage !== '') {
            $lines[] = '- Cobertura: '.$coverage;
        }

        $packages = is_array($photo['packages'] ?? null) ? $photo['packages'] : [];
        foreach ($packages as $pack) {
            if (! is_array($pack)) {
                continue;
            }
            $name = trim((string) ($pack['name'] ?? ''));
            if ($name === '') {
                continue;
            }
            $price = $pack['price_eur'] ?? null;
            $per = trim((string) ($pack['per'] ?? ''));
            $rec = (($pack['recommended'] ?? false) === true) ? ' [recomendado]' : '';
            $details = $this->stringList($pack['details'] ?? null);
            $desc = trim((string) ($pack['description'] ?? ''));
            $chunk = '- Pack '.$name.$rec.': ';
            if (is_numeric($price)) {
                $chunk .= (string) $price.' €';
                if ($per !== '') {
                    $chunk .= ' / '.$per;
                }
            }
            if ($details !== []) {
                $chunk .= ' — '.implode('; ', $details);
            }
            if ($desc !== '') {
                $chunk .= '. '.$desc;
            }
            $lines[] = $chunk;
        }

        $client = $this->stringList($photo['client_should'] ?? null);
        if ($client !== []) {
            $lines[] = '- El cliente debería: '.implode('; ', $client).'.';
        }
        $school = $this->stringList($photo['school_does'] ?? null);
        if ($school !== []) {
            $lines[] = '- La escuela hace: '.implode('; ', $school).'.';
        }
        $bot = trim((string) ($photo['bot_guidance'] ?? ''));
        if ($bot !== '') {
            $lines[] = '- Guía bot: '.$bot;
        }
        $lines[] = '';

        return $lines;
    }

    /** @param array<string, mixed> $doc */
    private function compileSecondHandAuctions(array $doc): array
    {
        $lines = [];
        $sh = is_array($doc['second_hand'] ?? null) ? $doc['second_hand'] : [];
        if ($sh !== []) {
            $lines[] = '## Segunda mano';
            $lines[] = '- '.trim((string) ($sh['note'] ?? ''));
            $lines[] = '- Página: '.trim((string) ($sh['page_path'] ?? '/segunda-mano')).'.';
            $lines[] = '';
        }

        $au = is_array($doc['auctions'] ?? null) ? $doc['auctions'] : [];
        if ($au !== []) {
            $lines[] = '## Subastas';
            $lines[] = '- Acceso: '.trim((string) ($au['access'] ?? '')).'.';
            $lines[] = '- Pago: '.trim((string) ($au['payment'] ?? '')).'.';
            $lines[] = '- Página: '.trim((string) ($au['page_path'] ?? '/subastas')).'.';
            $lines[] = '';
        }

        return $lines;
    }

    /** @param array<string, mixed> $doc */
    private function compileEdgeCases(array $doc): array
    {
        $cases = $doc['edge_cases'] ?? [];
        if (! is_array($cases) || $cases === []) {
            return [];
        }

        $lines = [
            '## Situaciones frecuentes (comportamiento real de la app)',
            '- Usa estas guías cuando el usuario describa un problema concreto; no inventes reglas distintas.',
        ];

        foreach ($cases as $case) {
            if (! is_array($case)) {
                continue;
            }
            $title = trim((string) ($case['title'] ?? ''));
            $guidance = trim((string) ($case['bot_guidance'] ?? ''));
            if ($title === '' || $guidance === '') {
                continue;
            }
            $lines[] = '- **'.$title.'**: '.$guidance;
            if (! empty($case['options']) && is_array($case['options'])) {
                foreach ($case['options'] as $opt) {
                    $opt = trim((string) $opt);
                    if ($opt !== '') {
                        $lines[] = '  · '.$opt;
                    }
                }
            }
        }
        $lines[] = '';

        return $lines;
    }

    /** @param array<string, mixed> $doc */
    private function compileWhatsappPlaybook(array $doc): array
    {
        $play = is_array($doc['whatsapp_playbook'] ?? null) ? $doc['whatsapp_playbook'] : [];
        if ($play === []) {
            return [];
        }

        $lines = ['## WhatsApp (cuándo ofrecerlo)'];
        $lines[] = '- NUNCA cites el número de teléfono ni un enlace wa.me. El botón de WhatsApp del chat solo aparece tras derivación a humano.';
        $lines[] = '- No digas que el botón está visible desde el inicio del chat.';

        foreach ($play['when_to_offer'] ?? [] as $when) {
            $when = trim((string) $when);
            if ($when !== '') {
                $lines[] = '- Ofrecer WA: '.$when;
            }
        }
        foreach ($play['when_not_to_offer_first'] ?? [] as $when) {
            $when = trim((string) $when);
            if ($when !== '') {
                $lines[] = '- No ofrecer WA primero: '.$when;
            }
        }
        $escalation = trim((string) ($play['escalation_note'] ?? ''));
        if ($escalation !== '') {
            $lines[] = '- '.$escalation;
        }
        $lines[] = '';

        return $lines;
    }

    /** @param array<string, mixed> $doc */
    private function compileEscalation(array $doc): array
    {
        $esc = is_array($doc['escalation'] ?? null) ? $doc['escalation'] : [];
        if ($esc === []) {
            return [];
        }

        $lines = ['## No improvisar'];
        foreach ($esc['never_guess'] ?? [] as $item) {
            $item = trim((string) $item);
            if ($item !== '') {
                $lines[] = '- No inventar: '.$item;
            }
        }
        $token = trim((string) ($esc['trigger_token'] ?? '[TRIGGER_FALLBACK]'));
        $lines[] = '- Si no hay certeza en el contexto: responde solo '.$token.'.';
        $lines[] = '';

        return $lines;
    }

    private function formatEuros(float $amount): string
    {
        return rtrim(rtrim(number_format($amount, 2, ',', '.'), '0'), ',');
    }
}
