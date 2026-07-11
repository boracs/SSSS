<?php

declare(strict_types=1);

namespace App\Services\Chatbot;

use App\DTOs\Chatbot\ChatbotReplyDto;

/**
 * FAQ para alumnos y clientes de la escuela (surf, clases, bonos, alquileres).
 * Respuestas prácticas en lenguaje cotidiano — sin jerga técnica ni de programación.
 */
final class ChatbotService
{
    private const CONTEXT_FALLBACK = 'fallback';

    /**
     * @var list<array{pattern: string, context: string, response: string}>
     */
    private const PATTERNS = [
        // ── Saludo ────────────────────────────────────────────────────────────
        [
            'pattern' => '/^(hola|buenas|hey|saludos|que\s+tal|help|ayuda|buenos\s+dias|buenas\s+tardes)\b/u',
            'context' => 'general.greeting',
            'response' => '¡Hola! 👋 Soy **Maider**, de **San Sebastian Surf School**. '
                .'Te ayudo con **reservar clases**, **bonos**, **alquiler de tablas**, **cancelaciones** y dudas del día a día. '
                .'¿Qué necesitas?',
        ],
        [
            'pattern' => '/\b(que\s+puedes|que\s+sabes|en\s+que\s+me\s+ayudas)\b/u',
            'context' => 'general.capabilities',
            'response' => 'Puedo contarte **cómo apuntarte a una clase**, **cómo funciona el bono**, **qué pasa si cancelas**, '
                .'**cómo alquilar una tabla** o **dónde ver tus reservas**. '
                .'Si tu duda es muy concreta (tu nombre, tu hora exacta), escríbenos por **WhatsApp** (botón verde) o entra en la web con tu usuario.',
        ],

        // ── Reservar clase ──────────────────────────────────────────────────
        [
            'pattern' => '/\b(inscrib|apunt|reserv|anot)\w*\b.*\b(clase|clases|surf|academia)\b|\b(clase|clases)\b.*\b(como\s+me\s+apunto|como\s+reservo|primera\s+vez)\b|\b(quiero|me\s+gustaria)\s+(surf|surfear|una\s+clase)\b/u',
            'context' => 'classes.how_to_book',
            'response' => '**Para reservar una clase:**'."\n\n"
                .'1. Entra en la web → menú **Academia**.'."\n"
                .'2. Elige **día y hora** en el calendario.'."\n"
                .'3. Indica cuántas personas sois si es grupal.'."\n"
                .'4. Paga la **señal con tarjeta** o usa tu **bono** si ya eres socio.'."\n\n"
                .'**Consejo:** en verano conviene reservar **con unos días de antelación**. '
                .'Si no ves hueco, prueba otra hora o escríbenos por **WhatsApp**.',
        ],
        [
            'pattern' => '/\b(primera\s+vez|principiante|nunca\s+he\s+surf|empezar|nivel\s+iniciacion|nuevo\s+en\s+surf)\b/u',
            'context' => 'classes.beginner',
            'response' => '¡Bienvenido! 🏄 En **iniciación** te enseñamos desde cero: seguridad, coger olas de espuma y disfrutar en **Zurriola**. '
                .'Reserva una **clase grupal** desde **Academia** — no hace falta traer tabla al principio, te orientamos con el material. '
                .'Lleva **bañador**, **toalla** y muchas ganas. Si tienes dudas médicas o de edad mínima, pregúntanos por **WhatsApp**.',
        ],
        [
            'pattern' => '/\b(cupo|plazas?|disponibilidad|hay\s+(sitio|plaza|hueco)|lleno|completo|aforo)\b.*\b(clase|clases)\b|\b(clase|clases)\b.*\b(hay\s+plaza|quedan|disponib|lleno)\b/u',
            'context' => 'classes.capacity',
            'response' => 'Cada clase tiene **plazas limitadas** por seguridad. En la web ves en **tiempo real** si quedan sitios. '
                .'Si pone **completo**, esa sesión ya está llena — elige **otro horario** o **otro día**. '
                .'A veces alguien cancela al último momento; si estás muy interesado, avísanos por **WhatsApp** y miramos opciones.',
        ],
        [
            'pattern' => '/\b(no\s+me\s+deja|error|falla|no\s+puedo)\b.*\b(reserv|apunt|inscrib)\w*\b|\b(reserv|apunt)\w*\b.*\b(no\s+me\s+deja|falla|lleno|completo)\b/u',
            'context' => 'classes.booking_failed',
            'response' => 'Si la web no te deja completar la reserva, lo más habitual es que **justo en ese momento se llenó la clase** (otra persona reservó antes). '
                .'**Prueba otra hora** o vuelve a intentarlo más tarde. '
                .'Si el problema continúa, mándanos captura por **WhatsApp** y te ayudamos.',
        ],
        [
            'pattern' => '/\b(particular|clase\s+particular|privad|1\s+a\s+1|solo\s+para\s+mi)\b/u',
            'context' => 'classes.private',
            'response' => 'La **clase particular** es para ti (o tu grupo cerrado) con monitor dedicado. '
                .'Resérvala desde **Academia** o pídela por **WhatsApp** con fecha y hora preferidas. '
                .'Si pagas con **bono**, una particular cuenta como **2 clases** del pack.',
        ],
        [
            'pattern' => '/\b(grupo|grupos?)\s*(de\s*)?(7|siete|8|ocho|9|nueve|10|diez|11|once|12|doce)\b|\b(7|siete)\s*(personas|amigos|gente)\b/u',
            'context' => 'classes.large_group',
            'response' => 'Para grupos **grandes (7 o más personas)** necesitamos **organizar dos monitores** por seguridad. '
                .'Reserva con **antelación** y escríbenos por **WhatsApp** con: **fecha**, **hora** y **número exacto** de participantes. '
                .'Así confirmamos que podemos atenderos bien.',
        ],
        [
            'pattern' => '/\b(corte|l[ií]mite|hasta\s+cuando|ultima\s+hora)\b.*\b(apunt|inscrib|reserv)\w*\b|\b(apuntarse|inscribirse)\b.*\b(antes|tarde|minutos)\b/u',
            'context' => 'classes.deadline',
            'response' => 'Por organización del equipo, **online cerramos inscripciones poco antes** de que empiece la clase. '
                .'Si llegas tarde, **llama o WhatsApp** — a veces podemos encajarte si queda sitio. '
                .'Lo ideal: reservar **con tiempo**, sobre todo en temporada alta.',
        ],
        [
            'pattern' => '/\b(que\s+llevo|que\s+necesito|material|neopreno|traje|toalla|crema)\b/u',
            'context' => 'classes.what_to_bring',
            'response' => '**Qué llevar a clase:**'."\n\n"
                .'- **Bañador**'."\n"
                .'- **Toalla**'."\n"
                .'- **Crema solar**'."\n"
                .'- Ropa cómoda para antes/después'."\n\n"
                .'El **neopreno y la tabla** suelen facilitarlos la escuela según la sesión. '
                .'Si tienes traje propio, dímelo al reservar. Para alquileres largos, mira **Alquiler de tablas** en la web.',
        ],
        [
            'pattern' => '/\b(donde\s+(nos\s+vemos|quedamos|esta|is)|punto\s+de\s+encuentro|ubicacion|zurriola|playa)\b/u',
            'context' => 'classes.meeting_point',
            'response' => 'Las clases son en la **playa de Zurriola (Donostia)**, junto a nuestras **instalaciones del club**. '
                .'Al reservar verás la hora exacta. Llega **10–15 minutos antes** para equiparte con calma. '
                .'Si es tu primera vez y no encuentras el punto, escríbenos por **WhatsApp** el día de la clase.',
        ],

        // ── Cancelaciones (usuario y escuela) ─────────────────────────────
        [
            'pattern' => '/\b(escuela|vosotros|monitor|club)\b.*\b(cancel|anul|suspend)\w*\b|\b(cancel|anul|suspend)\w*\b.*\b(escuela|clima|tiempo|mar|oleaje|temporal|lluvia|viento)\b|\b(mal\s+tiempo|oleaje\s+fuerte|no\s+hay\s+mar)\b/u',
            'context' => 'classes.school_cancels',
            'response' => 'Si **la escuela cancela** la clase (mar complicado, temporal, seguridad):'."\n\n"
                .'- Te **avisamos** por el contacto que tengamos (WhatsApp, email…).'."\n"
                .'- **Reprogramamos** o te **devolvemos** el importe / las clases del bono, según cómo hayas pagado.'."\n\n"
                .'La seguridad va **siempre primero**. Si tienes duda sobre **tu clase de hoy**, escríbenos ya por **WhatsApp**.',
        ],
        [
            'pattern' => '/\b(yo\s+)?(cancel|anul)\w*\b.*\b(clase|clases|reserva|plaza|inscripci[oó]n)\b|\b(clase|reserva)\b.*\b(cancel|anul)\w*\b|\b(no\s+puedo\s+ir|no\s+voy\s+a\s+poder)\b/u',
            'context' => 'classes.user_cancels',
            'response' => '**Si tú cancelas tu clase:**'."\n\n"
                .'- **Con tiempo** (varias horas antes, según indique la web): normalmente **recuperas la clase en tu bono** o te indicamos la opción de devolución.'."\n"
                .'- **Muy tarde** o **sin avisar**: la plaza se pierde y **puede no devolverse** la clase del bono.'."\n\n"
                .'Cancela desde tu cuenta → **Mis reservas**, o avísanos por **WhatsApp** cuanto antes. Cuanto **más pronto**, mejor.',
        ],
        [
            'pattern' => '/\b(devolv|reembols|me\s+devuel|recupero)\b.*\b(dinero|clase|bono|pago|se[nñ]al)\b|\b(reembolso|devolucion)\b/u',
            'context' => 'classes.refund',
            'response' => 'Depende de **quién cancela** y **con cuánta antelación**:'."\n\n"
                .'- **Tú, con tiempo:** suele devolverse al **bono** o gestionarse el reembolso según cómo pagaste.'."\n"
                .'- **La escuela** (mar malo, etc.): **siempre** te damos solución (nueva fecha o devolución).'."\n"
                .'- **Última hora sin avisar:** puede no aplicarse devolución.'."\n\n"
                .'Para tu caso concreto, mira **Mis reservas** o escríbenos por **WhatsApp**.',
        ],

        // ── Bonos ───────────────────────────────────────────────────────────
        [
            'pattern' => '/\b(bono|bonos|vip|socio|membresia|membres[ií]a|hacerme\s+socio)\b.*\b(que\s+es|como\s+funciona|ventaja|precio|comprar|activar)\b|\b(que\s+es\s+el\s+vip|ser\s+socio)\b/u',
            'context' => 'bono.intro',
            'response' => 'El **bono / socio VIP** es un **pack de clases** con precio mejor que suelto, acceso a **taquilla** en el club y ventajas extra. '
                .'Compras un número de clases y vas **gastándolas** al reservar. '
                .'Mira los packs en **Bonos VIP** en la web o pregúntanos por **WhatsApp** qué encaja contigo.',
        ],
        [
            'pattern' => '/\b(cuantas\s+clases|cuanto\s+gasta|cuantas\s+quita|descuenta|consume)\b.*\b(bono|particular|grupal|grupo)\b|\b(bono)\b.*\b(cuantas\s+clases|gasta)\b/u',
            'context' => 'bono.consumption',
            'response' => '**Cuántas clases gasta tu bono:**'."\n\n"
                .'- **Clase particular** → **2 clases** del bono.'."\n"
                .'- **Grupal** en la que solo hay **una persona** → **2 clases**.'."\n"
                .'- **Grupal normal** (varios apuntados) → **1 clase por persona** reservada.'."\n\n"
                .'En tu cuenta ves **cuántas te quedan** y el **historial** de las que has usado.',
        ],
        [
            'pattern' => '/\b(cuantas\s+me\s+qued|saldo|clases\s+restantes|me\s+queda)\b.*\b(bono|pack)\b|\b(bono)\b.*\b(cuantas|quedan|saldo)\b/u',
            'context' => 'bono.balance',
            'response' => 'Para ver **cuántas clases te quedan**, entra en la web con tu usuario → **Mis reservas** o **Bonos VIP**. '
                .'Ahí aparece tu **saldo actual** y las clases que ya has disfrutado. '
                .'Si no cuadra algo, escríbenos por **WhatsApp** y lo revisamos contigo.',
        ],
        [
            'pattern' => '/\b(historial|clases\s+usadas|donde\s+veo)\b.*\b(bono|clases)\b/u',
            'context' => 'bono.history',
            'response' => 'En **Bonos VIP** o **Mis reservas** (con tu usuario iniciado) ves **todas las clases que has ido** y las que has reservado. '
                .'Así controlas fácilmente **cuánto te queda** del pack.',
        ],

        // ── Alquiler tablas ─────────────────────────────────────────────────
        [
            'pattern' => '/\b(alquil|rent)\w*\b.*\b(tabla|tablas|surfboard)\b|\b(tabla|tablas)\b.*\b(alquil|como\s+alquilo)\w*\b|\b(quiero\s+una\s+tabla)\b/u',
            'context' => 'rental.howto',
            'response' => '**Para alquilar una tabla:**'."\n\n"
                .'1. Menú **Alquiler de tablas**.'."\n"
                .'2. Elige **modelo** (soft, hard, tu talla…).'."\n"
                .'3. Marca **recogida y devolución** en el calendario.'."\n"
                .'4. Paga la **señal** online y listo.'."\n\n"
                .'Recoges en el **club** en el horario acordado. Si la fecha que quieres está ocupada, prueba **otro día** o **otra tabla**.',
        ],
        [
            'pattern' => '/\b(alquil|tabla|tablas)\b.*\b(precio|precios|cuesta|cuanto|€|euros|tarifa)\b|\b(cuanto\s+cuesta)\b.*\b(alquil|tabla)\b/u',
            'context' => 'rental.pricing',
            'response' => 'El precio depende de **cuánto tiempo** alquilas (horas, día, varios días…) y del **tipo de tabla**. '
                .'En la web, al elegir fechas, te sale el **precio total** y la **señal** antes de pagar — **sin sorpresas**. '
                .'Cada tabla tiene su tarifa en la ficha del **Alquiler de tablas**.',
        ],
        [
            'pattern' => '/\b(alquil|tabla)\b.*\b(disponib|libre|ocupad|hay)\w*\b|\b(hay\s+tabla|esta\s+libre)\b/u',
            'context' => 'rental.availability',
            'response' => 'En el calendario de alquiler ves qué días están **libres**. Si un día sale **ocupado**, esa tabla ya está reservada. '
                .'Prueba **otras fechas** o un **modelo parecido**. Si necesitas ayuda eligiendo tabla según tu nivel, pregúntanos por **WhatsApp**.',
        ],
        [
            'pattern' => '/\b(se[nñ]al|dep[oó]sito|fianza|adelanto)\b.*\b(alquil|tabla)\b/u',
            'context' => 'rental.deposit',
            'response' => 'Al reservar pagas una **señal** (parte del total) para **guardar la tabla** en esas fechas. '
                .'El resto lo ves en la web antes de confirmar. Pagas con **tarjeta** de forma segura. '
                .'Si no completas el pago a tiempo, la reserva **puede caducar** y la tabla queda libre para otros.',
        ],

        // ── Cuenta y VIP ────────────────────────────────────────────────────
        [
            'pattern' => '/\b(mis\s+reservas|mi\s+cuenta|entrar|login|registr|contrase[nñ]a|usuario)\b/u',
            'context' => 'account.access',
            'response' => '**Mis reservas** es tu zona personal: ahí ves **clases**, **alquileres** y **bono**. '
                .'Si no tienes cuenta, **regístrate** en la web (arriba a la derecha). '
                .'¿Olvidaste la contraseña? Usa **“¿Has olvidado tu contraseña?”** en el login o escríbenos por **WhatsApp**.',
        ],
        [
            'pattern' => '/\b(vip|socio)\b.*\b(progreso|evoluci[oó]n|como\s+voy|estad[ií]stica|mejorar)\b|\b(como\s+voy|mi\s+progreso)\b/u',
            'context' => 'vip.progress',
            'response' => 'Si eres **socio VIP**, en **Mis reservas** / **Mi perfil** puedes ver **cuántas clases llevas**, tu **asistencia** y cómo vas mejorando. '
                .'Es útil para **organizar tu temporada** y ver cuánto te queda del bono. '
                .'Entra con tu usuario para ver **tus datos actualizados**.',
        ],

        // ── Pagos ───────────────────────────────────────────────────────────
        [
            'pattern' => '/\b(pago|pagos|tarjeta|bizum|transferencia|justificante|se[nñ]al)\b/u',
            'context' => 'payments.general',
            'response' => 'Lo más cómodo es pagar con **tarjeta** en la propia web al reservar (clase o alquiler). '
                .'Para clases sueltes pagas una **señal**; con **bono** no pagas cada vez — vas gastando clases del pack. '
                .'Si tienes un **pago pendiente**, entra en **Mis reservas** o contacta por **WhatsApp**.',
        ],

        // ── Taquillas y contacto ──────────────────────────────────────────────
        [
            'pattern' => '/\b(taquilla|taquillas|casillero|guardar\s+material|cuota)\b/u',
            'context' => 'locker.general',
            'response' => 'Las **taquillas** del club son para **guardar neopreno, tabla y material** entre sesiones. '
                .'Hay distintos **planes y cuotas** — míralos en **Taquillas** en la web. '
                .'Muchos socios combinan **taquilla + bono** para surfear a menudo. ¿Dudas? **WhatsApp**.',
        ],
        [
            'pattern' => '/\b(horario|telefono|contacto|whatsapp|hablar\s+con|persona\s+real)\b/u',
            'context' => 'contact.general',
            'response' => 'Para hablar con el **equipo humano**, usa el botón **WhatsApp** (verde, abajo a la izquierda) o la página **Contacto**. '
                .'Estamos en **Donostia**, junto a **Zurriola**. '
                .'Te resolvemos dudas de **clases, alquileres, bonos y taquillas**.',
        ],

        // ── Nivel / edad ────────────────────────────────────────────────────
        [
            'pattern' => '/\b(ni[nñ]os|ninos|peques|hijos|edad\s+minima|menores|familia)\b/u',
            'context' => 'classes.kids',
            'response' => 'Tenemos clases para **distintas edades y niveles**. La edad mínima y el tipo de clase dependen de la sesión — '
                .'mira el detalle en **Academia** o pregúntanos por **WhatsApp** indicando **edad del niño/a** y **experiencia**. '
                .'Priorizamos **seguridad y diversión**.',
        ],
    ];

    private const DEFAULT_RESPONSE = 'No estoy segura de entender esa pregunta 🤔 '
        .'Prueba a preguntarme cosas como:'."\n\n"
        .'- **¿Cómo reservo una clase?**'."\n"
        .'- **¿Qué pasa si cancelo?**'."\n"
        .'- **¿Cuántas clases gasta mi bono?**'."\n"
        .'- **¿Cómo alquilo una tabla?**'."\n\n"
        .'Para tu caso personal (tu reserva, tu hora), entra en **Mis reservas** o escríbenos por **WhatsApp** — te atiende el equipo en persona.';

    public function reply(string $query): ChatbotReplyDto
    {
        return $this->resolveQuery($query);
    }

    public function resolveQuery(string $query): ChatbotReplyDto
    {
        $normalized = $this->normalize($query);

        if ($normalized === '') {
            return new ChatbotReplyDto(
                'Pregúntame lo que quieras sobre **clases**, **bonos**, **alquiler de tablas** o **cancelaciones**. '
                .'Para temas muy concretos tuyos, **WhatsApp** o **Mis reservas** con tu usuario.',
                self::CONTEXT_FALLBACK,
            );
        }

        foreach (self::PATTERNS as $entry) {
            if (preg_match($entry['pattern'], $normalized) === 1) {
                return new ChatbotReplyDto($entry['response'], $entry['context']);
            }
        }

        return new ChatbotReplyDto(self::DEFAULT_RESPONSE, self::CONTEXT_FALLBACK);
    }

    private function normalize(string $query): string
    {
        $text = mb_strtolower(trim($query));
        if ($text === '') {
            return '';
        }

        $replacements = [
            'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n',
        ];

        return strtr($text, $replacements);
    }
}
