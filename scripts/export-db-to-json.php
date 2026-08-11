<?php
/**
 * Exporta tablas de la BD a archivos JSON para backup.
 * Uso: php scripts/export-db-to-json.php [--all] [--table=nombre]
 * 
 * Salida: storage/backups/YYYY-MM-DD/
 */

define('LARAVEL_START', microtime(true));

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

$date = date('Y-m-d');
$dir = __DIR__ . '/../storage/backups/' . $date;

if (! File::exists($dir)) {
    File::makeDirectory($dir, 0755, true);
}

$options = getopt('', ['all', 'table:']);
$all = isset($options['all']);
$requestedTable = $options['table'] ?? null;

// Mapa: tabla => columnas a exportar (null = todas, [] = sin datos, solo estructura)
$tables = [
    'chatbot_interactions' => [
        'export' => true,
        'note' => 'Historial de conversaciones del chatbot (columna history = JSON, máx 24 turnos)',
    ],
    'surf_daily_briefs' => [
        'export' => true,
        'note' => 'Partes diarios de condiciones del mar + IA + override admin',
    ],
    'surf_brief_votes' => [
        'export' => true,
        'note' => 'Votos de usuarios sobre los partes de surf',
    ],
    'articles' => [
        'export' => true,
        'note' => 'Artículos del blog (content = HTML)',
    ],

];

$exported = [];

foreach ($tables as $table => $config) {
    if (! $all && $requestedTable && $requestedTable !== $table) {
        continue;
    }

    echo "Exportando {$table}... ";

    try {
        $columns = $config['columns'] ?? ['*'];
        $rows = DB::table($table)->select($columns)->get();

        $data = [
            'exported_at' => date('Y-m-d H:i:s'),
            'table' => $table,
            'count' => $rows->count(),
            'note' => $config['note'] ?? '',
            'rows' => $rows->toArray(),
        ];

        $filename = "{$table}.json";
        $path = "{$dir}/{$filename}";

        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($json === false) {
            echo "ERROR (json_encode): " . json_last_error_msg() . "\n";
            continue;
        }

        File::put($path, $json);
        $size = File::size($path);
        $sizeH = $size > 1024 * 1024 ? round($size / 1024 / 1024, 2) . ' MB' : round($size / 1024, 1) . ' KB';

        echo "OK → {$filename} ({$rows->count()} filas, {$sizeH})\n";
        $exported[] = ['table' => $table, 'file' => $filename, 'count' => $rows->count(), 'size' => $sizeH];

    } catch (\Exception $e) {
        echo "ERROR: " . $e->getMessage() . "\n";
    }
}

// Resumen
echo "\n=== RESUMEN ===\n";
echo "Directorio: {$dir}\n";
foreach ($exported as $e) {
    echo "  {$e['file']} — {$e['count']} filas, {$e['size']}\n";
}
echo "Total: " . count($exported) . " archivos exportados.\n";
echo "PHP " . memory_get_peak_usage(true) / 1024 / 1024 . " MB pico.\n";

// También guarda un manifiesto
$manifest = [
    'exported_at' => date('Y-m-d H:i:s'),
    'app' => config('app.name'),
    'db' => config('database.default') . ' / ' . config('database.connections.' . config('database.default') . '.database'),
    'files' => $exported,
];
File::put("{$dir}/manifest.json", json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
echo "Manifiesto: manifest.json\n";
