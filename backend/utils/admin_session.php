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
        // Configure secure session
        ini_set('session.cookie_httponly', '1');
        ini_set('session.cookie_secure', defined('ENVIRONMENT') && ENVIRONMENT === 'production' ? '1' : '0');
        // Use 'Lax' instead of 'Strict' to allow cookies in cross-site navigation (like redirects)
        ini_set('session.cookie_samesite', 'Lax');
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        
        session_start();
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
    
    // Create admin_sessions table if it doesn't exist
    try {
        $db->exec("CREATE TABLE IF NOT EXISTS admin_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            session_id VARCHAR(255) NOT NULL UNIQUE,
            admin_id INT NOT NULL,
            admin_mobile VARCHAR(20) NOT NULL,
            admin_role VARCHAR(50) NOT NULL,
            admin_email VARCHAR(255) NOT NULL,
            ip_address VARCHAR(45) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            INDEX idx_session_id (session_id),
            INDEX idx_admin_id (admin_id),
            INDEX idx_expires_at (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (PDOException $e) {
        // Table might already exist
    }
    
    // Clean expired sessions
    try {
        $db->exec("DELETE FROM admin_sessions WHERE expires_at < NOW()");
    } catch (PDOException $e) {
        // Ignore errors
    }
    
    // Calculate expiry (1 hour from now)
    $expiresAt = date('Y-m-d H:i:s', $now + (SESSION_EXPIRY / 1000));
    
    // Store session in database
    $stmt = $db->prepare("INSERT INTO admin_sessions (session_id, admin_id, admin_mobile, admin_role, admin_email, ip_address, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE admin_id = VALUES(admin_id), admin_mobile = VALUES(admin_mobile), admin_role = VALUES(admin_role), admin_email = VALUES(admin_email), ip_address = VALUES(ip_address), expires_at = VALUES(expires_at), last_activity = NOW()");
    $stmt->execute([$sessionId, $adminId, $adminMobile, $adminRole, $adminEmail, $ip, $expiresAt]);
    
    // Store in PHP session
    $_SESSION['admin_authenticated'] = true;
    $_SESSION['admin_id'] = $adminId;
    $_SESSION['admin_mobile'] = $adminMobile;
    $_SESSION['admin_role'] = $adminRole;
    $_SESSION['admin_email'] = $adminEmail;
    $_SESSION['admin_session_created'] = $now;
    $_SESSION['admin_last_activity'] = $now;
    
    // Regenerate session ID for security after login
    // CRITICAL FIX: After regeneration, update the database record with the new session ID
    try {
        session_regenerate_id(true);
        $newSessionId = session_id();
        
        if ($newSessionId !== $sessionId) {
            // Update database record with new session ID
            try {
                $updateStmt = $db->prepare("UPDATE admin_sessions SET session_id = ? WHERE session_id = ?");
                $updateStmt->execute([$newSessionId, $sessionId]);
                
                // If update affected 0 rows, insert new record (shouldn't happen, but be safe)
                if ($updateStmt->rowCount() === 0) {
                    error_log("Warning: Session ID update affected 0 rows, inserting new record. Old ID: $sessionId, New ID: $newSessionId");
                    $insertStmt = $db->prepare("INSERT INTO admin_sessions (session_id, admin_id, admin_mobile, admin_role, admin_email, ip_address, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
                    $insertStmt->execute([$newSessionId, $adminId, $adminMobile, $adminRole, $adminEmail, $ip, $expiresAt]);
                } else {
                    error_log("Session ID updated successfully: $sessionId -> $newSessionId");
                }
            } catch (PDOException $dbError) {
                error_log("Database error updating session ID: " . $dbError->getMessage());
                // Try to insert new record as fallback
                try {
                    $insertStmt = $db->prepare("INSERT INTO admin_sessions (session_id, admin_id, admin_mobile, admin_role, admin_email, ip_address, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE session_id = VALUES(session_id)");
                    $insertStmt->execute([$newSessionId, $adminId, $adminMobile, $adminRole, $adminEmail, $ip, $expiresAt]);
                    error_log("Fallback: Inserted session with new ID: $newSessionId");
                } catch (PDOException $insertError) {
                    error_log("Critical: Failed to update or insert session ID: " . $insertError->getMessage());
                    // Session will still work with old ID, but this is not ideal
                }
            }
        }
    } catch (Exception $e) {
        error_log("Warning: Could not regenerate session ID: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        // Continue anyway - session is still valid with original ID
    }
    
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
    // Normalize mobile number before checking whitelist to handle format variations
    $storedMobile = $session['admin_mobile'];
    if (!isWhitelistedMobile($storedMobile)) {
        error_log("SECURITY ALERT: Admin mobile " . substr($storedMobile, 0, 4) . "**** is no longer whitelisted");
        error_log("Stored mobile format: " . $storedMobile);
        error_log("Normalized stored mobile: " . normalizeMobile($storedMobile));
        error_log("Whitelist: " . json_encode(getAdminWhitelist()));
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
 */
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

