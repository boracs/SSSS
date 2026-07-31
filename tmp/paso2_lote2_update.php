<?php

declare(strict_types=1);

$path = dirname(__DIR__).'/database/seeders/data/taller_articles.php';
/** @var list<array<string, string>> $articles */
$articles = require $path;

$bySlug = [];
foreach ($articles as $i => $a) {
    $bySlug[$a['slug']] = $i;
}

$updates = [];

$updates['guia-de-corrientes-en-la-playa-como-detectarlas-utilizarlas-y-surfear-seguro'] = [
    'title' => 'Guía de Corrientes en la Playa: Cómo Detectarlas, Utilizarlas y Surfear Seguro',
    'slug' => 'guia-de-corrientes-en-la-playa-como-detectarlas-utilizarlas-y-surfear-seguro',
    'excerpt' => 'Cómo detectar corrientes de resaca, qué hacer si te atrapan y cómo las usan los surfistas con seguridad en playas abiertas.',
    'content' => <<<'HTML'
<figure>
<img src="/img/taller/corrientes-resaca-playa-senales.webp" alt="Canal de agua más calmada entre rompientes (resaca)" width="1536" height="1024" loading="eager">
</figure>
<p>Las <strong>corrientes de resaca</strong> (rip currents) son canales de agua que salen hacia mar abierto. Entenderlas evita sustos y, con experiencia, ayuda a posicionarte. Esta guía va de detección, salida segura y uso en surf. Complementa las <a href="/taller/manual-de-surf-seguridad-convivencia-y-localismo">normas de prioridad y seguridad</a> del lineup.</p>
<h2>Qué es una resaca</h2>
<p>Cuando las olas empujan agua hacia la orilla, esa agua tiene que volver. Suele concentrarse en un canal más estrecho y profundo: ahí la corriente tira hacia fuera. No es un “agujero que te chupa al fondo”; es un flujo horizontal hacia el mar.</p>
<h2>Cómo detectarlas</h2>
<ul>
<li>Franja de agua más calmada o con menos espuma entre zonas de rompiente.</li>
<li>Agua más turbia, con arena o espuma que se aleja de la orilla.</li>
<li>Líneas de espuma, algas o restos que salen en dirección al mar.</li>
<li>Rompe irregular: a un lado olas, al otro un “pasillo” más quieto.</li>
</ul>
<h3>Observar 5 min</h3>
<p>Antes de entrar, mira desde un punto alto o desde la orilla. Identifica dónde rompe de forma continua y dónde hay un hueco. Ese contraste suele marcar el canal.</p>
<h2>Cómo salir</h2>
<ul>
<li>No nades a contracorriente hacia la orilla agotándote.</li>
<li>Nada en paralelo a la playa hasta salir del canal; luego vuelve con las olas.</li>
<li>Si puedes, flota y señala para pedir ayuda; conserva energía.</li>
<li>Si tienes tabla, úsala como flotador y no la sueltes sin necesidad.</li>
</ul>
<h2>Uso en surf</h2>
<p>Surfistas experimentados usan a veces la resaca como “autopista” para salir al pico con menos remada. Eso exige leer el mar y no bloquear a quien entra o sale. Principiantes: prioriza zonas de espumas supervisadas y pregunta al monitor.</p>
<h2>Ejemplo local: playas abiertas tipo Zurriola</h2>
<p>En beach breaks abiertos (como Zurriola en Donostia) las resacas cambian con marea, swell y banco de arena. No asumas el mismo canal dos días seguidos: vuelve a observar. Si hay bandera o aviso de socorristas, respétalo siempre.</p>
HTML,
    'meta_title' => 'Cómo detectar corrientes de resaca en la playa',
    'meta_description' => 'Señales visuales, qué hacer si te atrapa y cómo las usan los surfistas. Seguridad en playas abiertas.',
    'meta_keywords' => 'corrientes de resaca, rip current, seguridad playa',
    'chatbot_summary' => 'Explica corrientes de resaca: qué son, señales visuales, cómo salir nadando en paralelo y uso cauteloso en surf. Zurriola solo como ejemplo de beach break. Enlaza a normas de seguridad del lineup.',
    'chatbot_keywords' => 'corrientes de resaca en la playa, detectar rip current, salir de una corriente, corrientes y surf',
];

$updates['a-que-edad-puede-un-nino-comenzar-a-surfear-etapas-y-consejos'] = [
    'title' => '¿A Qué Edad Puede un Niño Comenzar a Surfear? Etapas y Consejos',
    'slug' => 'a-que-edad-puede-un-nino-comenzar-a-surfear-etapas-y-consejos',
    'excerpt' => 'Etapas por edad para empezar a surfear, enfoque lúdico vs técnico y consejos de seguridad para familias en la playa.',
    'content' => <<<'HTML'
<figure>
<img src="/img/taller/ninos-iniciacion-surf-playa.webp" alt="Niño con softboard y monitor en zona de espumas" width="1536" height="1024" loading="eager">
</figure>
<p>No hay una edad mágica única: depende de natación, atención y confort en el agua. Como orientación familiar, muchos niños empiezan a disfrutar de espumas con supervisión alrededor de los 5–8 años, y ganan autonomía técnica más adelante. Esta guía es por etapas y seguridad, no un compromiso médico.</p>
<h2>Por etapas de edad</h2>
<ul>
<li><strong>Muy pequeños:</strong> juego en orilla, confianza con el agua y el softboard en seco o espuma mínima; siempre con adulto.</li>
<li><strong>Inicio lúdico (aprox. 5–8):</strong> clases cortas, softboard, foco en diversión y seguridad, no en “coger olas perfectas”.</li>
<li><strong>Base técnica (aprox. 8–12):</strong> remada, pop-up simple y respeto de normas del grupo si ya nadan con soltura.</li>
<li><strong>Adolescentes:</strong> progresión más técnica según motivación y condiciones; sigue valiendo la supervisión en mar vivo.</li>
</ul>
<h2>Qué priorizar</h2>
<ul>
<li>Que sepan nadar en aguas poco profundas y escuchan instrucciones.</li>
<li>Material blando (softboard) y zona de espumas, no el pico adulto.</li>
<li>Sesiones cortas: mejor ganas de repetir que una clase demasiado larga.</li>
<li>Frío, viento y cansancio: abortar a tiempo es progreso, no fracaso.</li>
</ul>
<h2>Seguridad</h2>
<ul>
<li>Invento bien puesto, neopreno adecuado y ratio monitor/niños razonable.</li>
<li>Evitar mar grande, shorebreak fuerte o resacas marcadas en iniciación infantil.</li>
<li>Protección solar, hidratación y punto de encuentro claro con la familia.</li>
</ul>
<h3>Clases en escuela</h3>
<p>Una escuela aporta ojos formados, material y protocolo. Antes de reservar, usa el <a href="/taller/que-debo-tener-en-cuenta-al-reservar-una-clase-de-surf">checklist de reserva</a>; para imaginar el día 1, mira <a href="/taller/que-aprendere-en-mi-primera-clase-de-surf-y-guia-de-preguntas-frecuentes">qué se aprende en la primera clase</a>. En S4 (Zurriola / Donostia) puedes consultar la Academia cuando encaje con la edad y el nivel de tu hijo o hija.</p>
HTML,
    'meta_title' => 'A qué edad puede un niño empezar a surfear',
    'meta_description' => 'Etapas por edad, enfoque lúdico vs técnico y consejos de seguridad para familias. Guía S4 Zurriola.',
    'meta_keywords' => 'edad surf niños, clases surf niños, iniciación',
    'chatbot_summary' => 'Orientación por etapas de edad para que un niño empiece a surfear, prioridad lúdica/seguridad, softboard y espumas. CTA suave a Academia S4 Zurriola y enlaces a checklist de reserva y primera clase. Sin precios ni horarios inventados.',
    'chatbot_keywords' => 'edad para empezar a surfear niños, clases de surf para niños, surf niños 8 años, iniciación familiar',
];

$updates['medidas-de-las-tablas-de-surf-la-guia-definitiva-para-elegir-tu-tabla'] = [
    'title' => 'Medidas de las Tablas de Surf: La Guía Definitiva para Elegir tu Tabla',
    'slug' => 'medidas-de-las-tablas-de-surf-la-guia-definitiva-para-elegir-tu-tabla',
    'excerpt' => 'Longitud, ancho, grosor y volumen en litros: cómo leer las medidas de una tabla según peso y nivel sin quedarte corto de flotación.',
    'content' => <<<'HTML'
<figure>
<img src="/img/taller/volumen-litros-tabla-surf-guia.webp" alt="Etiqueta de litros en cola de tabla de surf" width="1536" height="1024" loading="eager">
</figure>
<p>Esta guía trata el <strong>volumen en litros</strong> y las medidas (longitud, ancho, grosor) para interpretar una ficha técnica. No es una guía de “qué tipo de tabla comprar al empezar”: eso está en <a href="/taller/cual-es-la-tabla-de-surf-ideal-para-aprender">tabla ideal para aprender (softboard / tipo)</a>. Para nombres de partes (nose, rails, tail), ver <a href="/taller/guia-completa-partes-de-una-tabla-de-surf-y-sus-funciones">partes de una tabla</a>.</p>
<h2>Litros y flotación</h2>
<p>El volumen (L) resume cuánta flotabilidad ofrece la tabla. Más litros → más fácil remar y atrapar olas lentas; menos litros → más sensible, pero exige mejor timing y fitness. El “número mágico” depende de peso, nivel y tipo de olas: úsalo como brújula, no como dogma.</p>
<ul>
<li>Principiante / intermedio temprano: suele ir holgado de litros respecto a su peso.</li>
<li>Avanzado: puede bajar litros si busca respuesta, asumiendo más caídas y remada.</li>
</ul>
<h2>Longitud, ancho y grosor</h2>
<ul>
<li><strong>Longitud (pies/\"):</strong> más larga suele planear y remar con menos esfuerzo; más corta pivota antes.</li>
<li><strong>Ancho (pulgadas):</strong> más ancho = más estabilidad al ponerte de pie; demasiado estrecho castiga el equilibrio.</li>
<li><strong>Grosor:</strong> aporta litros y “carril” bajo los pies; tablas muy finas bajan flotación aunque midan largo.</li>
</ul>
<p>Las tres medidas se combinan: dos tablas con el mismo largo pueden tener litros muy distintos.</p>
<h2>Por nivel</h2>
<ul>
<li><strong>Empezando a remar solo:</strong> prioriza litros y ancho generosos; valida sensaciones antes de bajar medida.</li>
<li><strong>Ya coges espumas/paredes fáciles:</strong> ajusta longitud y volumen a tu peso y a la ola media de tu spot.</li>
<li><strong>Progresión agresiva:</strong> baja litros solo si las caídas vienen de exceso de flotación (tabla “muerta”), no de técnica.</li>
</ul>
<h3>Errores comunes</h3>
<ul>
<li>Mirar solo el largo e ignorar los litros.</li>
<li>Bajar de volumen demasiado pronto por moda o por copiar a un amigo más ligero.</li>
<li>Comparar litros entre shapes muy distintos sin mirar ancho/grosor.</li>
<li>Confundir esta guía de métricas con la elección de material blando vs fibra al iniciar.</li>
</ul>
HTML,
    'meta_title' => 'Volumen y medidas de tablas de surf (guía)',
    'meta_description' => 'Longitud, ancho, grosor y litros: cómo interpretar medidas según peso y nivel sin quedarte corto de flotación.',
    'meta_keywords' => 'volumen litros tabla surf, medidas tabla, flotabilidad',
    'chatbot_summary' => 'Explica volumen en litros y medidas (longitud, ancho, grosor) según peso y nivel. Ángulo solo métricas; enlaza a softboard/principiantes (#4) y a partes de la tabla (#11). No centra el copy en “mejor softboard”.',
    'chatbot_keywords' => 'volumen en litros de una tabla de surf, medidas tabla según peso, litros por kilo surf, longitud ancho grosor',
];

$updates['manual-de-surf-seguridad-convivencia-y-localismo'] = [
    'title' => 'Manual de Surf: Seguridad, Convivencia y Localismo',
    'slug' => 'manual-de-surf-seguridad-convivencia-y-localismo',
    'excerpt' => 'Normas de prioridad en el pico, distancia de seguridad, convivencia y localismo explicados con sentido común para compartir el agua.',
    'content' => <<<'HTML'
<figure>
<img src="/img/taller/normas-prioridad-surf-lineup.webp" alt="Surfistas respetando turnos en el pico" width="1536" height="1024" loading="eager">
</figure>
<p>El surf funciona cuando hay <strong>normas de prioridad</strong>, distancia y respeto. Este manual es etiqueta y seguridad en el agua, no una clase de táctica de “dónde sentarse para coger más olas” (eso está en la guía de <a href="/taller/donde-colocarse-en-el-agua-para-coger-mas-olas-guia-de-posicionamiento">posicionamiento en el pico</a>). Si el mar mueve mucha agua, revisa también las <a href="/taller/guia-de-corrientes-en-la-playa-como-detectarlas-utilizarlas-y-surfear-seguro">corrientes de resaca</a>.</p>
<h2>Seguridad</h2>
<ul>
<li>Entra solo si controlas la natación y las condiciones del día.</li>
<li>Mantén distancia: tablas y cuerpos ocupan espacio en caídas.</li>
<li>No sueltes la tabla hacia otras personas; aprende a controlar el invento.</li>
<li>Si hay socorristas o banderas, sus indicaciones mandan.</li>
</ul>
<h2>Prioridades</h2>
<ul>
<li>Quien está más cerca del pico / más adentro en la pared suele tener preferencia en esa ola.</li>
<li>No “drops” sobre alguien que ya remó y tiene la ola.</li>
<li>Si alguien tiene la ola, no te cruces por delante (snake / corte).</li>
<li>Una ola, en la práctica, es para quien la ha ganado con claridad; el resto cede.</li>
</ul>
<h2>Comunicación en el pico</h2>
<ul>
<li>Contacto visual y gestos claros (“tuya”, “voy”) reducen choques.</li>
<li>Si fallas o caes en la trayectoria de otro, discúlpate y da espacio.</li>
<li>Rotación justa: no remes todas las olas del set si el pico está lleno.</li>
</ul>
<h2>Localismo</h2>
<p>El localismo es la presión (a veces agresiva) de quienes sienten el spot como “suyo”. La respuesta útil: respeto, no saturar, ceder olas, no discutir en el agua y elegir otro pico si el ambiente está tenso. Conocer las normas no te da derecho a imponer; te da criterio para compartir.</p>
HTML,
    'meta_title' => 'Normas de prioridad y seguridad en el surf',
    'meta_description' => 'Prioridad en el pico, distancia de seguridad, convivencia y localismo explicados con sentido común. Taller S4.',
    'meta_keywords' => 'normas prioridad surf, etiqueta surf, localismo',
    'chatbot_summary' => 'Manual de etiqueta: seguridad, prioridad en el pico, comunicación y localismo. No es guía de posicionamiento táctico (#14) ni de corrientes (#7); enlaza a ambas. Sin inventar reglas legales locales.',
    'chatbot_keywords' => 'normas de prioridad en el surf, etiqueta del surf, no saltar olas, localismo surf',
];

foreach ($updates as $slug => $data) {
    if (! isset($bySlug[$slug])) {
        fwrite(STDERR, "Missing slug: {$slug}\n");
        exit(1);
    }
    $articles[$bySlug[$slug]] = $data;
    echo "Updated: {$slug}\n";
}

$export = "<?php\n\ndeclare(strict_types=1);\n\n/**\n * Artículos del Taller de Surf — PDF + SEO Paso 2 (Top 5 + lote 2).\n */\nreturn [\n";

foreach ($articles as $article) {
    $export .= "    [\n";
    foreach (['title', 'slug', 'excerpt', 'content', 'meta_title', 'meta_description', 'meta_keywords', 'chatbot_summary', 'chatbot_keywords'] as $key) {
        if (! array_key_exists($key, $article)) {
            continue;
        }
        $val = $article[$key];
        if ($key === 'content') {
            $export .= "        'content' => <<<'HTML'\n".$val."\nHTML,\n";
        } else {
            $export .= '        '.var_export($key, true).' => '.var_export($val, true).",\n";
        }
    }
    $export .= "    ],\n";
}
$export .= "];\n";

file_put_contents($path, $export);
echo "Wrote {$path} (".count($articles)." articles)\n";

$check = require $path;
foreach (array_keys($updates) as $slug) {
    foreach ($check as $a) {
        if ($a['slug'] === $slug) {
            echo $slug."\n  meta=".strlen($a['meta_title']).' desc='.strlen($a['meta_description'])." img=".(str_contains($a['content'], '/img/taller/') ? 'yes' : 'NO')."\n";
            break;
        }
    }
}
