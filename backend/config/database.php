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
    define('DB_HOST', 'localhost');
    define('DB_PORT', '3306');
    define('DB_USER', 'root');
    define('DB_PASS', '');
    define('DB_NAME', 'indiapropertys_db');
} else {
    // PRODUCTION (Hostinger)
    // Values provided from your Hostinger MySQL details
    define('DB_HOST', '127.0.0.1');
    define('DB_PORT', '3306');
    define('DB_NAME', 'u449667423_lastdata');
    define('DB_USER', 'u449667423_devlop');
    define('DB_PASS', 'V1d2a3n4t@2020');
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

