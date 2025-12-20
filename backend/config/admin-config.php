<?php
/**
 * Admin Panel Configuration
 * MSG91 Configuration and Admin Mobile Number
 * SECURITY: Admin mobile number is hardcoded here and NEVER exposed to frontend
 */

// MSG91 API Credentials
define('MSG91_AUTH_KEY', '481618A2cCSUpaZHTW6936c356P1');
define('MSG91_WIDGET_ID', '356c6c6c4141303836323334');
// Using Widget ID for OTP (Widget-based OTP)
define('MSG91_TEMPLATE_ID', '356c6c6c4141303836323334'); // Using Widget ID as Template ID for widget-based OTP
define('MSG91_TOKEN', '481618T5XOC0xYx9t6936b319P1');

// MSG91 API Endpoints
define('MSG91_SEND_OTP_URL', 'https://control.msg91.com/api/v5/otp');
define('MSG91_VERIFY_OTP_URL', 'https://control.msg91.com/api/v5/otp/verify');
define('MSG91_RESEND_OTP_URL', 'https://control.msg91.com/api/v5/otp/retry');

// ADMIN MOBILE - This is the ONLY number that receives OTP
// NEVER expose this to frontend
// Format: 917888076881 (with country code 91) or 7888076881 (without country code)
define('ADMIN_MOBILE', '917888076881');
define('ADMIN_MOBILE_SHORT', '7888076881'); // Without country code - this is the valid number

// OTP Configuration
define('OTP_EXPIRY_MINUTES', 10);
define('OTP_LENGTH', 6);
define('OTP_RESEND_COOLDOWN_SECONDS', 30);
