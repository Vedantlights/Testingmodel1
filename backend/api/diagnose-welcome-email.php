<?php
/**
 * Welcome Email Diagnostic Tool
 * 
 * This script helps diagnose why welcome emails aren't being sent
 * It shows the exact API request and response from MSG91
 */

header('Content-Type: text/html; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/admin-config.php';

?>
<!DOCTYPE html>
<html>
<head>
    <title>Welcome Email Diagnostic</title>
    <style>
        body { font-family: monospace; max-width: 1200px; margin: 20px auto; padding: 20px; background: #f5f5f5; }
        .section { background: white; padding: 20px; margin: 20px 0; border: 1px solid #ddd; border-radius: 5px; }
        .success { color: green; }
        .error { color: red; }
        .warning { color: orange; }
        .info { color: blue; }
        pre { background: #f9f9f9; padding: 15px; border: 1px solid #ddd; overflow-x: auto; }
        h1 { color: #333; }
        h2 { color: #555; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        table th, table td { padding: 8px; text-align: left; border: 1px solid #ddd; }
        table th { background: #f0f0f0; font-weight: bold; }
        .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
        .btn:hover { background: #0056b3; }
    </style>
</head>
<body>
    <h1>🔍 Welcome Email Diagnostic Tool</h1>
    
    <?php
    // Section 1: Configuration Check
    echo "<div class='section'>";
    echo "<h2>1. Configuration Check</h2>";
    
    $configOk = true;
    $configs = [
        'MSG91_EMAIL_AUTH_KEY' => defined('MSG91_EMAIL_AUTH_KEY') ? MSG91_EMAIL_AUTH_KEY : null,
        'MSG91_EMAIL_SEND_URL' => defined('MSG91_EMAIL_SEND_URL') ? MSG91_EMAIL_SEND_URL : null,
        'MSG91_WELCOME_TEMPLATE_ID' => defined('MSG91_WELCOME_TEMPLATE_ID') ? MSG91_WELCOME_TEMPLATE_ID : null,
        'MSG91_EMAIL_FROM_EMAIL' => defined('MSG91_EMAIL_FROM_EMAIL') ? MSG91_EMAIL_FROM_EMAIL : null,
        'MSG91_EMAIL_FROM_NAME' => defined('MSG91_EMAIL_FROM_NAME') ? MSG91_EMAIL_FROM_NAME : null,
        'MSG91_EMAIL_DOMAIN' => defined('MSG91_EMAIL_DOMAIN') ? MSG91_EMAIL_DOMAIN : 'indiapropertys.in',
    ];
    
    foreach ($configs as $key => $value) {
        if ($value === null) {
            echo "<p class='error'>❌ $key: NOT DEFINED</p>";
            $configOk = false;
        } else {
            $displayValue = $key === 'MSG91_EMAIL_AUTH_KEY' ? substr($value, 0, 15) . '...' : $value;
            echo "<p class='success'>✅ $key: $displayValue</p>";
        }
    }
    
    if (!$configOk) {
        echo "</div></body></html>";
        exit;
    }
    echo "</div>";
    
    // Section 2: Recent Email Logs
    echo "<div class='section'>";
    echo "<h2>2. Recent Email Logs (Last 10)</h2>";
    
    try {
        $db = getDB();
        $stmt = $db->query("
            SELECT el.*, u.email as user_email, u.full_name 
            FROM email_logs el
            LEFT JOIN users u ON el.user_id = u.id
            WHERE el.email_type = 'welcome'
            ORDER BY el.created_at DESC
            LIMIT 10
        ");
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($logs)) {
            echo "<p class='warning'>⚠️ No email logs found. Emails may not have been triggered yet.</p>";
        } else {
            echo "<table>";
            echo "<tr><th>ID</th><th>User</th><th>Email</th><th>Status</th><th>Error</th><th>Time</th></tr>";
            foreach ($logs as $log) {
                $statusClass = $log['status'] === 'SUCCESS' ? 'success' : 'error';
                $errorMsg = !empty($log['error_message']) ? substr($log['error_message'], 0, 50) . '...' : '-';
                echo "<tr>";
                echo "<td>{$log['id']}</td>";
                echo "<td>" . ($log['full_name'] ?? 'N/A') . "</td>";
                echo "<td>" . ($log['user_email'] ?? 'N/A') . "</td>";
                echo "<td class='$statusClass'><strong>{$log['status']}</strong></td>";
                echo "<td class='error'>$errorMsg</td>";
                echo "<td>{$log['created_at']}</td>";
                echo "</tr>";
            }
            echo "</table>";
            
            // Show last error details
            $lastLog = $logs[0];
            if ($lastLog['status'] === 'FAILED' && !empty($lastLog['msg91_response'])) {
                echo "<h3>Last Error Details:</h3>";
                $responseData = json_decode($lastLog['msg91_response'], true);
                echo "<pre>" . json_encode($responseData, JSON_PRETTY_PRINT) . "</pre>";
            }
        }
    } catch (Exception $e) {
        echo "<p class='error'>❌ Error reading logs: " . $e->getMessage() . "</p>";
    }
    echo "</div>";
    
    // Section 3: Test API Call
    echo "<div class='section'>";
    echo "<h2>3. Test API Call</h2>";
    
    $testEmail = isset($_GET['test_email']) ? trim($_GET['test_email']) : '';
    $testName = isset($_GET['test_name']) ? trim($_GET['test_name']) : 'Test User';
    
    if (empty($testEmail)) {
        echo "<form method='GET'>";
        echo "<p><label>Test Email: <input type='email' name='test_email' placeholder='test@example.com' required></label></p>";
        echo "<p><label>Test Name: <input type='text' name='test_name' value='Test User'></label></p>";
        echo "<p><button type='submit' class='btn'>Test Send Email</button></p>";
        echo "</form>";
    } else {
        echo "<p class='info'>📧 Testing with: <strong>$testEmail</strong> (Name: $testName)</p>";
        
        // Prepare payload
        $payload = [
            'recipients' => [
                [
                    'to' => [
                        [
                            'email' => $testEmail,
                            'name' => $testName
                        ]
                    ],
                    'variables' => [
                        'name' => $testName,
                        'email' => $testEmail
                    ]
                ]
            ],
            'from' => [
                'email' => MSG91_EMAIL_FROM_EMAIL
            ],
            'domain' => MSG91_EMAIL_DOMAIN,
            'template_id' => MSG91_WELCOME_TEMPLATE_ID
        ];
        
        echo "<h3>Request Payload:</h3>";
        echo "<pre>" . json_encode($payload, JSON_PRETTY_PRINT) . "</pre>";
        
        // Make API call
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
            CURLOPT_SSL_VERIFYHOST => 2
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        $curlInfo = curl_getinfo($ch);
        curl_close($ch);
        
        echo "<h3>Response:</h3>";
        echo "<p><strong>HTTP Code:</strong> <span class='" . ($httpCode === 200 ? 'success' : 'error') . "'>$httpCode</span></p>";
        
        if ($curlError) {
            echo "<p class='error'><strong>cURL Error:</strong> $curlError</p>";
        }
        
        if ($response) {
            $responseData = json_decode($response, true);
            echo "<pre>" . json_encode($responseData, JSON_PRETTY_PRINT) . "</pre>";
            
            if ($httpCode === 200) {
                if (isset($responseData['type']) && $responseData['type'] === 'success') {
                    echo "<p class='success'>✅ SUCCESS! Email should be sent. Check inbox/spam folder.</p>";
                } elseif (isset($responseData['message'])) {
                    echo "<p class='warning'>⚠️ Response: " . htmlspecialchars($responseData['message']) . "</p>";
                } else {
                    echo "<p class='warning'>⚠️ HTTP 200 but unexpected response format. Check MSG91 dashboard.</p>";
                }
            } else {
                echo "<p class='error'>❌ FAILED: HTTP $httpCode</p>";
                if (isset($responseData['message'])) {
                    echo "<p class='error'><strong>Error:</strong> " . htmlspecialchars($responseData['message']) . "</p>";
                }
                if (isset($responseData['errors'])) {
                    echo "<p class='error'><strong>Errors:</strong> " . htmlspecialchars(json_encode($responseData['errors'])) . "</p>";
                }
            }
        } else {
            echo "<p class='error'>❌ No response from API</p>";
        }
        
        echo "<p><a href='?' class='btn'>Test Again</a></p>";
    }
    echo "</div>";
    
    // Section 4: Recommendations
    echo "<div class='section'>";
    echo "<h2>4. Recommendations</h2>";
    echo "<ul>";
    echo "<li>✅ Verify MSG91_EMAIL_AUTH_KEY is correct (check MSG91 dashboard)</li>";
    echo "<li>✅ Verify template_id exists and is active in MSG91 dashboard</li>";
    echo "<li>✅ Verify sender email is verified in MSG91</li>";
    echo "<li>✅ Verify domain is verified in MSG91</li>";
    echo "<li>✅ Check spam folder for test emails</li>";
    echo "<li>✅ Check MSG91 dashboard for delivery reports</li>";
    echo "</ul>";
    echo "</div>";
    ?>
    
    <div class="section">
        <h2>Quick Links</h2>
        <a href="test-welcome-email-direct.php" class="btn">Direct Test Script</a>
        <a href="check-email-status.php" class="btn">Check Email Status</a>
        <a href="view-email-logs.php" class="btn">View All Logs</a>
    </div>
</body>
</html>

