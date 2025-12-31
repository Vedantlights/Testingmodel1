<?php
/**
 * Minimal Error Catcher
 * This script will show ANY PHP error that occurs
 */

// Force display ALL errors
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Custom error handler to catch everything
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    echo "<div style='background:#ffdddd;border:2px solid red;padding:15px;margin:10px;font-family:monospace;'>";
    echo "<strong>PHP Error [{$errno}]:</strong> {$errstr}<br>";
    echo "<strong>File:</strong> {$errfile}<br>";
    echo "<strong>Line:</strong> {$errline}";
    echo "</div>";
    return true;
});

// Catch fatal errors
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        echo "<div style='background:#ffdddd;border:2px solid red;padding:15px;margin:10px;font-family:monospace;'>";
        echo "<strong>FATAL ERROR:</strong><br>";
        echo "<strong>Type:</strong> {$error['type']}<br>";
        echo "<strong>Message:</strong> {$error['message']}<br>";
        echo "<strong>File:</strong> {$error['file']}<br>";
        echo "<strong>Line:</strong> {$error['line']}";
        echo "</div>";
    }
});

header('Content-Type: text/html');
echo "<h1>Testing moderate-and-upload.php dependencies</h1>";
echo "<p>Time: " . date('Y-m-d H:i:s') . "</p><hr>";

// Test each file one by one
$files = [
    'config/config.php',
    'config/database.php', 
    'config/moderation.php',
    'utils/auth.php',
    'helpers/FileHelper.php',
    'services/WatermarkService.php',
    'vendor/autoload.php',
    'services/GoogleVisionService.php'
];

$basePath = __DIR__ . '/../';

foreach ($files as $file) {
    $fullPath = $basePath . $file;
    echo "<p><strong>Loading:</strong> {$file} ... ";
    
    if (!file_exists($fullPath)) {
        echo "<span style='color:red;'>FILE NOT FOUND</span></p>";
        continue;
    }
    
    try {
        require_once $fullPath;
        echo "<span style='color:green;'>OK</span></p>";
    } catch (Throwable $e) {
        echo "<span style='color:red;'>EXCEPTION: " . htmlspecialchars($e->getMessage()) . "</span></p>";
        echo "<pre style='background:#2d2d2d;color:#f8f8f2;padding:10px;font-size:11px;'>";
        echo htmlspecialchars($e->getTraceAsString());
        echo "</pre>";
    }
}

echo "<hr><h2>Testing GoogleVisionService</h2>";

if (class_exists('GoogleVisionService')) {
    echo "<p>Class exists: <span style='color:green;'>YES</span></p>";
    
    try {
        echo "<p>Creating instance...</p>";
        $service = new GoogleVisionService();
        echo "<p style='color:green;'>✅ GoogleVisionService created successfully!</p>";
    } catch (Throwable $e) {
        echo "<p style='color:red;'>❌ Error creating GoogleVisionService:</p>";
        echo "<pre style='background:#ffdddd;padding:10px;'>";
        echo "Exception: " . get_class($e) . "\n";
        echo "Message: " . htmlspecialchars($e->getMessage()) . "\n";
        echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n\n";
        echo "Stack Trace:\n" . htmlspecialchars($e->getTraceAsString());
        echo "</pre>";
    }
} else {
    echo "<p style='color:red;'>GoogleVisionService class does not exist!</p>";
}

echo "<hr><h2>PHP Info Summary</h2>";
echo "<p><strong>PHP Version:</strong> " . phpversion() . "</p>";
echo "<p><strong>Memory Limit:</strong> " . ini_get('memory_limit') . "</p>";
echo "<p><strong>Max Execution Time:</strong> " . ini_get('max_execution_time') . "</p>";

echo "<hr><p style='color:green;'>Script completed without fatal errors.</p>";