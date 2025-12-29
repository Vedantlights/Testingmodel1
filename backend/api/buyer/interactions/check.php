<?php
/**
 * Check Buyer Interaction Limits API
 * GET /api/buyer/interactions/check.php?property_id={id}&action_type={view_owner|chat_owner}
 * 
 * Returns remaining attempts and reset time for a specific action
 * 
 * NOTE: Rate limits are GLOBAL per buyer (across all properties)
 * - property_id is accepted for API compatibility but NOT used for limit calculation
 * - A buyer has 5 total attempts per action type across ALL properties
 */

// Register shutdown function to catch fatal errors
register_shutdown_function(function() {
    // Only handle if headers haven't been sent yet
    if (!headers_sent()) {
        $error = error_get_last();
        if ($error !== NULL && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
            // Clean any output
            while (ob_get_level() > 0) {
                ob_end_clean();
            }
            // Set CORS headers
            $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
            if (!empty($origin)) {
                header("Access-Control-Allow-Origin: $origin");
            }
            header('Content-Type: application/json');
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'A fatal error occurred. Please check server logs.',
                'error' => defined('ENVIRONMENT') && ENVIRONMENT === 'development' ? $error['message'] : null
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
    }
});

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', null, 405);
}

// Ensure output buffering is clean at the start
if (ob_get_level() > 0) {
    ob_clean();
}

try {
    $user = requireUserType(['buyer']);
    $buyerId = $user['id'];
    
    $propertyId = isset($_GET['property_id']) ? intval($_GET['property_id']) : 0;
    $actionType = isset($_GET['action_type']) ? trim($_GET['action_type']) : '';
    
    // property_id is optional (accepted for API compatibility but not used for limit calculation)
    // Action type is required
    if (!in_array($actionType, ['view_owner', 'chat_owner'])) {
        sendError('Invalid action type. Must be "view_owner" or "chat_owner"', null, 400);
    }
    
    $db = getDB();
    if (!$db) {
        sendError('Database connection failed', null, 500);
    }
    
    // Constants
    $MAX_ATTEMPTS = 5;
    $WINDOW_HOURS = 24;
    
    // Calculate the cutoff time (24 hours ago)
    $cutoffTime = date('Y-m-d H:i:s', strtotime("-{$WINDOW_HOURS} hours"));
    
    // Count attempts in the last 24 hours (GLOBAL - across all properties)
    // NOTE: property_id is NOT included in WHERE clause - limits are global per buyer
    $stmt = $db->prepare("
        SELECT COUNT(*) as attempt_count,
               MIN(timestamp) as first_attempt_time
        FROM buyer_interaction_limits
        WHERE buyer_id = ? 
          AND action_type = ?
          AND timestamp >= ?
    ");
    $stmt->execute([$buyerId, $actionType, $cutoffTime]);
    $result = $stmt->fetch();
    
    // Safety check: COUNT(*) should always return a row, but handle edge case
    if ($result === false) {
        $result = ['attempt_count' => 0, 'first_attempt_time' => null];
    }
    
    $attemptCount = intval($result['attempt_count'] ?? 0);
    $remainingAttempts = max(0, $MAX_ATTEMPTS - $attemptCount);
    $canPerformAction = $remainingAttempts > 0;
    
    // Calculate reset time (24 hours from first attempt, or now if no attempts)
    $resetTime = null;
    $resetTimeSeconds = null;
    
    if ($attemptCount > 0 && $result['first_attempt_time']) {
        $firstAttemptTime = strtotime($result['first_attempt_time']);
        $resetTimeSeconds = $firstAttemptTime + ($WINDOW_HOURS * 3600);
        $resetTime = date('Y-m-d H:i:s', $resetTimeSeconds);
    }
    
    sendSuccess('Usage limits retrieved', [
        'remaining_attempts' => $remainingAttempts,
        'max_attempts' => $MAX_ATTEMPTS,
        'used_attempts' => $attemptCount,
        'can_perform_action' => $canPerformAction,
        'reset_time' => $resetTime,
        'reset_time_seconds' => $resetTimeSeconds,
        'action_type' => $actionType,
        'property_id' => $propertyId // Included for reference, but limits are global
    ]);
    
} catch (PDOException $e) {
    error_log("Check Interaction Limits PDO Error: " . $e->getMessage());
    error_log("SQL State: " . $e->getCode());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    // Check if it's a table doesn't exist error (MySQL error 1146)
    $errorMessage = $e->getMessage();
    
    if (strpos($errorMessage, "doesn't exist") !== false || strpos($errorMessage, "Unknown table") !== false) {
        sendError('Database table not found. Please ensure the buyer_interaction_limits table exists.', null, 500);
    } else {
        sendError('Database error occurred. Please try again later.', null, 500);
    }
} catch (Throwable $e) {
    // Catch both Exception and Error (PHP 7+)
    error_log("Check Interaction Limits Error: " . $e->getMessage());
    error_log("Error Code: " . $e->getCode());
    error_log("Error Class: " . get_class($e));
    error_log("Stack trace: " . $e->getTraceAsString());
    
    // sendError() calls exit(), so this will terminate the script
    sendError('Failed to check interaction limits: ' . $e->getMessage(), null, 500);
}

