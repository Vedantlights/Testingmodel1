<?php
/**
 * Google OAuth Login API
 * POST /api/admin/auth/google-login.php
 * Verifies Google ID token and creates/updates admin session
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/google-oauth-config.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/admin_auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['credential']) || empty($data['credential'])) {
        sendError('Google credential is required', null, 400);
    }
    
    $credential = trim($data['credential']);
    
    // Verify Google ID token
    $googleUserInfo = verifyGoogleToken($credential);
    
    if (!$googleUserInfo) {
        sendError('Invalid Google token. Please try again.', null, 401);
    }
    
    $email = $googleUserInfo['email'];
    $googleId = $googleUserInfo['sub'];
    $name = $googleUserInfo['name'] ?? $googleUserInfo['given_name'] ?? 'Admin User';
    $picture = $googleUserInfo['picture'] ?? null;
    
    // SECURITY: Only allow specific admin email
    $allowedAdminEmail = defined('GOOGLE_ALLOWED_ADMIN_EMAIL') ? GOOGLE_ALLOWED_ADMIN_EMAIL : 'admin@indiapropertys.com';
    
    if ($email !== $allowedAdminEmail) {
        error_log("Unauthorized Google login attempt: " . $email);
        sendError('Unauthorized. Only registered admin email can access.', null, 403);
    }
    
    $db = getDB();
    
    // Check if admin exists
    $stmt = $db->prepare("SELECT id, username, email, full_name, role, is_active, google_id FROM admin_users WHERE email = ?");
    $stmt->execute([$email]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$admin) {
        // Create new admin user
        $stmt = $db->prepare("INSERT INTO admin_users (email, username, full_name, role, is_active, google_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
        $stmt->execute([
            $email,
            explode('@', $email)[0], // username from email
            $name,
            'super_admin',
            1,
            $googleId
        ]);
        $adminId = $db->lastInsertId();
        
        $admin = [
            'id' => $adminId,
            'username' => explode('@', $email)[0],
            'email' => $email,
            'full_name' => $name,
            'role' => 'super_admin',
            'is_active' => 1,
            'google_id' => $googleId
        ];
    } else {
        // Update Google ID if not set
        if (empty($admin['google_id'])) {
            $stmt = $db->prepare("UPDATE admin_users SET google_id = ? WHERE id = ?");
            $stmt->execute([$googleId, $admin['id']]);
        }
        
        // Check if admin is active
        if (!$admin['is_active']) {
            sendError('Your account has been deactivated. Please contact the administrator.', null, 403);
        }
        
        // Update admin info from Google
        $stmt = $db->prepare("UPDATE admin_users SET full_name = ?, google_id = ? WHERE id = ?");
        $stmt->execute([$name, $googleId, $admin['id']]);
        
        $admin['full_name'] = $name;
        $admin['google_id'] = $googleId;
    }
    
    // Generate admin token
    $token = generateAdminToken($admin['id'], $admin['role'], $admin['email']);
    
    // Log successful login
    error_log("Admin login successful via Google OAuth - Email: " . $email);
    
    // Return admin data (without sensitive info)
    unset($admin['google_id']);
    
    sendSuccess('Login successful', [
        'token' => $token,
        'admin' => $admin
    ]);
    
} catch (Exception $e) {
    error_log("Google Login Error: " . $e->getMessage());
    sendError('Login failed. Please try again.', null, 500);
}

/**
 * Verify Google ID Token
 * @param string $idToken Google ID token
 * @return array|false User info or false on failure
 */
function verifyGoogleToken($idToken) {
    try {
        // Google's token verification endpoint
        $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken);
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        if ($curlError) {
            error_log("Google Token Verification CURL Error: " . $curlError);
            return false;
        }
        
        if ($httpCode !== 200) {
            error_log("Google Token Verification HTTP Error: " . $httpCode . " - " . $response);
            return false;
        }
        
        $tokenData = json_decode($response, true);
        
        if (!$tokenData || isset($tokenData['error'])) {
            error_log("Google Token Verification Error: " . json_encode($tokenData));
            return false;
        }
        
        // Verify token is not expired
        if (isset($tokenData['exp']) && $tokenData['exp'] < time()) {
            error_log("Google Token Expired");
            return false;
        }
        
        // Verify audience (client ID) - optional but recommended
        // Uncomment and set your Google Client ID
        /*
        $expectedClientId = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
        if (isset($tokenData['aud']) && $tokenData['aud'] !== $expectedClientId) {
            error_log("Google Token Audience Mismatch");
            return false;
        }
        */
        
        return $tokenData;
        
    } catch (Exception $e) {
        error_log("Google Token Verification Exception: " . $e->getMessage());
        return false;
    }
}
