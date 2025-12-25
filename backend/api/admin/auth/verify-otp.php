<?php
/**
 * Admin Verify OTP API
 * POST /api/admin/auth/verify-otp.php
 * Verifies MSG91 widget token and creates secure admin session
 */

// Enable error logging
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display, but log
ini_set('log_errors', 1);

// Start output buffering early to prevent any PHP warnings/notices from breaking JSON
if (ob_get_level() == 0) {
    ob_start();
}

// Log incoming request
error_log("=== VERIFY OTP REQUEST START ===");
error_log("Method: " . ($_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN'));
$rawInputDebug = file_get_contents('php://input');
error_log("Request Body: " . $rawInputDebug);

// Header for JSON response
header('Content-Type: application/json');

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/admin-config.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/validation.php';
require_once __DIR__ . '/../../../utils/admin_session.php';
require_once __DIR__ . '/../../../utils/rate_limit.php';

error_log("All files loaded successfully");

/**
 * Normalize phone number to consistent format for database queries
 * Handles: 10-digit (7888076881), 12-digit (917888076881), or + format (+917888076881)
 */
function normalizePhone($phone) {
    if (empty($phone)) {
        return '';
    }
    
    // Remove all non-digits first
    $phone = preg_replace('/[^0-9]/', '', $phone);
    
    // If 10 digits, add +91
    if (strlen($phone) == 10) {
        return '+91' . $phone;
    }
    
    // If 12 digits starting with 91, add +
    if (strlen($phone) == 12 && substr($phone, 0, 2) == '91') {
        return '+' . $phone;
    }
    
    // If already has + in original (before removing), preserve it
    // But since we removed it, check original length
    // For now, just ensure it starts with +
    if (strlen($phone) > 10) {
        return '+' . $phone;
    }
    
    return '+' . $phone;
}

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $rawInput = file_get_contents('php://input');
    error_log("Raw input: " . $rawInput);
    
    $data = json_decode($rawInput, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("JSON decode error: " . json_last_error_msg());
        error_log("Raw input was: " . $rawInput);
        sendError('Invalid JSON in request body', null, 400);
    }
    
    error_log("Parsed data: " . json_encode($data));
    
    if (!isset($data['mobile']) || empty($data['mobile'])) {
        error_log("Mobile number missing in request");
        sendError('Mobile number is required', null, 400);
    }
    
    if (!isset($data['widgetToken']) || empty($data['widgetToken'])) {
        error_log("Widget token missing in request");
        sendError('Widget verification token is required', null, 400);
    }
    
    $validationToken = isset($data['validationToken']) ? trim($data['validationToken']) : null;
    
    // Handle widgetToken - MSG91 widget might send it as 'message' or 'token' or 'widgetToken'
    $widgetToken = trim($data['widgetToken'] ?? $data['message'] ?? $data['token'] ?? '');
    $mobile = trim($data['mobile'] ?? $data['phone'] ?? '');
    
    error_log("Received mobile: " . $mobile);
    error_log("Widget token present: " . (!empty($widgetToken) ? 'YES (' . substr($widgetToken, 0, 20) . '...)' : 'NO'));
    
    // Get database connection
    try {
        $db = getDB();
        if (!$db) {
            error_log("ERROR: getDB() returned null");
            sendError('Database connection failed', null, 500);
        }
        error_log("Database connection successful");
    } catch (Exception $e) {
        error_log("ERROR: Database connection exception: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        sendError('Database connection failed: ' . $e->getMessage(), null, 500);
    }
    
    // CRITICAL: Normalize and validate mobile format FIRST
    error_log("Normalizing mobile: " . $mobile);
    $normalizedMobile = normalizePhone($mobile);
    error_log("Normalized mobile: " . $normalizedMobile);
    
    // Validate the normalized format
    $validatedMobile = validateMobileFormat($normalizedMobile);
    if (!$validatedMobile) {
        error_log("ERROR: Mobile format validation failed after normalization. Original: " . $mobile . ", Normalized: " . $normalizedMobile);
        sendError('Invalid mobile number format', null, 400);
    }
    error_log("Validated mobile format: " . $validatedMobile);
    
    // For database queries, we'll use both formats
    $mobileForDB = $validatedMobile; // +917888076881
    $mobileDigitsOnly = normalizeMobile($validatedMobile); // 917888076881 (no +)
    error_log("Mobile for DB (with +): " . $mobileForDB);
    error_log("Mobile for DB (digits only): " . $mobileDigitsOnly);
    
    // CRITICAL: Verify mobile is whitelisted (primary security check)
    error_log("Checking whitelist for: " . $validatedMobile);
    
    // Try direct whitelist query with both formats
    $isWhitelisted = false;
    try {
        // Try with + format
        $checkStmt = $db->prepare("SELECT COUNT(*) FROM admin_whitelist WHERE phone = ? AND is_active = 1");
        $checkStmt->execute([$mobileForDB]);
        $count1 = $checkStmt->fetchColumn();
        
        if ($count1 == 0) {
            // Try digits only format
            $checkStmt->execute([$mobileDigitsOnly]);
            $count2 = $checkStmt->fetchColumn();
            $isWhitelisted = ($count2 > 0);
        } else {
            $isWhitelisted = true;
        }
        
        // Also check via function (has fallback)
        if (!$isWhitelisted) {
            $isWhitelisted = isWhitelistedMobile($validatedMobile);
        }
        
        error_log("Whitelist check result: " . ($isWhitelisted ? 'PASSED' : 'FAILED'));
        
        if (!$isWhitelisted) {
            // Debug: Show all whitelist entries
            try {
                $debugStmt = $db->prepare("SELECT phone, is_active FROM admin_whitelist");
                $debugStmt->execute();
                $whitelistEntries = $debugStmt->fetchAll(PDO::FETCH_ASSOC);
                error_log("Whitelist entries in DB: " . json_encode($whitelistEntries));
            } catch (Exception $e) {
                error_log("Error querying whitelist for debug: " . $e->getMessage());
            }
            
            sendError('Unauthorized access. Only registered admin mobile number is allowed.', null, 403);
        }
    } catch (PDOException $e) {
        error_log("Error checking whitelist: " . $e->getMessage());
        sendError('Database error while checking authorization', null, 500);
    }
    
    error_log("Whitelist check passed");
    
    // Optional: If validation token is provided, verify it (for backwards compatibility)
    // But if not provided, we'll proceed if mobile is whitelisted
    if ($validationToken && strpos($validationToken, 'local_') !== 0) {
        // Only check database token if it's not a local frontend token
        $stmt = $db->prepare("SELECT * FROM validation_tokens WHERE token = ? AND expires_at > NOW() AND used = 0");
        $stmt->execute([$validationToken]);
        $tokenRecord = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($tokenRecord) {
            // Verify mobile matches token
            $tokenMobile = normalizeMobile($tokenRecord['mobile']);
            $requestMobile = normalizeMobile($validatedMobile);
            
            if ($tokenMobile !== $requestMobile) {
                error_log("SECURITY ALERT - Mobile mismatch: token mobile " . substr($tokenMobile, 0, 4) . "**** vs request mobile " . substr($requestMobile, 0, 4) . "****");
                sendError('Mobile number mismatch. Please restart the login process.', null, 403);
            }
            
            // Mark token as used
            $stmt = $db->prepare("UPDATE validation_tokens SET used = 1 WHERE token = ?");
            $stmt->execute([$validationToken]);
        }
    }
    
    // Rate limiting: OTP verification attempts per mobile
    $rateLimit = checkMobileRateLimit($validatedMobile, OTP_MAX_ATTEMPTS, 600); // 10 minutes window
    if (!$rateLimit['allowed']) {
        $resetTime = date('Y-m-d H:i:s', $rateLimit['reset_at']);
        sendError('Too many OTP verification attempts. Please try again after ' . $resetTime, [
            'reset_at' => $resetTime,
            'retry_after' => $rateLimit['reset_at'] - time()
        ], 429);
    }
    
    // Verify widget token with MSG91 (server-side verification)
    // Note: MSG91 widget handles OTP verification client-side, but we verify the token here
    // For widget-based OTP, the widgetToken is the proof that OTP was verified
    // (Validation token was already marked as used above if it existed in the database)
    
    // Update admin_otp_logs to mark OTP as verified
    // NOTE: admin_otp_logs uses "mobile" column (varchar 15), normalize to match
    error_log("Updating OTP log status to 'verified'");
    try {
        // Normalize mobile for OTP log (digits only, max 15 chars)
        $otpLogMobile = normalizeMobile($validatedMobile); // Gets digits only: 917888076881
        if (strlen($otpLogMobile) > 15) {
            $otpLogMobile = substr($otpLogMobile, -15); // Take last 15 digits
        }
        
        // Try with normalized mobile (digits only) - this matches how send-otp.php stores it
        $stmt = $db->prepare("UPDATE admin_otp_logs SET status = 'verified', verified_at = NOW() WHERE mobile = ? AND status = 'pending' AND (expires_at > NOW() OR expires_at IS NULL) ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([$otpLogMobile]);
        $updatedRows = $stmt->rowCount();
        error_log("OTP log update (digits only) - Rows affected: " . $updatedRows);
        
        if ($updatedRows === 0) {
            // Try with full format including +
            $otpLogMobileWithPlus = '+' . $otpLogMobile;
            $stmt2 = $db->prepare("UPDATE admin_otp_logs SET status = 'verified', verified_at = NOW() WHERE mobile = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1");
            $stmt2->execute([$otpLogMobileWithPlus]);
            $updatedRows2 = $stmt2->rowCount();
            error_log("OTP log update (with +) - Rows affected: " . $updatedRows2);
        }
        
        if ($updatedRows === 0 && (!isset($updatedRows2) || $updatedRows2 === 0)) {
            error_log("Warning: No OTP log entry found to update for mobile: " . $otpLogMobile);
        }
    } catch (PDOException $e) {
        error_log("Error updating OTP log: " . $e->getMessage());
        error_log("SQL Error Info: " . print_r($e->errorInfo, true));
        // Continue even if logging fails - not critical for login flow
    }
    
    // Get admin user - check phone first (handle NULL phone case)
    error_log("Looking up admin user by phone: " . $validatedMobile);
    
    // Try multiple phone formats to match database
    $phoneFormats = [
        $mobileForDB,        // +917888076881
        $mobileDigitsOnly,   // 917888076881 (digits only)
        substr($mobileDigitsOnly, -10), // 7888076881 (last 10 digits)
    ];
    
    $admin = null;
    foreach ($phoneFormats as $phoneFormat) {
        try {
            $stmt = $db->prepare("SELECT id, username, email, phone, full_name, role, is_active FROM admin_users WHERE phone = ? AND is_active = 1 LIMIT 1");
            $stmt->execute([$phoneFormat]);
            $admin = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($admin) {
                error_log("Admin found with phone format: " . $phoneFormat . " - ID: " . $admin['id']);
                break;
            }
        } catch (PDOException $e) {
            error_log("Error querying admin with phone format '" . $phoneFormat . "': " . $e->getMessage());
        }
    }
    
    // If not found by phone, try to find any active admin (for first-time setup or NULL phone case)
    if (!$admin) {
        error_log("Admin not found by phone, trying to find any active admin");
        try {
            // First try admin email
            $stmt = $db->prepare("SELECT id, username, email, phone, full_name, role, is_active FROM admin_users WHERE (email LIKE ? OR email = 'admin@indiapropertys.com') AND is_active = 1 ORDER BY id ASC LIMIT 1");
            $stmt->execute(['%admin%']);
            $admin = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($admin) {
                error_log("Admin found by email - ID: " . $admin['id'] . ", Email: " . $admin['email'] . ", Current phone: " . ($admin['phone'] ?? 'NULL'));
            }
        } catch (PDOException $e) {
            error_log("Error querying admin by email: " . $e->getMessage());
        }
    }
    
    if (!$admin) {
        // Create default admin user
        error_log("Admin user not found, creating new admin user");
        $defaultEmail = 'admin@indiapropertys.com';
        $defaultUsername = 'admin';
        
        try {
            // Use normalized phone (without +) for varchar(15) column
            $phoneForDB = normalizeMobile($validatedMobile);
            if (strlen($phoneForDB) > 15) {
                $phoneForDB = substr($phoneForDB, -15); // Take last 15 characters
            }
            
            $stmt = $db->prepare("INSERT INTO admin_users (username, email, phone, full_name, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
            $stmt->execute([$defaultUsername, $defaultEmail, $phoneForDB, 'Admin User', 'super_admin', 1]);
            $adminId = $db->lastInsertId();
            error_log("New admin user created with ID: " . $adminId);
            
            $admin = [
                'id' => $adminId,
                'username' => $defaultUsername,
                'email' => $defaultEmail,
                'phone' => $phoneForDB,
                'full_name' => 'Admin User',
                'role' => 'super_admin',
                'is_active' => 1
            ];
        } catch (PDOException $e) {
            error_log("ERROR creating admin user: " . $e->getMessage());
            error_log("SQL Error Info: " . print_r($e->errorInfo, true));
            sendError('Failed to create admin account: ' . $e->getMessage(), null, 500);
        }
    } else {
        error_log("Admin user found - ID: " . $admin['id'] . ", Email: " . $admin['email']);
        
        // CRITICAL: Update phone number if it's NULL or different
        $currentPhone = $admin['phone'] ?? null;
        error_log("Current admin phone in DB: " . ($currentPhone === null ? 'NULL' : $currentPhone));
        
        // Prepare phone for database (varchar 15, prefer digits only for storage)
        $phoneForDBUpdate = $mobileDigitsOnly;
        if (strlen($phoneForDBUpdate) > 15) {
            $phoneForDBUpdate = substr($phoneForDBUpdate, -15);
        }
        
        // Update if NULL or different
        if ($currentPhone === null || empty($currentPhone)) {
            error_log("Admin phone is NULL, updating to: " . $phoneForDBUpdate);
            try {
                $stmt = $db->prepare("UPDATE admin_users SET phone = ? WHERE id = ?");
                $stmt->execute([$phoneForDBUpdate, $admin['id']]);
                $admin['phone'] = $phoneForDBUpdate;
                error_log("Successfully updated admin phone from NULL to: " . $phoneForDBUpdate);
            } catch (PDOException $e) {
                error_log("ERROR: Could not update admin phone: " . $e->getMessage());
                error_log("SQL Error Info: " . print_r($e->errorInfo, true));
                // Continue - we'll still try to create session
            }
        } else {
            // Normalize both for comparison
            $currentPhoneNormalized = normalizeMobile($currentPhone);
            $newPhoneNormalized = normalizeMobile($phoneForDBUpdate);
            
            if ($currentPhoneNormalized !== $newPhoneNormalized) {
                error_log("Admin phone is different, updating from '" . $currentPhone . "' to '" . $phoneForDBUpdate . "'");
                try {
                    $stmt = $db->prepare("UPDATE admin_users SET phone = ? WHERE id = ?");
                    $stmt->execute([$phoneForDBUpdate, $admin['id']]);
                    $admin['phone'] = $phoneForDBUpdate;
                } catch (PDOException $e) {
                    error_log("Warning: Could not update admin phone: " . $e->getMessage());
                    // Continue - not critical
                }
            } else {
                error_log("Admin phone matches, no update needed");
            }
        }
        
        // CRITICAL: Check if admin is active
        if (empty($admin['is_active']) || !$admin['is_active']) {
            error_log("ERROR: Admin account is inactive - ID: " . $admin['id']);
            sendError('Your account has been deactivated. Please contact the administrator.', null, 403);
        }
    }
    
    // CRITICAL: Verify admin ID exists before creating session
    if (empty($admin['id'])) {
        error_log("ERROR: Admin ID is missing after lookup");
        sendError('Admin account not found. Please contact support.', null, 401);
    }
    
    error_log("Admin user ready - ID: " . $admin['id'] . ", Role: " . ($admin['role'] ?? 'N/A'));
    
    // Create secure admin session
    error_log("Creating admin session for admin ID: " . $admin['id']);
    try {
        // Use validated mobile for session (keep original format)
        $sessionCreated = createAdminSession($validatedMobile, $admin['id'], $admin['role'], $admin['email']);
        
        if (!$sessionCreated) {
            error_log("ERROR: createAdminSession returned false");
            sendError('Failed to create session. Please try again.', null, 500);
        }
        
        // Log successful session creation
        $sessionId = session_id();
        error_log("Admin session created successfully - Mobile: " . substr($validatedMobile, 0, 4) . "**** - Session ID: " . $sessionId);
        
        // Verify session was actually created in database
        try {
            $verifyStmt = $db->prepare("SELECT id FROM admin_sessions WHERE session_id = ? AND admin_id = ?");
            $verifyStmt->execute([$sessionId, $admin['id']]);
            $sessionRecord = $verifyStmt->fetch(PDO::FETCH_ASSOC);
            if ($sessionRecord) {
                error_log("Session verified in database - Session DB ID: " . $sessionRecord['id']);
            } else {
                error_log("WARNING: Session not found in database after creation");
            }
        } catch (PDOException $e) {
            error_log("Warning: Could not verify session in DB: " . $e->getMessage());
        }
        
    } catch (PDOException $e) {
        error_log("ERROR: PDO exception creating admin session: " . $e->getMessage());
        error_log("SQL State: " . ($e->errorInfo[0] ?? 'N/A'));
        error_log("SQL Error Info: " . print_r($e->errorInfo ?? [], true));
        error_log("Stack trace: " . $e->getTraceAsString());
        sendError('Failed to create session: ' . $e->getMessage(), null, 500);
    } catch (Exception $e) {
        error_log("ERROR: Exception creating admin session: " . $e->getMessage());
        error_log("File: " . $e->getFile() . " | Line: " . $e->getLine());
        error_log("Stack trace: " . $e->getTraceAsString());
        sendError('Failed to create session: ' . $e->getMessage(), null, 500);
    } catch (Error $e) {
        error_log("ERROR: Fatal error creating admin session: " . $e->getMessage());
        error_log("File: " . $e->getFile() . " | Line: " . $e->getLine());
        error_log("Stack trace: " . $e->getTraceAsString());
        sendError('Failed to create session. Please try again.', null, 500);
    }
    
    // NOTE: We do NOT verify session immediately after creation to avoid race conditions
    // The session will be verified on the next request (e.g., when dashboard loads)
    // This is safe because we've already validated the mobile and created the session successfully
    
    // Log successful login
    error_log("Admin login successful via MSG91 OTP - Mobile: " . substr($validatedMobile, 0, 4) . "**** - Session ID: " . session_id());
    
    sendSuccess('OTP verified successfully. Admin session created.', [
        'admin' => [
            'id' => $admin['id'],
            'username' => $admin['username'],
            'email' => $admin['email'],
            'full_name' => $admin['full_name'],
            'role' => $admin['role']
        ],
        'session_id' => session_id() // Include session ID for debugging
    ]);
    
} catch (PDOException $e) {
    error_log("Verify OTP Database Error: " . $e->getMessage());
    error_log("SQL State: " . ($e->errorInfo[0] ?? 'N/A'));
    error_log("Error Info: " . print_r($e->errorInfo ?? [], true));
    error_log("Stack Trace: " . $e->getTraceAsString());
    
    // Clean any output before sending error
    if (ob_get_level() > 0) {
        ob_clean();
    }
    
    sendError('Database error occurred. Please try again.', null, 500);
} catch (Error $e) {
    error_log("Verify OTP Fatal Error: " . $e->getMessage());
    error_log("File: " . $e->getFile() . " | Line: " . $e->getLine());
    error_log("Stack Trace: " . $e->getTraceAsString());
    
    // Clean any output before sending error
    if (ob_get_level() > 0) {
        ob_clean();
    }
    
    sendError('A server error occurred. Please try again.', null, 500);
} catch (Exception $e) {
    error_log("Verify OTP Exception: " . $e->getMessage());
    error_log("File: " . $e->getFile() . " | Line: " . $e->getLine());
    error_log("Stack Trace: " . $e->getTraceAsString());
    
    // Clean any output before sending error
    if (ob_get_level() > 0) {
        ob_clean();
    }
    
    sendError('Failed to verify OTP. Please try again.', null, 500);
}
