---
name: prompt-forge
description: Diseña, audita y refina prompts hasta nivel producción, con rúbrica de puntuación, reescritura iterativa y protocolo de contraste con un segundo modelo (DeepSeek). Usar cuando el usuario pida crear un prompt, mejorar un prompt, "hazme un prompt", pasar algo a DeepSeek o comparar versiones de un prompt.
disable-model-invocation: true
---

# Prompt Forge

Convierte una idea vaga en un prompt ejecutable, verificable y sin ambigüedad.

En este modo **no se escribe código de la aplicación ni se editan archivos del proyecto**: el entregable es el prompt. Solo se leen archivos si hace falta contexto real para redactarlo.

## Flujo obligatorio (4 fases)

### Fase 1 — Capturar intención

Nunca redactes a ciegas. Rellena mentalmente esta ficha; si falta algo **crítico**, pregunta con `AskQuestion` (máximo 3 preguntas, con opciones y una recomendada). Si falta algo secundario, asúmelo y decláralo en "Supuestos".

| Campo | Pregunta interna |
|---|---|
| Objetivo | ¿Qué debe existir/cambiar cuando el prompt se ejecute bien? |
| Destinatario | ¿Agente con herramientas (Cursor) o modelo de chat sin repo (DeepSeek)? |
| Contexto real | ¿Qué rutas, servicios, tablas o ficheros concretos toca? |
| Entradas | ¿Qué datos, ejemplos o fragmentos hay que pegarle? |
| Salida | ¿Código, plan, análisis, texto, JSON? ¿En qué formato exacto? |
| Éxito | ¿Cómo se comprueba objetivamente que salió bien? |
| Límites | ¿Qué NO debe tocar, inventar ni proponer? |

### Fase 2 — Draft v1

Redacta el prompt siguiendo la anatomía de 10 bloques (abajo). Omite bloques que no apliquen; no rellenes por rellenar.

### Fase 3 — Auditoría con rúbrica

Puntúa tu propio draft del 1 al 5 en cada eje. **Cualquier eje por debajo de 4 obliga a reescribir** antes de entregar.

| Eje | Pregunta de control |
|---|---|
| Objetivo | ¿Un tercero sabría qué entregar sin preguntar nada? |
| Contexto | ¿Incluye rutas/nombres reales en vez de "el servicio ese"? |
| Verificabilidad | ¿Los criterios de aceptación se pueden marcar como cumplidos/no cumplidos? |
| Formato | ¿Está definida la estructura exacta de la respuesta? |
| Restricciones | ¿Están cerradas las puertas por las que el modelo suele escaparse? |
| Anti-alucinación | ¿Le obligas a decir "no lo sé" o a leer antes de afirmar? |
| Densidad | ¿Sobra alguna frase? ¿Hay relleno cortés o repeticiones? |
| Autonomía | ¿Queda claro qué decide él y qué te consulta? |

La auditoría es **interna**: no muestres la tabla, las notas ni el proceso de reescritura. El usuario solo ve el resultado. Única excepción: si un eje sigue por debajo de 4 después de reescribir porque falta un dato que solo él tiene, dilo en una línea al entregar.

### Fase 4 — Entrega

Entrega siempre:

1. **El prompt final** en un bloque de código único, listo para copiar, sin comentarios tuyos dentro.
2. **Supuestos** que hiciste (lista corta) — solo si los hubo.
3. **Qué pegar tú** (fragmentos, errores, capturas) si el prompt lo requiere.

## Anatomía del prompt (10 bloques)

```
1. ROL          Quién es y en qué es experto. Una frase. Sin épica.
2. OBJETIVO     Qué debe existir al terminar. En imperativo y medible.
3. CONTEXTO     Stack, rutas reales, restricciones del entorno, estado actual.
4. ENTRADAS     Datos/ficheros/ejemplos que recibe. Marcados con delimitadores.
5. TAREAS       Pasos numerados en orden de ejecución.
6. RESTRICCIONES  Prohibiciones explícitas y límites de alcance.
7. FORMATO      Estructura exacta de la salida (secciones, orden, longitud).
8. ACEPTACIÓN   Checklist verificable de "esto está bien si...".
9. AUTONOMÍA    Qué decide solo, qué pregunta, cuándo se detiene.
10. VERIFICACIÓN  Qué debe revisar antes de responder (autoauditoría).
```

## Reglas de redacción

- **Imperativo, segunda persona.** "Genera el DTO", no "podrías generar un DTO".
- **Positivo antes que negativo.** Di qué hacer; reserva las prohibiciones para el bloque de restricciones.
- **Nombres reales.** `app/Services/Rentals/RentalPolicyService.php`, no "el servicio de alquileres".
- **Números en vez de adjetivos.** "Máximo 3 opciones", no "pocas opciones".
- **Un ejemplo vale más que tres párrafos.** Si el formato es delicado, incluye un ejemplo de salida.
- **Delimitadores** para el contenido pegado: `<<<CONTEXTO ... CONTEXTO>>>`.
- **Cláusula anti-invención** siempre que haya riesgo factual: "Si un dato no está en el contexto, escribe `DESCONOCIDO`; no lo deduzcas."
- **Sin cortesía.** "Por favor", "muchas gracias", "eres el mejor" son tokens desperdiciados.
- Idioma del prompt: **español**, salvo que el usuario pida otro.

## Antipatrones (rechazar en la auditoría)

| Antipatrón | Arreglo |
|---|---|
| "Hazlo lo mejor posible" | Criterios de aceptación concretos |
| "Ten en cuenta el proyecto" | Rutas y ficheros exactos |
| Rol inflado de 5 líneas | Una frase de rol |
| Formato implícito | Plantilla de salida literal |
| Todo en un párrafo | Bloques con encabezados |
| Pedir 6 cosas a la vez | Trocear en prompts encadenados |
| Contexto pegado sin delimitar | `<<<...>>>` |
| Repetir la misma instrucción 3 veces | Decirla una vez, en su bloque |

## Protocolo dúo con DeepSeek

Este flujo es para contrastar el prompt con un segundo modelo. Tú (Cursor) tienes el repo; DeepSeek no. Por tanto DeepSeek critica y aporta; Cursor decide y consolida.

**Ronda 1 — enviar a crítica.** Genera un bloque copiable con esta estructura:

```
Actúa como auditor de prompts. No ejecutes el prompt: audítalo.

PROMPT A AUDITAR:
<<<PROMPT
[prompt v1]
PROMPT>>>

CONTEXTO DE USO: [modelo destino, con/sin acceso al repo, objetivo real]

Devuelve exactamente:
1. Fallos por eje (objetivo, contexto, verificabilidad, formato, restricciones,
   anti-alucinación, densidad, autonomía). Solo ejes con fallo real.
2. Ambigüedades: frase literal + cómo puede malinterpretarse.
3. Instrucciones que faltan y son necesarias.
4. Versión reescrita completa.
5. Qué recortarías sin perder precisión.

Prohibido: elogios, resúmenes de lo que hace bien, preámbulos.
```

**Ronda 2 — consolidar.** Cuando el usuario pegue la respuesta de DeepSeek:

1. Clasifica cada sugerencia: **acepto / rechazo / adapto**, una línea de motivo cada una.
2. Rechaza lo que contradiga el repo real (DeepSeek no lo ve) o lo que añada palabrería.
3. Emite el **prompt v3 consolidado** y vuelve a pasar la rúbrica de la Fase 3.

Regla de arbitraje: ante empate entre tu versión y la de DeepSeek, gana la que sea **más verificable**; en segundo lugar, la más corta.

## Prompts para agentes de este repo

Cuando el prompt vaya dirigido a un agente que va a tocar `maider_0`, añade al bloque CONTEXTO:

- Stack: Laravel 11 (PHP 8.2+), React 19 + Inertia 2, MySQL/XAMPP, Tailwind.
- "Lee `docs/PROJECT_TREE_FOR_GEMINI.md` antes de proponer rutas; no inventes directorios."
- "Antes de tocar archivos, lee `docs/taller-prompts/COORDINACION.md` (Estado actual + Última actividad): no repitas, solapes ni pises trabajo ya hecho; reclama la tarea y ciérrala al terminar."
- Arquitectura: DTOs readonly, Service Layer, Actions, eventos + listeners encolados, `DB::transaction()` y `lockForUpdate()` en reservas/inventario/saldos, dinero en int (céntimos).
- Skill/regla aplicable si toca: `sovereign-architect-protocol`, `.cursor/rules/chatbot-s4.mdc`, `.cursor/rules/seo-geo-public.mdc`, `.cursor/rules/tunnel-share-modes.mdc`.

## Plantillas por tipo de tarea

Para el esqueleto concreto según el tipo de encargo (feature, bug, refactor, auditoría, investigación, generación de texto, extracción de datos), ver [TEMPLATES.md](TEMPLATES.md).
