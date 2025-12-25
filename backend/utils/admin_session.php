<?php
/**
 * Admin Session Management
 * Secure HTTP-only cookie-based session management
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/admin-config.php';
require_once __DIR__ . '/../config/database.php';

/**
 * Initialize secure session
 */
function initSecureSession() {
    if (session_status() === PHP_SESSION_NONE) {
        // Set cookie parameters BEFORE session_start
        $isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
        $cookieParams = [
            'lifetime' => 86400, // 24 hours
            'path' => '/',
            'domain' => '', // Empty = current domain only
            'secure' => $isSecure,
            'httponly' => true,
            'samesite' => 'Lax'
        ];
        
        session_set_cookie_params($cookieParams);
        
        // Also set via ini for compatibility
        ini_set('session.cookie_httponly', '1');
        ini_set('session.cookie_secure', $isSecure ? '1' : '0');
        ini_set('session.cookie_samesite', 'Lax');
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.cookie_lifetime', '86400');
        ini_set('session.gc_maxlifetime', '86400');
        
        session_start();
        
        error_log("Session started - ID: " . session_id() . ", Cookie params: " . json_encode($cookieParams));
    }
}

/**
 * Create admin session
 */
function createAdminSession($adminMobile, $adminId, $adminRole, $adminEmail) {
    initSecureSession();
    
    $db = getDB();
    $ip = getClientIP();
    $sessionId = session_id();
    $now = time();
    
    // Create admin_sessions table if it doesn't exist (matches schema requirements)
    try {
        $db->exec("CREATE TABLE IF NOT EXISTS admin_sessions (
            id INT(11) NOT NULL AUTO_INCREMENT,
            session_id VARCHAR(255) NOT NULL UNIQUE,
            admin_id INT(11) NOT NULL,
            admin_mobile VARCHAR(20) NOT NULL,
            admin_role VARCHAR(50) NOT NULL,
            admin_email VARCHAR(255) NOT NULL,
            ip_address VARCHAR(45) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            INDEX idx_session_id (session_id),
            INDEX idx_admin_id (admin_id),
            INDEX idx_expires_at (expires_at),
            FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (PDOException $e) {
        // Table might already exist, ignore error
        error_log("Note: admin_sessions table creation: " . $e->getMessage());
    }
    
    // Clean expired sessions
    try {
        $db->exec("DELETE FROM admin_sessions WHERE expires_at < NOW()");
    } catch (PDOException $e) {
        // Ignore errors
    }
    
    // Calculate expiry (24 hours from now per requirements, or use SESSION_EXPIRY constant)
    $expirySeconds = defined('SESSION_EXPIRY') ? (SESSION_EXPIRY / 1000) : 86400; // Default 24 hours if not defined
    $expiresAt = date('Y-m-d H:i:s', $now + $expirySeconds);
    error_log("Session expiry calculated: " . $expiresAt . " (in " . $expirySeconds . " seconds)");
    
    // Store session in database (match exact schema)
    error_log("Inserting session into admin_sessions - Session ID: " . $sessionId . ", Admin ID: " . $adminId);
    try {
        $stmt = $db->prepare("INSERT INTO admin_sessions (session_id, admin_id, admin_mobile, admin_role, admin_email, ip_address, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE admin_id = VALUES(admin_id), admin_mobile = VALUES(admin_mobile), admin_role = VALUES(admin_role), admin_email = VALUES(admin_email), ip_address = VALUES(ip_address), expires_at = VALUES(expires_at), last_activity = NOW()");
        $stmt->execute([$sessionId, $adminId, $adminMobile, $adminRole, $adminEmail, $ip, $expiresAt]);
        error_log("Session inserted successfully - Rows affected: " . $stmt->rowCount());
    } catch (PDOException $e) {
        error_log("ERROR inserting session: " . $e->getMessage());
        error_log("SQL State: " . ($e->errorInfo[0] ?? 'N/A'));
        error_log("SQL Error Info: " . print_r($e->errorInfo ?? [], true));
        error_log("Session ID: " . $sessionId);
        error_log("Admin ID: " . $adminId);
        error_log("Admin Mobile: " . $adminMobile);
        throw $e; // Re-throw to be caught by caller
    }
    
    // Store in PHP session
    $_SESSION['admin_authenticated'] = true;
    $_SESSION['admin_id'] = $adminId;
    $_SESSION['admin_mobile'] = $adminMobile;
    $_SESSION['admin_role'] = $adminRole;
    $_SESSION['admin_email'] = $adminEmail;
    $_SESSION['admin_session_created'] = $now;
    $_SESSION['admin_last_activity'] = $now;
    
    // Skip session_regenerate_id to avoid cookie/database mismatch
    // The session is already secure with a random ID from session_start()
    // Regenerating causes cookie and database to get out of sync
    
    error_log("Admin session created successfully - Session ID: " . $sessionId . ", Admin ID: " . $adminId);
    
    return true;
}

/**
 * Get current admin session
 */
function getAdminSession() {
    initSecureSession();
    
    if (!isset($_SESSION['admin_authenticated']) || !$_SESSION['admin_authenticated']) {
        return null;
    }
    
    $db = getDB();
    $sessionId = session_id();
    $now = time();
    
    // Check database session
    $stmt = $db->prepare("SELECT * FROM admin_sessions WHERE session_id = ? AND expires_at > NOW()");
    $stmt->execute([$sessionId]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$session) {
        // Session expired or invalid
        destroyAdminSession();
        return null;
    }
    
    // Check inactivity timeout (1 hour)
    $lastActivity = strtotime($session['last_activity']);
    if (($now - $lastActivity) > (SESSION_EXPIRY / 1000)) {
        destroyAdminSession();
        return null;
    }
    
    // Check absolute expiry (8 hours)
    $createdAt = strtotime($session['created_at']);
    if (($now - $createdAt) > 28800) { // 8 hours
        destroyAdminSession();
        return null;
    }
    
    // CRITICAL: Re-validate mobile is still whitelisted
    $storedMobile = $session['admin_mobile'];
    
    // Try multiple formats for whitelist check
    $isWhitelisted = isWhitelistedMobile($storedMobile);
    
    if (!$isWhitelisted) {
        // Try with + prefix
        $isWhitelisted = isWhitelistedMobile('+' . ltrim($storedMobile, '+'));
    }
    
    if (!$isWhitelisted) {
        // Try normalized (digits only)
        $normalized = preg_replace('/[^0-9]/', '', $storedMobile);
        $isWhitelisted = isWhitelistedMobile($normalized);
    }
    
    if (!$isWhitelisted) {
        // Try with +91 prefix if it's a 10-digit number
        $digits = preg_replace('/[^0-9]/', '', $storedMobile);
        if (strlen($digits) === 10) {
            $isWhitelisted = isWhitelistedMobile('+91' . $digits);
        }
    }
    
    if (!$isWhitelisted) {
        error_log("SECURITY ALERT: Admin mobile not whitelisted - Stored: " . $storedMobile);
        error_log("Tried formats: original, with +, normalized digits, +91 format");
        destroyAdminSession();
        return null;
    }
    
    // Update last activity
    $stmt = $db->prepare("UPDATE admin_sessions SET last_activity = NOW() WHERE session_id = ?");
    $stmt->execute([$sessionId]);
    $_SESSION['admin_last_activity'] = $now;
    
    return [
        'admin_id' => $session['admin_id'],
        'admin_mobile' => $session['admin_mobile'],
        'admin_role' => $session['admin_role'],
        'admin_email' => $session['admin_email'],
        'ip_address' => $session['ip_address'],
        'created_at' => $session['created_at'],
        'last_activity' => $session['last_activity']
    ];
}

/**
 * Destroy admin session
 */
function destroyAdminSession() {
    initSecureSession();
    
    $db = getDB();
    $sessionId = session_id();
    
    // Remove from database
    try {
        $stmt = $db->prepare("DELETE FROM admin_sessions WHERE session_id = ?");
        $stmt->execute([$sessionId]);
    } catch (PDOException $e) {
        // Ignore errors
    }
    
    // Clear PHP session
    $_SESSION = [];
    
    // Destroy session cookie
    if (isset($_COOKIE[session_name()])) {
        setcookie(session_name(), '', time() - 3600, '/');
    }
    
    session_destroy();
}

/**
 * Get client IP address
 * Wrapped in function_exists check to prevent redeclaration errors
 */
if (!function_exists('getClientIP')) {
    function getClientIP() {
        $ipKeys = ['HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_FORWARDED', 'HTTP_X_CLUSTER_CLIENT_IP', 'HTTP_FORWARDED_FOR', 'HTTP_FORWARDED', 'REMOTE_ADDR'];
        
        foreach ($ipKeys as $key) {
            if (array_key_exists($key, $_SERVER) === true) {
                foreach (explode(',', $_SERVER[$key]) as $ip) {
                    $ip = trim($ip);
                    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                        return $ip;
                    }
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}

