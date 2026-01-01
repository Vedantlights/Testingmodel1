<?php
/**
 * Debug Welcome Email Worker Execution
 * 
 * This script helps debug why the welcome email worker isn't executing.
 * Run this via browser: http://localhost/backend/api/debug-welcome-email.php
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/admin-config.php';
require_once __DIR__ . '/../helpers/email_helper.php';

header('Content-Type: text/plain; charset=utf-8');

echo "=== Welcome Email Worker Debug Test ===\n\n";

// 1. Check exec() function availability
echo "1. Checking exec() function availability...\n";
if (function_exists('exec')) {
    echo "   ✓ exec() function is available\n";
} else {
    echo "   ✗ exec() function is NOT available\n";
    echo "   ERROR: exec() must be enabled in php.ini\n";
    exit;
}

// 2. Check PHP OS
echo "\n2. PHP OS Information:\n";
echo "   OS Family: " . PHP_OS_FAMILY . "\n";
echo "   OS: " . PHP_OS . "\n";

// 3. Check PHP executable
echo "\n3. PHP Executable:\n";
if (defined('PHP_EXECUTABLE_PATH')) {
    echo "   PHP_EXECUTABLE_PATH: " . PHP_EXECUTABLE_PATH . "\n";
    $phpExecutable = PHP_EXECUTABLE_PATH;
} elseif (defined('PHP_BINARY') && PHP_BINARY) {
    echo "   PHP_BINARY: " . PHP_BINARY . "\n";
    $phpExecutable = PHP_BINARY;
} else {
    echo "   Using: php (assumes in PATH)\n";
    $phpExecutable = 'php';
}

// Test if PHP executable works
echo "   Testing PHP executable...\n";
exec($phpExecutable . ' --version 2>&1', $phpVersionOutput, $phpVersionCode);
if ($phpVersionCode === 0 && !empty($phpVersionOutput)) {
    echo "   ✓ PHP executable works: " . $phpVersionOutput[0] . "\n";
} else {
    echo "   ✗ PHP executable test failed (exit code: $phpVersionCode)\n";
    echo "   Output: " . implode("\n", $phpVersionOutput) . "\n";
}

// 4. Check worker script path
echo "\n4. Worker Script Path:\n";
if (defined('WORKER_WELCOME_EMAIL_SCRIPT')) {
    $workerScript = WORKER_WELCOME_EMAIL_SCRIPT;
    echo "   WORKER_WELCOME_EMAIL_SCRIPT: " . $workerScript . "\n";
} else {
    $workerScript = __DIR__ . '/../workers/send_welcome_email.php';
    echo "   Default path: " . $workerScript . "\n";
}

// Resolve to absolute path
$resolvedPath = realpath($workerScript);
if ($resolvedPath !== false) {
    $workerScript = $resolvedPath;
    echo "   Resolved path: " . $workerScript . "\n";
} else {
    echo "   ✗ Worker script path could not be resolved\n";
}

if (file_exists($workerScript)) {
    echo "   ✓ Worker script exists\n";
    echo "   File permissions: " . substr(sprintf('%o', fileperms($workerScript)), -4) . "\n";
} else {
    echo "   ✗ Worker script NOT FOUND\n";
    exit;
}

// 5. Test command execution
echo "\n5. Testing Command Execution:\n";
$testUserId = 999;
$testName = "Test User";
$testEmail = "test@example.com";

$userIdEscaped = escapeshellarg($testUserId);
$nameEscaped = escapeshellarg($testName);
$emailEscaped = escapeshellarg($testEmail);

if (PHP_OS_FAMILY === 'Windows') {
    $phpExecutableWin = str_replace('/', '\\', $phpExecutable);
    $workerScriptWin = str_replace('/', '\\', $workerScript);
    
    $testCommand = sprintf(
        'cmd /c start /B /MIN "" "%s" "%s" %s %s %s',
        $phpExecutableWin,
        $workerScriptWin,
        $userIdEscaped,
        $nameEscaped,
        $emailEscaped
    );
    
    echo "   Windows command: " . $testCommand . "\n";
} else {
    $testCommand = sprintf(
        '%s %s %s %s %s',
        $phpExecutable,
        $workerScript,
        $userIdEscaped,
        $nameEscaped,
        $emailEscaped
    );
    
    echo "   Unix command: " . $testCommand . "\n";
}

// Test execution (synchronous for testing)
echo "\n6. Testing Synchronous Execution (for debugging):\n";
echo "   Running worker script directly...\n";

$directCommand = sprintf(
    '"%s" "%s" %s %s %s',
    $phpExecutable,
    $workerScript,
    $userIdEscaped,
    $nameEscaped,
    $emailEscaped
);

exec($directCommand . ' 2>&1', $directOutput, $directReturnCode);

echo "   Exit code: $directReturnCode\n";
if (!empty($directOutput)) {
    echo "   Output:\n";
    foreach ($directOutput as $line) {
        echo "      $line\n";
    }
} else {
    echo "   No output (this is normal for background execution)\n";
}

// 7. Check database connection
echo "\n7. Testing Database Connection:\n";
try {
    $db = getDB();
    echo "   ✓ Database connection successful\n";
    
    // Check if email_logs table exists
    $stmt = $db->query("SHOW TABLES LIKE 'email_logs'");
    if ($stmt->rowCount() > 0) {
        echo "   ✓ email_logs table exists\n";
    } else {
        echo "   ✗ email_logs table does NOT exist (run migration)\n";
    }
    
    // Check if users table has email_status column
    $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'email_status'");
    if ($stmt->rowCount() > 0) {
        echo "   ✓ users.email_status column exists\n";
    } else {
        echo "   ✗ users.email_status column does NOT exist (run migration)\n";
    }
} catch (Exception $e) {
    echo "   ✗ Database connection failed: " . $e->getMessage() . "\n";
}

// 8. Summary
echo "\n=== Summary ===\n";
$allGood = function_exists('exec') && file_exists($workerScript);
if ($allGood) {
    echo "✓ Basic requirements met. Background worker should work.\n";
    echo "\nIf emails still don't send, check:\n";
    echo "  1. PHP error logs for 'sendWelcomeEmailAsync' messages\n";
    echo "  2. Check if MSG91 credentials are correct\n";
    echo "  3. Test worker script manually via command line\n";
} else {
    echo "✗ Some requirements are not met. Fix issues above.\n";
}

echo "\n=== Test Complete ===\n";

