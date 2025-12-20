<?php
/**
 * Admin Authentication Helper Functions
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/auth.php';

// Generate admin token
function generateAdminToken($adminId, $role, $email) {
    $payload = [
        'admin_id' => $adminId,
        'role' => $role,
        'email' => $email,
        'type' => 'admin',
        'iat' => time(),
        'exp' => time() + JWT_EXPIRATION
    ];
    
    $header = base64UrlEncode(json_encode(['typ' => 'JWT', 'alg' => JWT_ALGORITHM]));
    $payload_encoded = base64UrlEncode(json_encode($payload));
    $signature = base64UrlEncode(hash_hmac('sha256', "$header.$payload_encoded", JWT_SECRET, true));
    
    return "$header.$payload_encoded.$signature";
}

// Get current admin from token
function getCurrentAdmin() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (empty($authHeader)) {
        return null;
    }
    
    // Extract token from "Bearer <token>"
    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $token = $matches[1];
        $payload = verifyToken($token);
        
        if ($payload && isset($payload['type']) && $payload['type'] === 'admin') {
            require_once __DIR__ . '/../config/database.php';
            $db = getDB();
            
            $stmt = $db->prepare("SELECT id, username, email, full_name, role, is_active FROM admin_users WHERE id = ? AND is_active = 1");
            $stmt->execute([$payload['admin_id']]);
            $admin = $stmt->fetch();
            
            if ($admin) {
                return $admin;
            }
        }
    }
    
    return null;
}

// Require admin authentication
function requireAdmin() {
    $admin = getCurrentAdmin();
    if (!$admin) {
        sendError('Admin authentication required', null, 401);
    }
    return $admin;
}

// Require specific admin role
function requireAdminRole($allowedRoles) {
    $admin = requireAdmin();
    
    if (!in_array($admin['role'], (array)$allowedRoles)) {
        sendError('Access denied. Insufficient permissions.', null, 403);
    }
    
    return $admin;
}
