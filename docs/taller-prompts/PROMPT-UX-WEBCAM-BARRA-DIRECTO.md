# Prompt UX — Barra de la webcam Diputación vs percepción de «en directo»

> **Destino:** Reasonix `/marketing-diseno`.
> **Cadena:** FASE A = marketing (S1 + S6 + S7) → FASE B = UX frontend (S3 + S5 + S10). Misma sesión; no esperar otro chat.
> **No implementar código aquí.** Cursor no toca el player hasta veredicto.
> **Estado:** ejecutado Cursor · 2026-08-24 (P2: barra DVR + Volver al directo).

## Duda del dueño

La webcam de Zurriola viene de la **Diputación de Gipuzkoa**. En el player oficial suele haber una **barra abajo** para ir adelante/atrás. Quiere esa barra en S4, pero teme que la gente piense que **no es en directo** (parece un vídeo grabado tipo YouTube).

---

## Prompt (copiar desde aquí)

```
1. ROL
Eres el agente senior Marketing + Diseño Web S4 (docs/taller-prompts/AGENTE-MARKETING-DISENO.md). Skills: FASE A = S1 + S6 + S7 (modo público). FASE B = S3 + S5 + S10 (UX frontend de la misma persona; no hay otro agente). No implementas código.

2. OBJETIVO
Resuelve la tensión: barra de reproducción (adelante/atrás) en la webcam vs percepción de señal EN DIRECTO. Entrega un patrón ganador + copy + specs para Cursor, o un «no pongas barra» justificado.

3. CONTEXTO
- Página: /servicios/webcams (`resources/js/Pages/Servicios_Webcams.jsx`), ancla `#webcam-directo`.
- Player S4: `resources/js/components/webcam/ZurriolaWebcamPlayer.jsx`. HLS propio (`hls.js`, lowLatencyMode), vídeo HTML5 con `controls={false}`: HOY no hay barra de seek. Sí hay badge «En directo», zoom +/−, fullscreen, fallback offline.
- Fuente: stream Gipuzkoa `…/camaramar/GIP_zurriola_169.stream/playlist.m3u8`. Crédito «Fuente oficial Gipuzkoa» → `https://www.gipuzkoa.eus/es/web/hondartzak/webcams/zurriola`.
- El player de la Diputación (sitio oficial) suele mostrar controles nativos (barra). Eso es lo que el dueño quiere «traer».
- Público: surfistas que miran si hay ola AHORA para decidir ir a Zurriola / clase. Confundir live con replay = pérdida de confianza y llamadas al club.
- Doctrina: el estado se muestra, no se esconde. Una pantalla, un objetivo primario = ver la playa ahora.

4. ENTRADAS
<<<DUDA_DUENO
Quiero la barra debajo para mover adelante/atrás, pero puede generar confusión y que la gente piense que no es en directo. ¿Cómo gestionarlo?
DUDA_DUENO>>>

<<<ESTADO_S4
ZurriolaWebcamPlayer: controls=false; status live|loading|error; pill «En directo» solo si status===live; sin timeline; sin botón «volver al vivo».
ESTADO_S4>>>

Adjunta captura: (1) player S4 actual, (2) player de gipuzkoa.eus si puedes. Si falta captura: DESCONOCIDO de px; trabaja con ESTADO_S4. Duración de la ventana DVR del HLS: DESCONOCIDO hasta que FASE B lo marque «requiere prueba en red» — no inventes minutos.

5. TAREAS
FASE A — Marketing (primero):
1) Nota 0–10 solo de confianza «¿esto es live?» (rúbrica §5, ejes jerarquía + claridad + estados).
2) Riesgo CRO: barra tipo VOD vs badge live. ¿La barra ayuda (revisar la última serie) o destruye (parece grabación)?
3) Elige UN patrón ganador (no empate):
   P1 Sin barra (status quo). Zoom/fullscreen bastan.
   P2 Barra DVR + copy live fuerte + CTA «Volver al directo» cuando no estás en el borde live.
   P3 Controles nativos del vídeo (`controls`) tal cual Diputación.
   P4 Barra solo en fullscreen; en vista página sin barra.
4) Microcopy ES (S6): badge, hint bajo el H2 «Señal en directo», label de la barra, vacío/error. Sin prometer rewind de horas si DVR es corto.
5) Decisión ejecutiva A (2–3 líneas).

FASE B — UX frontend (mismo mensaje, sin preguntar si continúas):
6) Viabilidad: nativos vs barra custom en el player actual. Si P2/P3/P4: wireframe ASCII (página + fullscreen). Hits ≥ 44 px. Contraste AA del badge LIVE.
7) Qué no tocar: URL del stream, crédito Gipuzkoa, HLS source, offline image, zoom.
8) Si el ganador necesita saber cuántos segundos se puede rebobinar: marca «requiere medición HLS (liveSyncPosition)» para Cursor; no inventes el número.
9) Prompt S10 para Cursor: un bloque. Locator por bloque en ZurriolaWebcamPlayer.jsx (cabecera live, <video>, overlay). Pre-check COORDINACION. Sin backend.

6. RESTRICCIONES
- No código. No cambiar la URL del stream ni quitar el crédito Diputación.
- No librerías de player nuevas salvo justificación de 1 línea (preferir hls.js ya cargado + UI propia).
- No decir que «es 100 % live» si hay DVR: dilo con honestidad (directo + puedes ir unos minutos atrás).
- Español de España. Números antes que adjetivos.
- Si un dato no está: DESCONOCIDO.

7. FORMATO
A. Diagnóstico (nota + 1 párrafo: live vs VOD).
B. Patrón ganador (P1–P4) + por qué.
C. Microcopy final (listo para pegar).
D. Wireframe si hay barra (desktop + móvil).
E. Prompt Cursor S10 o «no implementar».
F. Checklist aceptación (8 ítems).

8. ACEPTACIÓN
- Un ganador.
- Queda claro cómo se evita «parece un YouTube».
- Cursor sabe si pone controls nativos, barra custom, o nada.
- Copy no promete archivo histórico si no existe.

9. AUTONOMÍA
Elige el patrón. No preguntes si pasas a FASE B: pásate. Pregunta solo si el dueño quiere rewind de horas (archivo) vs minutos (DVR del live) — y aun así recomienda uno por defecto: DVR corto, no archivo.

10. VERIFICACIÓN
¿Un surfista de 16 años entendería en 2 s que está viendo AHORA? ¿La barra contradice ese mensaje o lo acompaña?
```

---

## Instrucciones para el dueño

1. Reasonix → `/marketing-diseno` → pega el **Prompt**.
2. Adjunta captura del player S4 y, si puedes, la barra del sitio de Gipuzkoa.
3. Cuando entregue FASE A+B: **«implementa la barra de la webcam»** (o «no la pongas») según el veredicto.
