<?php

declare(strict_types=1);

/**
 * Intents FAQ del chatbot — preguntas que los usuarios suelen hacer.
 *
 * Cómo ampliar:
 * 1. Añade un bloque en `intents` con `patterns` (regex, consulta ya normalizada).
 * 2. `sample_questions` documenta variantes reales (también ayuda a Gemini vía S4BusinessContextService).
 * 3. `handler`:
 *    - `static` + `response` → texto fijo.
 *    - `dynamic:locker_status` / `dynamic:bono_balance` → datos en vivo del usuario logueado.
 * 4. Si `requires_auth` es true, anónimos reciben `guest_response`.
 *
 * Fase 2 (opcional): tabla `chatbot_faq_entries` + admin para editar sin deploy.
 *
 * @return array{intents: list<array{
 *     key: string,
 *     title: string,
 *     sample_questions: list<string>,
 *     patterns: list<string>,
 *     handler: string,
 *     response?: string,
 *     requires_auth?: bool,
 *     guest_response?: string,
 *     priority?: int
 * }>}
 */
return [
    'intents' => [
        [
            'key' => 'account.locker_status',
            'title' => 'Vencimiento y días restantes de taquilla',
            'sample_questions' => [
                '¿Hasta cuándo tengo taquilla?',
                '¿Cuántos días me queda la taquilla?',
                '¿Cuándo caduca mi taquilla?',
                '¿Hasta qué fecha tengo el casillero?',
                '¿Me queda tiempo de taquilla?',
            ],
            'patterns' => [
                '/\b(hasta\s+cuando|hasta\s+que\s+dia|cuando\s+(caduca|vence)|fecha\s+de\s+vencimiento)\b.*\b(taquilla|taquillas|casillero|locker)\b/u',
                '/\b(taquilla|taquillas|casillero)\b.*\b(hasta\s+cuando|cuando\s+(caduca|vence)|vencimiento|caducidad)\b/u',
                '/\b(cuant\w*|cuanto)\s+(tiempo|dias?)\s+(me\s+)?(queda|restante|tengo)\b.*\b(taquilla|taquillas|casillero)\b/u',
                '/\b(taquilla|taquillas|casillero)\b.*\b(cuant\w*|cuanto)\s+(dias?|tiempo)\s+(me\s+)?(queda|restante)\b/u',
                '/\b(hasta\s+cuando|cuanto\s+me\s+queda)\b.*\b(tengo|tienes)\b.*\b(taquilla|casillero)\b/u',
            ],
            'handler' => 'dynamic:locker_status',
            'requires_auth' => true,
            'guest_response' => 'Para saber **hasta cuándo tienes taquilla** y los **días que te quedan**, entra en la web con tu usuario y mira **Mis reservas** → **Taquilla**, o pregúntame de nuevo estando logueado. Si aún no tienes taquilla, mira los planes en [**Taquillas**](/taquillas).',
            'priority' => 25,
        ],
        [
            'key' => 'account.locker_number',
            'title' => 'Número de taquilla asignado',
            'sample_questions' => [
                '¿Qué número de taquilla tengo?',
                '¿Cuál es mi taquilla?',
                '¿En qué casillero estoy?',
            ],
            'patterns' => [
                '/\b(que|cual)\s+(numero|n[uú]mero)\s+(de\s+)?(taquilla|casillero)\s+(tengo|tienes|es)\b/u',
                '/\b(mi|mio)\s+(numero|n[uú]mero)\s+(de\s+)?(taquilla|casillero)\b/u',
                '/\b(taquilla|casillero)\b.*\b(que\s+numero|numero\s+tengo|cual\s+es)\b/u',
            ],
            'handler' => 'dynamic:locker_status',
            'requires_auth' => true,
            'guest_response' => 'Para ver tu **número de taquilla**, entra con tu usuario en la web (**Mis reservas**). Si no tienes cuenta, regístrate o escríbenos por **WhatsApp**.',
            'priority' => 24,
        ],
        [
            'key' => 'account.bono_balance',
            'title' => 'Clases restantes del bono',
            'sample_questions' => [
                '¿Cuántas clases me quedan del bono?',
                '¿Cuánto bono me queda?',
                '¿Qué saldo tengo en el bono?',
            ],
            'patterns' => [
                '/\b(cuant\w*|cuanto)\s+(clases?|creditos?)\s+(me\s+)?(queda|restante|tengo)\b.*\b(bono|bonos|pack)\b/u',
                '/\b(bono|bonos|pack)\b.*\b(cuant\w*|cuanto)\s+(clases?|creditos?)\s+(me\s+)?(queda|restante|tengo)\b/u',
                '/\b(saldo|clases?\s+restantes)\b.*\b(bono|bonos)\b/u',
                '/\b(bono|bonos)\b.*\b(saldo|clases?\s+restantes)\b/u',
            ],
            'handler' => 'dynamic:bono_balance',
            'requires_auth' => true,
            'guest_response' => 'Para ver **cuántas clases te quedan del bono**, entra con tu usuario en **Mis reservas** → **Bonos**, o pregúntame de nuevo estando logueado.',
            'priority' => 23,
        ],
        [
            'key' => 'locker.how_to_renew',
            'title' => 'Cómo renovar o ampliar taquilla',
            'sample_questions' => [
                '¿Cómo renuevo la taquilla?',
                '¿Puedo ampliar mi plan de taquilla?',
                '¿Cómo pago la cuota de taquilla?',
            ],
            'patterns' => [
                '/\b(renov|amplia|extiend|prorroga)\w*\b.*\b(taquilla|taquillas|cuota|casillero)\b/u',
                '/\b(taquilla|taquillas|cuota)\b.*\b(renov|amplia|extiend|prorroga|pagar|pago)\w*\b/u',
                '/\b(como\s+(renovo|pago|amplio))\b.*\b(taquilla|cuota)\b/u',
            ],
            'handler' => 'static',
            'response' => 'Para **renovar o ampliar tu taquilla**, entra en **Taquillas** en la web, elige el plan y completa el pago (tarjeta o transferencia según el flujo). '
                .'Si ya tienes periodo activo, los días **se apilan** al final. '
                .'¿Dudas con tu caso concreto? **WhatsApp** o revisa **Mis reservas** con tu usuario.',
            'priority' => 12,
        ],
    ],
];
