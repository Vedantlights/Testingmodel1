<?php
/**
 * Admin Verify OTP API
 * POST /api/admin/auth/verify-otp.php
 * Verifies OTP via MSG91 and creates admin session
 */

// Suppress error display for JSON responses
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Set basic CORS headers immediately for preflight requests
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 86400');

// Handle preflight OPTIONS request immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/admin-config.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/admin_auth.php';

// Set proper CORS headers using the utility function
setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['otp']) || empty($data['otp'])) {
        sendError('OTP is required', null, 400);
    }
    
    $otp = trim($data['otp']);
    $requestId = isset($data['request_id']) ? trim($data['request_id']) : null;
    
    // Use hardcoded admin mobile number from config
    if (!defined('ADMIN_MOBILE')) {
        sendError('Server configuration error', null, 500);
    }
    
    $mobile = ADMIN_MOBILE;
    
    $db = getDB();
    
    // Verify OTP with MSG91
    // POST https://control.msg91.com/api/v5/otp/verify
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => MSG91_VERIFY_OTP_URL,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'authkey: ' . MSG91_AUTH_KEY
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'mobile' => $mobile,
            'otp' => $otp
        ])
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($curlError) {
        error_log("MSG91 CURL Error: " . $curlError);
        sendError('Failed to verify OTP. Please try again.', null, 500);
    }
    
    $msg91Response = json_decode($response, true);
    
    // Update OTP log if request_id was provided
    if ($requestId) {
        $mobileLast4 = substr($mobile, -4);
        $status = ($httpCode === 200 && isset($msg91Response['type']) && $msg91Response['type'] === 'success') ? 'verified' : 'failed';
        $stmt = $db->prepare("UPDATE admin_otp_logs SET status = ?, verified_at = NOW() WHERE request_id = ? AND mobile = ?");
        $stmt->execute([$status, $requestId, $mobileLast4]);
    }
    
    if ($httpCode === 200 && isset($msg91Response['type']) && $msg91Response['type'] === 'success') {
        // OTP verified successfully - Get or create admin user
        // First, try to find admin by phone or email
        try {
            $stmt = $db->prepare("SELECT id, username, email, full_name, role, is_active FROM admin_users WHERE phone = ? OR email LIKE ? LIMIT 1");
            $stmt->execute([$mobile, '%admin%']);
            $admin = $stmt->fetch();
        } catch (PDOException $e) {
            // If phone column doesn't exist, try without it
            error_log("Phone column may not exist, trying without it: " . $e->getMessage());
            $stmt = $db->prepare("SELECT id, username, email, full_name, role, is_active FROM admin_users WHERE email LIKE ? LIMIT 1");
            $stmt->execute(['%admin%']);
            $admin = $stmt->fetch();
        }
        
        // If no admin found, create a default admin user
        if (!$admin) {
            $defaultEmail = 'admin@indiapropertys.com';
            $defaultUsername = 'admin';
            
            try {
                // Try to create admin with phone column
                $stmt = $db->prepare("INSERT INTO admin_users (username, email, phone, full_name, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
                $stmt->execute([$defaultUsername, $defaultEmail, $mobile, 'Admin User', 'super_admin', 1]);
                $adminId = $db->lastInsertId();
            } catch (PDOException $e) {
                // If phone column doesn't exist, create without it
                error_log("Phone column doesn't exist, creating admin without phone: " . $e->getMessage());
                $stmt = $db->prepare("INSERT INTO admin_users (username, email, full_name, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
                $stmt->execute([$defaultUsername, $defaultEmail, 'Admin User', 'super_admin', 1]);
                $adminId = $db->lastInsertId();
            }
            
            $admin = [
                'id' => $adminId,
                'username' => $defaultUsername,
                'email' => $defaultEmail,
                'full_name' => 'Admin User',
                'role' => 'super_admin',
                'is_active' => 1
            ];
        } else {
            // Update phone number if column exists
            try {
                $stmt = $db->prepare("UPDATE admin_users SET phone = ? WHERE id = ?");
                $stmt->execute([$mobile, $admin['id']]);
            } catch (PDOException $e) {
                // Phone column doesn't exist, ignore
                error_log("Phone column doesn't exist, skipping update: " . $e->getMessage());
            }
            
            // Check if admin is active
            if (!$admin['is_active']) {
                sendError('Your account has been deactivated. Please contact the administrator.', null, 403);
            }
        }
        
        // Generate admin token
        $token = generateAdminToken($admin['id'], $admin['role'], $admin['email']);
        
        sendSuccess('OTP verified successfully', [
            'token' => $token,
            'admin' => $admin
        ]);
    } else {
        $errorMsg = isset($msg91Response['message']) ? $msg91Response['message'] : 'Invalid OTP';
        sendError($errorMsg, null, 400);
    }
    
} catch (Exception $e) {
    error_log("Admin Verify OTP Error: " . $e->getMessage());
    sendError('Failed to verify OTP. Please try again.', null, 500);
}
