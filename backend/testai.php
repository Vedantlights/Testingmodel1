<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "=== FIND DUPLICATE DEFINITION ===\n\n";

// Check BEFORE loading any config
echo "1. Before loading configs:\n";
echo "   GOOGLE_APPLICATION_CREDENTIALS defined: " . (defined('GOOGLE_APPLICATION_CREDENTIALS') ? 'YES' : 'NO') . "\n";
if (defined('GOOGLE_APPLICATION_CREDENTIALS')) {
    echo "   Value: " . GOOGLE_APPLICATION_CREDENTIALS . "\n";
}

// Load config.php
echo "\n2. After loading config.php:\n";
require_once __DIR__ . '/config/config.php';
echo "   GOOGLE_APPLICATION_CREDENTIALS defined: " . (defined('GOOGLE_APPLICATION_CREDENTIALS') ? 'YES' : 'NO') . "\n";
if (defined('GOOGLE_APPLICATION_CREDENTIALS')) {
    echo "   Value: " . GOOGLE_APPLICATION_CREDENTIALS . "\n";
}

// Load database.php
echo "\n3. After loading database.php:\n";
require_once __DIR__ . '/config/database.php';
echo "   GOOGLE_APPLICATION_CREDENTIALS defined: " . (defined('GOOGLE_APPLICATION_CREDENTIALS') ? 'YES' : 'NO') . "\n";
if (defined('GOOGLE_APPLICATION_CREDENTIALS')) {
    echo "   Value: " . GOOGLE_APPLICATION_CREDENTIALS . "\n";
}

// Load moderation.php
echo "\n4. After loading moderation.php:\n";
require_once __DIR__ . '/config/moderation.php';
echo "   GOOGLE_APPLICATION_CREDENTIALS defined: " . (defined('GOOGLE_APPLICATION_CREDENTIALS') ? 'YES' : 'NO') . "\n";
if (defined('GOOGLE_APPLICATION_CREDENTIALS')) {
    echo "   Value: " . GOOGLE_APPLICATION_CREDENTIALS . "\n";
}

echo "\n=== Check if file exists at final path ===\n";
$path = GOOGLE_APPLICATION_CREDENTIALS;
echo "Path: $path\n";
echo "Exists: " . (file_exists($path) ? 'YES' : 'NO') . "\n";