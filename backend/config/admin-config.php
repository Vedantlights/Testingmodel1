<?php
/**
 * Admin Panel Configuration
 * MSG91 Configuration and Admin Mobile Number
 * SECURITY: Admin mobile number is hardcoded here and NEVER exposed to frontend
 */

// MSG91 Widget Configuration
// Get from environment variables or use defaults
define('MSG91_WIDGET_ID', getenv('MSG91_WIDGET_ID') ?: '356c73693735333838393730');
define('MSG91_AUTH_TOKEN', getenv('MSG91_AUTH_TOKEN') ?: '481618T5XOC0xYx9t6936b319P1');

// MSG91 API Credentials (for server-side verification)
define('MSG91_AUTH_KEY', '481618A2cCSUpaZHTW6936c356P1');
define('MSG91_TEMPLATE_ID', '356c6c6c4141303836323334');
define('MSG91_TOKEN', '481618T5XOC0xYx9t6936b319P1');

// MSG91 API Endpoints
define('MSG91_SEND_OTP_URL', 'https://control.msg91.com/api/v5/otp');
define('MSG91_VERIFY_OTP_URL', 'https://control.msg91.com/api/v5/otp/verify');
define('MSG91_RESEND_OTP_URL', 'https://control.msg91.com/api/v5/otp/retry');

// ADMIN WHITELIST - ONLY these numbers can access admin panel
// NEVER expose these to frontend
// Format: +917888076881 (with + and country code)
define('ADMIN_MOBILE_1', getenv('ADMIN_MOBILE_1') ?: '+917888076881');
define('ADMIN_MOBILE_2', getenv('ADMIN_MOBILE_2') ?: '');

// Get all whitelisted admin mobiles
function getAdminWhitelist() {
    $whitelist = [];
    if (defined('ADMIN_MOBILE_1') && !empty(ADMIN_MOBILE_1)) {
        $whitelist[] = ADMIN_MOBILE_1;
    }
    if (defined('ADMIN_MOBILE_2') && !empty(ADMIN_MOBILE_2)) {
        $whitelist[] = ADMIN_MOBILE_2;
    }
    return $whitelist;
}

// Normalize mobile number for comparison (remove +, spaces, etc.)
function normalizeMobile($mobile) {
    return preg_replace('/[^0-9]/', '', $mobile);
}

// Check if mobile is whitelisted
function isWhitelistedMobile($mobile) {
    $normalized = normalizeMobile($mobile);
    $whitelist = getAdminWhitelist();
    
    foreach ($whitelist as $whitelisted) {
        if (normalizeMobile($whitelisted) === $normalized) {
            return true;
        }
    }
    return false;
}

// Session Configuration
define('ADMIN_SESSION_SECRET', getenv('ADMIN_SESSION_SECRET') ?: 'change-this-to-strong-random-secret-in-production-2024');
define('SESSION_EXPIRY', (int)(getenv('SESSION_EXPIRY') ?: 3600000)); // 1 hour in milliseconds

// OTP Configuration
define('OTP_EXPIRY_MINUTES', 10);
define('OTP_LENGTH', 6);
define('OTP_MAX_ATTEMPTS', (int)(getenv('OTP_MAX_ATTEMPTS') ?: 3));
define('OTP_RESEND_LIMIT', (int)(getenv('OTP_RESEND_LIMIT') ?: 3));
define('OTP_RESEND_COOLDOWN_SECONDS', (int)(getenv('OTP_RESEND_COOLDOWN_SECONDS') ?: 60));

// Rate Limiting Configuration
define('RATE_LIMIT_VALIDATE_ATTEMPTS', 5); // 5 attempts per IP per hour
define('RATE_LIMIT_VALIDATE_WINDOW', 3600); // 1 hour in seconds
define('RATE_LIMIT_OTP_SEND_WINDOW', 600); // 10 minutes in seconds
define('RATE_LIMIT_OTP_VERIFY_ATTEMPTS', 3); // 3 attempts per session
