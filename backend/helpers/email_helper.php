<?php
/**
 * Email Helper Functions
 * Handles async email sending via background workers
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/admin-config.php';

/**
 * Send welcome email synchronously (blocking - use as fallback)
 * 
 * This function sends the welcome email directly via MSG91 API.
 * Use this if background worker (exec()) is not available.
 * 
 * @param int $userId User ID
 * @param string $name User's full name
 * @param string $email User's email address
 * @return bool True if email sent successfully, false otherwise
 */
function sendWelcomeEmailSync($userId, $name, $email) {
    // Validate inputs
    if (empty($userId) || !is_numeric($userId)) {
        error_log("sendWelcomeEmailSync: Invalid user ID provided: " . $userId);
        return false;
    }
    
    if (empty($name) || empty($email)) {
        error_log("sendWelcomeEmailSync: Missing name or email for user ID: " . $userId);
        return false;
    }
    
    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        error_log("sendWelcomeEmailSync: Invalid email format for user ID: " . $userId . ", Email: " . $email);
        return false;
    }
    
    try {
        // Prepare MSG91 API payload (correct v5 API structure)
        $payload = [
            'recipients' => [
                [
                    'to' => [
                        [
                            'email' => $email,
                            'name' => $name
                        ]
                    ]
                ]
            ],
            'from' => [
                'email' => defined('MSG91_EMAIL_FROM_EMAIL') ? MSG91_EMAIL_FROM_EMAIL : 'noreply@indiapropertys.in'
            ],
            'domain' => defined('MSG91_EMAIL_DOMAIN') ? MSG91_EMAIL_DOMAIN : 'indiapropertys.in',
            'template_id' => defined('MSG91_WELCOME_TEMPLATE_ID') ? MSG91_WELCOME_TEMPLATE_ID : 'welcome_template_34'
        ];
        
        // Send to MSG91 API
        $url = defined('MSG91_EMAIL_SEND_URL') ? MSG91_EMAIL_SEND_URL : 'https://control.msg91.com/api/v5/email/send';
        $authkey = defined('MSG91_EMAIL_AUTH_KEY') ? MSG91_EMAIL_AUTH_KEY : '481618A2cCSUpaZHTW6936c356P1';
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
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
                "authkey: $authkey"
            ]
        ]);
        
        $response = curl_exec($ch);
        $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        // Add logging
        error_log("MSG91 Email Trigger - User: " . $email . " (User ID: $userId)");
        error_log("MSG91 HTTP Code: " . $httpcode);
        error_log("MSG91 Response: " . ($response ? substr($response, 0, 500) : 'No response'));
        if ($error) {
            error_log("MSG91 CURL Error: " . $error);
        }
        
        // Update database status
        try {
            $db = getDB();
            if ($httpcode === 200) {
                $stmt = $db->prepare("UPDATE users SET email_status = 'SENT', email_sent_at = NOW() WHERE id = ?");
                $stmt->execute([$userId]);
                
                // Log to email_logs
                $responseData = json_decode($response, true);
                $stmt = $db->prepare("INSERT INTO email_logs (user_id, email_type, status, msg91_response) VALUES (?, 'welcome', 'SUCCESS', ?)");
                $stmt->execute([$userId, json_encode($responseData)]);
                
                return true;
            } else {
                $stmt = $db->prepare("UPDATE users SET email_status = 'FAILED' WHERE id = ?");
                $stmt->execute([$userId]);
                
                // Log to email_logs
                $responseData = json_decode($response, true);
                $errorMsg = isset($responseData['message']) ? $responseData['message'] : (isset($responseData['errors']) ? $responseData['errors'] : 'HTTP ' . $httpcode);
                $stmt = $db->prepare("INSERT INTO email_logs (user_id, email_type, status, msg91_response, error_message) VALUES (?, 'welcome', 'FAILED', ?, ?)");
                $stmt->execute([$userId, json_encode($responseData), is_string($errorMsg) ? $errorMsg : json_encode($errorMsg)]);
                
                return false;
            }
        } catch (Exception $dbError) {
            error_log("sendWelcomeEmailSync: Database update error: " . $dbError->getMessage());
            // Don't fail if DB update fails
        }
        
        return ($httpcode === 200);
        
    } catch (Exception $e) {
        error_log("sendWelcomeEmailSync: Exception - " . $e->getMessage());
        try {
            $db = getDB();
            $stmt = $db->prepare("UPDATE users SET email_status = 'FAILED' WHERE id = ?");
            $stmt->execute([$userId]);
            $stmt = $db->prepare("INSERT INTO email_logs (user_id, email_type, status, error_message) VALUES (?, 'welcome', 'FAILED', ?)");
            $stmt->execute([$userId, $e->getMessage()]);
        } catch (Exception $dbError) {
            // Ignore DB errors
        }
        return false;
    }
}

/**
 * Send welcome email asynchronously (non-blocking)
 * 
 * This function triggers a background worker process to send the welcome email.
 * The email is sent asynchronously, so it doesn't block the registration process.
 * 
 * @param int $userId User ID
 * @param string $name User's full name
 * @param string $email User's email address
 * @return void (Always returns immediately, doesn't wait for email to be sent)
 */
function sendWelcomeEmailAsync($userId, $name, $email) {
    // Validate inputs
    if (empty($userId) || !is_numeric($userId)) {
        error_log("sendWelcomeEmailAsync: Invalid user ID provided: " . $userId);
        return;
    }
    
    if (empty($name) || empty($email)) {
        error_log("sendWelcomeEmailAsync: Missing name or email for user ID: " . $userId);
        return;
    }
    
    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        error_log("sendWelcomeEmailAsync: Invalid email format for user ID: " . $userId . ", Email: " . $email);
        return;
    }
    
    // Get the path to the worker script (use absolute path from config)
    $workerScript = defined('WORKER_WELCOME_EMAIL_SCRIPT') 
        ? WORKER_WELCOME_EMAIL_SCRIPT 
        : __DIR__ . '/../workers/send_welcome_email.php';
    
    // Convert to absolute path for better reliability in production
    // Check if path is already absolute (starts with / on Unix or C:\ on Windows)
    $isAbsolute = !empty($workerScript) && (
        substr($workerScript, 0, 1) === '/' ||  // Unix absolute path
        preg_match('/^[A-Z]:[\\\\\/]/i', $workerScript)  // Windows absolute path (C:\ or C:/)
    );
    
    if (!$isAbsolute) {
        // Relative path - convert to absolute using realpath
        $resolvedPath = realpath($workerScript);
        if ($resolvedPath !== false) {
            $workerScript = $resolvedPath;
        }
    } else {
        // Already absolute, but resolve symlinks and normalize
        $resolvedPath = realpath($workerScript);
        if ($resolvedPath !== false) {
            $workerScript = $resolvedPath;
        }
    }
    
    // Check if worker script exists
    if (!file_exists($workerScript)) {
        error_log("sendWelcomeEmailAsync: Worker script not found at: " . $workerScript);
        error_log("sendWelcomeEmailAsync: Current directory: " . __DIR__);
        return;
    }
    
    // Escape arguments for shell execution to prevent injection attacks
    $userIdEscaped = escapeshellarg($userId);
    $nameEscaped = escapeshellarg($name);
    $emailEscaped = escapeshellarg($email);
    
    // Get PHP executable path (use configured path from config.php)
    $phpExecutable = defined('PHP_EXECUTABLE_PATH') 
        ? PHP_EXECUTABLE_PATH 
        : (defined('PHP_BINARY') && PHP_BINARY ? PHP_BINARY : 'php');
    
    // Build command to run worker in background
    // On Unix-like systems (Linux, macOS): nohup + & runs in background
    // On Windows: Use start with proper escaping for background execution
    $command = '';
    $output = [];
    $returnVar = 0;
    
    if (PHP_OS_FAMILY === 'Windows') {
        // Windows: Use start /B /MIN to run in background (minimized window)
        // Escape paths properly for Windows cmd.exe
        $phpExecutableWin = str_replace('/', '\\', $phpExecutable);
        $workerScriptWin = str_replace('/', '\\', $workerScript);
        
        // Build command - use cmd /c to ensure proper execution
        $command = sprintf(
            'cmd /c start /B /MIN "" "%s" "%s" %s %s %s',
            $phpExecutableWin,
            $workerScriptWin,
            $userIdEscaped,
            $nameEscaped,
            $emailEscaped
        );
    } else {
        // Unix-like (Linux, macOS): Use nohup and & to run in background
        // Redirect output to /dev/null to prevent blocking
        $command = sprintf(
            'nohup %s %s %s %s %s > /dev/null 2>&1 &',
            $phpExecutable,
            $workerScript,
            $userIdEscaped,
            $nameEscaped,
            $emailEscaped
        );
    }
    
    // Check if exec() function is available
    if (!function_exists('exec')) {
        error_log("sendWelcomeEmailAsync: ERROR - exec() function is not available. Background worker cannot execute.");
        error_log("sendWelcomeEmailAsync: Please enable exec() function in php.ini or contact your hosting provider.");
        return;
    }
    
    // Execute command in background (non-blocking)
    try {
        // Log command before execution for debugging
        error_log("sendWelcomeEmailAsync: Executing command: " . $command);
        error_log("sendWelcomeEmailAsync: PHP executable: " . $phpExecutable);
        error_log("sendWelcomeEmailAsync: Worker script: " . $workerScript);
        
        // Use exec() to run command in background
        // The command runs asynchronously and doesn't block execution
        if (PHP_OS_FAMILY === 'Windows') {
            // Windows: Use exec() without output capture (start /B returns immediately, non-blocking)
            // The 'start /B' command returns immediately, so this won't block
            exec($command);
            $returnVar = 0; // start command always returns 0 immediately
            error_log("sendWelcomeEmailAsync: Windows command executed (start /B returns immediately)");
        } else {
            // Unix: Use exec with output capture (non-blocking due to & at end of command)
            exec($command, $output, $returnVar);
            if (!empty($output)) {
                error_log("sendWelcomeEmailAsync: Unix command output: " . implode("\n", $output));
            }
            if ($returnVar !== 0) {
                error_log("sendWelcomeEmailAsync: WARNING - Unix exec() returned non-zero exit code: " . $returnVar);
            }
        }
        
        error_log("sendWelcomeEmailAsync: Background worker triggered for user ID: " . $userId . ", Email: " . $email);
    } catch (Exception $e) {
        // Log error but don't throw exception (registration should still succeed)
        error_log("sendWelcomeEmailAsync: Exception - Failed to trigger background worker for user ID: " . $userId . ", Error: " . $e->getMessage());
    } catch (Error $e) {
        // Catch fatal errors too
        error_log("sendWelcomeEmailAsync: Fatal Error - Failed to trigger background worker for user ID: " . $userId . ", Error: " . $e->getMessage());
    }
}

