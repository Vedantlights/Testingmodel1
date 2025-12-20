<?php
/**
 * Admin Token Verification API
 * GET /api/admin/auth/verify.php
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/admin_auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', null, 405);
}

try {
    $admin = requireAdmin();
    
    // Return admin data
    sendSuccess('Token is valid', [
        'admin' => $admin
    ]);
    
} catch (Exception $e) {
    error_log("Admin Verify Error: " . $e->getMessage());
    sendError('Token verification failed', null, 401);
}
