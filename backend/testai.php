<?php
header('Content-Type: text/plain');
$path = '/home/u123456789/Secure/indiapropertys-8fab286d41e4.json';
echo "Exists: " . (file_exists($path) ? 'YES' : 'NO') . "\n";
echo "Readable: " . (is_readable($path) ? 'YES' : 'NO') . "\n";
if (file_exists($path)) {
    echo "Contents valid JSON: " . (json_decode(file_get_contents($path)) ? 'YES' : 'NO');
}