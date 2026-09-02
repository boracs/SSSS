# Plan 301 zurriolacam.com.es → app S4 (enero, cutover de lanzamiento)

**Fecha plan:** 2026-08-28 · **Autor:** Reasonix · **Estado:** PLAN (ejecutar en el lanzamiento de la app, ~enero; no antes: el 301 necesita destino estable e indexado).
**Decisión del dueño:** mantener zurriolacam unos meses más; la app sale ~enero; el tráfico de zurriolacam es escaso en clics (~207/3 meses) pero la demanda de cámara es real → merece 301, no borrado seco.

---

## 1) Datos GSC de zurriolacam (captura del dueño 2026-08-28, ~3 meses)

**⚠️ SUPERADO 2026-08-28 por el export completo de 16 meses** (CSV real en `docs/taller-seo/data/gsc-zurriolacam-2026-08/`): la captura filtrada (~207 clics / ~9.200 imp / 3 meses) era un subconjunto; los números reales son ~20x mayores (ver abajo).

### 1b. Datos REALES — export completo GSC (16 meses, Web, sin filtros) · 2026-08-28

**Fuente:** CSV oficial (Consultas/Páginas/Países/Dispositivos/Filtros) guardado en `docs/taller-seo/data/gsc-zurriolacam-2026-08/`. Filtros aplicados en el export: solo `Tipo de búsqueda: Web` + `Últimos 16 meses` (SIN filtro de consulta).

| Métrica | Valor | Lectura |
|---|---|---|
| Clics home | **7.295** (≈470/mes ≈ 15/día) | Tráfico diario real; NO es escaso |
| Impresiones home | **385.031** (~24k/mes) | Demanda enorme de cámara |
| **webcam zurriola** | **2.427 clics / 163.169 imp / CTR 1,49 % / pos. 4,63** | 🏆 La kw del plan GEO YA está en top-5 |
| zurriolacam (marca) | 945 / 1.417 / CTR 66,7 % / pos. 1,49 | Marca consolidada |
| zurriola webcam | 458 / 31.103 / pos. 4,48 | Variante top-5 |
| camaramar zurriola | 291 / 20.080 / pos. 5,5 | Demanda cámara municipal |
| camara zurriola | 208 / 6.535 / pos. 4,09 | Familia de cámara |
| web cam zurriola / webcam la zurriola / zurriola webcam directo… | 140–147 clics c/u, pos 4,3–5,4 | La familia completa en top-6 |
| Móvil | **83 %** (6.040 clics) | Público móvil → CTA y UX móvil críticos |
| España | 7.190 clics (96 %) | Local; Francia 113, Uruguay 52… |
| Artículos informacionales | 0–115 clics (medidas 115, titulación 64) | Impresiones reales (medidas 20.188) pero CTR <1 % y pos >8 |

**Lectura estratégica (actualizada):**
- El 301 de enero hereda top-5 de la familia completa de cámara — el plan GEO/webcam es la jugada central, no secundaria.
- CTR 1,49 % en pos 4,63 de "webcam zurriola" = SERP saturada de cámaras/snippets → **meta description con números + parte citable** para ganar el clic.
- Artículos informacionales: aportan impresiones, no clics (pos 25–60) → el valor está en la cámara, no en el blog de zurriolacam.


---

## 2) Mapa 301 completo (zurriolacam.com.es → sansebastiansurfschool.com)

> **Destino final (decisión dueño 2026-08-28): `sansebastiansurfschool.com` = dominio oficial de la app.** El dueño posee también `.eu` y `.es`; ambos → **301 permanente** al `.com` (misma URL, sin cadenas). DNS en Cloudflare (túnel named «masquesurf» actualmente apuntado a `.eu` → re-apuntar a `.com` en la Fase 0).

| Origen zurriolacam.com.es | → Destino app |
|---|---|
| `/` (home + webcam) | `/servicios/webcams` |
| `/el-kit-del-surfista/` | `/taller/el-kit-del-surfista-guia-esencial-de-equipamiento` |
| `/como-reparar-una-tabla-de-surf-que-material-usar/` | `/taller/guia-practica-como-reparar-una-tabla-de-surf` |
| `/normas-del-surf-y-seguridad/` | `/taller/manual-de-surf-seguridad-convivencia-y-localismo` |
| `/tabal-de-surf-ideal-para-aprender/` | `/taller/cual-es-la-tabla-de-surf-ideal-para-aprender` |
| `/tipos-de-tablas-de-surf/` | `/taller/cual-es-la-tabla-de-surf-ideal-para-aprender` |
| `/que-tener-en-cuenta-al-reservar-una-clase-de-surf/` | `/taller/que-debo-tener-en-cuenta-al-reservar-una-clase-de-surf` |
| `/las-corrientes-de-la-playa/` | `/taller/guia-de-corrientes-en-la-playa-como-detectarlas-utilizarlas-y-surfear-seguro` |
| `/que-aprendere-en-mi-primera-clase-de-surf/` | `/taller/que-aprendere-en-mi-primera-clase-de-surf-y-guia-de-preguntas-frecuentes` |
| `/epoxi-o-fibra-como-saber-de-que-material-es-mi-tabla/` | `/taller/de-que-materiales-esta-hecha-una-tabla-de-surf-guia-de-componentes` |
| `/a-que-edad-puede-un-nino-surfear/` | `/taller/a-que-edad-puede-un-nino-comenzar-a-surfear-etapas-y-consejos` |
| `/partes-de-una-tabla-de-surf/` | `/taller/guia-completa-partes-de-una-tabla-de-surf-y-sus-funciones` |
| `/medidas-tablas-de-surf/` | `/taller/medidas-de-las-tablas-de-surf-la-guia-definitiva-para-elegir-tu-tabla` |
| `/tipo-de-olas-y-rompientes/` | `/taller/guia-de-olas-y-rompientes-tipos-fondos-y-factores-que-influyen-en-el-surf` |
| `/donde-ponerse-para-coger-mas-olas/` | `/taller/donde-colocarse-en-el-agua-para-coger-mas-olas-guia-de-posicionamiento` |
| `/que-titulacion-necesito-para-impartir-clases-de-surf/` | `/taller/que-titulacion-se-necesita-para-impartir-clases-de-surf-en-espana` |
| `/como-hacer-el-pato/` | `/taller/como-hacer-el-pato-en-surf-duck-dive` |
| `/como-interpretar-el-parte-de-olas/` | `/taller/como-interpretar-el-parte-de-olas-guia-avanzada-para-surfistas` |
| `/en-que-direccion-rompe-la-ola/` | `/taller/como-saber-en-que-direccion-rompe-una-ola` |
| `/escuelas-de-surf-en-san-sebastian/` | `/servicios/surf` |
| `/acerca-de/` | `/nosotros` |
| `/contacto/` | `/contacto` |
| `/privacy-policy/` | — (no redirigir o → `/contacto`; decisión menor) |

**Reglas del 301:**
1. **Status 301 permanente** (no 302), uno por URL antigua (no redirect genérico de todo el dominio con regex que se coma rutas sin equivalente).
2. Mantener el **dominio y hosting vivos 6-12 meses** tras el 301 para que Google transfiera el historial; luego se puede soltar.
3. Si una URL antigua no tiene equivalente claro → al home de la sección más próxima, nunca a 404.
4. No redirigir al carrito/zonas auth.

---

## 3) Ecosistema de socios (El Bunker = asociado de S4) — revisado 2026-08-28

- **El Bunker surf shop es el asociado del dueño para S4** y este quiere que reciba tráfico y crezca. Los enlaces de la home de zurriolacam a El Bunker y Wallapop **NO se quitan** (decisión del dueño): son el embudo actual.
- **Embudo mientras zurriolacam viva:** webcam (tráfico diario) → El Bunker (tienda/alquiler/clases físicas) + enlace a la app S4 cuando sea pública.
- **Tras el cutover de enero:** el 301 lleva el grueso del tráfico de cámara a `/servicios/webcams` de la app, y **la app enlaza a El Bunker** en las secciones donde el socio aporta (local físico, tienda, taller…) para que no pierda tráfico. Ajustar en función de qué aporta El Bunker a S4.
- **Wallapok** (usuario guillaumeb-9076052, tablas de segunda mano): si también es del dueño, mismo razonamiento (o sustituirlo por `/segunda-mano` de la app cuando esté pública); si es de un tercero, decidir si interesa seguir enviándole tráfico.

### Datos Google Analytics de zurriolacam (28 días, captura del dueño 2026-08-28)

- **140 usuarios activos / 120 nuevos; 1 min 01 s de interacción media; 0 € ingresos.**
- **Sesiones por canal:** Direct 195 · Organic Search 146 · Referral 11 · AI Assistant 6 · Unassigned 3. (Direct > Orgánico = destino de favoritos.)
- **Nuevos por canal:** Organic 78 · Direct 29 · Referral 9 · AI Assistant 4.
- **Países:** Spain 109 · US 9 · MX 5 · CN 3 · AR 2 · FR 2 · IT 2.
- **Vistas por página:** Webcam ZURRIOLA EN VIVO **407** (93 % del total 436) · artículos ≤13 (Medidas 13, pato 4, titulación 3, parte 2, dirección 2, escuelas 2).
- **Retención por cohorte:** Sem0 100 % → Sem1 3,4 % → Sem2 2,9 % → Sem3 1,3 % → 0 % (utilidad: entra, mira, se va).
- **Impresiones orgánicas por landing:** `/` 2,4 mil · /medidas-tablas-de-surf/ 218 · /acerca-de/ 168 · /contacto/ 155 · /sitemap/ 116 · /partes-de-una-tabla-de-surf/ 46 · /escuelas-de-surf-en-san-sebastian/ 41.
- **Clics orgánicos por query:** zurriolacam 39 · webcam zurriola 2 (marca dominante).
- **Lectura estratégica:** el valor de zurriolacam es la webcam (93 % vistas, Direct>Orgánico, demanda "camaramar zurriola"/"webcam zurriola" en GSC). Los artículos casi no se leen → el blog duplicado del Taller no aporta; el GEO (AI Assistant 6 sesiones) ya empieza a traer algo y es la línea a amplificar con la app.

---

## 4) Qué NO hacer

- ❌ No borrar zurriolacam sin 301 (pierde la demanda de cámara ~6.500 impresiones y el historial de "webcam zurriola").
- ❌ No 301 antes del lanzamiento de la app (destino inestable = redirect muerto).
- ❌ No duplicar contenido: mientras zurriolacam viva, no publicar en ella artículos nuevos del Taller (ya hay solapamiento en el kit del surfista, marcado en `SEO_MATRIX.md` #1).

---

*Plan de Reasonix 2026-08-28. Ejecución de los 301: Cursor/despliegue en el cutover de enero. Registrado en `COORDINACION.md`.*
