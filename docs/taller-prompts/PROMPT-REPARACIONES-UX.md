# Prompt — UX/CRO + a11y páginas reparación (Edy / Willy)

Destino: **Cursor** (repo). Lote único de quick wins de la auditoría 2026-08-30. No es rediseño de proceso ni de URL.

Pegar el bloque siguiente en un chat nuevo de Cursor.

---

```
ROL: Ingeniero Laravel 12 + React 19/Inertia 2. Implementas el lote UX/CRO/a11y de las landings de reparación. No rediseñas el proceso de negocio.

OBJETIVO: En `/servicios` (tablas/Edy) y `/servicios/reparacion-neoprenos` (neoprenos/Willy) deja un CTA primario por pantalla, camino a taquilla para no-socios, banner de contacto debajo del H1, enlaces cruzados, WhatsApp del reparador (no de la escuela si existe), y a11y mínima (44 px + disclosure). Extrae el StepCard duplicado.

PRE-CHECK:
1. Lee `docs/taller-prompts/COORDINACION.md` (Estado actual + Última actividad). Si esta tarea ya está HECHO y el código cumple los criterios → responde «Ya implementado» + evidencias; no toques. Si no → reclama EN CURSO.
2. No pises L1 Stripe ni pagos. No toques `app/Services/Payments/**`, webhooks ni checkout.
3. Lee `docs/PROJECT_TREE_FOR_GEMINI.md` antes de crear rutas. Localiza por bloque (nombre de sección / constante / JSX), no por número de línea.
4. Lee antes de editar: `resources/js/Pages/Servicios.jsx`, `resources/js/Pages/Servicios_ReparacionNeoprenos.jsx`, `resources/js/components/ContactBlock.jsx`, `resources/js/components/S4Button.jsx`, `resources/css/app.css` (bloque `.s4-btn--md`), closures `servicios` y `servicios.reparacionNeoprenos` en `routes/web.php`, `PublicPageSeoService::serviciosReparacionNeoprenos()`.

<<<CONTEXTO
Stack: Laravel 12, React 19, Inertia 2, Tailwind 3, S4Button + PageShell.
Rutas: GET /servicios (name servicios) · GET /servicios/reparacion-neoprenos (name servicios.reparacionNeoprenos).
Props actuales (NO renombrar keys): whatsappHelpUrl, edyContact | willyContact (name, phone, phoneTel, email, whatsappUrl), seo.
Contacto real: config services.repair.edy / services.repair.willy; URLs WhatsApp ya vienen en *.whatsappUrl.
Taquillas públicas: route("taquillas.planes").
Taller DIY tablas: route("taller.show", "guia-practica-como-reparar-una-tabla-de-surf").
ContactBlock.jsx solo lo usan estas dos páginas (Footer.jsx tiene OTRA función local homónima: no la toques).
PageShell: tablas variant="dark"; neoprenos variant="royal". Conservar.
Un H1 por página. SeoHead se queda. Cero JSON-LD/metas en JSX (.cursor/rules/seo-geo-public.mdc).
Hallazgos origen (IDs): M-P0-1, M-P1-2, M-P1-4, M-P1-5, M-P1-6, F-P1-1, F-P1-2, F-P1-3, F-P2-4, F-P2-5 + title neoprenos (M-P2-8 parcial).
CONTEXTO>>>

TAREAS (orden):

1) Extrae StepCard duplicado a `resources/js/components/RepairStepCard.jsx`.
   Props: step, icon, title, body, highlight, isLast, accent ("cyan" | "violet").
   En ambas páginas envuelve los pasos en <ol> (un <li> por paso). Iconos decorativos: aria-hidden.
   Actualiza solo la fila de components en PROJECT_TREE_FOR_GEMINI.md.

2) ContactBlock.jsx (compartido de reparación, no el del Footer):
   - Botón: min-h-11; conservar aria-expanded.
   - aria-controls + id estable del panel (p. ej. contact-panel-{slug del fallbackName}).
   - Iconos del panel: aria-hidden.

3) `.s4-btn--md` en app.css: añade min-h-11. No toques --sm ni el kit admin.

4) Hero de ambas (bloque H1 + lead + CTAs). Orden visual obligatorio:
   badge → H1 → lead → banner ContactBlock (solo si hay teléfono/email/whatsapp) → CTAs.
   El banner ámbar NO puede ir encima del H1.
   Copy y jerarquía FIJOS (no inventes variantes):
   TABLAS:
   - Primario (S4Button accent): «Así se deja la tabla» → #como-funciona
   - Secundario (S4Button secondary, peso visual menor): «Ver planes de taquilla» → route("taquillas.planes")
   - Links de texto (no S4Button): «También reparamos neoprenos» → servicios.reparacionNeoprenos; «Instalaciones del club» → nosotros#taller-edy-mulder; «Toques pequeños en casa» → taller.show slug guia-practica-como-reparar-una-tabla-de-surf
   NEOPRENOS:
   - Primario: «Así se deja el traje» → #como-funciona
   - Secundario: «Ver planes de taquilla» → taquillas.planes
   - Link de texto: «Reparación de tablas» → servicios
   Prohibido ExternalLink en rutas internas.

5) Bloque valor neoprenos: añade tarjeta «¿Quién puede usarlo?» espejo de tablas (servicio para socios con taquilla + link «Ver planes de taquilla»). Conserva el texto de perchas (párrafo extra o card aparte, no lo borres).

6) CTA final (bloque dudas):
   TABLAS: un solo primario WhatsApp. href = edyContact.whatsappUrl si existe; si no, whatsappHelpUrl de escuela con el texto actual de duda Edy. Label: «WhatsApp Edy» si usas edy; «WhatsApp» si fallback escuela. Secundario: «Formulario de contacto». Quita el tercer S4Button «Conocer el club».
   NEOPRENOS: un solo WhatsApp. Prioridad willyContact.whatsappUrl («WhatsApp Willy»); si no hay, escuela («WhatsApp S4»). No muestres los dos. Secundario: formulario de contacto.
   Si montas query ?text= sobre whatsappHelpUrl, usa URL + searchParams. No hagas split("?")[0].

7) SEO contenido (1 línea): en PublicPageSeoService::serviciosReparacionNeoprenos() deja title = «Reparación de neoprenos en Zurriola | San Sebastian Surf School». No toques jsonLd, no añadas FAQ/HowTo/Breadcrumb, no cambies path.

8) Cierra en COORDINACION (HECHO + 1 línea en Última actividad). npm run build. Verifica en navegador /servicios y /servicios/reparacion-neoprenos (hero, ancla #como-funciona, ContactBlock teclado, ambos WhatsApp).

RESTRICCIONES:
- UI + 1 title SEO. Cero precios, plazos nuevos, reseñas o fotos inventadas.
- No muevas /servicios a otra URL. No crees hub de servicios.
- No toques payload keys, closures de contacto (salvo que debas leer whatsappUrl ya existente), L1 Stripe, Footer.jsx, GlobalNav, chatbot, tests de pagos.
- No nuevas dependencias. No JSON-LD en JSX. No cambies PageShell variant.
- No refactorices a DTO las props de contacto en este lote.
- Si un dato no está en código/config, escribe DESCONOCIDO; no lo deduzcas.

FORMATO DE SALIDA:
1. Archivos tocados (o «Ya implementado»).
2. Resumen por ID de hallazgo (M-P0-1 …) → hecho / no aplica + 1 evidencia.
3. Diff de keys Inertia: lista keys antes/después (deben ser las mismas).
4. Comando build + resultado.
5. Riesgos o «ninguna».

CRITERIOS:
- [ ] Banner contacto debajo del H1+lead en ambas
- [ ] 1 S4Button accent en hero; taquilla es el secundario; cruces son <a>/Link de texto
- [ ] Neoprenos tiene camino a taquillas
- [ ] Tablas enlaza a neoprenos + Taller DIY; neoprenos enlaza a tablas
- [ ] Footer tablas: WhatsApp Edy si hay edy.whatsappUrl; sin tercer botón
- [ ] Footer neoprenos: un solo WhatsApp
- [ ] ContactBlock: min-h-11 + aria-controls/id
- [ ] .s4-btn--md tiene min-h-11
- [ ] Cero ExternalLink en links internos de estas páginas
- [ ] RepairStepCard extraído; pasos en <ol>
- [ ] Title neoprenos con Zurriola; jsonLd intacto
- [ ] Keys payload sin cambio
- [ ] Build OK + COORDINACION cerrado
- [ ] Verificado en las dos URLs (no solo captura)

AUTONOMÍA: Decide clases Tailwind de los links de texto (cyan/violet según página) y si perchas queda en la card «quién» o al lado. Pregunta solo si falta una foto real o si el dueño quiere mover /servicios. No implementes FAQ/HowTo/fotos en este lote.

VERIFICACIÓN (antes de dar por cerrado): abre ambas URLs, pulsa el CTA primario (scroll a #como-funciona), abre/cierra ContactBlock con teclado, confirma que el WhatsApp del pie no es la escuela cuando el reparador tiene whatsappUrl. Si no puedes abrir el navegador, dilo y verifica con el HTML renderizado.
```
