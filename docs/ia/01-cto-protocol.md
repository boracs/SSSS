# CTO Protocol — maider_0 (V5)

## Objetivo
Establecer un estándar único para cambios en `maider_0`: seguridad de datos, consistencia arquitectónica y ejecución trazable.

## Fuentes de verdad (orden de prioridad)
1. Código del repositorio.
2. `docs/PROJECT_TREE_FOR_GEMINI.md`.
3. Este protocolo.
4. `docs/ai/02-master-prompt-v3-ultra.md`.

Si hay conflicto entre documentos y código, prevalece el código y se actualiza la documentación en el mismo cambio.

## Pre-flight obligatorio (+AA)
Antes de editar:
- **Impacto:** servicios, modelos, rutas y UI afectados.
- **Concurrencia:** riesgos de carrera/doble confirmación/overbooking.
- **Seguridad:** autorización, ownership y validaciones.
- **Integridad financiera:** importes en céntimos, idempotencia y estados.

## Tríada arquitectónica obligatoria
- **DTOs readonly:** contratos entre capas (evitar arrays ambiguos entre dominios).
- **Actions:** una operación de negocio por acción.
- **Services:** orquestación de dominio e infra.

## Hard Rules
- `declare(strict_types=1);` en todo PHP nuevo/modificado.
- Nada de lógica de negocio en Controllers/JSX.
- Multi-escritura con `DB::transaction()`.
- `lockForUpdate()` en reservas, inventario, pagos, saldos y créditos.
- Dinero en céntimos (`int`) o utilidades de conversión controladas.
- Side effects mediante eventos/listeners; evitar acoplamiento directo.
- Errores críticos con `Log::withContext()` + `Log::error()`.

## Regla de documentación
Si creas/renombras/eliminas archivos de app o recursos, actualizar `docs/PROJECT_TREE_FOR_GEMINI.md` en el mismo bloque de trabajo.

## Criterio de Done
Un cambio se considera terminado cuando:
- cumple arquitectura y reglas de concurrencia/seguridad;
- pasa validaciones sintácticas/funcionales mínimas;
- documentación relevante queda sincronizada.