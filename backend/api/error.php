<?php
/**
 * Error Handler
 */

require_once __DIR__ . '/../utils/response.php';

header('Content-Type: application/json');
http_response_code(404);

echo json_encode([
    'success' => false,
    'message' => 'Endpoint not found',
    'data' => null
], JSON_UNESCAPED_UNICODE);

