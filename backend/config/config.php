<?php
/**
 * Application Configuration
 */

// CORS Headers
// Add your production frontend domain(s) here
$allowed_origins = [
    // Local development
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    // Production - Hostinger / live domains
    'https://demo1.indiapropertys.com',
    'https://indiapropertys.com',
    'https://www.indiapropertys.com',
];

// Allow requests from allowed origins
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} elseif (!empty($origin) && defined('ENVIRONMENT') && ENVIRONMENT === 'development') {
    // In development, allow any origin for easier testing
    header("Access-Control-Allow-Origin: $origin");
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Error Reporting is now handled by environment detection above

// Timezone
date_default_timezone_set('Asia/Kolkata');

// ============================================
// ENVIRONMENT DETECTION & BASE URL CONFIGURATION
// ============================================
// Automatically detects if running on localhost or production
$isLocalhost = (
    $_SERVER['HTTP_HOST'] === 'localhost' ||
    strpos($_SERVER['HTTP_HOST'], 'localhost:') === 0 ||
    strpos($_SERVER['HTTP_HOST'], '127.0.0.1') === 0 ||
    strpos($_SERVER['HTTP_HOST'], '127.0.0.1:') === 0
);

if ($isLocalhost) {
    // LOCAL DEVELOPMENT
    define('BASE_URL', 'http://localhost/Fullstack/backend');
    define('ENVIRONMENT', 'development');
    // Error reporting enabled for development
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    // PRODUCTION (Hostinger)
    // Backend is deployed in /backend/ folder under demo1 subdomain
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    // If backend is in /backend/ folder, include it in BASE_URL
    define('BASE_URL', $protocol . '://' . $host . '/backend');
    define('ENVIRONMENT', 'production');
    // Error reporting: Log errors but don't display them (prevents HTML breaking JSON responses)
    error_reporting(E_ALL);
    ini_set('display_errors', 0);  // Don't display errors (prevents HTML in JSON responses)
    ini_set('log_errors', 1);
    // Log errors to a file in the backend directory
    $errorLogPath = __DIR__ . '/../logs/php_errors.log';
    if (!file_exists(dirname($errorLogPath))) {
        @mkdir(dirname($errorLogPath), 0755, true);
    }
    ini_set('error_log', $errorLogPath);
}

define('API_BASE_URL', BASE_URL . '/api');
// UPLOAD_BASE_URL points to /backend/uploads (files are saved to /backend/uploads/)
// Files are physically at: /public_html/demo1/backend/uploads/properties/
// URLs should be: https://demo1.indiapropertys.com/backend/uploads/properties/
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'];
define('UPLOAD_BASE_URL', $protocol . '://' . $host . '/backend/uploads');

// File Upload Paths - USE /backend/uploads/ (inside backend folder)
// Files saved to: /home/u449667423/domains/indiapropertys.com/public_html/demo1/backend/uploads/properties/
// URLs: https://demo1.indiapropertys.com/backend/uploads/properties/
// Note: UPLOAD_PROPERTIES_PATH, UPLOAD_TEMP_PATH, etc. are defined in moderation.php
// Use those constants instead of defining here
// __DIR__ is /backend/config/, so go up one level to /backend/
$baseUploadDir = dirname(__DIR__) . '/uploads/';
define('UPLOAD_DIR', $baseUploadDir);

// Verify the path is correct (for debugging)
error_log("UPLOAD_DIR: " . UPLOAD_DIR);
error_log("UPLOAD_DIR exists: " . (is_dir(UPLOAD_DIR) ? 'YES' : 'NO'));
error_log("UPLOAD_DIR writable: " . (is_writable(UPLOAD_DIR) ? 'YES' : 'NO'));

// Note: UPLOAD_PROPERTIES_PATH is defined in moderation.php - don't redefine here

define('PROPERTY_VIDEOS_DIR', UPLOAD_DIR . 'properties/videos/');
define('PROPERTY_BROCHURES_DIR', UPLOAD_DIR . 'properties/brochures/');
define('USER_PROFILES_DIR', UPLOAD_DIR . 'users/profiles/');

// Create upload directories if they don't exist
// Note: UPLOAD_PROPERTIES_PATH, UPLOAD_TEMP_PATH, etc. are created in moderation.php
$dirs = [
    UPLOAD_DIR,
    PROPERTY_VIDEOS_DIR,
    PROPERTY_BROCHURES_DIR,
    USER_PROFILES_DIR
];

foreach ($dirs as $dir) {
    if (!file_exists($dir)) {
        @mkdir($dir, 0755, true);
        if (file_exists($dir)) {
            error_log("Created upload directory: {$dir}");
        }
    }
}

// File Upload Limits
define('MAX_IMAGE_SIZE', 5 * 1024 * 1024); // 5MB
define('MAX_VIDEO_SIZE', 50 * 1024 * 1024); // 50MB
define('MAX_BROCHURE_SIZE', 10 * 1024 * 1024); // 10MB
define('MAX_IMAGES_PER_PROPERTY', 10);

// Allowed File Types
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
define('ALLOWED_VIDEO_TYPES', ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/ogg']);
define('ALLOWED_BROCHURE_TYPES', ['application/pdf']);

// JWT Secret (SECURITY: Use environment variable in production!)
// WARNING: Default secret is weak and should be changed in production
$jwtSecret = getenv('JWT_SECRET') ?: 'your-secret-key-change-in-production-2024';
if ($jwtSecret === 'your-secret-key-change-in-production-2024' && defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
    error_log('SECURITY WARNING: Using default JWT_SECRET in production! Please set JWT_SECRET environment variable.');
}
define('JWT_SECRET', $jwtSecret);
define('JWT_ALGORITHM', getenv('JWT_ALGORITHM') ?: 'HS256');
define('JWT_EXPIRATION', (int)(getenv('JWT_EXPIRATION') ?: 86400)); // 24 hours

// Mapbox Access Token (for geocoding)
// SECURITY: Use environment variable to avoid exposing token in code
$mapboxToken = getenv('MAPBOX_ACCESS_TOKEN') ?: 'pk.eyJ1Ijoic3VkaGFrYXJwb3VsIiwiYSI6ImNtaXp0ZmFrNTAxaTQzZHNiODNrYndsdTAifQ.YTMezksySLU7ZpcYkvXyqg';
define('MAPBOX_ACCESS_TOKEN', $mapboxToken);

// OTP Configuration
define('OTP_EXPIRATION_MINUTES', (int)(getenv('OTP_EXPIRATION_MINUTES') ?: 10));
define('OTP_LENGTH', (int)(getenv('OTP_LENGTH') ?: 6));

// Email Configuration (Hostinger SMTP)
// SECURITY: Use environment variables for sensitive credentials
define('SMTP_HOST', getenv('SMTP_HOST') ?: 'smtp.hostinger.com');
define('SMTP_PORT', (int)(getenv('SMTP_PORT') ?: 587));
define('SMTP_USER', getenv('SMTP_USER') ?: 'info@indiapropertys.com');
// WARNING: SMTP password should be set via environment variable
$smtpPass = getenv('SMTP_PASS');
if (empty($smtpPass)) {
    // Fallback to hardcoded value (for backward compatibility)
    $smtpPass = 'V1e2d2a4n5t@2020';
    if (defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
        error_log('SECURITY WARNING: SMTP password not set via environment variable in production!');
    }
}
define('SMTP_PASS', $smtpPass);
define('SMTP_FROM_EMAIL', getenv('SMTP_FROM_EMAIL') ?: 'info@indiapropertys.com');
define('SMTP_FROM_NAME', getenv('SMTP_FROM_NAME') ?: 'IndiaPropertys');

// SMS Configuration (MSG91 - Admin OTP configuration moved to admin-config.php)
// MSG91 constants are now defined in admin-config.php to avoid conflicts
define('MSG91_SENDER_ID', getenv('MSG91_SENDER_ID') ?: 'INDIA');
// New SMS Verification Widget Token (Tokenid)
// SECURITY: Use environment variable
$msg91WidgetToken = getenv('MSG91_WIDGET_AUTH_TOKEN') ?: '481618TcNAx989nvQ69410832P1';
if ($msg91WidgetToken === '481618TcNAx989nvQ69410832P1' && defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
    error_log('SECURITY WARNING: Using default MSG91_WIDGET_AUTH_TOKEN in production!');
}
define('MSG91_WIDGET_AUTH_TOKEN', $msg91WidgetToken);

// Pagination
define('DEFAULT_PAGE_SIZE', 20);
define('MAX_PAGE_SIZE', 100);

// Property Limits
define('FREE_PLAN_PROPERTY_LIMIT', 3);
define('BASIC_PLAN_PROPERTY_LIMIT', 10);
define('PRO_PLAN_PROPERTY_LIMIT', 50);
define('PREMIUM_PLAN_PROPERTY_LIMIT', -1); // Unlimited

// ============================================
// IMAGE MODERATION CONFIGURATION
// ============================================
// Google Cloud Vision API Configuration
// SECURITY: Use environment variable for credentials path
$googleCredentialsPath = getenv('GOOGLE_APPLICATION_CREDENTIALS');
if (empty($googleCredentialsPath)) {
    // Production path (Hostinger shared hosting)
    $googleCredentialsPath = '/home/u449667423/domains/indiapropertys.com/Secure/indiapropertys-8fab286d41e4.json';
    
    // Fallback to local development path if production path doesn't exist
    if (!file_exists($googleCredentialsPath)) {
        $googleCredentialsPath = __DIR__ . '/../config/google-cloud-credentials.json';
        if (defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
            error_log('SECURITY WARNING: Google Cloud credentials file not found at production path!');
        }
    }
}
define('GOOGLE_APPLICATION_CREDENTIALS', $googleCredentialsPath);

// Moderation Thresholds (0.0 to 1.0)
// These values determine when content is flagged as unsafe or needs review
define('MODERATION_ADULT_THRESHOLD', (float)(getenv('MODERATION_ADULT_THRESHOLD') ?: 0.6));
define('MODERATION_RACY_THRESHOLD', (float)(getenv('MODERATION_RACY_THRESHOLD') ?: 0.7));
define('MODERATION_VIOLENCE_THRESHOLD', (float)(getenv('MODERATION_VIOLENCE_THRESHOLD') ?: 0.5));
define('MODERATION_MEDICAL_THRESHOLD', (float)(getenv('MODERATION_MEDICAL_THRESHOLD') ?: 0.6));
define('MODERATION_ANIMAL_THRESHOLD', (float)(getenv('MODERATION_ANIMAL_THRESHOLD') ?: 0.7));

// Image Upload Limits for Moderation
define('MAX_IMAGE_SIZE_MB', (int)(getenv('MAX_IMAGE_SIZE_MB') ?: 5));
define('MAX_IMAGE_SIZE_BYTES', MAX_IMAGE_SIZE_MB * 1024 * 1024);

// Allowed Image Types for Moderation (comma-separated string)
$allowedImageTypesStr = getenv('ALLOWED_IMAGE_TYPES') ?: 'jpg,jpeg,png,webp';
$allowedImageTypesArray = array_map('trim', explode(',', $allowedImageTypesStr));
define('ALLOWED_IMAGE_TYPES_STR', $allowedImageTypesStr);
define('ALLOWED_IMAGE_TYPES_ARRAY', $allowedImageTypesArray);

// Moderation Upload Directories
define('UPLOAD_TEMP_DIR', UPLOAD_DIR . 'temp/');
define('UPLOAD_PROPERTIES_DIR', UPLOAD_DIR . 'properties/');
define('UPLOAD_REVIEW_DIR', UPLOAD_DIR . 'review/');
define('UPLOAD_REJECTED_DIR', UPLOAD_DIR . 'rejected/');

// Create moderation upload directories if they don't exist
$moderationDirs = [
    UPLOAD_TEMP_DIR,
    UPLOAD_PROPERTIES_DIR,
    UPLOAD_REVIEW_DIR,
    UPLOAD_REJECTED_DIR
];

foreach ($moderationDirs as $dir) {
    if (!file_exists($dir)) {
        mkdir($dir, 0755, true);
    }
}

// Database connection is handled by database.php
// Use Database::getInstance()->getConnection() or getDB() function
// 
// For InfinityFree hosting, uncomment and update these credentials:
// $host     = "sql101.infinityfree.com";
// $username = "if0_40672958";
// $password = "Vedant2020";
// $database = "if0_40672958_indiapropertys_db";
// $conn = new mysqli($host, $username, $password, $database);
// if ($conn->connect_error) {
//     die(json_encode(['error' => 'Connection failed']));
// }
// $conn->set_charset("utf8mb4");

