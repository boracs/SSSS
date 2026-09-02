# Prompt Cursor — P0-1: CTA único en /servicios/webcams (S10)

> Fuente: hallazgo P0-1 del agente marketing (2026-08-28) con datos GSC/GA de zurriolacam.
> Formato: `PLANTILLA-UX-MODAL.md` (UI-only, sin lógica). Estado en `COORDINACION.md`: PENDIENTE Cursor.

---

ROL: FE React/Inertia (público S4, fondos oscuros, acento cyan).

OBJETIVO: En `resources/js/Pages/Servicios_Webcams.jsx`, añadir UN CTA primario único de
conversión hacia las clases, al final del bloque de parte/forecast (justo después de
`<SurfBriefCard brief={surfBrief} />`, dentro de la sección de forecast). Sin tocar
lógica ni props existentes.

PRE-CHECK: 1) Leer `docs/taller-prompts/COORDINACION.md` — la fila «P0-1 CTA único en
/servicios/webcams» está PENDIENTE Cursor; si ya estuviera HECHO y el código lo cumple →
responder "Ya implementado" + evidencias; no tocar. Si no → reclamarla EN CURSO.
2) Leer `resources/js/Pages/Servicios_Webcams.jsx`; localizar por BLOQUE (sección
`id={FORECAST_ANCHOR_ID}`, final tras SurfBriefCard), NO por números de línea.

CONTEXTO (no inventar): Página pública de webcams (ruta `servicios.webcams`), diseño
s4-surface-dark con acentos cyan. CTA estático: no requiere props nuevas; enlaza con
`route("servicios.surf")`. Sin dinero implicado. Regla AP-8: un solo CTA primario por
pantalla — NO añadir CTAs secundarios ni banners que compitan en hero o en la webcam.
Voz de marca S4: imperativo («Reserva», «Alquila»), sin urgencia falsa (AP-7).

TAREAS:
1) Añadir el bloque CTA tras `SurfBriefCard` (cierre de la sección forecast):
   copy definitivo: «¿Hoy es tu día? Reserva tu clase de surf» + botón primario
   «Reservar mi clase» → `/servicios/surf`.
2) Estilo: botón primario del proyecto coherente con la página (fondo cyan sólido,
   texto oscuro, hover, focus-visible; target táctil ≥ 44 px; en móvil ancho completo,
   en sm+ auto; separación vertical coherente con el espaciado de la sección).
3) A11y: focus-visible; aria-label solo si el texto visible no basta.
4) No duplicar el CTA en ningún otro bloque de la página.
5) COORDINACION: marcar la fila P0-1 como HECHO (Cursor) al cerrar + build.

RESTRICCIONES: Solo UI/JSX de `Servicios_Webcams.jsx` (+ clases Tailwind inline si
hace falta). No backend, no nuevas dependencias, no archivos nuevos, no cambiar
props/payload (`surfBrief`, `surfDays`, `weatherData`, etc. intactos). No tocar
bloques vecinos (hero, webcam, WeatherDetailPanel, overlays, TallerGuideRail,
ZurriolaGeoGuide).

SALIDA: 1) Archivos tocados o "ya implementado". 2) Resumen/evidencia.
3) `npm run build` + diff confirmando que NO cambian props. 4) Riesgos o "ninguna".

CRITERIOS:
- [ ] pre-check respetado (COORDINACION: PENDIENTE → EN CURSO → HECHO)
- [ ] CTA único tras el parte, sin duplicados en hero/webcam
- [ ] enlace correcto a la ruta `servicios.surf`
- [ ] target ≥ 44 px + focus-visible
- [ ] responsive: móvil full-width, sm+ auto
- [ ] props/payload intactos (diff)
- [ ] build OK
