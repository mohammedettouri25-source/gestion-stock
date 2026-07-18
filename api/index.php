<?php

// ─── Vercel Serverless Environment Config ────────────────────────────────────
// All caches must live in /tmp (only writable dir on Vercel)
$_ENV['APP_CONFIG_CACHE']   = '/tmp/config.php';
$_ENV['APP_EVENTS_CACHE']   = '/tmp/events.php';
$_ENV['APP_PACKAGES_CACHE'] = '/tmp/packages.php';
$_ENV['APP_ROUTES_CACHE']   = '/tmp/routes.php';
$_ENV['APP_SERVICES_CACHE'] = '/tmp/services.php';
$_ENV['VIEW_COMPILED_PATH'] = '/tmp';

// Use stateless drivers — no persistent DB/Redis needed
$_ENV['CACHE_DRIVER']   = 'array';
$_ENV['SESSION_DRIVER'] = 'cookie';
$_ENV['LOG_CHANNEL']    = 'stderr';

// ─── SQLite Setup ─────────────────────────────────────────────────────────────
// Copy the SQLite database to /tmp so Laravel can write to it
$sqliteSource = __DIR__ . '/../backend/database/database.sqlite';
$sqliteDest   = '/tmp/database.sqlite';

if (file_exists($sqliteSource) && !file_exists($sqliteDest)) {
    copy($sqliteSource, $sqliteDest);
}

$_ENV['DB_CONNECTION'] = 'sqlite';
$_ENV['DB_DATABASE']   = $sqliteDest;

// ─── App Settings ─────────────────────────────────────────────────────────────
$_ENV['APP_ENV']   = 'production';
$_ENV['APP_DEBUG'] = 'false';

// Load Laravel's index.php
require __DIR__ . '/../backend/public/index.php';
