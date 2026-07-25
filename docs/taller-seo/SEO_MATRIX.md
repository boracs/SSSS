# SEO Matrix — Taller de Surf S4

**Fecha:** 2026-07-25  
**Alcance:** Auditoría SEO + investigación web (ES-ES). Solo análisis y documentación.  
**Paso 1b:** revisión humana asistida — estados APROBADO/POSPONER y CAMBIAR aplicados en matriz (ver sección correspondiente).  
**Fuentes de inventario:** `database/seeders/data/taller_articles.php` + BD `articles` (18 filas, ids 1–18).  
**Ruta pública:** `/taller/{slug}` → `resources/js/Pages/Taller/Show.jsx`  
**Restricciones aplicadas:** sin volúmenes/KD inventados; keywords naturales ES-ES; `kw_principal` única por artículo; local (Zurriola/Donostia) solo donde aporta valor comercial/local.

---

## A) Inventario completo (slug + title)

| # | slug | title_actual |
|---|------|--------------|
| 1 | `el-kit-del-surfista-guia-esencial-de-equipamiento` | El Kit del Surfista: Guía Esencial de Equipamiento |
| 2 | `guia-practica-como-reparar-una-tabla-de-surf` | Guía Práctica: Cómo Reparar una Tabla de Surf |
| 3 | `manual-de-surf-seguridad-convivencia-y-localismo` | Manual de Surf: Seguridad, Convivencia y Localismo |
| 4 | `cual-es-la-tabla-de-surf-ideal-para-aprender` | ¿Cuál es la Tabla de Surf Ideal para Aprender |
| 5 | `como-saber-si-tu-tabla-de-surf-se-ha-quedado-pequena` | ¿Cómo saber si tu Tabla de Surf se ha quedado Pequeña |
| 6 | `que-debo-tener-en-cuenta-al-reservar-una-clase-de-surf` | ¿Qué Debo Tener en Cuenta al Reservar una Clase de Surf |
| 7 | `guia-de-corrientes-en-la-playa-como-detectarlas-utilizarlas-y-surfear-seguro` | Guía de Corrientes en la Playa: Cómo Detectarlas, Utilizarlas y Surfear Seguro |
| 8 | `que-aprendere-en-mi-primera-clase-de-surf-y-guia-de-preguntas-frecuentes` | ¿Qué Aprenderé en mi Primera Clase de Surf? (Y Guía de Preguntas Frecuentes) |
| 9 | `de-que-materiales-esta-hecha-una-tabla-de-surf-guia-de-componentes` | ¿De Qué Materiales Está Hecha una Tabla de Surf? Guía de Componentes |
| 10 | `a-que-edad-puede-un-nino-comenzar-a-surfear-etapas-y-consejos` | ¿A Qué Edad Puede un Niño Comenzar a Surfear? Etapas y Consejos |
| 11 | `guia-completa-partes-de-una-tabla-de-surf-y-sus-funciones` | Guía Completa: Partes de una Tabla de Surf y sus Funciones |
| 12 | `medidas-de-las-tablas-de-surf-la-guia-definitiva-para-elegir-tu-tabla` | Medidas de las Tablas de Surf: La Guía Definitiva para Elegir tu Tabla |
| 13 | `guia-de-olas-y-rompientes-tipos-fondos-y-factores-que-influyen-en-el-surf` | Guía de Olas y Rompientes: Tipos, Fondos y Factores que Influyen en el Surf |
| 14 | `donde-colocarse-en-el-agua-para-coger-mas-olas-guia-de-posicionamiento` | ¿Dónde Colocarse en el Agua para Coger Más Olas? Guía de Posicionamiento |
| 15 | `que-titulacion-se-necesita-para-impartir-clases-de-surf-en-espana` | ¿Qué Titulación se Necesita para Impartir Clases de Surf en España |
| 16 | `como-hacer-el-pato-en-surf-duck-dive` | ¿Cómo hacer el pato en surf? (Duck Dive) |
| 17 | `como-interpretar-el-parte-de-olas-guia-avanzada-para-surfistas` | Cómo interpretar el parte de olas: Guía avanzada para surfistas |
| 18 | `como-saber-en-que-direccion-rompe-una-ola` | ¿Cómo saber en qué dirección rompe una ola |

**Hallazgos transversales de inventario (BD/seed):**

- `chatbot_summary` / `chatbot_keywords`: vacíos o nulos en los 18 (desalineados con cualquier intención SEO futura).
- `meta_description`: en la práctica = excerpt cortado (~170–179 chars en HTML source; SERP truncará).
- `meta_keywords`: relleno genérico con “escuela de surf, Donostia, San Sebastián, Zurriola” en casi todos (poco valor; riesgo de diluir intención).
- **0 imágenes** (`<img>`) en el HTML de contenido de los 18 artículos.
- Varios títulos con `¿` sin cerrar `?` (#4, #5, #6, #15, #18).
- Uso frecuente de `<h2>` como pasos numerados (jerarquía rota) y `<li>` con varios ítems pegados en una sola línea.

---

## B–C) Matriz SEO (intent SERP + auditoría contenido)

| # | slug | title_actual | intent_busqueda | kw_principal | kw_secundarias (2-3) | riesgo_canibalizacion | meta_title_propuesto (≤60) | meta_description_propuesta (≤155) | meta_keywords_propuestas | problemas_contenido | h2_h3_sugeridos | imagen_filename_propuesto | alt_propuesto | prioridad | confianza_kw | notas (fuentes) |
|---|------|--------------|-----------------|--------------|----------------------|-----------------------|----------------------------|-----------------------------------|--------------------------|---------------------|-----------------|---------------------------|---------------|-----------|--------------|-----------------|
| 1 | el-kit-del-surfista-guia-esencial-de-equipamiento | El Kit del Surfista: Guía Esencial de Equipamiento | informacional | equipamiento básico para surfear | kit del surfista; qué llevar para surfear; neopreno invento parafina | Media con #4 (primera tabla) si el copy se centra solo en softboard | Equipamiento básico para surfear: kit esencial | Lista clara del material mínimo (tabla, neopreno, invento, quillas, parafina) y qué llevar según nivel. Guía del Taller S4. | equipamiento básico surf, kit surfista, invento leash, parafina | Listas rotas (varios ítems en un `<li>`); sin H2; excerpt=meta cortada; **posible solapamiento textual** con guías homónimas locales; chatbot_* vacío | H2 Kit mínimo; H2 Principiante vs experimentado; H2 Viajes de surf; H3 Repuestos | kit-equipamiento-surfista-basico.webp | Material básico de surf: tabla, neopreno e invento sobre arena | media | alta | [escueladesurf.es](https://www.escueladesurf.es/2025/07/17/que-necesitas-para-empezar-a-surfear-desde-cero-equipo-ropa-y-actitud-guia-2025/); [zurriolacam.com.es](https://zurriolacam.com.es/el-kit-del-surfista/) (contenido muy similar — revisar originalidad) |
| 2 | guia-practica-como-reparar-una-tabla-de-surf | Guía Práctica: Cómo Reparar una Tabla de Surf | informacional (+ ligera comercial a taller Edy) | reparar tabla de surf | solarez tabla de surf; reparar toques tabla; resina UV surf | Baja (nicho DIY); no choca con páginas de servicio si se enlaza “cuándo ir al taller” | Cómo reparar una tabla de surf (Solarez y más) | Guía práctica: toques pequeños con Solarez, cuándo ir a taller y diferencias epoxi/poliéster. Del Taller de Surf S4. | reparar tabla de surf, solarez, toques tabla | `<h2>` usados como pasos 1–4; HTML denso; sin imágenes de proceso; meta=excerpt; chatbot vacío | H2 Toques pequeños; H2 Solarez (tipos); H2 Paso a paso; H2 Daños grandes / taller | reparar-tabla-surf-solarez-paso-a-paso.webp | Aplicación de Solarez sobre un toque en una tabla de surf | alta | alta | [blog.coresurfingshop.com](https://blog.coresurfingshop.com/reparar-tabla-de-surf-con-solarez-trucos-y-consejos/); [watsaysurfschool.com](https://www.watsaysurfschool.com/reparar-tabla-de-surf/) |
| 3 | manual-de-surf-seguridad-convivencia-y-localismo | Manual de Surf: Seguridad, Convivencia y Localismo | informacional | normas de prioridad en el surf | etiqueta del surf; no saltar olas; localismo surf | Media con #14 (pico/prioridad espacial) | Normas de prioridad y seguridad en el surf | Prioridad en el pico, distancia de seguridad, convivencia y localismo explicados con sentido común. Taller S4. | normas prioridad surf, etiqueta surf, localismo | Buena estructura H2 relativa; listas mejorables; meta genérica; chatbot vacío | H2 Seguridad; H2 Prioridades; H2 Comunicación en el pico; H2 Localismo | normas-prioridad-surf-lineup.webp | Surfistas respetando turnos en el pico | alta | alta | [elementsurf.com](https://www.elementsurf.com/es/escuela-de-surf-cantabria/reglas-del-surf/); [landboard.es](https://landboard.es/reglas-surf/) |
| 4 | cual-es-la-tabla-de-surf-ideal-para-aprender | ¿Cuál es la Tabla de Surf Ideal para Aprender | informacional / comercial ligera | tabla de surf para principiantes | softboard iniciación; primera tabla de surf; corchopán surf | Controlado vs #12: #4 = **tipo/softboard**; #12 = **litros/medidas** (sin solapar copy) | Mejor tabla de surf para principiantes | Softboard y seguridad: qué tipo de tabla elegir al empezar, sin tecnicismos de litros. Guía del Taller S4. | tabla surf principiantes, softboard, primera tabla | Título `¿` sin `?`; H2 numerados como pasos; sin imgs; **no hablar de litros** (eso es #12); chatbot vacío | H2 Softboard vs fibra; H2 Por qué espuma al empezar; H2 Errores al comprar; H3 Seguridad | softboard-tabla-principiantes-espuma.webp | Softboard de iniciación en la orilla | alta | alta | [behumax.com](https://behumax.com/tablas-de-surf-para-principiantes-todo-lo-que-necesitas-saber/); [blog.coresurfingshop.com](https://blog.coresurfingshop.com/softboards-aprende-mas-rapido-a-hacer-surf/) |
| 5 | como-saber-si-tu-tabla-de-surf-se-ha-quedado-pequena | ¿Cómo saber si tu Tabla de Surf se ha quedado Pequeña | informacional | cuándo cambiar de tabla de surf | tabla demasiado pequeña; progresión de tablas; bajar de volumen | Media con #4 y #12 (misma familia “elegir/cambiar tabla”) | Cuándo cambiar de tabla de surf (señales claras) | Señales de que tu tabla se quedó pequeña o de que bajaste de volumen demasiado pronto. Guía de progresión S4. | cambiar tabla de surf, progresión tablas, volumen | Título incompleto (`¿` sin `?`); casi sin H2; contenido corto vs competencia; chatbot vacío | H2 Señales de tabla pequeña; H2 Señales de bajar demasiado pronto; H2 Cómo probar el siguiente step | progresion-cambiar-tabla-surf.webp | Surfista comparando dos tablas de distinto tamaño | media | alta | [escueladesurfsopelana.com](https://www.escueladesurfsopelana.com/cuando-cambiar-de-tabla-de-surf/); [tilegitsurf.es](https://tilegitsurf.es/senales-de-que-tienes-la-tabla-de-surf-incorrecta/) |
| 6 | que-debo-tener-en-cuenta-al-reservar-una-clase-de-surf | ¿Qué Debo Tener en Cuenta al Reservar una Clase de Surf | comercial / local | reservar clase de surf | ratio instructor alumnos; qué incluye clase surf; seguro clase surf | Controlado vs #8: #6 = **antes de reservar / checklist**; #8 = **día 1 / qué se aprende** | Qué mirar antes de reservar una clase de surf | Ratio, material incluido, playa, seguro y condiciones: checklist para elegir escuela. Útil también en Zurriola (S4). | reservar clase de surf, escuela surf, ratio instructor | Título incompleto; H2 como lista numerada; oportunidad local poco explotada en H1/meta actual (solo keywords); chatbot vacío | H2 Checklist de reserva; H2 Qué debe incluir; H2 Condiciones y cancelación; H3 Grupos vs particular | reservar-clase-surf-checklist.webp | Alumnos con softboards en clase de iniciación en playa | alta | alta | [mojosurf.es](https://mojosurf.es/clases-de-surf-que-tener-en-cuenta/); [kaizensurfschool.es](https://kaizensurfschool.es/espanol-es/surf-en-tenerife-guia-segura-principiantes/) |
| 7 | guia-de-corrientes-en-la-playa-como-detectarlas-utilizarlas-y-surfear-seguro | Guía de Corrientes en la Playa: Cómo Detectarlas, Utilizarlas y Surfear Seguro | informacional (+ seguridad local opcional) | corrientes de resaca en la playa | detectar rip current; salir de una corriente; corrientes y surf | Baja | Cómo detectar corrientes de resaca en la playa | Señales visuales, qué hacer si te atrapa y cómo las usan los surfistas. Seguridad en playas abiertas. | corrientes de resaca, rip current, seguridad playa | Muchos H2 numerados (13); meta larga/genérica; sin diagramas; chatbot vacío; local Zurriola útil en un H2 ejemplo, no forzar en title | H2 Qué es una resaca; H2 Cómo detectarlas; H2 Cómo salir; H2 Uso en surf; H3 Observar 5 min | corrientes-resaca-playa-senales.webp | Canal de agua más calmada entre rompientes (resaca) | alta | alta | [magazine.todosurf.com](https://magazine.todosurf.com/magazine/surf/corrientes-resaca-surf/); [theconversation.com](https://theconversation.com/corrientes-de-resaca-saber-como-y-cuando-se-forman-puede-salvarnos-la-vida-269833) |
| 8 | que-aprendere-en-mi-primera-clase-de-surf-y-guia-de-preguntas-frecuentes | ¿Qué Aprenderé en mi Primera Clase de Surf? (Y Guía de Preguntas Frecuentes) | informacional / comercial | primera clase de surf | qué se aprende en clase de surf; take off arena; FAQ iniciación surf | Controlado vs #6: #8 = **experiencia del día 1 + FAQ**; no checklist de compra | Qué aprenderás en tu primera clase de surf | Teoría, práctica en arena, remada y primeras espumas: estructura típica y FAQ. Ideal antes de apuntarte en S4. | primera clase de surf, take off, iniciación surf | meta_description empieza mal (“Surf? (Y Guía…”) — recorte roto; H2/H3 densos; chatbot vacío | H2 Antes del agua; H2 En el agua; H2 FAQ; H3 Take-off | primera-clase-surf-teoria-arena.webp | Monitor corrigiendo pop-up en la arena | alta | alta | [ajonatura.com](https://ajonatura.com/es/que-esperar-en-tu-primera-clase-de-surf-preguntas-y-respuestas-mas-comunes/); [escueladesurf9pies.com](https://www.escueladesurf9pies.com/es/cursos/curso-de-iniciacion-al-surf-palmar) |
| 9 | de-que-materiales-esta-hecha-una-tabla-de-surf-guia-de-componentes | ¿De Qué Materiales Está Hecha una Tabla de Surf? Guía de Componentes | informacional | materiales de una tabla de surf | epoxi vs poliéster; foam PU EPS; fibra de vidrio tabla | Media con #2 (reparación) y #11 (partes) | De qué materiales está hecha una tabla de surf | Foam, resina (epoxi/poliéster) y fibra: diferencias, compatibilidad y por qué importa al reparar. | materiales tabla surf, epoxi, poliéster, foam | H2 numerados; sin esquemas; chatbot vacío | H2 Foam PU vs EPS; H2 Resinas; H2 Fibra y acabado; H3 Compatibilidad reparación | materiales-tabla-surf-epoxi-poliester.webp | Corte esquemático de foam, fibra y resina en tabla | media | alta | [blog.surfintrip.com](https://blog.surfintrip.com/es/de-que-esta-hecha-una-tabla-de-surf/); [magazine.todosurf.com](https://magazine.todosurf.com/magazine/surf/epoxy-vs-poliester-surf-640-htm/) |
| 10 | a-que-edad-puede-un-nino-comenzar-a-surfear-etapas-y-consejos | ¿A Qué Edad Puede un Niño Comenzar a Surfear? Etapas y Consejos | informacional / comercial local | edad para empezar a surfear niños | clases de surf para niños; surf niños 8 años; iniciación familiar | Baja (nicho parental); refuerzo local S4 en desc | A qué edad puede un niño empezar a surfear | Etapas por edad, enfoque lúdico vs técnico y consejos de seguridad para familias. Guía S4 Zurriola. | edad surf niños, clases surf niños, iniciación | Contenido útil; H2 numerados; chatbot vacío; buen candidato a CTA Academia | H2 Por etapas de edad; H2 Qué priorizar; H2 Seguridad; H3 Clases en escuela | ninos-iniciacion-surf-playa.webp | Niño con softboard y monitor en zona de espumas | alta | alta | [escueladesurf9pies.com](https://www.escueladesurf9pies.com/es/blog/que-edad-recomendable-para-aprender-surf); [pointbreakschool.com](https://www.pointbreakschool.com/es/a-que-edad-empezar-a-surfear/) |
| 11 | guia-completa-partes-de-una-tabla-de-surf-y-sus-funciones | Guía Completa: Partes de una Tabla de Surf y sus Funciones | informacional | partes de una tabla de surf | nose rocker quillas; tail deck rails; anatomía tabla surf | Media con #9 (componentes químicos) y #12 (medidas) | Partes de una tabla de surf y para qué sirven | Nose, rocker, rails, tail y quillas explicados en lenguaje claro. Glosario visual del Taller S4. | partes tabla de surf, nose, rocker, quillas | Casi sin H2 (solo H3); contenido corto frente a guías TOP; **prioridad de imagen/diagrama**; chatbot vacío | H2 Nose y rocker; H2 Rails y bottom; H2 Tail; H2 Quillas; H3 Glosario | partes-tabla-surf-diagrama-etiquetado.webp | Diagrama etiquetado de las partes de una tabla de surf | alta | alta | [tiendasurfera.com](https://tiendasurfera.com/partes-de-una-tabla-de-surf/); [blog.coresurfingshop.com](https://blog.coresurfingshop.com/partes-de-tabla-de-surf-2/) |
| 12 | medidas-de-las-tablas-de-surf-la-guia-definitiva-para-elegir-tu-tabla | Medidas de las Tablas de Surf: La Guía Definitiva para Elegir tu Tabla | informacional | volumen en litros de una tabla de surf | medidas tabla según peso; litros por kilo surf; longitud ancho grosor | Controlado vs #4: #12 = **métricas (L, pies, pulgadas)**; no vender softboard como tema central | Volumen y medidas de tablas de surf (guía) | Longitud, ancho, grosor y litros: cómo interpretar medidas según peso y nivel sin quedarte corto de flotación. | volumen litros tabla surf, medidas tabla, flotabilidad | Title “definitiva” ambicioso; H2 numerados; tablas HTML/listas mejorables; chatbot vacío; **evitar copy “mejor softboard”** | H2 Litros y flotación; H2 Longitud/ancho/grosor; H2 Por nivel; H3 Errores comunes | volumen-litros-tabla-surf-guia.webp | Etiqueta de litros en cola de tabla de surf | alta | alta | [dreisog.com](https://dreisog.com/blog/medidas-tablas-de-surf-segun-peso-y-altura/); [blog.coresurfingshop.com](https://blog.coresurfingshop.com/cuantos-litros-necesito-en-mi-tabla-de-surf/) |
| 13 | guia-de-olas-y-rompientes-tipos-fondos-y-factores-que-influyen-en-el-surf | Guía de Olas y Rompientes: Tipos, Fondos y Factores que Influyen en el Surf | informacional | tipos de rompientes de surf | beach break reef point break; fondos de olas; swell y rompiente | Media con #18 (dirección) y #7 (corrientes) | Tipos de rompientes: beach, reef y point break | Cómo cambian las olas según el fondo y qué implica para nivel y seguridad. Guía del Taller S4. | tipos rompientes, beach break, reef break, point break | H2 numerados; sin glosario visual; chatbot vacío | H2 Beach break; H2 Reef; H2 Point; H2 Factores (viento/fondo/swell) | tipos-rompientes-beach-reef-point.webp | Infografía beach break vs reef vs point break | media | alta | [tiendasurfera.com](https://tiendasurfera.com/que-tipos-de-rompientes-existen-en-el-surf/); [totorasurfschool.com](https://www.totorasurfschool.com/2019/03/26/1726/) |
| 14 | donde-colocarse-en-el-agua-para-coger-mas-olas-guia-de-posicionamiento | ¿Dónde Colocarse en el Agua para Coger Más Olas? Guía de Posicionamiento | informacional | posicionarse en el pico de surf | referencias en la orilla; leer el pico; coger más olas | Media–alta con #3 (prioridad) y #18 (derecha/izquierda): delimitar “dónde sentarse” | Dónde colocarse en el pico para coger más olas | Observar desde tierra, fijar referencias y mantenerse en el pico: táctica de posicionamiento. Taller S4. | posicionarse en el pico, lineup surf, referencias orilla | Muchos H2 (10); denso; chatbot vacío | H2 Observar desde tierra; H2 Referencias; H2 Ajustar con la marea; H3 Errores de posición | posicionamiento-pico-surf-referencias.webp | Surfista alineado con referencia en la orilla | media | alta | [tiendasurfera.com](https://tiendasurfera.com/que-es-el-pico-en-el-surf-y-como-posicionarse-correctamente/); [onesurfacademy.com](https://onesurfacademy.com/como-mejorar-tu-surf-posicionandote-mejor-en-el-pico/) |
| 15 | que-titulacion-se-necesita-para-impartir-clases-de-surf-en-espana | ¿Qué Titulación se Necesita para Impartir Clases de Surf en España | informacional / comercial (formación) | titulación instructor de surf en España | entrenador nacional de surf; TD1 surf; FESurfing formación | Baja (nicho laboral) | Titulación para dar clases de surf en España | ENS / plan formativo CSD, requisitos y diferencias con otras acreditaciones. Orientación clara (S4). | titulación instructor surf, entrenador nacional surf, FESurfing | **POSPONER (Paso 1b):** fuera de este lote por riesgo legal. Si se retoma: anclar solo a BOE + FESurfing; título incompleto; H2 numerados; chatbot vacío | H2 Marco legal CSD; H2 ENS Nivel I; H2 Requisitos y prácticas; H3 ISA vs ENS | titulacion-instructor-surf-espana.webp | Diploma / formación de monitor de surf (concepto) | media | alta | [boe.es](https://www.boe.es/buscar/doc.php?id=BOE-A-2012-2845); [surfing.es](https://surfing.es/curso-entrenador-nacional-surfing-nivel-1-pf-112sfsf01/); [surfusapp.com](https://www.surfusapp.com/blog/como-ser-monitor-instructor-entrenador-de-surf-titulaciones-y-estudios-formacion/) |
| 16 | como-hacer-el-pato-en-surf-duck-dive | ¿Cómo hacer el pato en surf? (Duck Dive) | informacional | cómo hacer el pato en surf | duck dive paso a paso; pasar olas por debajo; tortuga longboard | Baja | Cómo hacer el pato (duck dive) en surf | Pasos, timing, errores y alternativa con tablas de mucho volumen. Técnica del Taller S4. | pato surf, duck dive, pasar olas | Buena intención; listas densas; sin vídeo/stills; chatbot vacío | H2 Cuándo se puede; H2 Paso a paso; H2 Errores; H3 Tortuga / longboard | duck-dive-pato-surf-tecnica.webp | Secuencia de duck dive: hundir nose y tail | media | alta | [kaizensurfschool.es](https://kaizensurfschool.es/espanol-es/tutorial-como-pasar-olas-por-debajo-como-profesional/); [atlantiksurf.com](https://atlantiksurf.com/como-hacer-el-patito-duck-dive/) |
| 17 | como-interpretar-el-parte-de-olas-guia-avanzada-para-surfistas | Cómo interpretar el parte de olas: Guía avanzada para surfistas | informacional | interpretar el parte de olas | período del swell; leer forecast surf; altura vs período | Baja–media con #13 (rompientes) | Cómo interpretar un parte de olas (forecast) | Altura, período, dirección y viento: qué mirar primero para no engañarte con el tamaño. Guía S4. | parte de olas, período swell, forecast surf | Title “avanzada” OK; H2 densos (10); oportunidad de ejemplos con webcams S4 (sin forzar kw local en title); chatbot vacío | H2 Los 4 números; H2 Período; H2 Viento; H2 Ejemplo de lectura | interpretar-parte-olas-periodo-swell.webp | Pantalla de forecast con período y altura destacados | media | alta | [mundo-surf.com](https://www.mundo-surf.com/es/blog/general/el-periodo-en-las-olas-que-es-como-leerlo-y-su-impacto-en-el-surf); [magazine.todosurf.com](https://magazine.todosurf.com/magazine/surf/prediccion-olas-todosurf/) |
| 18 | como-saber-en-que-direccion-rompe-una-ola | ¿Cómo saber en qué dirección rompe una ola | informacional | ola de derecha o de izquierda | dirección de la ola surf; pico y pared; A-frame | Media con #14 y #13 | Cómo saber si una ola es de derecha o izquierda | Regla del punto de vista del surfista, pico y pared: deja de confundirte mirando desde la playa. | ola derecha izquierda, dirección ola, pico | Título incompleto; corto; meta empieza por “1. La regla…” (mal excerpt); chatbot vacío | H2 Perspectiva del surfista; H2 Desde la playa; H2 Pico y pared; H3 A-frames | ola-derecha-izquierda-explicacion.webp | Diagrama ola de derecha vs izquierda desde el surfista | media | alta | [protrainingcantabria.com](https://www.protrainingcantabria.com/aprende-como-leer-las-olas-surf-guia-para-principiantes/); [esenciasurfschool.com](https://esenciasurfschool.com/tips/como-aprender-a-leer-las-olas/) |

---

## 1) Mapa anti-canibalización (`kw_principal` → slug único)

| kw_principal | slug |
|--------------|------|
| equipamiento básico para surfear | `el-kit-del-surfista-guia-esencial-de-equipamiento` |
| reparar tabla de surf | `guia-practica-como-reparar-una-tabla-de-surf` |
| normas de prioridad en el surf | `manual-de-surf-seguridad-convivencia-y-localismo` |
| tabla de surf para principiantes | `cual-es-la-tabla-de-surf-ideal-para-aprender` |
| cuándo cambiar de tabla de surf | `como-saber-si-tu-tabla-de-surf-se-ha-quedado-pequena` |
| reservar clase de surf | `que-debo-tener-en-cuenta-al-reservar-una-clase-de-surf` |
| corrientes de resaca en la playa | `guia-de-corrientes-en-la-playa-como-detectarlas-utilizarlas-y-surfear-seguro` |
| primera clase de surf | `que-aprendere-en-mi-primera-clase-de-surf-y-guia-de-preguntas-frecuentes` |
| materiales de una tabla de surf | `de-que-materiales-esta-hecha-una-tabla-de-surf-guia-de-componentes` |
| edad para empezar a surfear niños | `a-que-edad-puede-un-nino-comenzar-a-surfear-etapas-y-consejos` |
| partes de una tabla de surf | `guia-completa-partes-de-una-tabla-de-surf-y-sus-funciones` |
| volumen en litros de una tabla de surf | `medidas-de-las-tablas-de-surf-la-guia-definitiva-para-elegir-tu-tabla` |
| tipos de rompientes de surf | `guia-de-olas-y-rompientes-tipos-fondos-y-factores-que-influyen-en-el-surf` |
| posicionarse en el pico de surf | `donde-colocarse-en-el-agua-para-coger-mas-olas-guia-de-posicionamiento` |
| titulación instructor de surf en España | `que-titulacion-se-necesita-para-impartir-clases-de-surf-en-espana` |
| cómo hacer el pato en surf | `como-hacer-el-pato-en-surf-duck-dive` |
| interpretar el parte de olas | `como-interpretar-el-parte-de-olas-guia-avanzada-para-surfistas` |
| ola de derecha o de izquierda | `como-saber-en-que-direccion-rompe-una-ola` |

**Clusters a vigilar en Fase 2 (enlaces internos + ángulos distintos):**

- **Elegir tabla:** #4 (softboard/tipo) ↔ #12 (litros/medidas) ↔ #5 (cuándo cambiar).
- **Leer el mar:** #13 (rompientes) ↔ #14 (posición) ↔ #18 (derecha/izquierda) ↔ #7 (corrientes).
- **Clases S4:** #6 (antes de reservar) ↔ #8 (día 1 / FAQ) ↔ #10 (niños).

---

## 2) Top 5 a intervenir en Fase 2 (prioridad)

**Regla Paso 1b:** solo artículos con estado **APROBADO** (excluye POSPONER).

| Orden | # | slug | Motivo (impacto S4 + gravedad actual) |
|------|---|------|----------------------------------------|
| 1 | 8 | `que-aprendere-en-mi-primera-clase-de-surf-…` | Embudo comercial claro; **meta_description rota**; alta intención “primera clase”. |
| 2 | 6 | `que-debo-tener-en-cuenta-al-reservar-…` | Intención comercial/local; checklist vs competencia; CTA a Academia. |
| 3 | 4 | `cual-es-la-tabla-de-surf-ideal-para-aprender` | SERP softboard; título mal cerrado; ángulo **tipo** (sin litros; eso es #12). |
| 4 | 2 | `guia-practica-como-reparar-una-tabla-de-surf` | Intent DIY fuerte + puente a servicio Edy; HTML de pasos mal etiquetado. |
| 5 | 11 | `guia-completa-partes-de-una-tabla-de-surf-…` | Glosario evergreen; hoy corto y sin H2/diagrama; base semántica para #9/#12/#16. |

*Cola posterior (APROBADO, no Top 5):* #7, #10, #12, #3…  
*Fuera de este lote (POSPONER):* #1 (originalidad — rewrite ángulo S4 más adelante); #15 (riesgo legal — no en este lote).

---

## Estado de aprobación Paso 1b

**Fecha revisión:** 2026-07-25  
**Conteo:** 16 APROBADO · 0 CAMBIAR pendiente · 2 POSPONER (#1, #15)  
**Cierre humano:** Top 5 confirmado #8 → #6 → #4 → #2 → #11. Paso 2 = solo ese lote.

| # | slug (corto) | estado | notas |
|---|--------------|--------|-------|
| 1 | kit-equipamiento | **POSPONER** | Fuera de Paso 2. Más adelante rewrite con ángulo S4 original (evitar solape con guías locales). |
| 2 | reparar-tabla | APROBADO | Top 5. |
| 3 | seguridad-prioridad | APROBADO | Vigilancia cluster vs #14. |
| 4 | tabla-principiantes | APROBADO | **CAMBIAR aplicado:** meta sin “volumen”; riesgo vs #12 controlado (tipo vs litros). Top 5. |
| 5 | tabla-pequeña | APROBADO | Cluster tabla con #4/#12. |
| 6 | reservar-clase | APROBADO | **CAMBIAR aplicado:** ángulo “antes de reservar” vs #8. Top 5. |
| 7 | corrientes-resaca | APROBADO | Cola posterior. |
| 8 | primera-clase-FAQ | APROBADO | **CAMBIAR aplicado:** ángulo “día 1 / FAQ” vs #6. Top 5. |
| 9 | materiales-tabla | APROBADO | Delimitar vs #11/#2. |
| 10 | edad-niños | APROBADO | Cola posterior (familias / CTA). |
| 11 | partes-tabla | APROBADO | Top 5. |
| 12 | medidas-volumen | APROBADO | **CAMBIAR aplicado:** métricas only; no softboard como tema central. |
| 13 | rompientes | APROBADO | Cluster mar vs #14/#18/#7. |
| 14 | posicionamiento-pico | APROBADO | Delimitar vs #3/#18. |
| 15 | titulación-España | **POSPONER** | Riesgo legal: fuera de este lote. Cuando se retome: anclar solo a BOE + FESurfing. |
| 16 | duck-dive / pato | APROBADO | — |
| 17 | parte-de-olas | APROBADO | — |
| 18 | derecha-izquierda | APROBADO | — |

### Cambios aplicados en matriz (ex-CAMBIAR)

1. **#4** — `meta_description_propuesta` sin “volumen”; `riesgo_canibalizacion` / H2 sin tecnicismos de litros.  
2. **#6 / #8** — separación explícita checklist reserva vs experiencia día 1.  
3. **#12** — ángulo solo métricas; evitar copy “mejor softboard”.  
4. **#15** — (histórico) anclaje BOE/FESurfing; **estado final = POSPONER** (no implementar en este lote).

---

## Checklist Paso 1b (cierre)

- [x] Los 18 artículos tienen estado APROBADO | CAMBIAR (aplicado→APROBADO) | POSPONER.
- [x] Separación #4 vs #12 confirmada y reflejada en matriz.
- [x] Separación #6 vs #8 confirmada y reflejada en matriz.
- [x] Top 5 = solo APROBADO: **#8, #6, #4, #2, #11** (confirmado humano; no sustituir).
- [x] #1 POSPONER — fuera de Paso 2; rewrite ángulo S4 más adelante.
- [x] #15 POSPONER — fuera de este lote por riesgo legal.
- [x] Paso 2 autorizado: **solo Top 5** (prompt de implementación del lote).

### Checklist Paso 2 (lote Top 5) — hecho

| # | slug | seed+BD | metas/kw | HTML H2 | chatbot_* | imagen `/img/taller/` |
|---|------|---------|----------|---------|-----------|------------------------|
| 8 | `que-aprendere-en-mi-primera-clase-…` | [x] | [x] | [x] | [x] | `primera-clase-surf-teoria-arena.webp` |
| 6 | `que-debo-tener-en-cuenta-al-reservar-…` | [x] | [x] | [x] | [x] | `reservar-clase-surf-checklist.webp` |
| 4 | `cual-es-la-tabla-de-surf-ideal-para-aprender` | [x] | [x] | [x] | [x] | `softboard-tabla-principiantes-espuma.webp` |
| 2 | `guia-practica-como-reparar-una-tabla-de-surf` | [x] | [x] | [x] | [x] | `reparar-tabla-surf-solarez-paso-a-paso.webp` |
| 11 | `guia-completa-partes-de-una-tabla-de-surf-…` | [x] | [x] | [x] | [x] | `partes-tabla-surf-diagrama-etiquetado.webp` |

*Fecha Paso 2:* 2026-07-25. Fuera de alcance: #1 y #15 (POSPONER) y resto de artículos.

### Checklist Paso 2 (lote 2 — cola APROBADA) — hecho

| # | slug | seed+BD | metas/kw | HTML H2 | chatbot_* | imagen `/img/taller/` |
|---|------|---------|----------|---------|-----------|------------------------|
| 7 | `guia-de-corrientes-en-la-playa-…` | [x] | [x] | [x] | [x] | `corrientes-resaca-playa-senales.webp` |
| 10 | `a-que-edad-puede-un-nino-…` | [x] | [x] | [x] | [x] | `ninos-iniciacion-surf-playa.webp` |
| 12 | `medidas-de-las-tablas-de-surf-…` | [x] | [x] | [x] | [x] | `volumen-litros-tabla-surf-guia.webp` |
| 3 | `manual-de-surf-seguridad-…` | [x] | [x] | [x] | [x] | `normas-prioridad-surf-lineup.webp` |

*Fecha lote 2:* 2026-07-25. Ángulos: #7 sin Zurriola en meta_title; #12 métricas only (+enlace #4/#11); #3 etiqueta (no #14); #10 familias + CTA clases.

### Checklist Paso 2 (lote 3 — cola APROBADA restante) — hecho

| # | slug | seed+BD | metas/kw | HTML H2 | chatbot_* | imagen `/img/taller/` |
|---|------|---------|----------|---------|-----------|------------------------|
| 5 | `como-saber-si-tu-tabla-…-pequena` | [x] | [x] | [x] | [x] | `progresion-cambiar-tabla-surf.webp` |
| 9 | `de-que-materiales-esta-hecha-…` | [x] | [x] | [x] | [x] | `materiales-tabla-surf-epoxi-poliester.webp` |
| 13 | `guia-de-olas-y-rompientes-…` | [x] | [x] | [x] | [x] | `tipos-rompientes-beach-reef-point.webp` |
| 14 | `donde-colocarse-en-el-agua-…` | [x] | [x] | [x] | [x] | `posicionamiento-pico-surf-referencias.webp` |
| 16 | `como-hacer-el-pato-en-surf-…` | [x] | [x] | [x] | [x] | `duck-dive-pato-surf-tecnica.webp` |
| 17 | `como-interpretar-el-parte-de-olas-…` | [x] | [x] | [x] | [x] | `interpretar-parte-olas-periodo-swell.webp` |
| 18 | `como-saber-en-que-direccion-rompe-…` | [x] | [x] | [x] | [x] | `ola-derecha-izquierda-explicacion.webp` |

*Fecha lote 3:* 2026-07-25. **16/18 SEO-listos.** Pendientes POSPONER: #1 (kit/originalidad), #15 (titulación/legal).

### Regen WebP (post lote 3) — hecho

| # | archivo | nota |
|---|---------|------|
| 13 | `tipos-rompientes-beach-reef-point.webp` | Foto costa sin tipografía IA |
| 17 | `interpretar-parte-olas-periodo-swell.webp` | Still life cuaderno+mar (sin UI de app) |
| 11 | `partes-tabla-surf-diagrama-etiquetado.webp` | Diagrama limpio etiquetado ES |

*Fecha regen:* 2026-07-25. #1/#15 intactos.

### Lote estructura 1 — hecho

Pase de lectura HTML (sin cambiar metas/kw/imágenes) en: **#8, #6, #4, #10, #2**.  
Mejoras: H2/H3 reales, párrafos cortos, un concepto por `<li>`, FAQ/pasos en H3.

*Fecha:* 2026-07-25.

### Lote estructura 2 — hecho

Pase de lectura HTML (sin cambiar metas/kw/imágenes) en: **#7, #3, #14, #17, #13**.  
Ángulos anti-canibalización respetados; H2/H3 y listas limpias.

*Fecha:* 2026-07-25.

### Lote estructura 3 — hecho · 16/16 APROBADO maquetados

Pase de lectura HTML (sin cambiar metas/kw/imágenes) en: **#5, #12, #9, #11, #16, #18**.  
Con estructura 1 + 2 + 3: **16/16 APROBADO** con jerarquía limpia. Pendientes solo **#1** y **#15** (POSPONER).

*Fecha:* 2026-07-25.

### Paso 4 técnico — hecho

Cableado SEO Taller: `PublicPageSeoService::tallerIndex()` / `tallerArticle()` → `SeoMetaDto` → `SeoHead` en Index/Show.  
Canonical + og:image + JSON-LD Article. Sitemap verificado (18 slugs + índice). Detalle: `docs/taller-seo/SEO_DONE.md`.

*Fecha:* 2026-07-25.

---

## 3) Gaps de imágenes

| Métrica | Valor |
|---------|-------|
| Artículos totales | 18 |
| Con `<img>` en `content` (Paso 2 Top 5 + lotes 2–3) | **16/16** APROBADO hechos (`public/img/taller/*.webp`) |
| Resto sin imagen en content | **2/18** (#1 y #15 POSPONER) |
| Sin cover_image en modelo Article | **18/18** (campo no existe / no usado) |
| Propuesta cola posterior | 1 imagen hero por artículo restante + diagramas en #13, #18, #7, #16 |

**Imágenes Top 5:** generadas IA + alt de matriz; convertidas a WebP real en `public/img/taller/`.

---

## 4) Resumen de hallazgos SERP (sin métricas inventadas)

Patrones dominantes observados en resultados ES (blogs de escuelas, tiendas y medios surf):

1. **Títulos tipo pregunta o “cómo / guía / checklist”** — alineados con PAA (“qué llevar”, “cuándo cambiar”, “cómo detectar”, “derecha o izquierda”).
2. **Listas y pasos numerados** con H2/H3 reales (no pasos metidos en un solo `<h2>` multilínea).
3. **Softboard + volumen/litros** aparecen una y otra vez en guías de iniciación y medidas; conviene **separar** tipo de tabla (#4) vs métricas (#12).
4. **Seguridad y etiqueta** (prioridad, no drop-in, localismo) son pilares de escuelas ES; buen encaje editorial S4.
5. **Forecast:** el **período** se trata como dato más decisivo que la altura sola.
6. **Titulación España:** la SERP mezcla blogs explicativos con **fuentes oficiales** (BOE / FESurfing); el artículo #15 debe anclarse ahí.
7. **Local Zurriola/Donostia:** aporta en piezas de **clases/familias/reserva**; en guías técnicas puras (materiales, duck dive, forecast) forzar local diluye intención.
8. **Riesgo de contenido duplicado:** el artículo #1 presenta solapamiento fuerte con guías públicas locales del mismo tema; validar autoría antes de empujar SEO.

---

## Notas para Fase 2 (lote Top 5 — autorizado)

**Alcance:** solo #8, #6, #4, #2, #11. No tocar #1 ni #15 (POSPONER) ni el resto en este lote.

### Keywords (ya analizados en Paso 1 — obligatorios)

Cada fila del Top 5 ya tiene en la matriz: `intent_busqueda`, `kw_principal` (única), `kw_secundarias`, `meta_*_propuesto`, `confianza_kw`, mapa anti-canibalización.  
En Paso 2 **no rehacer** el keyword research: **aplicar** esas columnas en title/meta/H2/copy/`chatbot_*` y respetar ángulos vs #12/#6/#8.

### Imágenes (IA — decisión humana)

Si no hay asset real: **generar con IA** una imagen coherente con el tema (estilo editorial surf, sin texto ilegible, sin logos inventados), guardar en `public/img/taller/` con el `imagen_filename_propuesto` de la matriz, insertar `<figure><img src="…" alt="…">` usando `alt_propuesto` (ajustable si hace falta). No dejar gap vacío en el lote Top 5.

### Resto

- Reescribir metas según columnas `meta_*_propuesto` de la matriz.
- Reparar jerarquía HTML (H2/H3, listas).
- Cerrar títulos con `?` donde falte (#4, #6).
- Rellenar `chatbot_*` alineado a `kw_principal` / resumen de intención.
- Enlaces internos: #6↔#8; #4↔#12 (mencionar medidas sin canibalizar); #2→taller Edy si aplica.
- Respetar ángulos: #4 tipo/softboard (sin litros); #6 checklist reserva; #8 día 1/FAQ.

---

*Documento generado en modo auditoría + Paso 1b cerrado. Paso 2 = implementación del lote Top 5.*
