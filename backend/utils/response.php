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
        $referer = parse_url($_SERVER['HTTP_REFERER'], PHP_URL_ORIGIN);
        if ($referer) {
            $origin = $referer;
        }
    }
    
    // Set CORS origin header
    if (!empty($origin) && in_array($origin, $allowedOrigins)) {
        header("Access-Control-Allow-Origin: $origin");
    } else {
        // Default to first allowed origin for development
        header('Access-Control-Allow-Origin: http://localhost:3000');
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
    setCorsHeaders();
    http_response_code($statusCode);
    
    $response = [
        'success' => $success,
        'message' => $message,
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
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

