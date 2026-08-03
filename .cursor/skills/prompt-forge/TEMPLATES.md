# Plantillas por tipo de tarea

Esqueletos base para la Fase 2 de `prompt-forge`. Adapta, no copies literal: borra los bloques que no apliquen y sustituye todos los `[...]`.

---

## 1. Nueva funcionalidad (código)

```
ROL: Ingeniero [stack] con experiencia en [dominio].

OBJETIVO: Implementar [funcionalidad] de forma que [resultado observable].

CONTEXTO:
- Stack: [versiones]
- Archivos implicados: [rutas exactas]
- Estado actual: [qué existe ya y hay que reutilizar]
- Restricciones del entorno: [BD, colas, hosting]

TAREAS:
1. Leer [archivos] antes de escribir nada.
2. [Paso]
3. [Paso]

RESTRICCIONES:
- No modificar [rutas/áreas].
- No crear dependencias nuevas sin justificarlo antes.
- Reutilizar [servicio existente] en lugar de duplicar lógica.

FORMATO DE SALIDA:
Por cada archivo: ruta, y el contenido completo o el diff. Sin explicaciones
entre archivos. Al final, una lista de 3-5 líneas con lo que hiciste.

CRITERIOS DE ACEPTACIÓN:
- [ ] [Comportamiento verificable]
- [ ] No rompe [flujo existente]
- [ ] [Test/comando] pasa

AUTONOMÍA: Decide libremente [nombres, orden interno]. Pregunta antes de
[cambiar el esquema de BD / romper una API pública]. Si falta un dato
imprescindible, detente y pregunta en vez de asumir.
```

---

## 2. Bug / error concreto

```
ROL: Depurador metódico.

SÍNTOMA: [qué se ve] al [acción que lo reproduce].
ESPERADO: [qué debería pasar].

EVIDENCIA:
<<<LOG
[stack trace / error literal]
LOG>>>

CÓDIGO SOSPECHOSO: [rutas]

TAREAS:
1. Formula las 3 causas más probables, ordenadas por probabilidad.
2. Indica, para cada una, cómo confirmarla o descartarla.
3. Confirma la causa real con evidencia antes de proponer el arreglo.
4. Aplica el arreglo mínimo.

RESTRICCIONES:
- Prohibido refactorizar de paso.
- Prohibido silenciar el error con try/catch vacío o con valores por defecto.
- Si la evidencia no basta para confirmar la causa, dilo y pide el dato que falta.

FORMATO: Causa raíz (2-3 frases) → evidencia que la confirma → parche → cómo verificarlo.
```

---

## 3. Refactor

```
ROL: Ingeniero especializado en refactor sin cambio de comportamiento.

OBJETIVO: Reestructurar [componente] para [beneficio concreto y medible].

INVARIANTE: El comportamiento externo no cambia. Mismas entradas → mismas salidas.

ALCANCE: Solo [rutas]. Todo lo demás es intocable.

TAREAS:
1. Lista los puntos de entrada actuales y quién los consume.
2. Propón el plan de refactor en pasos independientes y reversibles.
3. Espera aprobación del plan antes de tocar código.

CRITERIOS DE ACEPTACIÓN:
- [ ] Ningún cambio en firmas públicas salvo [excepción declarada]
- [ ] [Tests] siguen pasando
- [ ] [Métrica: nº de queries, líneas, duplicación] mejora
```

---

## 4. Auditoría / revisión

```
ROL: Auditor técnico severo. Tu valor está en lo que encuentras, no en lo que apruebas.

MATERIAL: [rutas o diff]

BUSCA, EN ESTE ORDEN:
1. Bugs de corrección y casos límite no cubiertos
2. Riesgos de seguridad
3. Rendimiento (N+1, queries en bucle, payloads)
4. Violaciones de la arquitectura del proyecto
5. Legibilidad

FORMATO POR HALLAZGO:
[GRAVE|MEDIO|LEVE] archivo:línea — problema en una frase — arreglo concreto.

RESTRICCIONES:
- No listes lo que está bien.
- No hay hallazgo sin ubicación exacta.
- Si no encuentras nada de una categoría, escribe "sin hallazgos" y pasa.
- Máximo [N] hallazgos, priorizados por impacto.
```

---

## 5. Investigación / decisión técnica

```
ROL: Arquitecto que decide, no que enumera opciones.

PREGUNTA: [decisión a tomar]

RESTRICCIONES REALES: [presupuesto, stack, equipo, plazos, hosting]

TAREAS:
1. Propón como máximo 3 opciones viables bajo esas restricciones.
2. Compara solo en los ejes que afectan a la decisión: [ejes].
3. Recomienda una y defiéndela.
4. Indica en qué condiciones tu recomendación sería errónea.

FORMATO: Recomendación primero (3 frases), luego comparativa, luego riesgos.

RESTRICCIONES:
- Nada de "depende" sin resolverlo.
- Si un dato clave falta para decidir, nómbralo explícitamente.
```

---

## 6. Redacción / contenido

```
ROL: Redactor de [tipo de contenido] para [audiencia].

OBJETIVO: [texto] que consiga [acción del lector].

CONTEXTO DE MARCA: [tono, cosas que decimos, cosas que no decimos]

ENTRADAS:
<<<MATERIAL
[datos, notas, texto previo]
MATERIAL>>>

RESTRICCIONES:
- Longitud: [N] palabras ±10%.
- Registro: [tú/usted], [cercano/técnico].
- Prohibido: superlativos vacíos, "revolucionario", "solución integral", relleno.
- No inventes datos, cifras ni testimonios. Lo que falte: [PENDIENTE].

FORMATO: [estructura exacta con secciones].

ACEPTACIÓN:
- [ ] Cada párrafo aporta información nueva
- [ ] Se puede leer en voz alta sin tropezar
```

---

## 7. Extracción de datos / salida estructurada

```
ROL: Extractor de datos. Devuelves datos, no prosa.

ENTRADA:
<<<TEXTO
[contenido]
TEXTO>>>

ESQUEMA DE SALIDA (JSON válido, sin markdown alrededor, sin comentarios):
{
  "campo": "tipo | null",
  ...
}

REGLAS:
- Un campo ausente en la entrada va a null. Prohibido inferirlo.
- No añadas campos fuera del esquema.
- Copia los valores literales; no normalices salvo [excepciones].
- Si la entrada no contiene nada extraíble, devuelve [].
```

---

## 8. Prompt encadenado (tarea grande)

Cuando una tarea pide más de ~4 entregables distintos, trocea en prompts secuenciales y define el traspaso:

```
PROMPT 1 → Diagnóstico. Salida: informe con [estructura].
PROMPT 2 → Plan, tomando como entrada el informe del paso 1.
PROMPT 3 → Ejecución del plan aprobado, un módulo por vez.
```

Cada eslabón debe declarar: qué recibe, qué entrega, y cuándo se considera terminado.
