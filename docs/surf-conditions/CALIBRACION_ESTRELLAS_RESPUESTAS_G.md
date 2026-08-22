# Calibración estrellas — respuestas abiertas (sección G)

Fuente: criterio de la escuela S4 / Zurriola (2026-08), redactado a partir de las respuestas del equipo.  
Uso: reglas de negocio para **estrellas por nivel** y para el razonamiento del parte / forecast.  
No es el resumen corto del chat: aquí va el **detalle operativo**.

**Arquitectura (2026-08-19):** las estrellas las calcula PHP (`SurfLevelQualityStarsService`) leyendo `zurriola-spot-logistics.json` (`stars` por banda kJ + `star_modifiers`: viento sur fuerte, rip del espigón, periodo largo en verano). Gemini del parte recibe esas mismas notas y no debe contradecirlas. Este documento sigue siendo el criterio humano; si cambia G1–G4, actualiza el JSON.

---

## G1 — Viento sur (offshore): ¿cuándo deja de limpiar?

Sí existe un umbral: a partir de unos **20 km/h** el viento sur empieza a molestar.

Pero **no es un corte fijo para todos los días**. Depende mucho de la fuerza y del tamaño:

- Si hay **poca fuerza y poco tamaño** (olas de menos de ~1 m y energía por debajo de ~200 kJ), el sur fuerte **frena** al surfista, no hay tubo y **no merece la pena**.
- Si el mar está **más grande y con fuerza**, la ola **sigue tubeando**: el viento no te frena del todo y la sesión puede seguir siendo buena. En ese caso se puede surfear incluso con sur alto (orientativamente hasta ~30 km/h) porque hay masa y tubo.

### Escala práctica de viento (sobre todo sur / glassy)

| Situación | Lectura |
|-----------|---------|
| Glassy **−5 / 0 / +5 km/h** (si pasa de 5 al sur o al norte, ya no) | Calma real; **8 km/h no es glass** |
| Sur ~**5 km/h** | Ideal |
| Sur **10–15 km/h** | Notable; si hay olas grandes, muy usable |
| Sur **≥15–20 km/h** + mar pequeño (&lt;1 m / &lt;200 kJ) | Demasiado: frena mucho y no compensa |
| Sur hasta ~**30 km/h** + mar grande con fuerza | Aún surfeable; puede haber tubos |

### Norte (onshore) — va junto a G1/G6

- Norte **&gt; ~10 km/h**: empeora de forma notable (mar rizándose / picado).
- Norte **&gt; ~15–20 km/h**: **horrible** para la calidad: todo revuelto. Puede ser “surfeable”, pero muy picado; **pocas veces merece la pena**, tanto si el mar es pequeño, medio o grande.

---

## G2 — Corriente de retorno del espigón (referencia ≥1800 kJ en JSON)

**No** debe forzar siempre el mismo tope bajo de estrellas (p. ej. máximo 2) para todos.

### Por nivel

- **Iniciación:** esa corriente, si está muy fuerte, es **traicionera y peligrosa**. Cuantas más olas hay, más agua entra hacia la playa; al tener que salir, genera corrientes fuertes. Para iniciación son más peligrosas.
- **Intermedio / avanzado:** esas mismas corrientes pueden ser **ideales si se saben utilizar**. No se debe castigar la nota igual que a iniciación.

### Matiz de marea (muy importante)

Con **marea alta**, la corriente del espigón suele ser **más suave / moderada** y no tan peligrosa.  
En ese contexto, con unos **~800 kJ** de fuerza, a veces se puede valorar entrar incluso con niveles de **iniciación** (zona resguardada), porque la corriente no está tan agresiva como en otras mareas con la misma energía.

---

## G3 — Franja “Desfasado” (&gt;2500 kJ)

**No siempre 1 estrella.** Tiene que haber valoraciones distintas según nivel:

| Nivel | Orientación de estrellas / consejo |
|-------|-------------------------------------|
| **Avanzado** | Puede ser **3** estrellas e incluso **4**, pero al límite del desfase. |
| **Intermedio** | Alrededor de **2** estrellas. |
| **Iniciación** | En **espumas** podría llegar a ~**3**. Para **subir arriba** y coger olas sin romper: **0** — subir implica exponerse a corrientes que ya son peligrosas para intermedio; imagina para iniciación. |

**Fuerza ideal para avanzado en Zurriola:** más o menos **500–1300 kJ**, dependiendo del punto de marea y del resto de factores.

El JSON que dice “evitar Zurriola / ir a La Concha” sigue siendo aviso de seguridad útil, pero **las estrellas no deben aplastar siempre a 1** para avanzado.

---

## G4 — Verano (jun–sep) y periodo largo (&gt;12–14 s)

**Sí, hay que tenerlo en cuenta en las estrellas.**

Motivo (batimetría estacional):

- En **invierno** el fondo es más **irregular** (canales, bancos movidos por temporales). Aunque el periodo sea alto, **cierra menos** en barra.
- En **verano** el fondo queda más **plano**. Con periodos largos (&gt;12–14 s) sube el riesgo de que la ola **cierre en barra**.

Por tanto: **penalizar más el periodo largo en junio–septiembre** que en invierno.

---

## G5 — ¿Una escala de estrellas o varias?

**Varias escalas por nivel.**  
Para el mismo escenario grande/potente, iniciación, intermedio y avanzado no deben ver la misma nota.

En producto (2026-08-19): la tabla y el slider ya muestran **tres filas** de estrellas. El titular del parte sale de esas mismas notas (`headlineFromStars`).

---

## G6 — Si dos variables tiran en direcciones opuestas: ¿qué manda?

Orden de importancia en la cabeza del criterio S4:

1. **Viento** — de lo más decisivo para la nota final.  
2. **Energía / tamaño** — decide si el viento “mata” la sesión o se aguanta, y si hay ola útil.  
3. **Marea** — crítica sobre todo con mar pequeño.  
4. **Periodo** — y su interacción con la estación (fondo de verano/invierno).

### Viento (ampliado)

- Norte &gt;10: notablemente malo; &gt;15–20: horrible casi siempre (ver G1).  
- Glassy 0–5: muy bien, casi independiente de la dirección.  
- Sur: el “malo” depende del tamaño (tabla G1): con mar pequeño, a partir de ~15–20 ya es demasiado; con mar grande, se aguanta más sur.

### Marea (ampliado)

- Mar **pequeño** + mareas **vivas** + **marea alta:** casi no habrá olas unas **2 horas antes y 2 horas después** de la pleamar.  
- Mar pequeño + mareas **muertas:** suele haber olas tanto en alta como en baja.  
- Mar pequeño + marea **media:** cabe la posibilidad de que no haya.  
- Mar **potente** (por encima de ~**500 kJ**): habrá olas tanto en alta como en baja, en vivas y en muertas; la marea **deja de ser tan determinante**.

---

## Cómo usar esto (para no perder detalle)

| Sitio | Qué hay | ¿Le basta a la IA? |
|-------|---------|---------------------|
| Resumen de 6 bullets en el chat | Ultra corto | No |
| Columna `nota_opcional` del CSV (G1–G6) | Frases cortas | Poco |
| **Este archivo `.md`** | Criterio completo | Sí, si se inyecta |
| `zurriola-spot-logistics.json` + guía | Lo que Gemini lee hoy | Hay que **fusionar** aquí el criterio |

Siguiente paso recomendado cuando digas: volcar estas reglas (estructuradas) al JSON de logística + ajustar el servicio de estrellas a **tres escalas por nivel**.
