<?php
/**
 * User Login API
 * POST /api/auth/login.php
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/validation.php';
require_once __DIR__ . '/../../utils/auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $email = sanitizeInput($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $userType = sanitizeInput($input['userType'] ?? 'buyer');
    
    // Validation
    $errors = [];
    if (empty($email)) {
        $errors['email'] = 'Email is required';
    } elseif (!validateEmail($email)) {
        $errors['email'] = 'Invalid email format';
    }
    
    if (empty($password)) {
        $errors['password'] = 'Password is required';
    }
    
    if (!in_array($userType, ['buyer', 'seller', 'agent'])) {
        $errors['userType'] = 'Invalid user type';
    }
    
    if (!empty($errors)) {
        sendValidationError($errors);
    }
    
    // Get database connection
    $db = getDB();
    
    // Normalize email (lowercase, trim) - same as registration
    $emailNormalized = strtolower(trim($email));
    
    // profile_image is in user_profiles table, not users table
    // Always join with user_profiles to get profile_image
    $stmt = $db->prepare("
        SELECT u.id, u.full_name, u.email, u.phone, u.password, u.user_type, u.email_verified, u.phone_verified,
               up.profile_image
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE LOWER(TRIM(u.email)) = ?
    ");
        $stmt = $db->prepare("
            SELECT u.id, u.full_name, u.email, u.phone, u.password, u.user_type, u.email_verified, u.phone_verified,
                   NULL as profile_image
            FROM users u
            WHERE LOWER(TRIM(u.email)) = ?
        ");
    }
    
    $stmt->execute([$emailNormalized]);
    $user = $stmt->fetch();
    
    if (!$user) {
        error_log("Login failed: User not found for email: $emailNormalized");
        sendError('Invalid email or password', null, 401);
    }
    
    // Verify password
    if (!password_verify($password, $user['password'])) {
        error_log("Login failed: Password mismatch for email: $emailNormalized");
        sendError('Invalid email or password', null, 401);
    }
    
    error_log("Login successful for email: $emailNormalized, user_type: {$user['user_type']}");
    
    // Check if user can login with selected user type
    $registeredType = $user['user_type'];
    $roleAccessMap = [
        'buyer' => ['buyer', 'seller'],
        'seller' => ['buyer', 'seller'],
        'agent' => ['agent']
    ];
    
    $allowedRoles = $roleAccessMap[$registeredType] ?? [];
    if (!in_array($userType, $allowedRoles)) {
        $typeLabels = [
            'buyer' => 'Buyer/Tenant',
            'seller' => 'Seller/Owner',
            'agent' => 'Agent/Builder'
        ];
        
        if ($registeredType === 'agent' && $userType !== 'agent') {
            sendError('You are registered as an Agent/Builder. You can only access the Agent/Builder dashboard.', null, 403);
        } else {
            sendError("You are registered as {$typeLabels[$registeredType]}. You cannot access this dashboard.", null, 403);
        }
    }
    
    // Generate token
    $token = generateToken($user['id'], $userType, $user['email']);
    
    // Store session (optional)
    $stmt = $db->prepare("INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, FROM_UNIXTIME(?))");
    $stmt->execute([$user['id'], $token, time() + JWT_EXPIRATION]);
    
    // Prepare user data
    unset($user['password']);
    
    // Normalize profile image URL
    $profileImage = $user['profile_image'] ?? null;
    if (!empty($profileImage)) {
        $profileImage = trim($profileImage);
        if (strpos($profileImage, 'http://') === 0 || strpos($profileImage, 'https://') === 0) {
            // Already a full URL
        } elseif (strpos($profileImage, '/uploads/') === 0) {
            $profileImage = BASE_URL . $profileImage;
        } elseif (strpos($profileImage, 'uploads/') === 0) {
            $profileImage = BASE_URL . '/' . $profileImage;
        } else {
            $profileImage = UPLOAD_BASE_URL . '/' . ltrim($profileImage, '/');
        }
    }
    
    $userData = [
        'id' => $user['id'],
        'full_name' => $user['full_name'],
        'email' => $user['email'],
        'phone' => $user['phone'],
        'user_type' => $userType, // Return the login type, not registered type
        'email_verified' => (bool)$user['email_verified'],
        'phone_verified' => (bool)$user['phone_verified'],
        'profile_image' => $profileImage
    ];
    
    error_log("Login API: Sending success response for user: {$userData['email']}, type: {$userData['user_type']}");
    sendSuccess('Login successful', [
        'token' => $token,
        'user' => $userData
    ]);
    
} catch (PDOException $e) {
    error_log("Login Database Error: " . $e->getMessage());
    error_log("Login Error Code: " . $e->getCode());
    error_log("Login SQL State: " . $e->errorInfo[0] ?? 'N/A');
    
    // Provide more specific error message for debugging
    $errorMessage = 'Login failed. Please try again.';
    if (strpos($e->getMessage(), 'Column not found') !== false) {
        $errorMessage = 'Database configuration error. Please contact support.';
        error_log("Column error detected - this is a database schema issue");
    }
    
    sendError($errorMessage, null, 500);
} catch (Exception $e) {
    error_log("Login Error: " . $e->getMessage());
    error_log("Login Error Trace: " . $e->getTraceAsString());
    sendError('Login failed. Please try again.', null, 500);
}

