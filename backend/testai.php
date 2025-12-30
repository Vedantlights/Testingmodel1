<?php
header('Content-Type: text/plain');

$path = '/home/u449667423/domains/indiapropertys.com/Secure/indiapropertys-8fab286d41e4.json';

echo "Path: $path\n";
echo "Exists: " . (file_exists($path) ? 'YES' : 'NO') . "\n";
echo "Readable: " . (is_readable($path) ? 'YES' : 'NO') . "\n";

$content = file_get_contents($path);
$json = json_decode($content);
echo "Valid JSON: " . ($json ? 'YES' : 'NO') . "\n";
echo "Project ID: " . ($json->project_id ?? 'ERROR') . "\n";

echo "\n✅ If all YES - your 500 error should be fixed!";