<?php
/**
 * Admin Authentication Helper Functions
 * Updated to use session-based authentication (HTTP-only cookies)
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/admin_session.php';

// Get current admin from session
if (!function_exists('getCurrentAdmin')) {
function getCurrentAdmin() {
    $session = getAdminSession();
    
    if (!$session) {
        return null;
    }
    
    // Get admin details from database
    require_once __DIR__ . '/../config/database.php';
    $db = getDB();
    
    $stmt = $db->prepare("SELECT id, username, email, full_name, role, is_active FROM admin_users WHERE id = ? AND is_active = 1");
    $stmt->execute([$session['admin_id']]);
    $admin = $stmt->fetch();
    
    return $admin ?: null;
}
}

// Require admin authentication (session-based)
if (!function_exists('requireAdmin')) {
function requireAdmin() {
    $admin = getCurrentAdmin();
    if (!$admin) {
        require_once __DIR__ . '/response.php';
        sendError('Admin authentication required', null, 401);
    }
    return $admin;
}
}

// Require specific admin role
if (!function_exists('requireAdminRole')) {
function requireAdminRole($allowedRoles) {
    $admin = requireAdmin();
    
    if (!in_array($admin['role'], (array)$allowedRoles)) {
        require_once __DIR__ . '/response.php';
        sendError('Access denied. Insufficient permissions.', null, 403);
    }
    
    return $admin;
}
