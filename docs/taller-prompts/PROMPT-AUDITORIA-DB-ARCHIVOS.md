# Prompt — Auditoría de eficiencia de BD + limpieza de archivos rotos

> **Origen:** 2026-08-10, sesión Reasonix. Respuesta de Cursor (valoración «Partida 1»: coste de reconstrucción) → el dueño pidió la parte de **eficiencia de BD** y **archivos rotos**. Este prompt es para ejecutar en **Cursor** (lógica/implementación). La crítica de la valoración está en la conversación de Reasonix.

---

## Rol

Arquitecto Laravel senior, metódico y no destructivo. **Primero auditas y mides, luego cambias.** Todo cambio: mínimo, reversible y con evidencia. Nada se borra sin `--dry-run` + backup + log.

## Contexto real del repo (verificado, no asumas otro)

- Laravel 11 + React 19/Inertia, MySQL (`mas_que_surf`), 39 modelos, 98 migraciones, 336 ficheros PHP, 86 páginas JSX (de las cuales **25 son admin**), ~30 Services en `app/Services/`.
- **No hay Telescope ni debugbar** en `composer.json`: para medir usa `DB::enableQueryLog()` o instala debugbar **solo en local** (no commitear).
- `DatafonoPaymentReconciliationService.php` = 1.900 líneas (reconciliación TPV): **no lo reescribas**, solo señala bucles de query si los hay.
- Antes de tocar nada: leer `docs/taller-prompts/COORDINACION.md`, reclamar la tarea en **Estado actual**, y `docs/PROJECT_TREE_FOR_GEMINI.md` para no inventar rutas.

## Fase 1 — Eficiencia de BD

### 1.1 Inventario
- `SHOW TABLE STATUS` + `SHOW INDEX FROM` por tabla: filas aprox., FKs, índices existentes.
- Tablas foco (alto volumen/join): `bookings`, `lesson_user`, `pedido_producto`, `bono_consumptions`, `taquilla_audit_logs`, `chatbot_interactions`, `payment_webhook_idempotency`, `datafono_payments`, `fiscal_invoices`, `mostrador_ticket_lines`, `surf_daily_briefs`.

### 1.2 Índices
- FKs sin índice; columnas de filtro/orden frecuente (`status`, fechas, `user_id`, `surfboard_id`, `expires_at`, referencias externas) sin índice; `WHERE` con funciones/casts que anulan índices.
- Cada índice = **migración nueva** (nunca editar migraciones viejas), reversible.

### 1.3 N+1 / lazy loading
- Revisar `app/Http/Controllers/**` y Services: queries dentro de `foreach`/bucles, `->with()` ausentes, `->get()` en loops, `select *` innecesarios.
- Foco: admin (25 páginas), `AvailabilityService`, `BookingService`, `app/Services/Rentals`, `app/Services/Taquilla` (mapa de ocupación), `VipStudentPerformanceService`, `app/Services/Store` (tienda pública), `app/Services/SurfConditions`, `app/Services/Photos`, `app/Services/Auctions`, `DatafonoPaymentReconciliationService`.

### 1.4 Queries pesadas
- Motor de disponibilidad de alquileres, bloqueo de stock, calendario de clases, dashboard admin, listados con filtros (tienda, segunda mano, subastas).
- Mide **antes** (query log + timing) y **después**; documenta top-10 con `EXPLAIN`.

### 1.5 Esquema / deuda
- Columnas sin uso, enums legado (ya hubo refactor de `lesson level`; busca otros), soft deletes bien indexados, tablas de log/audit que crecen sin límite → proponer retención/archivado.

### 1.6 Cache
- Tarifas/planes/artículos estáticos, sitemap, forecast: qué se puede cachear **sin tocar lógica de negocio**. Verificar `CACHE_DRIVER` real.

### Reglas Fase 1
- Nada de borrar datos de pago/fiscal (TicketBAI) ni lógica de negocio.
- Migraciones reversibles + `php artisan migrate` y `php artisan test` en verde.
- Un tema por cambio; no mezclar.

## Fase 2 — Archivos rotos

### 2.1 Definiciones
- **Ruta rota:** fila en BD con ruta a archivo inexistente (404).
- **Huérfano:** archivo en disco sin fila que lo referencie.
- **Enlace externo caído:** solo reportar, no tocar.
- **Duplicado:** mismo archivo varias veces → reportar.

### 2.2 Orígenes a inventariar
- `storage/app/public`: fotos de productos, `Imagen`, sesiones `PhotoSession` (con `expires_at`), vídeos AutoCoach, pruebas de pago (`lesson_user`/`pedidos`/`pagos_cuotas`), avatares.
- `public/storage`: verificar `storage:link`.
- Segunda mano (soft deletes): fotos de tablas dadas de baja.

### 2.3 Detección (read-only, no borra)
Script que genere informe: `origen | tipo de rotura | ruta | tamaño | última referencia | irreemplazable (sí/no)`.

### 2.4 Limpieza
- Requiere `--dry-run` primero y `--backup`.
- Solo borra lo marcado **seguro**: regenerable (cachés/thumbnails) u huérfano confirmado.
- **Irremplazables (fotos de cliente, pruebas de pago) → solo reportar, nunca borrar.**
- Log de todo lo borrado (archivo + filas de BD).

### 2.5 Cierre
- `storage:link` correcto, directorios vacíos limpiados, `.gitignore` de storage sano.
- Propuesta (si procede): comando artisan de limpieza automática para `PhotoSession` caducadas.

## Criterios de éxito (entregable final)

1. Top-10 queries ≥ 30 % más rápidas o justificación en el informe.
2. Cero N+1 nuevos en flujos auditados (o documentados con motivo).
3. Informe de archivos: nº exacto antes/después; cero 404 en medios servidos desde BD.
4. Nada borrado sin `--dry-run` + backup; nada tocado de pagos/fiscal/TicketBAI.
5. Migraciones nuevas reversibles; `php artisan test` verde.
6. Resumen del resultado en `COORDINACION.md` (Estado actual + Última actividad).

---

# Anexo — Partidas complementarias a la valoración de Cursor (Reasonix, 2026-08-10)

La «Partida 1» de Cursor (coste de reconstrucción desde cero, 22 partidas, 3.470–5.160 h con PM) omitió estas piezas. Se suman o ajustan.

## Partidas nuevas

| # | Partida | Horas | Nota |
|---|---------|-------|------|
| 23 | Auditoría + optimización de BD (índices, N+1, queries pesadas) | 30–60 | Incluye medición antes/después; las FK de Laravel ya traen índice por defecto, así que el trabajo real son N+1 y queries complejas (disponibilidad, ocupación taquillas, VipStudentPerformance). |
| 24 | Limpieza de archivos rotos (detección + script seguro + limpieza) | 15–30 | Detección es read-only y rápida; lo delicado es la limpieza con backup y clasificación manual de irreemplazables. |
| 25 | Validación y regeneración de integridad de datos | 40–80 | Huérfanos en BD (referencias a IDs inexistentes), valores inconsistentes (stock negativo, rangos de fecha solapados), datos legacy de migraciones acumuladas. |
| 26 | Sistema de emails/notificaciones transaccionales | 40–80 | Bienvenida, confirmación de reserva/pedido, recordatorios, facturas por email. Jobs/queues ya existen (`jobs` table), faltan las mail classes y templates. |
| 27 | Mantenimiento post-lanzamiento (~15 %) | +505–750 | Bug fixing, soporte, ajustes de usuario real. Se aplica al total ajustado. |

**Suma partidas nuevas:** 125–250 h (23+24+25+26).

## Ajuste de la partida 17 (Admin kit + paneles)

Cursor puso 200–300 h para «86 páginas». Verificado contra el repo:
- 86 ficheros JSX en `resources/js/Pages` = **frontend entero** (público + admin).
- De esos, solo **25 son admin**; los otros 61 están en las partidas 2–16 (landing, tienda, academia, alquileres, etc.).

→ **Ajuste propuesto:** partida 17 real = 60–100 h (25 paneles admin CRUD + filtros + exports).  
→ **Exceso original:** −140 a −200 h respecto a lo declarado.

## Total corregido (Reasonix)

|  | Sin PM | Con PM (~15 %) |
|---|---|---|
| **Mínimo** | 3.020 + 125 − 140 = **3.005 h** | 3.005 + 505 = **3.510 h** |
| **Máximo** | 4.560 + 250 − 200 = **4.610 h** | 4.610 + 750 = **5.360 h** |
| **€ a 40 €/h** | 120.200–184.400 € | 140.400–214.400 € |
| **€ a 60 €/h** | 180.300–276.600 € | 210.600–321.600 € |

**Conclusión:** los totales apenas varían porque la sobreestimación de admin se compensa con los gaps nuevos. La diferencia real está en **qué paga el comprador** (las 4 partidas nuevas son deuda técnica que ya tienes → el valor REAL de la app hoy es menor que el valor de reposición).

## Factor de productividad IA (no incluido en horas)

El dueño reconstruyó esta app en ~5 meses con Cursor + DeepSeek. Un equipo humano tardaría 12–18 meses. El «valor de reposición» como seguro/venta es un **techo**:  
- **Coste humano:** ~3.500–5.400 h (~210.000–322.000 € a 60 €/h).  
- **Coste real con IA (dueño):** fracción (horas estimadas 800–1.500 h reales con el flujo actual). 

Para una venta, el precio justo no es el coste de reposición, sino **código + datos + marca/SEO + conocimiento de negocio**. La tabla de horas sirve para argumentar el techo; el valor real se negocia aparte.
