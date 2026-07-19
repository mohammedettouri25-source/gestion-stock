<?php
if (isset($_GET['debug_php'])) {
    phpinfo();
    exit;
}

// ─── Vercel Serverless Environment Config ────────────────────────────────────
// All caches must live in /tmp (only writable dir on Vercel)
$_ENV['APP_CONFIG_CACHE']   = '/tmp/config.php';
$_ENV['APP_EVENTS_CACHE']   = '/tmp/events.php';
$_ENV['APP_PACKAGES_CACHE'] = '/tmp/packages.php';
$_ENV['APP_ROUTES_CACHE']   = '/tmp/routes.php';
$_ENV['APP_SERVICES_CACHE'] = '/tmp/services.php';
$_ENV['VIEW_COMPILED_PATH'] = '/tmp';

// ─── App Core Settings ────────────────────────────────────────────────────────
// backend/.env is gitignored — must define critical vars here for Vercel
$_ENV['APP_NAME']  = 'GStock';
$_ENV['APP_ENV']   = 'production';
$_ENV['APP_DEBUG'] = 'false';
$_ENV['APP_KEY']   = 'base64:4oQM8R1aTdsA0kWClG0XWbpnbnCioGUi/sawfSIQrwY=';
$_ENV['APP_URL']   = getenv('VERCEL_URL')
    ? 'https://' . getenv('VERCEL_URL')
    : 'http://localhost:8000';

// ─── Stateless Drivers (required for serverless) ──────────────────────────────
$_ENV['CACHE_DRIVER']    = 'array';
$_ENV['SESSION_DRIVER']  = 'cookie';
$_ENV['QUEUE_CONNECTION']= 'sync';
$_ENV['LOG_CHANNEL']     = 'stderr';

// ─── SQLite Setup ─────────────────────────────────────────────────────────────
// Copy the bundled SQLite database to /tmp (writable) on first request
$sqliteSource = __DIR__ . '/../backend/database/database.sqlite';
$sqliteDest   = '/tmp/database.sqlite';

if (file_exists($sqliteSource) && !file_exists($sqliteDest)) {
    copy($sqliteSource, $sqliteDest);
}

$_ENV['DB_CONNECTION'] = 'sqlite';
$_ENV['DB_DATABASE']   = $sqliteDest;

// ─── Sanctum / Auth ───────────────────────────────────────────────────────────
$_ENV['SANCTUM_STATEFUL_DOMAINS'] = 'localhost,localhost:3000,localhost:5173,.vercel.app';

// ─── Load Laravel with Error Catching ─────────────────────────────────────────
try {
    require __DIR__ . '/../backend/public/index.php';
} catch (\Throwable $e) {
    header('HTTP/1.1 500 Internal Server Error');
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Vercel Serverless PHP Crash',
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => array_slice(explode("\n", $e->getTraceAsString()), 0, 10)
    ], JSON_PRETTY_PRINT);
    exit;
}
