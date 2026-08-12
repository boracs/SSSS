# 05 · Flujos de trabajo y método

> Técnicas de trabajo: cómo pensar un proceso antes de escribir código, y cómo trabajar con las IAs (tu método de comparar varias). También flujos de negocio ya diseñados que vale la pena recordar.

**Mini-índice:**
- 5.1 Pensar un flujo antes de escribir código
- 5.2 Embudo del chatbot: FAQ → IA → humano
- 5.3 Tu método: comparar varias IAs
- 5.4 Proceso atómico de trabajo con una tarea
- 5.5 Cuaderno compartido: Libro de Aprendizaje (Cursor + DeepSeek) *(entrada de Cursor)*
- 5.6 Memoria y contexto de las IAs
- 5.7 Cómo se consumen los tokens
- 5.8 Cuándo abrir un chat nuevo (el "circulito")
- 5.9 El aviso de reinicio de chat + ritual "guardar y reiniciar"

---

## 5.1 Pensar un flujo antes de escribir código

- **Qué es:** dibujar el recorrido completo de un proceso (quién entra, qué pasa, qué falla, qué se hace con el fallo) **antes** de pedir código a la IA.
- **Por qué importa:** si no tienes claro el flujo, el código que te devuelva la IA tendrá huecos (casos raros, fallos, seguridad). Tu carpeta `flujos_TOTALMENTE_INCOMPLETOS.txt` es el ejemplo de por qué: flujos a medias no sirven.
- **Cómo:** 
  1. Escribir los pasos en orden (texto o diagrama).
  2. Marcar los **puntos de fallo** de cada paso y qué pasa entonces.
  3. Decidir qué es **síncrono** (el usuario espera: validar, reservar) y qué es **asíncrono** (cola: emails, sincronización).
  4. Recién entonces pedir implementación.
- **En tu proyecto:** el flujo del chatbot (5.2) es un buen ejemplo de flujo pensado con capas y fallos.
- **Para recordar:** *primero el flujo con sus fallos; después el código.*

---

## 5.2 Embudo del chatbot: FAQ → IA → humano (patrón de referencia)

- **Qué es:** no dejar que la IA conteste todo siempre. Se intenta responder con datos locales (FAQ, artículos); si no hay respuesta segura, se llama a Gemini con contexto; y si eso falla o es incierto, se **escala a un humano**.
- **Flujo real (resumen):**
  1. Mensaje del usuario → capa 1: **rate limiting** (5 req/min) + **validación/sanitización** (bloquea patrones de riesgo → `REQUIRES_HUMAN`).
  2. Capa de negocio `ChatbotAgentService`: FAQ local regex + artículos → **responde sin IA** si hay match.
  3. Si no → **Gemini** + contexto S4 (`S4BusinessContextService`). Guardrails de certeza: respuesta insegura → degrada.
  4. 2 fallos seguidos o inseguridad → **escalación WhatsApp** con ID de caso; el admin lo gestiona en `/admin/chatbot`.
- **Por qué importa:** ahorra coste de IA, da respuestas 100% seguras cuando se puede, y nunca deja al usuario sin salida (nunca un 500).
- **Para recordar:** *local primero, IA después, humano al final.*

---

## 5.3 Tu método: comparar varias IAs y quedarte con la mejor

- **Qué es:** pedir lo mismo a varias herramientas (DeepSeek/Reasonix, Cursor, Gemini…), comparar, y quedarte con la mejor respuesta.
- **Por qué funciona:** cada IA tiene puntos fuertes; la comparación te da la respuesta más completa y te enseña a detectar cuál es mejor y por qué.
- **Reglas para que funcione:** dar a todas el **mismo contexto** y el **mismo prompt** (si no, no es comparación), y pedir que te **expliquen el porqué**, no solo el código.
- **En tu proyecto:** este repo es un taller de prompts con ese propósito (`docs/taller-prompts/CONTRATO-IA.md` = contrato entre DeepSeek y Cursor para no pisarse).
- **Para recordar:** *mismo prompt + mismo contexto para todas; quédate con la mejor y guarda el porqué aquí.*

---

## 5.4 Proceso atómico de trabajo con una tarea

- **Qué es:** la secuencia que siempre funciona para encargar trabajo técnico (a Cursor o a mí):
  1. **Objetivo** claro en una frase.
  2. **Archivos implicados** (no inventar rutas; mirar `docs/PROJECT_TREE_FOR_GEMINI.md`).
  3. **Reglas del proyecto** que aplicar (V3: atomicidad, idempotencia, zero-logic, DTOs…).
  4. **Casos borde** (qué pasa si falla, si no hay stock, si el usuario no está logueado).
  5. **Verificación** (cómo saber que está bien: probar, ver logs, probar el flujo).
- **Para recordar:** *objetivo → archivos → reglas → bordes → verificación.*

---

## 5.5 Cuaderno compartido: Libro de Aprendizaje (Cursor + DeepSeek)

- **Qué es:** la carpeta `docs/aprendizaje/` es el cuaderno vivo del dueño. **Las dos IAs** (Cursor y Reasonix/DeepSeek) pueden leerlo y guardar entradas nuevas.
- **Por qué importa:** no dependes de un solo chat; la teoría queda en el repo y viaja con Git.
- **Cómo usarlo:**
  1. Preguntas algo de teoría / “qué es X” / “guárdalo”.
  2. La IA lee `INDICE.md`, responde, y si vale la pena **escribe** en el tema 01–06.
  3. En Reasonix puedes invocar `/profesor-aprendizaje`; en Cursor basta con preguntar (está en `.cursorrules`).
- **Para recordar:** *teoría al libro; código a Cursor; diseño a DeepSeek — el cuaderno lo alimentan los dos.*

---

## 5.6 Memoria y contexto de las IAs (por qué no hay que reenviar todo)

- **Qué es:** cada conversación de una IA tiene un **contexto** (todo lo enviado en ese chat). Dentro de la misma conversación lo recuerda todo; pero **cada chat/sesión nueva empieza de cero**. Lo que persiste entre sesiones son: (a) los **archivos del repo en disco**, que la IA con acceso lee cuando los necesita (bajo demanda), y (b) la **memoria interna del agente** (resumen compacto, no el archivo entero).
- **Los 3 niveles de memoria (de verdad):**
  1. **Resúmenes de hechos** (`memory/*.md` en `AppData\Roaming\reasonix\projects\<proyecto>\memory\`) → se cargan al inicio de cada chat nuevo. Compactos y baratos.
  2. **El libro** (`docs/aprendizaje/`) → teoría consultable bajo demanda.
  3. **Transcripciones completas** (`sessions/*.jsonl`) → las preguntas/respuestas literales. **NO se cargan automáticamente**: se leen solo bajo demanda (recuperar algo concreto), porque leer una conversación entera sí es caro.
- **Por qué importa:** la memoria no guarda "las últimas preguntas y respuestas": guarda **resúmenes de lo importante**. Ese es el truco del ahorro — cargar resúmenes (cientos de tokens) en cada chat nuevo, no transcripciones (miles). Así el "contexto extra" de arrancar un chat nuevo es mínimo, y por eso se puede relacionar un chat nuevo con lo aprendido en los anteriores sin gastar de más.
- **En tu proyecto:** el contrato del taller exige "contexto por demanda" (no volcar todos los `.md`; leer solo lo necesario). `COORDINACION.md` = reparto de zonas (quién toca qué) para no pisarse ni tener que reenviar todo.
- **Para recordar:** *el contexto vive dentro de la conversación; entre conversaciones viven los resúmenes y los archivos. Resúmenes siempre, transcripciones solo cuando haga falta.*

---

## 5.7 Cómo se consumen los tokens (el "cobro" real)

- **Qué es:** los tokens se cobran por **procesar**, no por guardar. En cada respuesta, la IA relee **todo el contexto de la conversación** (tus mensajes + sus respuestas + archivos leídos) y eso se cobra como tokens de entrada. La memoria no "almacena gratis": lo que se guardó vuelve a entrar como contexto cuando se usa.
- **Por qué importa (el error típico):** pensar "una vez lo tenga en memoria, ya no cuesta" es falso. Dentro de una conversación, cada turno nuevo reprocesa el contexto completo → si el contexto es enorme, **cada respuesta es cara**, aunque no envíes nada nuevo. La forma de ahorrar es mantener el contexto pequeño: resúmenes compactos (memoria interna), leer archivos solo bajo demanda y no volcar `.md` enteros.
- **En tu proyecto:** la memoria interna del agente son resúmenes cortos (cuestan poco al cargarse cada sesión); `COORDINACION.md` e `INDICE.md` son compactos a propósito; el "contexto por demanda" del contrato existe para no inflar el contexto.
- **Para recordar:** *pagan por releer, no por recordar. Contexto pequeño = chat barato.*

---

## 5.8 Cuándo abrir un chat nuevo (el "circulito" de contexto)

- **Qué es:** las herramientas (Cursor, Claude, etc.) muestran un medidor de contexto (el "circulito"). Marca cuánto del contexto disponible está ocupado por la conversación actual. Cuanto más largo el chat, más lleno el medidor y **más se relee en cada respuesta** (ver 5.7).
- **Por qué importa:** un chat eterno acumula ruido (pruebas fallidas, temas cerrados, archivos leídos que ya no importan) → cada turno es más caro y lento, y al llenarse el contexto la IA puede **olvidar lo más viejo** o recortarlo. Abrir chat nuevo por tema mantiene cada conversación ligera.
- **Cuándo conviene abrir chat nuevo:**
  1. **Cambia la temática** (pasas de pagos a SEO → contexto viejo no aporta).
  2. El medidor está **alto o casi lleno** y la tarea actual ya no usa lo antiguo.
  3. El chat está lleno de **ruido** (errores, idas y venidas ya resueltas).
- **Qué NO hacer:** abrir chat nuevo a mitad de una tarea compleja que aún necesita el contexto útil — perderías información y tendrías que re-explicar todo. **Lo que debe persistir entre chats son los archivos del repo y las memorias, no el historial del chat.** El chat es efímero; el repo es permanente.
- **En tu proyecto:** este repo está diseñado para eso: `docs/aprendizaje/` (tu teoría), `COORDINACION.md` (estado compartido) y las memorias internas sobreviven a cualquier chat nuevo. Puedes cerrar un chat y abrir otro sin perder nada importante.
- **Para recordar:** *chat nuevo por tema; lo que quieres conservar va al repo, no al chat.*

---

## 5.9 El aviso de reinicio de chat (regla del agente, idea del dueño)

- **Qué es:** cuando el chat es largo y el historial viejo ya no aporta a la tarea actual, el agente añade al final de su respuesta un aviso breve: *"se recomienda reiniciar chat para ahorrar tokens"*.
- **Por qué importa (la cuenta):** un aviso de 2 frases cuesta ~40-60 tokens de salida. Un chat con el contexto casi lleno relee 100.000+ tokens en **cada** respuesta. Avisar cuesta 50 tokens y evita releer cientos de miles → el ahorro es de miles de veces el coste. Además el "cálculo" no cuesta nada extra: el contexto ya se procesa entero en cada turno; el aviso solo es una frase añadida.
- **Límites honestos:**
  1. El agente no ve el contador exacto ni el % del circulito (eso lo muestra la UI de la herramienta); **estima** por la longitud del chat.
  2. El criterio no es solo "chat largo": es chat largo **y el historial viejo ya no se necesita** para lo actual. No avisar si reiniciar haría perder contexto útil.
  3. No es un proceso automático de fondo: es una regla que el agente sigue en cada respuesta.
- **En tu proyecto:** aplica a cualquier chat con IA (Reasonix, Cursor, Gemini…). Lo que no debe perderse al reiniciar ya vive en el repo y en las memorias.
- **El ritual "guardar y reiniciar" (mejora):** cuando el agente avise de reinicio, añadir también: *"antes de reiniciar, ¿hay algo de esta conversación que quieras que guarde en el libro?"*. Así el aviso pasa de reactivo (solo avisar) a proactivo (asegurar que nada se pierde) y el ciclo completo queda: **aprender → guardar → reiniciar → reutilizar**.
- **Para recordar:** *avisar cuesta 50 tokens; no avisar puede costar 100.000. Y antes de reiniciar: guarda.*

---

## 5.10 Markdown vs JSON: el formato depende del consumidor

- **Qué es:** no hay un formato "mejor" — depende de **quién consume el dato**. **Markdown** brilla cuando lo lee una persona (o una IA con contexto): legible, anotable. **JSON** brilla cuando lo procesa una **máquina** (script, router, parseo): estructurado, filtrable, validable.
- **Por qué importa (el mito del ahorro):** JSON **no es más barato en tokens que Markdown** — repetir claves (`"que_es":`, `"por_que":` × muchas entradas) consume más tokens que Markdown bien estructurado. La ventaja del JSON no es el precio: es la **procesabilidad**. La eficiencia de verdad sale de los resúmenes y filtros, no del formato.
- **En tu proyecto:** `docs/taller-prompts/RUTAS-CONTEXTO.json` = router máquina (lo consume `scripts/deepseek-ask.mjs`, con regla "cargar solo la fila del tema, nunca todo"); `docs/aprendizaje/` = vista humana en Markdown. El mismo repositorio usa cada formato donde toca — y el router ya tiene la fila `"aprendizaje": ["docs/aprendizaje/"]`.
- **Tu cadena real (parte de olas):** APIs (Open-Meteo/Euskalmet) → **JSON** → `SurfForecastTableService::publicPayload()/detailedPayload()` → **arrays JSON** → React (props). Para el parte escrito: `SurfDailyBriefService::formatDayForAI()` convierte los DTOs a **texto plano estructurado** (no JSON, no Markdown) para Gemini, y `sanitizePlainText()` quita markdown por seguridad (los LLM redactan mejor desde prosa estructurada que desde JSON puro). **Markdown solo donde el consumidor final es un documento con formato:** enlaces del chatbot (`ChatbotPageCatalogService` genera `[Título](/ruta)`).
- **Para recordar:** *¿lo lee una persona? Markdown. ¿lo procesa un programa? JSON. ¿lo redacta un LLM? Texto plano estructurado. Cada eslabón con su formato.*
- **El matiz que lo aclara todo: los tres son texto plano por debajo.** La diferencia es la *convención y el propósito*: `.txt` = texto sin convenciones; `.md` = texto + símbolos de formato para que un humano lo lea mejor renderizado (NO es como Word: es texto puro que se abre en cualquier editor); `.json` = texto + estructura de datos (claves/valores) para que una máquina lo procese. Lo que cambia no es el archivo, es **quién lo consume y cómo**. Analogía: el Markdown es "texto con instrucciones de maquetado", el JSON es "texto con instrucciones de estructura", el txt es "texto a secas".

---

## 5.11 Cómo verificar que una IA leyó de verdad (el "sí" que vale)

- **Qué es:** cuando preguntas a una IA "¿sabes/te han informado de X?", un "sí" por norma o por quedar bien **no vale nada**. El "sí" solo vale si viene de **haber leído el archivo de verdad** (recuerda: las IAs leen del disco — no "reciben" información por arte de magia).
- **Por qué importa:** los LLM tienden a asentir para ser útiles; si confías en el "sí" sin verificar, puedes asumir que Cursor sabe algo que no sabe. La verificación real es la que demuestra la lectura.
- **Cómo verificar (3 pruebas):**
  1. **Citar:** "¿qué dice exactamente la regla de poda del libro?" → si lo leyó, lo resume o cita con precisión; si no, divaga.
  2. **Ruta:** "¿dónde está documentado el aviso de reinicio?" → debe citar `COORDINACION.md §Flujo de eficiencia` + `05-flujos §5.9`, no inventar.
  3. **Aplicar:** "añade una entrada sobre X siguiendo las reglas A-D" → si usa la estructura (Qué es → Por qué → En tu proyecto → Para recordar), registra autor y no duplica, demostró que leyó.
- **En tu proyecto:** vale para Cursor, Reasonix, Gemini… cualquier IA con la que trabajes. Es parte de tu método de comparar IAs: no comparas "síes", comparas **pruebas**.
- **Para recordar:** *"sí" sin cita no es "sí". Pide la prueba: cita, ruta o aplicación.*

---

## 5.12 Portabilidad del ecosistema IA a otros proyectos

- **Qué es:** el sistema de trabajo con IA de maider_0 tiene una mitad **portable** (se copia a cualquier proyecto) y una mitad **específica** (se regenera por proyecto).
- **Por qué importa:** quien copia TODO (incluido el árbol y el router de maider_0) arrastra basura ajena; quien no copia NADA, rehace el sistema desde cero en cada proyecto. La regla: **la estructura es portable; el contenido no.**
- **Portable (copiar/adaptar):** libro de aprendizaje con reglas A-D, flujo de eficiencia (resúmenes, aviso de reinicio), confirmación cruzada, pre-vuelo/anti-pisotón, skill profesor-aprendizaje.
- **Específico (regenerar, nunca copiar):** el mapa del proyecto (`PROJECT_TREE`), el router de contexto (`RUTAS-CONTEXTO.json`), las rules `.mdc` del stack, el contrato del dúo.
- **En tu proyecto:** `PROJECT_TREE_FOR_GEMINI.md` debe seguir siendo el mapa real de maider_0 (el código manda). Para un proyecto nuevo se usa una **plantilla de bootstrap** genérica (cómo montar el mapa, el router, el libro…), no se "generaliza" el archivo actual.
- **Para recordar:** *estructura portable, contenido específico. El mapa de cada proyecto refleja SU código.*

---

## 5.13 Las 3 vías de valor del ecosistema IA (análisis de monetización)

- **Qué es:** el sistema de trabajo con IA no vale dinero igual en todas las vías. Hay 3: (1) **como producto a la venta** (plantilla/curso), (2) **como habilidad profesional**, (3) **como eficiencia personal**.
- **Por qué importa:** evita perder tiempo vendiendo lo que no se vende, y concentra el esfuerzo donde el valor es real.
- **Las 3 vías (veredicto honesto):**
  1. **Producto a la venta: poco hoy.** Mercado saturado; el sistema está atado al stack propio; sin audiencia no vale 0–50 €. No perseguir de momento.
  2. **Habilidad profesional: MUCHO.** Para un junior, orquestar IAs con método (no "preguntar por preguntar") es diferencial en entrevistas y en pymes. El valor está en **saberlo explicar**, no en tenerlo (la industria va hacia ahí: agents/skills/MCP).
  3. **Eficiencia personal: cuantificable.** Si ahorra ~3 h/semana → ~150 h/año; también ahorro de tokens. Convertible a € en CV.
- **En tu proyecto:** no vender el código de S4 (ventaja competitiva local). El producto futuro sería el **método + plantillas genéricas** (bootstrap), nunca el contenido específico.
- **Para recordar:** *como producto hoy no; como carrera y eficiencia sí. Lo valioso es haberlo construido y poder enseñarlo.*

---

> **Por ampliar:** 5.14+ (cómo hacer code review, cómo leer logs, cómo testear…).
