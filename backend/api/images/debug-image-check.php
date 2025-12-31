<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain');

echo "=== IMAGE PATH DEBUG ===\n\n";

// Check all possible upload directories
$paths = [
    '/home/u449667423/domains/indiapropertys.com/public_html/demo1/uploads/properties/',
    '/home/u449667423/domains/indiapropertys.com/public_html/demo1/uploads/properties/images/',
    '/home/u449667423/domains/indiapropertys.com/public_html/demo1/backend/uploads/properties/',
];

foreach ($paths as $path) {
    echo "Path: $path\n";
    echo "  Exists: " . (is_dir($path) ? "YES" : "NO") . "\n";
    if (is_dir($path)) {
        echo "  Writable: " . (is_writable($path) ? "YES" : "NO") . "\n";
        $files = scandir($path);
        $count = count($files) - 2; // Remove . and ..
        echo "  Items: $count\n";
    }
    echo "\n";
}

// Check specific property folders
echo "=== PROPERTY FOLDERS ===\n";
$baseDir = '/home/u449667423/domains/indiapropertys.com/public_html/demo1/uploads/properties/';
if (is_dir($baseDir)) {
    $folders = scandir($baseDir);
    foreach ($folders as $folder) {
        if ($folder !== '.' && $folder !== '..' && is_dir($baseDir . $folder)) {
            $files = glob($baseDir . $folder . '/*');
            echo "Property $folder: " . count($files) . " files\n";
            foreach (array_slice($files, 0, 5) as $file) {
                echo "  - " . basename($file) . "\n";
            }
        }
    }
}

// Check images subfolder
echo "\n=== IMAGES SUBFOLDER ===\n";
$imagesDir = $baseDir . 'images/';
if (is_dir($imagesDir)) {
    $files = glob($imagesDir . '*');
    echo "Found " . count($files) . " files in images subfolder\n";
    foreach (array_slice($files, 0, 10) as $file) {
        echo "  - " . basename($file) . "\n";
    }
} else {
    echo "images/ subfolder does not exist\n";
}

// Check .htaccess
echo "\n=== HTACCESS CHECK ===\n";
$htaccess = $baseDir . '.htaccess';
if (file_exists($htaccess)) {
    echo ".htaccess exists:\n";
    echo file_get_contents($htaccess);
} else {
    echo "No .htaccess in uploads folder\n";
}

// Check config constants
echo "\n=== CONFIG CONSTANTS ===\n";
require_once __DIR__ . '/../../config/config.php';
echo "UPLOAD_BASE_URL: " . (defined('UPLOAD_BASE_URL') ? UPLOAD_BASE_URL : 'NOT DEFINED') . "\n";
echo "UPLOAD_DIR: " . (defined('UPLOAD_DIR') ? UPLOAD_DIR : 'NOT DEFINED') . "\n";
echo "BASE_URL: " . (defined('BASE_URL') ? BASE_URL : 'NOT DEFINED') . "\n";

