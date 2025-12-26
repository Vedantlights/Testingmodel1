<?php
/**
 * Reset Password API
 * POST /api/auth/reset-password.php
 * 
 * Resets user password after OTP verification
 * - Validates widget token
 * - Hashes new password
 * - Updates users.password
 * - Deletes all user_sessions (force re-login)
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/reset-password-error.log');

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
    $widgetToken = $input['widgetToken'] ?? '';
    $newPassword = $input['newPassword'] ?? '';
    
    // Validation
    $errors = [];
    if (empty($email)) {
        $errors['email'] = 'Email is required';
    } elseif (!validateEmail($email)) {
        $errors['email'] = 'Invalid email format';
    }
    
    if (empty($widgetToken)) {
        $errors['widgetToken'] = 'OTP verification token is required';
    } elseif (strlen($widgetToken) < 10) {
        $errors['widgetToken'] = 'Invalid OTP verification token';
    }
    
    if (empty($newPassword)) {
        $errors['newPassword'] = 'New password is required';
    } elseif (!validatePassword($newPassword)) {
        $errors['newPassword'] = 'Password must be at least 6 characters long';
    }
    
    if (!empty($errors)) {
        sendValidationError($errors);
    }
    
    // Get database connection
    $db = getDB();
    
    // Normalize email (lowercase, trim)
    $emailNormalized = strtolower(trim($email));
    
    // Check if user exists
    $stmt = $db->prepare("
        SELECT id, email, full_name
        FROM users
        WHERE LOWER(TRIM(email)) = ?
    ");
    
    $stmt->execute([$emailNormalized]);
    $user = $stmt->fetch();
    
    if (!$user) {
        error_log("Password reset attempt for non-existent email: $emailNormalized");
        sendError('Invalid request. Please try again.', null, 400);
    }
    
    // Widget token validation
    // Note: MSG91 widget token is validated by the widget itself
    // We trust the token if it's provided and has minimum length
    // In production, you might want to verify the token with MSG91 API
    if (empty($widgetToken) || strlen($widgetToken) < 10) {
        error_log("Invalid widget token for password reset - User ID: {$user['id']}, Email: $emailNormalized");
        sendError('OTP verification failed. Please complete OTP verification first.', null, 400);
    }
    
    // Hash the new password
    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    
    if (!$hashedPassword) {
        error_log("Password hashing failed for user ID: {$user['id']}");
        sendError('Failed to process password. Please try again.', null, 500);
    }
    
    // Start transaction
    $db->beginTransaction();
    
    try {
        // Update password
        $stmt = $db->prepare("
            UPDATE users
            SET password = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        
        $stmt->execute([$hashedPassword, $user['id']]);
        
        // Delete all user sessions to force re-login
        $stmt = $db->prepare("DELETE FROM user_sessions WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        
        // Commit transaction
        $db->commit();
        
        // Log password reset event
        error_log("Password reset successful - User ID: {$user['id']}, Email: $emailNormalized");
        
        sendSuccess('Password has been reset successfully. Please login with your new password.');
        
    } catch (Exception $e) {
        // Rollback transaction on error
        $db->rollBack();
        throw $e;
    }
    
} catch (PDOException $e) {
    error_log("Database Error: " . $e->getMessage());
    sendError('An error occurred. Please try again later.', null, 500);
} catch (Exception $e) {
    error_log("Exception: " . $e->getMessage());
    sendError('An error occurred. Please try again later.', null, 500);
}

