<?php
/**
 * Response Helper Functions
 */

// Set CORS headers
function setCorsHeaders() {
    // Allowed origins - add production URLs here
    $allowedOrigins = [
        // Local development
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        // Production domains
        'https://demo1.indiapropertys.com',
        'https://indiapropertys.com',
        'https://www.indiapropertys.com',
    ];
    
    // Get origin from request
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    
    // If no origin header, try Referer header
    if (empty($origin) && isset($_SERVER['HTTP_REFERER'])) {
        $parsedUrl = parse_url($_SERVER['HTTP_REFERER']);
        if (isset($parsedUrl['scheme']) && isset($parsedUrl['host'])) {
            // Build origin from scheme and host
            $origin = $parsedUrl['scheme'] . '://' . $parsedUrl['host'];
            // Include port if present (and not default port)
            if (isset($parsedUrl['port'])) {
                $defaultPort = ($parsedUrl['scheme'] === 'https') ? 443 : 80;
                if ($parsedUrl['port'] != $defaultPort) {
                    $origin .= ':' . $parsedUrl['port'];
                }
            }
        }
    }
    
    // Set CORS origin header
    if (!empty($origin) && in_array($origin, $allowedOrigins)) {
        header("Access-Control-Allow-Origin: $origin");
    } elseif (!empty($origin)) {
        // If origin is provided but not in allowed list, check if it's production
        // Allow demo1 subdomain even if not explicitly listed (for flexibility)
        if (strpos($origin, 'demo1.indiapropertys.com') !== false || 
            strpos($origin, 'indiapropertys.com') !== false) {
            header("Access-Control-Allow-Origin: $origin");
        } else {
            // Default to first allowed origin for development
            header('Access-Control-Allow-Origin: http://localhost:3000');
        }
    } else {
        // No origin header - allow all for development, restrict for production
        if (defined('ENVIRONMENT') && ENVIRONMENT === 'development') {
            header('Access-Control-Allow-Origin: *');
        } else {
            header('Access-Control-Allow-Origin: https://demo1.indiapropertys.com');
        }
    }
    
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400'); // Cache preflight for 24 hours
    header('Content-Type: application/json; charset=utf-8');
}

// Handle preflight requests
function handlePreflight() {
    // Always set CORS headers first
    setCorsHeaders();
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        // Preflight request - just send headers and exit
        http_response_code(200);
        exit();
    }
}

// Send JSON response
function sendResponse($success, $message = '', $data = null, $statusCode = 200) {
    // Clear any output buffer to ensure clean JSON
    if (ob_get_level() > 0) {
        ob_clean();
    }
    
    setCorsHeaders();
    http_response_code($statusCode);
    
    $response = [
        'success' => $success,
        'message' => $message,
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    $json = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
    if ($json === false) {
        // JSON encoding failed - log error and send error response
        error_log("JSON encoding failed: " . json_last_error_msg());
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Server error: Failed to encode response',
            'error' => json_last_error_msg()
        ]);
        exit();
    }
    
    echo $json;
    exit();
}

// Send success response
function sendSuccess($message = 'Success', $data = null, $statusCode = 200) {
    sendResponse(true, $message, $data, $statusCode);
}

// Send error response
function sendError($message = 'Error', $data = null, $statusCode = 400) {
    sendResponse(false, $message, $data, $statusCode);
}

// Send validation error response
function sendValidationError($errors, $message = 'Validation failed') {
    sendResponse(false, $message, ['errors' => $errors], 422);
}

