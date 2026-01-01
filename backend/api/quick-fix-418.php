<?php
/**
 * Quick Fix Error 418 - Action Checklist
 * 
 * This page provides a simple checklist to fix the MSG91 Error 418
 */

require_once __DIR__ . '/../config/admin-config.php';

header('Content-Type: text/html; charset=utf-8');

$serverIP = $_SERVER['SERVER_ADDR'] ?? 'Not available';

?>
<!DOCTYPE html>
<html>
<head>
    <title>Quick Fix Error 418</title>
    <style>
        body { font-family: Arial; max-width: 900px; margin: 20px auto; padding: 20px; background: #f5f5f5; }
        h1 { color: #d32f2f; border-bottom: 3px solid #d32f2f; padding-bottom: 10px; }
        h2 { color: #1976d2; margin-top: 30px; }
        .important { background: #fff3cd; border-left: 5px solid #ffc107; padding: 15px; margin: 20px 0; }
        .success-box { background: #e8f5e9; border-left: 5px solid #4caf50; padding: 15px; margin: 20px 0; }
        .error-box { background: #ffebee; border-left: 5px solid #d32f2f; padding: 15px; margin: 20px 0; }
        .step { background: white; padding: 20px; margin: 15px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .step-number { background: #1976d2; color: white; width: 30px; height: 30px; border-radius: 50%; display: inline-block; text-align: center; line-height: 30px; margin-right: 10px; font-weight: bold; }
        code { background: #f0f0f0; padding: 2px 8px; border-radius: 3px; font-family: monospace; }
        .ip-address { font-size: 24px; font-weight: bold; color: #1976d2; padding: 10px; background: #e3f2fd; border-radius: 5px; text-align: center; margin: 10px 0; }
        .checklist { list-style: none; padding: 0; }
        .checklist li { padding: 8px; margin: 5px 0; background: #f5f5f5; border-left: 4px solid #ddd; }
        .checklist li:before { content: "☐ "; font-size: 18px; margin-right: 10px; }
        a.button { display: inline-block; background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 5px; }
        a.button:hover { background: #1565c0; }
        a.button-success { background: #4caf50; }
        a.button-success:hover { background: #388e3c; }
    </style>
</head>
<body>
    <h1>🚨 Quick Fix: MSG91 Error 418</h1>
    
    <div class="error-box">
        <strong>⚠️ IMPORTANT:</strong> This is <strong>NOT a code issue</strong>. Your code is correct. 
        The problem is MSG91 dashboard configuration (IP whitelisting).
    </div>
    
    <div class="important">
        <strong>📋 What is Error 418?</strong><br>
        Error 418 = Your server's IP address is NOT whitelisted in MSG91 dashboard.<br>
        MSG91 is blocking your API requests for security.
    </div>
    
    <h2>📍 Step 1: Your Server IP Address</h2>
    <div class="step">
        <div class="ip-address">
            <?php echo htmlspecialchars($serverIP); ?>
        </div>
        <p><strong>Copy this IP address</strong> - you'll need it in Step 5.</p>
        <a href="check-server-ip.php" class="button" target="_blank">View Full IP Details →</a>
    </div>
    
    <h2>🔑 Step 2-5: Fix in MSG91 Dashboard</h2>
    
    <div class="step">
        <span class="step-number">2</span>
        <strong>Log into MSG91 Dashboard</strong>
        <p>
            <a href="https://control.msg91.com" class="button" target="_blank">Open MSG91 Dashboard →</a>
        </p>
    </div>
    
    <div class="step">
        <span class="step-number">3</span>
        <strong>Go to Authkey Settings</strong>
        <ul>
            <li>Click your <strong>username</strong> (top right)</li>
            <li>Select <strong>"Authkey"</strong></li>
            <li>If asked, verify with OTP</li>
        </ul>
    </div>
    
    <div class="step">
        <span class="step-number">4</span>
        <strong>Find Your Authkey</strong>
        <p>Look for: <code><?php echo defined('MSG91_EMAIL_AUTH_KEY') ? substr(MSG91_EMAIL_AUTH_KEY, 0, 15) . '***' : 'Your Auth Key'; ?></code></p>
    </div>
    
    <div class="step">
        <span class="step-number">5</span>
        <strong>Add IP to Whitelist</strong>
        <ol>
            <li>Click <strong>arrow/edit</strong> under "Actions" for your authkey</li>
            <li>Find <strong>"API Security"</strong> section</li>
            <li>Turn ON "API Security" (if off)</li>
            <li>Find <strong>"Whitelisted IPs"</strong></li>
            <li><strong>Add IP:</strong> <code><?php echo htmlspecialchars($serverIP); ?></code></li>
            <li><strong>Save</strong> changes</li>
        </ol>
        <div class="important" style="margin-top: 15px;">
            <strong>OR</strong> if you prefer (less secure): <strong>Disable "API Security"</strong> to allow all IPs.
        </div>
    </div>
    
    <div class="step">
        <span class="step-number">6</span>
        <strong>Wait 2-5 Minutes</strong>
        <p>MSG91 needs time to process the changes. Be patient!</p>
    </div>
    
    <div class="step">
        <span class="step-number">7</span>
        <strong>Test Again</strong>
        <p>
            <a href="test-welcome-email-direct.php" class="button button-success">Test Welcome Email →</a>
        </p>
        <p>You should get <strong>HTTP 200</strong> (not 401) and receive the email!</p>
    </div>
    
    <h2>✅ Checklist</h2>
    <ul class="checklist">
        <li>Got server IP: <?php echo htmlspecialchars($serverIP); ?></li>
        <li>Logged into MSG91 Dashboard</li>
        <li>Went to Authkey Settings</li>
        <li>Found my authkey</li>
        <li>Added server IP to whitelist (or disabled API Security)</li>
        <li>Saved changes</li>
        <li>Waited 2-5 minutes</li>
        <li>Tested again - got HTTP 200</li>
        <li>Received email in inbox</li>
    </ul>
    
    <h2>❌ Still Not Working?</h2>
    <div class="step">
        <p><strong>Try these additional checks:</strong></p>
        <ul>
            <li><a href="msg91-error-418-fix.php" target="_blank">View Detailed Fix Guide →</a></li>
            <li>Check if Email API uses different authkey (Email → Settings → API Integration)</li>
            <li>Verify Email API permissions are enabled for your authkey</li>
            <li>Contact MSG91 Support: support@msg91.com or 1800-1212-911</li>
        </ul>
    </div>
    
    <div class="success-box" style="margin-top: 30px;">
        <strong>✅ Your Code is Ready!</strong><br>
        Once you fix IP whitelisting in MSG91 dashboard, emails will work immediately. 
        No code changes needed.
    </div>
</body>
</html>

