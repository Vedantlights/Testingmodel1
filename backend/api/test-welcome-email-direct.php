<?php
/**
 * Direct Welcome Email Test
 * 
 * This script directly tests sending a welcome email without using background worker
 * Use this to debug email sending issues
 * 
 * Usage: php test-welcome-email-direct.php <email>
 * Or visit: /api/test-welcome-email-direct.php?email=test@example.com
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/admin-config.php';

header('Content-Type: text/plain; charset=utf-8');

// Get email from command line or GET parameter
$testEmail = '';
if (php_sapi_name() === 'cli') {
    // CLI mode
    if ($argc < 2) {
        echo "Usage: php test-welcome-email-direct.php <email> [name] [user_id]\n";
        exit(1);
    }
    $testEmail = $argv[1];
    $testName = $argv[2] ?? 'Test User';
    $testUserId = intval($argv[3] ?? 999);
} else {
    // Web mode
    $testEmail = $_GET['email'] ?? '';
    $testName = $_GET['name'] ?? 'Test User';
    $testUserId = intval($_GET['user_id'] ?? 999);
    
    if (empty($testEmail)) {
        echo "Error: Email parameter required\n";
        echo "Usage: ?email=test@example.com&name=Test User&user_id=999\n";
        exit(1);
    }
}

echo "=== Welcome Email Direct Test ===\n\n";
echo "Email: $testEmail\n";
echo "Name: $testName\n";
echo "User ID: $testUserId\n\n";

// Check MSG91 configuration
echo "1. Checking MSG91 Configuration...\n";

if (!defined('MSG91_EMAIL_AUTH_KEY')) {
    echo "   ✗ MSG91_EMAIL_AUTH_KEY not defined\n";
    exit(1);
} else {
    echo "   ✓ MSG91_EMAIL_AUTH_KEY: " . substr(MSG91_EMAIL_AUTH_KEY, 0, 10) . "***\n";
}

if (!defined('MSG91_EMAIL_SEND_URL')) {
    echo "   ✗ MSG91_EMAIL_SEND_URL not defined\n";
    exit(1);
} else {
    echo "   ✓ MSG91_EMAIL_SEND_URL: " . MSG91_EMAIL_SEND_URL . "\n";
}

if (!defined('MSG91_WELCOME_TEMPLATE_ID')) {
    echo "   ✗ MSG91_WELCOME_TEMPLATE_ID not defined\n";
    exit(1);
} else {
    echo "   ✓ MSG91_WELCOME_TEMPLATE_ID: " . MSG91_WELCOME_TEMPLATE_ID . "\n";
}

if (!defined('MSG91_EMAIL_FROM_EMAIL')) {
    echo "   ✗ MSG91_EMAIL_FROM_EMAIL not defined\n";
    exit(1);
} else {
    echo "   ✓ MSG91_EMAIL_FROM_EMAIL: " . MSG91_EMAIL_FROM_EMAIL . "\n";
}

if (!defined('MSG91_EMAIL_FROM_NAME')) {
    echo "   ✗ MSG91_EMAIL_FROM_NAME not defined\n";
    exit(1);
} else {
    echo "   ✓ MSG91_EMAIL_FROM_NAME: " . MSG91_EMAIL_FROM_NAME . "\n";
}

// Prepare payload
echo "\n2. Preparing MSG91 API Payload...\n";
$payload = [
    'to' => [
        [
            'name' => $testName,
            'email' => $testEmail
        ]
    ],
    'from' => [
        'name' => MSG91_EMAIL_FROM_NAME,
        'email' => MSG91_EMAIL_FROM_EMAIL
    ],
    'domain' => defined('MSG91_EMAIL_DOMAIN') ? MSG91_EMAIL_DOMAIN : 'indiapropertys.com',
    'template_id' => MSG91_WELCOME_TEMPLATE_ID
];

echo "   Payload:\n";
echo "   " . json_encode($payload, JSON_PRETTY_PRINT) . "\n\n";

// Send to MSG91 API
echo "3. Sending to MSG91 API...\n";

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => MSG91_EMAIL_SEND_URL,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'authkey: ' . MSG91_EMAIL_AUTH_KEY
    ],
    CURLOPT_TIMEOUT => 30,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_VERBOSE => true
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
$curlInfo = curl_getinfo($ch);

curl_close($ch);

echo "   HTTP Code: $httpCode\n";

if ($response === false || !empty($curlError)) {
    echo "   ✗ cURL Error: $curlError\n";
    exit(1);
}

echo "   ✓ Response received\n\n";

// Parse response
echo "4. Response Analysis...\n";
$responseData = json_decode($response, true);

if ($responseData === null) {
    echo "   ✗ Invalid JSON response\n";
    echo "   Raw response: $response\n";
    exit(1);
}

echo "   Response:\n";
echo "   " . json_encode($responseData, JSON_PRETTY_PRINT) . "\n\n";

// Check if successful
if ($httpCode === 200) {
    if (isset($responseData['type']) && $responseData['type'] === 'success') {
        echo "   ✓ SUCCESS: Email sent successfully!\n";
        echo "   Check your inbox: $testEmail\n";
    } elseif (isset($responseData['message']) && strpos(strtolower($responseData['message']), 'success') !== false) {
        echo "   ✓ SUCCESS: Email sent successfully!\n";
        echo "   Check your inbox: $testEmail\n";
    } else {
        echo "   ⚠ WARNING: HTTP 200 but response format unexpected\n";
        echo "   Check MSG91 dashboard for delivery status\n";
    }
} else {
    echo "   ✗ FAILED: HTTP $httpCode\n";
    if (isset($responseData['message'])) {
        echo "   Error: " . $responseData['message'] . "\n";
    }
    if (isset($responseData['errors'])) {
        echo "   Errors: " . json_encode($responseData['errors']) . "\n";
    }
}

echo "\n=== Test Complete ===\n";

