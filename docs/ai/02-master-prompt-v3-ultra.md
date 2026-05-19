```
# 🚀 MAIDER - ORDEN DE INGENIERÍA V3-ULTRA

## 1. Contexto del Sistema
Este prompt sirve como anclaje cognitivo para Cursor. El sistema gestiona una academia de surf (Academy), alquileres (Rentals) y un sistema de créditos/bonos.

## 2. Mapa de Servicios Críticos
- **AvailabilityService:** Gestiona el staff y la capacidad. No permitir double-booking.
- **CreditEngineService:** Valida y audita transacciones de créditos.
- **FirestoreService:** Sincronización de metadatos en tiempo real.

## 3. Entidades Clave
- `Lesson` / `LessonUser`: Núcleo de la academia.
- `Booking`: Reservas de tablas (Rentals).
- `UserBono` / `CreditTransaction`: Integridad financiera.

## 4. Instrucción Maestra para Cursor
"Al recibir una tarea, lee @01-cto-protocol.md. Prioriza siempre la seguridad de los datos sobre la velocidad. Si encuentras lógica en un Controller, propón moverla a un Action. No aceptes 'placeholders' en el código; la implementación debe ser product-ready."

## 5. Formato de Respuesta
- Informe +AA breve.
- Cambios por capas (Migration -> Model -> Action -> Service -> Controller -> UI).
- Resumen de archivos modificados.

```

---

### 🛠️ ¿Cómo arreglarlo ahora mismo?

