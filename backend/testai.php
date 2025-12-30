<?php
header('Content-Type: text/plain');

echo "=== FIND CREDENTIALS FILE ===\n\n";

// Your actual home directory
$homeDir = '/home/u449667423';

// Check common locations
$possiblePaths = [
    $homeDir . '/Secure/indiapropertys-8fab286d41e4.json',
    $homeDir . '/secure/indiapropertys-8fab286d41e4.json',
    $homeDir . '/domains/indiapropertys.com/Secure/indiapropertys-8fab286d41e4.json',
    $homeDir . '/domains/indiapropertys.com/public_html/demo1/config/indiapropertys-8fab286d41e4.json',
    $homeDir . '/domains/indiapropertys.com/public_html/demo1/backend/config/indiapropertys-8fab286d41e4.json',
];

foreach ($possiblePaths as $path) {
    $exists = file_exists($path) ? '✅ EXISTS' : '❌ NO';
    echo "$exists: $path\n";
}

echo "\n=== LIST HOME DIRECTORY ===\n";
$dirs = @scandir($homeDir);
if ($dirs) {
    foreach ($dirs as $dir) {
        if ($dir !== '.' && $dir !== '..') {
            echo "  - $dir\n";
        }
    }
}