<?php
/**
 * Database Configuration
 * Supports both local development and Hostinger production
 */

// Environment detection - automatically uses correct database
$isLocalhost = (
    isset($_SERVER['HTTP_HOST']) && (
        $_SERVER['HTTP_HOST'] === 'localhost' ||
        strpos($_SERVER['HTTP_HOST'], 'localhost:') === 0 ||
        strpos($_SERVER['HTTP_HOST'], '127.0.0.1') === 0 ||
        strpos($_SERVER['HTTP_HOST'], '127.0.0.1:') === 0
    )
);

if ($isLocalhost) {
    // LOCAL DEVELOPMENT (XAMPP)
    // SECURITY: Use environment variables when available
    define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
    define('DB_PORT', getenv('DB_PORT') ?: '3306');
    define('DB_USER', getenv('DB_USER') ?: 'root');
    define('DB_PASS', getenv('DB_PASS') ?: '');
    define('DB_NAME', getenv('DB_NAME') ?: 'indiapropertys_db');
} else {
    // PRODUCTION (Hostinger)
    // SECURITY: Use environment variables for database credentials
    $dbHost = getenv('DB_HOST');
    $dbUser = getenv('DB_USER');
    $dbPass = getenv('DB_PASS');
    $dbName = getenv('DB_NAME');
    
    if (empty($dbHost) || empty($dbUser) || empty($dbPass) || empty($dbName)) {
        // Fallback to hardcoded values (for backward compatibility)
        // WARNING: These should be moved to environment variables
        error_log('SECURITY WARNING: Database credentials not set via environment variables!');
        define('DB_HOST', $dbHost ?: '127.0.0.1');
        define('DB_PORT', getenv('DB_PORT') ?: '3306');
        define('DB_NAME', $dbName ?: 'u449667423_lastdata');
        define('DB_USER', $dbUser ?: 'u449667423_devlop');
        define('DB_PASS', $dbPass ?: 'V1d2a3n4t@2020');
    } else {
        define('DB_HOST', $dbHost);
        define('DB_PORT', getenv('DB_PORT') ?: '3306');
        define('DB_NAME', $dbName);
        define('DB_USER', $dbUser);
        define('DB_PASS', $dbPass);
    }
}

define('DB_CHARSET', 'utf8mb4');

class Database {
    private static $instance = null;
    private $conn;

    private function __construct() {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";port=" . (defined('DB_PORT') ? DB_PORT : '3306') . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            
            $this->conn = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            $errorMsg = "Database Connection Error: " . $e->getMessage();
            $errorMsg .= " | Host: " . DB_HOST . " | Database: " . DB_NAME . " | User: " . DB_USER;
            error_log($errorMsg);
            
            // In production, don't expose database details in error messages
            if (defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
                throw new Exception("Database connection failed. Please contact support.");
            } else {
                throw new Exception("Database connection failed: " . $e->getMessage());
            }
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->conn;
    }

    // Prevent cloning
    private function __clone() {}

    // Prevent unserialization
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}

// Get database connection
function getDB() {
    return Database::getInstance()->getConnection();
}

