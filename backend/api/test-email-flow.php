<?php
/**
 * Test Email Flow - Debug all components
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== Email Flow Diagnostic ===\n\n";

// Step 1: Check config
echo "1. Checking config.php...\n";
require_once __DIR__ . '/../config/config.php';
echo "   ✓ Config loaded\n";
echo "   MSG91_SMTP_HOST: " . (defined('MSG91_SMTP_HOST') ? MSG91_SMTP_HOST : 'NOT DEFINED') . "\n";
echo "   MSG91_SMTP_PORT: " . (defined('MSG91_SMTP_PORT') ? MSG91_SMTP_PORT : 'NOT DEFINED') . "\n";
echo "   MSG91_SMTP_USER: " . (defined('MSG91_SMTP_USER') ? MSG91_SMTP_USER : 'NOT DEFINED') . "\n";
echo "   MSG91_SMTP_PASS: " . (defined('MSG91_SMTP_PASS') ? substr(MSG91_SMTP_PASS, 0, 3) . '***' : 'NOT DEFINED') . "\n\n";

// Step 2: Check database
echo "2. Checking database.php...\n";
require_once __DIR__ . '/../config/database.php';
echo "   ✓ Database config loaded\n\n";

// Step 3: Check PHPMailer
echo "3. Checking PHPMailer...\n";
// Using root vendor folder
$phpmailerPath = __DIR__ . '/../../vendor/autoload.php';
if (file_exists($phpmailerPath)) {
    echo "   ✓ vendor/autoload.php exists\n";
    require_once $phpmailerPath;
    if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        echo "   ✓ PHPMailer class is available\n";
    } else {
        echo "   ✗ PHPMailer class NOT found after autoload\n";
    }
} else {
    echo "   ✗ vendor/autoload.php NOT found at: $phpmailerPath\n";
    echo "   Install via: composer require phpmailer/phpmailer\n";
}
echo "\n";

// Step 4: Check email template
echo "4. Checking welcome_email_template.php...\n";
$templatePath = __DIR__ . '/../utils/welcome_email_template.php';
if (file_exists($templatePath)) {
    echo "   ✓ Template file exists\n";
    require_once $templatePath;
    if (function_exists('generateWelcomeEmailTemplate')) {
        echo "   ✓ generateWelcomeEmailTemplate() function exists\n";
    } else {
        echo "   ✗ generateWelcomeEmailTemplate() function NOT found\n";
    }
} else {
    echo "   ✗ Template file NOT found at: $templatePath\n";
}
echo "\n";

// Step 5: Check email_helper_smtp.php
echo "5. Checking email_helper_smtp.php...\n";
$helperPath = __DIR__ . '/../helpers/email_helper_smtp.php';
if (file_exists($helperPath)) {
    echo "   ✓ Helper file exists\n";
    require_once $helperPath;
    if (function_exists('sendWelcomeEmailViaSMTP')) {
        echo "   ✓ sendWelcomeEmailViaSMTP() function exists\n";
    } else {
        echo "   ✗ sendWelcomeEmailViaSMTP() function NOT found\n";
    }
} else {
    echo "   ✗ Helper file NOT found at: $helperPath\n";
}
echo "\n";

// Step 6: Check email_helper.php
echo "6. Checking email_helper.php...\n";
$mainHelperPath = __DIR__ . '/../helpers/email_helper.php';
if (file_exists($mainHelperPath)) {
    echo "   ✓ Main helper file exists\n";
    require_once $mainHelperPath;
    if (function_exists('sendWelcomeEmailSync')) {
        echo "   ✓ sendWelcomeEmailSync() function exists\n";
    } else {
        echo "   ✗ sendWelcomeEmailSync() function NOT found\n";
    }
    if (function_exists('sendWelcomeEmailAsync')) {
        echo "   ✓ sendWelcomeEmailAsync() function exists\n";
    } else {
        echo "   ✗ sendWelcomeEmailAsync() function NOT found\n";
    }
} else {
    echo "   ✗ Main helper file NOT found at: $mainHelperPath\n";
}
echo "\n";

// Step 7: Test function call
echo "7. Testing function call (dry run)...\n";
if (function_exists('sendWelcomeEmailViaSMTP')) {
    echo "   Function is callable\n";
    // Don't actually call it, just verify it exists
} else {
    echo "   ✗ Function is NOT callable\n";
}
echo "\n";

echo "=== Diagnostic Complete ===\n";

