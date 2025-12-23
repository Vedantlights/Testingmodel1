<?php
/**
 * Admin Authentication Middleware
 * Protects admin routes with session-based authentication
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/admin-config.php';
require_once __DIR__ . '/admin_session.php';
require_once __DIR__ . '/response.php';

/**
 * Require admin authentication
 * Use this middleware to protect admin routes
 */
function requireAdminAuth() {
    $session = getAdminSession();
    
    if (!$session) {
        sendError('Admin authentication required', null, 401);
    }
    
    return $session;
}

/**
 * Check if admin is authenticated (non-blocking)
 */
function isAdminAuthenticated() {
    return getAdminSession() !== null;
}

