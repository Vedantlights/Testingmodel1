<?php
/**
 * Complete Email Flow Test
 * Tests the entire email sending flow with detailed debugging
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

echo "<!DOCTYPE html><html><head><title>Complete Email Flow Test</title>";
echo "<style>body{font-family:monospace;padding:20px;background:#f5f5f5;}";
echo ".success{color:green;}.error{color:red;}.info{color:blue;}";
echo "pre{background:#fff;padding:10px;border:1px solid #ddd;overflow-x:auto;}</style></head><body>";
echo "<h1>Complete Email Flow Test</h1><pre>";

// Step 1: Load config
echo "Step 1: Loading configuration...\n";
try {
    require_once __DIR__ . '/../config/config.php';
    echo "✓ Config loaded\n";
    
    // Check MSG91 SMTP constants
    $constants = [
        'MSG91_SMTP_HOST',
        'MSG91_SMTP_PORT',
        'MSG91_SMTP_USER',
        'MSG91_SMTP_PASS',
        'MSG91_SMTP_FROM_EMAIL',
        'MSG91_SMTP_FROM_NAME'
    ];
    
    foreach ($constants as $const) {
        if (defined($const)) {
            $value = constant($const);
            if (strpos($const, 'PASS') !== false) {
                $value = substr($value, 0, 3) . '***';
            }
            echo "  ✓ $const: $value\n";
        } else {
            echo "  ✗ $const: NOT DEFINED\n";
        }
    }
} catch (Exception $e) {
    echo "✗ Config load failed: " . $e->getMessage() . "\n";
    exit;
}

// Step 2: Load database
echo "\nStep 2: Loading database...\n";
try {
    require_once __DIR__ . '/../config/database.php';
    echo "✓ Database config loaded\n";
    $db = getDB();
    if ($db) {
        echo "✓ Database connection successful\n";
    } else {
        echo "✗ Database connection failed\n";
    }
} catch (Exception $e) {
    echo "✗ Database load failed: " . $e->getMessage() . "\n";
}

// Step 3: Check PHPMailer
echo "\nStep 3: Checking PHPMailer...\n";
// Using root vendor folder
$phpmailerPath = __DIR__ . '/../../vendor/autoload.php';
if (file_exists($phpmailerPath)) {
    echo "✓ vendor/autoload.php exists\n";
    require_once $phpmailerPath;
    if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        echo "✓ PHPMailer class is available\n";
    } else {
        echo "✗ PHPMailer class NOT found\n";
    }
} else {
    echo "✗ vendor/autoload.php NOT found\n";
}

// Step 4: Load template
echo "\nStep 4: Loading email template...\n";
try {
    require_once __DIR__ . '/../utils/welcome_email_template.php';
    if (function_exists('generateWelcomeEmailTemplate')) {
        echo "✓ generateWelcomeEmailTemplate() function exists\n";
    } else {
        echo "✗ generateWelcomeEmailTemplate() function NOT found\n";
    }
} catch (Exception $e) {
    echo "✗ Template load failed: " . $e->getMessage() . "\n";
}

// Step 5: Load email helper
echo "\nStep 5: Loading email helper...\n";
try {
    require_once __DIR__ . '/../helpers/email_helper_smtp.php';
    if (function_exists('sendWelcomeEmailViaSMTP')) {
        echo "✓ sendWelcomeEmailViaSMTP() function exists\n";
    } else {
        echo "✗ sendWelcomeEmailViaSMTP() function NOT found\n";
    }
} catch (Exception $e) {
    echo "✗ Email helper load failed: " . $e->getMessage() . "\n";
}

// Step 6: Test email sending (if test email provided)
$testEmail = $_GET['email'] ?? null;
if ($testEmail) {
    echo "\nStep 6: Testing email sending...\n";
    echo "  Test Email: $testEmail\n";
    echo "  Test Name: Test User\n";
    echo "  Test User ID: 999\n\n";
    
    if (function_exists('sendWelcomeEmailViaSMTP')) {
        // Enable error logging
        error_log("=== Starting email test for $testEmail ===");
        
        $result = sendWelcomeEmailViaSMTP(999, 'Test User', $testEmail);
        
        if ($result) {
            echo "✓ Email sent successfully!\n";
        } else {
            echo "✗ Email sending failed\n";
            echo "  Check PHP error logs for details\n";
        }
        
        error_log("=== Email test completed for $testEmail ===");
    } else {
        echo "✗ Cannot test - function not available\n";
    }
} else {
    echo "\nStep 6: Skipped (no test email provided)\n";
    echo "  Add ?email=test@example.com to URL to test sending\n";
}

// Step 7: Check recent email logs
echo "\nStep 7: Checking recent email logs...\n";
try {
    if (isset($db) && $db) {
        $stmt = $db->query("
            SELECT id, user_id, email_type, status, error_message, created_at 
            FROM email_logs 
            WHERE email_type = 'welcome' 
            ORDER BY created_at DESC 
            LIMIT 5
        ");
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($logs)) {
            echo "  No email logs found\n";
        } else {
            echo "  Recent logs:\n";
            foreach ($logs as $log) {
                $status = $log['status'];
                $error = $log['error_message'] ?? 'N/A';
                echo "    - ID: {$log['id']}, Status: $status, Error: " . substr($error, 0, 100) . "\n";
            }
        }
    } else {
        echo "  Cannot check logs - database not available\n";
    }
} catch (Exception $e) {
    echo "  Error checking logs: " . $e->getMessage() . "\n";
}

echo "\n=== Test Complete ===\n";
echo "</pre>";
echo "<p><a href='?email=" . urlencode($testEmail ?? 'test@example.com') . "'>Run Test with Email</a></p>";
echo "</body></html>";

