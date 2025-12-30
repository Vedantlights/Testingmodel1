<?php
header('Content-Type: text/plain');

echo "=== CREDENTIALS TEST ===\n\n";

$path = '/home/u123456789/Secure/indiapropertys-8fab286d41e4.json';

echo "Path: $path\n";
echo "Exists: " . (file_exists($path) ? 'YES' : 'NO') . "\n";
echo "Readable: " . (is_readable($path) ? 'YES' : 'NO') . "\n";

if (file_exists($path)) {
    $content = file_get_contents($path);
    $json = json_decode($content);
    echo "Valid JSON: " . ($json ? 'YES' : 'NO') . "\n";
    if ($json) {
        echo "Project ID: " . ($json->project_id ?? 'NOT FOUND') . "\n";
        echo "Client Email: " . ($json->client_email ?? 'NOT FOUND') . "\n";
    }
} else {
    echo "\n⚠️ FILE NOT FOUND!\n";
    echo "Check if the path is correct for your hosting.\n";
}

echo "\n=== UPLOAD PATHS TEST ===\n\n";

$docRoot = $_SERVER['DOCUMENT_ROOT'];
echo "Document Root: $docRoot\n\n";

$tempPath = $docRoot . '/uploads/temp/';
echo "Temp Path: $tempPath\n";
echo "Exists: " . (file_exists($tempPath) ? 'YES' : 'NO') . "\n";
echo "Writable: " . (is_writable($tempPath) ? 'YES' : 'NO') . "\n";