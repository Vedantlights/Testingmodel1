<?php
/**
 * Email Helper Functions
 * Handles async email sending via background workers
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/admin-config.php';

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
    
    // Get the path to the worker script
    $workerScript = __DIR__ . '/../workers/send_welcome_email.php';
    
    // Check if worker script exists
    if (!file_exists($workerScript)) {
        error_log("sendWelcomeEmailAsync: Worker script not found at: " . $workerScript);
        return;
    }
    
    // Escape arguments for shell execution to prevent injection attacks
    $userIdEscaped = escapeshellarg($userId);
    $nameEscaped = escapeshellarg($name);
    $emailEscaped = escapeshellarg($email);
    
    // Get PHP executable path
    $phpExecutable = PHP_BINARY ?: 'php';
    
    // Build command to run worker in background
    // On Unix-like systems (Linux, macOS): nohup + & runs in background
    // On Windows: start /B runs in background
    $command = '';
    
    if (PHP_OS_FAMILY === 'Windows') {
        // Windows: Use start /B to run in background
        $command = sprintf(
            'start /B "%s" "%s" %s %s %s > NUL 2>&1',
            $phpExecutable,
            $workerScript,
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
    
    // Execute command in background (non-blocking)
    try {
        // Use exec() to run command in background
        // The command runs asynchronously and doesn't block execution
        exec($command);
        
        error_log("sendWelcomeEmailAsync: Background worker triggered for user ID: " . $userId . ", Email: " . $email);
    } catch (Exception $e) {
        // Log error but don't throw exception (registration should still succeed)
        error_log("sendWelcomeEmailAsync: Failed to trigger background worker for user ID: " . $userId . ", Error: " . $e->getMessage());
    }
}

