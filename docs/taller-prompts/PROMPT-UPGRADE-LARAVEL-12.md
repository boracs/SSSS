# Prompt maestro — Upgrade Laravel 11 → 12 (local)

> **Cuándo:** cuando el árbol Git esté limpio y hayas parado de implementar features.
> **Dónde ejecutarlo:** chat **nuevo** de Cursor (pegar el bloque). No Reasonix.
> **No es:** deploy a Forge, PHP 8.4 del VPS, ni Laravel 13.

---

```
ROL: Ingeniero Laravel 11→12 en el repo maider_0 (S4). Ejecutas la guía oficial de upgrade; no añades features.

OBJETIVO: Dejar la app en Laravel 12 estable en local: composer.json con laravel/framework ^12.0, composer.lock con v12.x, PHP declarado compatible (^8.2 sin subirlo), tests Pest en verde (o lista de fallos preexistentes vs introducidos por el upgrade). Cero cambios de negocio.

CONTEXTO:
- Hoy: laravel/framework v11.46.1, composer.json "php": "^8.2", Inertia 2, Breeze ^2.3, Sanctum ^4, Pest ^3, Ziggy ^2, stripe-php ^20, Vite 6, React 19.
- Laravel 11 ya no tiene parches de seguridad (EOL 2026-03-12). Laravel 12 tiene seguridad hasta 2027-02-24. PHP 8.2 pierde parches el 2026-12-31.
- Arquitectura: DTOs readonly, Services, Actions, dinero int céntimos, eventos+colas. No reescribir eso.
- Mapa: docs/PROJECT_TREE_FOR_GEMINI.md. Coordinación: docs/taller-prompts/COORDINACION.md — reclama la tarea EN CURSO antes de tocar; al terminar HECHO + 1–2 líneas en Última actividad.
- Guía: https://laravel.com/docs/12.x/upgrade (11.x → 12.x). Gana la guía + el código del repo; si chocan, el código + tests.
- Hay docs/EN-EL-MOMENTO-DE-DESPLEGAR.md: no lo conviertas en un deploy a producción. Esto es solo local/composer. El PHP 8.4 del VPS y Forge son otro sprint.

PRE-VUELO OBLIGATORIO (antes de tocar nada):
1. `git status`: si el árbol NO está limpio (cambios sin commitear), DETENTE y avisa al dueño. Un upgrade solo se hace sobre un punto de rollback seguro (commit limpio). Si el árbol está limpio, anota el hash del commit actual como referencia de vuelta.
2. Ejecuta `php -v` y `php artisan --version` y anota las cifras reales. Mínimo PHP 8.2. PHP 8.3 o 8.4 locales también valen. No te detengas solo porque no sea 8.2.x. No saltes a Laravel 13 aunque PHP sea ≥ 8.3.
3. `composer why-not laravel/framework 12.0` y anota los bloqueos. Hallazgos conocidos (2026-08-26), NO son bloqueos reales: `pestphp/pest-plugin-laravel` admite `^12.9.2` y `brick/math 0.14` solo choca con `v12.0.0` exacta — por eso el constraint es `^12.0` y debe resolver a la ÚLTIMA 12.x, nunca pinnear 12.0.0. Si aparece OTRO paquete sin release para 12.x: DETENTE y lístalo.
4. MySQL/XAMPP encendido y BD `mas_que_surf_testing` existente: `phpunit.xml` fuerza `DB_DATABASE=mas_que_surf_testing` y los tests usan `RefreshDatabase`. Sin BD, los tests fallan por entorno y no por el upgrade. Si no arranca: DETENTE.
5. BASELINE OBLIGATORIO: ejecuta `php artisan test` ANTES de tocar composer.json y guarda el recuento y el nombre de cada test fallido. Sin baseline no puedes distinguir PREEXISTENTE de UPGRADE en el paso 7.

ENTRADAS (leer antes de escribir):
<<<LEER
composer.json
composer.lock (bloque laravel/framework: versión exacta)
bootstrap/app.php
app/Providers/AppServiceProvider.php
phpunit.xml
tests/ (estructura Pest)
docs/taller-prompts/COORDINACION.md (Estado actual + Última actividad)
docs/PROJECT_TREE_FOR_GEMINI.md (solo la tabla Stack, para actualizar Laravel 11 → 12 al final)
https://laravel.com/docs/12.x/upgrade
LEER>>>

TAREAS:
1. Reclama en COORDINACION.md Estado actual: fecha = hoy (no inventes una fecha vieja) | Upgrade Laravel 11 → 12 | Cursor | EN CURSO | composer.json, composer.lock, config/* si la guía lo exige.
2. Si PHP local < 8.2: DETENTE. Si es 8.2, 8.3 o 8.4: sigue con Laravel 12. No saltes a Laravel 13 en este sprint.
3. Sigue la guía 11→12 punto a punto. En composer.json: laravel/framework → ^12.0 y actualiza los paquetes first-party que la guía nombre (breeze, sanctum, pint, pail, collision, sail, etc.). El constraint "php": "^8.2" NO se sube en este sprint.
4. composer update acotado a los paquetes que cambiaste, con sus dependencias necesarias (p. ej. composer update laravel/framework laravel/breeze laravel/sanctum … --with-dependencies). NO un composer update ciego de todo el lock. El composer.lock solo se modifica vía comandos composer, nunca a mano; no lo regeneres entero si no hace falta.
5. Tras el update: php artisan optimize:clear ANTES de correr tests o artisan about (limpia caches de config/rutas/vistas/eventos de L11).
6. Aplica breaking changes de la guía SOLO donde este repo los use. Busca en app/, config/, routes/, bootstrap/, database/. No parches "por si acaso".
7. php artisan test (Pest) y compara contra el BASELINE del pre-vuelo 5. Si falla: arregla lo causado por el upgrade. Si el test ya fallaba en el baseline, márcalo PREEXISTENTE con su nombre; no reescribas la feature. Si un test de pagos/TBAI falla y no es obvio que sea el upgrade: DETENTE y pregunta.
8. Arranque mínimo: php artisan about OK. No hace falta npm, Vite, túnel ni navegador.
9. Cierra COORDINACION: HECHO + Última actividad (versión laravel/framework nueva en el lock, PHP local, tests pasados/fallidos).
10. Actualiza docs/PROJECT_TREE_FOR_GEMINI.md SOLO la mención de stack Laravel 11 → 12. No reescribas el mapa entero.

RESTRICCIONES:
- No Laravel 13, no subir el constraint php a ^8.3/^8.4, no PHP 8.5 "porque sí".
- No Tailwind 4, no React, no Vite mayor, no cambios JSX/CSS, no features (tienda, SEO, webcam, TBAI, catálogo, segunda mano).
- No editar .env (secretos). .env.example solo si la guía exige un KEY nuevo obligatorio.
- No Docker-prod, no Forge, no cloudflared, no commit a menos que el dueño lo pida explícitamente.
- No inventar paquetes. Si un paquete no tiene release para Laravel 12, DETENTE y lista el paquete + por qué bloquea; no hagas fork ni lo sustituyas sin preguntar.
- No tocar .cursorrules, .cursor/*, docs/ia/*.
- No mezclar este trabajo con docs/EN-EL-MOMENTO-DE-DESPLEGAR.md ni con un deploy.

FORMATO DE SALIDA (en este orden):
0. Baseline de tests antes del upgrade (pasados/fallidos + nombres de los fallidos).
1. Commit de rollback (hash). PHP local y Laravel antes/después (versiones exactas de php -v, artisan --version, laravel/framework en el lock).
2. Lista de archivos tocados (rutas).
3. Breaking changes de la guía que SÍ aplicaron vs los que no pegan a este repo.
4. Resultado de php artisan test (pasados / fallidos). Cada fallido: UPGRADE o PREEXISTENTE + nombre del test.
5. Qué queda pendiente (PHP 8.4 en el VPS, Laravel 13 más adelante, Forge). Nada de tutorial de Forge.

ACEPTACIÓN:
- [ ] Árbol Git estaba limpio al empezar (o te detuviste).
- [ ] Baseline de tests tomado ANTES de tocar composer.json.
- [ ] composer.json tiene laravel/framework ^12.0 y el lock tiene la última v12.x (no v11.x, no pinneado a v12.0.0).
- [ ] "php": "^8.2" sigue en composer.json.
- [ ] php artisan about funciona tras optimize:clear.
- [ ] tests: todos verdes, o fallos etiquetados UPGRADE vs PREEXISTENTE.
- [ ] COORDINACION.md actualizado (EN CURSO → HECHO + Última actividad).
- [ ] PROJECT_TREE_FOR_GEMINI.md: stack Laravel 12 si cambió.
- [ ] 0 features nuevas, 0 cambios de UI, 0 .env, 0 commit no pedido.

AUTONOMÍA:
- Decide el orden interno de la guía y qué archivos de config parchear.
- Pregunta (y detente) solo si: PHP < 8.2; git sucio; MySQL/BD de tests no disponible; un paquete bloquea L12; un test de pagos/TBAI falla y no es obvio que sea el upgrade.
- No preguntes permiso para seguir la guía oficial ni para reclamar/cerrar COORDINACION.

VERIFICACIÓN (antes de dar por cerrado):
1. ¿composer.json o el lock siguen en ^11 / v11.x? Si sí, no has terminado.
2. ¿Has tocado JSX, Tailwind, .env o has hecho commit? Reviértelo.
3. ¿Has subido "php" a ^8.3 o has saltado a Laravel 13? Reviértelo; eso es otro sprint.
4. ¿composer.lock lo editaste a mano? Mal: solo Composer.
5. ¿COORDINACION sigue EN CURSO? Ciérralo.
```
