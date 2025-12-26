<?php
/**
 * Forgot Password Init API
 * POST /api/auth/forgot-password-init.php
 * 
 * Validates email exists in users table and returns user's phone (if available)
 * for SMS OTP option
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/forgot-password-init-error.log');

register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Server error: ' . $error['message'],
            'file' => $error['file'],
            'line' => $error['line']
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
});

try {
    require_once __DIR__ . '/../../config/config.php';
    require_once __DIR__ . '/../../config/database.php';
    require_once __DIR__ . '/../../utils/response.php';
    require_once __DIR__ . '/../../utils/validation.php';
} catch (Error $e) {
    error_log("ERROR loading dependencies: " . $e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Server configuration error', 'error' => $e->getMessage()]);
    exit;
} catch (Exception $e) {
    error_log("EXCEPTION loading dependencies: " . $e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Server configuration error', 'error' => $e->getMessage()]);
    exit;
}

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $email = sanitizeInput($input['email'] ?? '');
    
    // Validation
    $errors = [];
    if (empty($email)) {
        $errors['email'] = 'Email is required';
    } elseif (!validateEmail($email)) {
        $errors['email'] = 'Invalid email format';
    }
    
    if (!empty($errors)) {
        sendValidationError($errors);
    }
    
    // Get database connection
    $db = getDB();
    
    // Normalize email (lowercase, trim) - same as login
    $emailNormalized = strtolower(trim($email));
    
    // Check if email exists in users table
    $stmt = $db->prepare("
        SELECT id, email, phone, full_name
        FROM users
        WHERE LOWER(TRIM(email)) = ?
    ");
    
    $stmt->execute([$emailNormalized]);
    $user = $stmt->fetch();
    
    // Security: Don't reveal if email exists or not
    // Always return success message, but only proceed if user exists
    if (!$user) {
        // Log the attempt for security monitoring
        error_log("Forgot password attempt for non-existent email: $emailNormalized");
        
        // Return generic success message (don't reveal email doesn't exist)
        sendSuccess('If the email exists, you will receive OTP instructions.', [
            'phone' => null // Don't reveal phone even if we had it
        ]);
    }
    
    // User exists - log the password reset initiation
    error_log("Password reset initiated for user ID: {$user['id']}, email: $emailNormalized");
    
    // Return success with phone (if available) for SMS option
    // Note: Phone is optional, user can still use email OTP
    $phone = $user['phone'] ?? null;
    
    // Mask phone number for security (show only last 4 digits)
    $maskedPhone = null;
    if ($phone) {
        $phoneDigits = preg_replace('/\D/', '', $phone);
        if (strlen($phoneDigits) >= 4) {
            $maskedPhone = '****' . substr($phoneDigits, -4);
        }
    }
    
    sendSuccess('Email verified. Please verify your identity using the OTP widget.', [
        'phone' => $maskedPhone, // Return masked phone for display purposes only
        'hasPhone' => !empty($phone) // Indicate if phone exists for SMS option
    ]);
    
} catch (PDOException $e) {
    error_log("Database Error: " . $e->getMessage());
    sendError('An error occurred. Please try again later.', null, 500);
} catch (Exception $e) {
    error_log("Exception: " . $e->getMessage());
    sendError('An error occurred. Please try again later.', null, 500);
}

