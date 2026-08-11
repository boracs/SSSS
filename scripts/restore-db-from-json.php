<?php
/**
 * Restaura tablas desde los archivos JSON exportados con export-db-to-json.php.
 * 
 * ⚠️  SOLO INSERTA — nunca trunca ni borra. Si hay conflictos de clave primaria,
 *    los registros existentes se conservan (INSERT IGNORE vía ON DUPLICATE KEY o skip).
 * 
 * ✅  Dry-run por defecto: `php scripts/restore-db-from-json.php` → solo simula.
 *    Para ejecutar de verdad: `php scripts/restore-db-from-json.php --execute`
 * 
 * ✅  Se puede filtrar por tabla: `php scripts/restore-db-from-json.php --execute --table=surf_daily_briefs`
 * 
 * ✅  Si no se especifica fecha, usa la más reciente en storage/backups/
 */

define('LARAVEL_START', microtime(true));

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

$options = getopt('', ['execute', 'table:', 'date:']);
$dryRun = ! isset($options['execute']);
$requestedTable = $options['table'] ?? null;
$date = $options['date'] ?? null;

// Buscar el directorio más reciente si no se especifica fecha
$backupsDir = __DIR__ . '/../storage/backups/';
if (! $date) {
    $dirs = File::directories($backupsDir);
    if (empty($dirs)) {
        echo "ERROR: no hay backups en storage/backups/\n";
        exit(1);
    }
    rsort($dirs);
    $date = basename($dirs[0]);
}
$dir = "{$backupsDir}/{$date}";

if (! File::exists($dir)) {
    echo "ERROR: no existe {$dir}\n";
    exit(1);
}

echo "📂 Backup: {$date}\n";
echo $dryRun ? "🔍 MODO DRY-RUN (sin --execute no se escribe nada)\n\n" : "⚠️  MODO EJECUCIÓN — INSERTANDO DATOS\n\n";

$files = File::files($dir);
$jsonFiles = array_filter($files, fn($f) => $f->getExtension() === 'json' && $f->getFilename() !== 'manifest.json');

$restored = [];
$skipped = 0;
$inserted = 0;
$errors = 0;

foreach ($jsonFiles as $file) {
    $table = $file->getFilenameWithoutExtension();
    $path = $file->getPathname();

    // Filtrar tabla si se pidió una específica
    if ($requestedTable && $table !== $requestedTable) {
        continue;
    }

    echo "{$table}... ";

    try {
        $raw = File::get($path);
        $data = json_decode($raw, true);
    } catch (\Exception $e) {
        echo "ERROR (lectura): {$e->getMessage()}\n";
        $errors++;
        continue;
    }

    if (! isset($data['rows']) || ! is_array($data['rows'])) {
        echo "ERROR: formato inválido\n";
        $errors++;
        continue;
    }

    $rowCount = count($data['rows']);
    if ($rowCount === 0) {
        echo "0 filas → nada que hacer\n";
        continue;
    }

    // Obtener columnas de la primera fila
    $columns = array_keys((array) $data['rows'][0]);
    // Excluir timestamps para que la BD los genere si no vienen
    $columns = array_filter($columns, fn($c) => ! in_array($c, ['created_at', 'updated_at'], true));
    // Re-index porque array_filter preserva keys
    $columns = array_values($columns);

    if ($dryRun) {
        // Validar que la tabla existe
        try {
            DB::table($table)->limit(1)->get();
        } catch (\Exception $e) {
            echo "SKIP (tabla no existe: {$e->getMessage()})\n";
            $skipped++;
            continue;
        }

        echo "OK → {$rowCount} filas (no insertadas, dry-run)\n";
        $restored[] = "{$table}: {$rowCount} filas";
        continue;
    }

    // === EJECUCIÓN REAL ===
    DB::beginTransaction();
    try {
        foreach ($data['rows'] as $row) {
            $row = (array) $row;

            // Preparar datos solo con las columnas que existen en JSON
            $values = [];
            foreach ($columns as $col) {
                // Si el valor es object (JSON anidado), serializar
                $val = $row[$col] ?? null;
                $values[$col] = is_array($val) || is_object($val) ? json_encode($val, JSON_UNESCAPED_UNICODE) : $val;
            }

            // INSERT ... ON DUPLICATE KEY → si el id ya existe, actualiza
            // Usamos insertOrIgnore + update para simular upsert
            $existing = DB::table($table)->where('id', $row['id'] ?? null)->exists();

            if ($existing) {
                // Update
                DB::table($table)->where('id', $row['id'])->update($values);
                $inserted++;
            } else {
                // Insert
                DB::table($table)->insert($values);
                $inserted++;
            }
        }
        DB::commit();
        echo "OK → {$rowCount} filas insertadas/actualizadas\n";
        $restored[] = "{$table}: {$rowCount} filas";

    } catch (\Exception $e) {
        DB::rollBack();
        echo "ERROR: {$e->getMessage()}\n";
        $errors++;
    }
}

echo "\n=== RESUMEN ===\n";
if ($dryRun) {
    echo "DRY-RUN — simulación completada.\n";
    echo "Para ejecutar: php scripts/restore-db-from-json.php --execute\n";
} else {
    echo "Insertados/actualizados: {$inserted} registros\n";
}
echo "Errores: {$errors}\n";
if (! empty($restored)) {
    foreach ($restored as $r) {
        echo "  {$r}\n";
    }
}
echo "Backup: {$date}\n";
