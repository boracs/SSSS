# 🛡️ THE SOVEREIGN ARCHITECT PROTOCOL (V4)

# Proyecto: Maider - Estándar de Ingeniería

## 1. MISIÓN Y GOBERNANZA

Este documento define la ley técnica del repositorio `maider_0`. Ninguna IA o desarrollador puede ignorar estas directivas. El objetivo es la robustez absoluta y la integridad de datos.

## 2. FLUJO DE TRABAJO OBLIGATORIO (+AA)

Antes de modificar código, Cursor debe realizar un Análisis de Arquitectura (+AA):

- **Impacto:** ¿Qué servicios se ven afectados?

- **Concurrencia:** ¿Hay riesgo de double-booking o condiciones de carrera?

- **Seguridad:** ¿Están las Policies de Laravel protegiendo este recurso?

## 3. ESTÁNDAR ARQUITECTÓNICO: LA TRÍADA

- **DTO (Data Transfer Objects):** Para mover datos entre capas sin usar arrays asociativos.

- **Actions:** Para la lógica de negocio pura (una sola responsabilidad).

- **Services:** Para orquestar infraestructuras complejas (Firestore, Disponibilidad, Créditos).

## 4. REGLAS DE ORO (HARD RULES)

- **Atomicidad:** Todo cambio en DB debe ir dentro de un `DB::transaction()`.

- **Bloqueo Pesimista:** Uso de `lockForUpdate()` en tablas de disponibilidad y pagos.

- **Tipado Estricto:** Siempre usar `declare(strict_types=1);` y tipos en argumentos/retornos.

- **Zero Logic Controllers:** Los controladores son meros traficantes de peticiones; no contienen lógica.

## 5. REVISIÓN DE INTEGRIDAD (V3-ULTRA)

- Validar `auth()` y propiedad `Ownership`) en cada consulta.

- No usar `float` para dinero; siempre `int` (céntimos).

- Logs enriquecidos con `Log::withContext()` en caso de error.