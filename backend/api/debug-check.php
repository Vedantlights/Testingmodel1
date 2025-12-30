<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain');

echo "=== BACKEND DEBUG ===\n\n";

// Test 1: Config
echo "1. Loading config.php... ";
try {
    require_once __DIR__ . '/../config/config.php';
    echo "OK\n";
} catch (Error $e) {
    echo "FAILED: " . $e->getMessage() . " (Line: " . $e->getLine() . ")\n";
}

// Test 2: Database
echo "2. Loading database.php... ";
try {
    require_once __DIR__ . '/../config/database.php';
    echo "OK\n";
} catch (Error $e) {
    echo "FAILED: " . $e->getMessage() . " (Line: " . $e->getLine() . ")\n";
}

// Test 3: DB Connection
echo "3. Testing DB connection... ";
try {
    $db = getDB();
    echo "OK - Connected\n";
} catch (Exception $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
}

// Test 4: Response utils
echo "4. Loading response.php... ";
try {
    require_once __DIR__ . '/../utils/response.php';
    echo "OK\n";
} catch (Error $e) {
    echo "FAILED: " . $e->getMessage() . " (Line: " . $e->getLine() . ")\n";
}

echo "\n=== DEBUG COMPLETE ===\n";

