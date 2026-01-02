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

// Get email from command line or GET parameter
$testEmail = '';
$isCli = (php_sapi_name() === 'cli');

if ($isCli) {
    // CLI mode
    header('Content-Type: text/plain; charset=utf-8');
    if ($argc < 2) {
        echo "Usage: php test-welcome-email-direct.php <email> [name] [user_id]\n";
        exit(1);
    }
    $testEmail = trim($argv[1]);
    $testName = isset($argv[2]) ? trim($argv[2]) : 'Test User';
    $testUserId = isset($argv[3]) ? intval($argv[3]) : 999;
} else {
    // Web mode
    header('Content-Type: text/html; charset=utf-8');
    
    // Get parameters from GET or POST
    $testEmail = isset($_GET['email']) ? trim($_GET['email']) : (isset($_POST['email']) ? trim($_POST['email']) : '');
    $testName = isset($_GET['name']) ? trim($_GET['name']) : (isset($_POST['name']) ? trim($_POST['name']) : 'Test User');
    $testUserId = isset($_GET['user_id']) ? intval($_GET['user_id']) : (isset($_POST['user_id']) ? intval($_POST['user_id']) : 999);
    
    if (empty($testEmail)) {
        // Show form if no email provided
        echo "<!DOCTYPE html><html><head><title>Welcome Email Test</title><style>body{font-family:Arial;max-width:600px;margin:50px auto;padding:20px;}input,button{padding:10px;margin:5px;width:100%;box-sizing:border-box;}button{background:#007bff;color:white;border:none;cursor:pointer;}button:hover{background:#0056b3;}.error{color:red;padding:10px;background:#fee;border:1px solid #fcc;}</style></head><body>";
        echo "<h1>Welcome Email Test</h1>";
        echo "<div class='error'><strong>Error:</strong> Email parameter is required</div>";
        echo "<form method='GET' action=''>";
        echo "<label>Email: <input type='email' name='email' placeholder='test@example.com' required></label><br>";
        echo "<label>Name: <input type='text' name='name' placeholder='Test User' value='Test User'></label><br>";
        echo "<label>User ID: <input type='number' name='user_id' placeholder='999' value='999'></label><br>";
        echo "<button type='submit'>Send Test Email</button>";
        echo "</form>";
        echo "<hr><p><strong>Direct URL usage:</strong><br><code>?email=test@example.com&name=Test%20User&user_id=999</code></p>";
        echo "</body></html>";
        exit(1);
    }
}

// Output formatting based on mode
if ($isCli) {
    echo "=== Welcome Email Direct Test ===\n\n";
    echo "Email: $testEmail\n";
    echo "Name: $testName\n";
    echo "User ID: $testUserId\n\n";
} else {
    echo "<!DOCTYPE html><html><head><title>Welcome Email Test Result</title><style>body{font-family:monospace;max-width:900px;margin:20px auto;padding:20px;background:#f5f5f5;}pre{background:#fff;padding:15px;border:1px solid #ddd;overflow-x:auto;}.success{color:green;}.error{color:red;}.warning{color:orange;}h1{color:#333;}</style></head><body>";
    echo "<h1>Welcome Email Direct Test</h1>";
    echo "<pre>";
    echo "Email: $testEmail\n";
    echo "Name: $testName\n";
    echo "User ID: $testUserId\n\n";
}

// Check MSG91 configuration
$configError = false;
echo "1. Checking MSG91 Configuration...\n";

if (!defined('MSG91_EMAIL_AUTH_KEY')) {
    echo "   ✗ MSG91_EMAIL_AUTH_KEY not defined\n";
    $configError = true;
} else {
    echo "   ✓ MSG91_EMAIL_AUTH_KEY: " . substr(MSG91_EMAIL_AUTH_KEY, 0, 10) . "***\n";
}

if (!defined('MSG91_EMAIL_SEND_URL')) {
    echo "   ✗ MSG91_EMAIL_SEND_URL not defined\n";
    $configError = true;
} else {
    echo "   ✓ MSG91_EMAIL_SEND_URL: " . MSG91_EMAIL_SEND_URL . "\n";
}

if (!defined('MSG91_WELCOME_TEMPLATE_ID')) {
    echo "   ✗ MSG91_WELCOME_TEMPLATE_ID not defined\n";
    $configError = true;
} else {
    echo "   ✓ MSG91_WELCOME_TEMPLATE_ID: " . MSG91_WELCOME_TEMPLATE_ID . "\n";
}

if (!defined('MSG91_EMAIL_FROM_EMAIL')) {
    echo "   ✗ MSG91_EMAIL_FROM_EMAIL not defined\n";
    $configError = true;
} else {
    echo "   ✓ MSG91_EMAIL_FROM_EMAIL: " . MSG91_EMAIL_FROM_EMAIL . "\n";
}

if (!defined('MSG91_EMAIL_FROM_NAME')) {
    echo "   ✗ MSG91_EMAIL_FROM_NAME not defined\n";
    $configError = true;
} else {
    echo "   ✓ MSG91_EMAIL_FROM_NAME: " . MSG91_EMAIL_FROM_NAME . "\n";
}

if (!defined('MSG91_EMAIL_DOMAIN')) {
    echo "   ⚠ MSG91_EMAIL_DOMAIN not defined (using default: indiapropertys.in)\n";
} else {
    echo "   ✓ MSG91_EMAIL_DOMAIN: " . MSG91_EMAIL_DOMAIN . "\n";
}

if ($configError) {
    if (!$isCli) {
        echo "</pre></body></html>";
    }
    exit(1);
}

// Prepare payload (correct v5 API structure)
echo "\n2. Preparing MSG91 API Payload...\n";
$payload = [
    'recipients' => [
        [
            'to' => [
                [
                    'email' => $testEmail,
                    'name' => $testName
                ]
            ]
        ]
    ],
    'from' => [
        'email' => MSG91_EMAIL_FROM_EMAIL
    ],
    'domain' => defined('MSG91_EMAIL_DOMAIN') ? MSG91_EMAIL_DOMAIN : 'indiapropertys.in',
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
    CURLOPT_ENCODING => '',
    CURLOPT_MAXREDIRS => 10,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_CUSTOMREQUEST => 'POST',
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json',
        'authkey: ' . MSG91_EMAIL_AUTH_KEY
    ],
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

if ($isCli) {
    echo "\n=== Test Complete ===\n";
} else {
    echo "\n=== Test Complete ===\n";
    echo "</pre>";
    echo "<p><a href='?email=$testEmail&name=" . urlencode($testName) . "&user_id=$testUserId'>Test Again</a> | <a href='?'>New Test</a></p>";
    echo "</body></html>";
}

