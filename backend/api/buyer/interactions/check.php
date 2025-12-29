<?php
/**
 * Check Buyer Interaction Limits API
 * GET /api/buyer/interactions/check.php?property_id={id}&action_type={view_owner|chat_owner}
 * 
 * Returns remaining attempts and reset time for a specific action
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', null, 405);
}

try {
    $user = requireUserType(['buyer']);
    $buyerId = $user['id'];
    
    $propertyId = isset($_GET['property_id']) ? intval($_GET['property_id']) : 0;
    $actionType = isset($_GET['action_type']) ? trim($_GET['action_type']) : '';
    
    if (!$propertyId) {
        sendError('Property ID is required', null, 400);
    }
    
    if (!in_array($actionType, ['view_owner', 'chat_owner'])) {
        sendError('Invalid action type. Must be "view_owner" or "chat_owner"', null, 400);
    }
    
    $db = getDB();
    
    // Constants
    $MAX_ATTEMPTS = 5;
    $WINDOW_HOURS = 24;
    
    // Calculate the cutoff time (24 hours ago)
    $cutoffTime = date('Y-m-d H:i:s', strtotime("-{$WINDOW_HOURS} hours"));
    
    // Count attempts in the last 24 hours
    $stmt = $db->prepare("
        SELECT COUNT(*) as attempt_count,
               MIN(timestamp) as first_attempt_time
        FROM buyer_interaction_limits
        WHERE buyer_id = ? 
          AND property_id = ? 
          AND action_type = ?
          AND timestamp >= ?
    ");
    $stmt->execute([$buyerId, $propertyId, $actionType, $cutoffTime]);
    $result = $stmt->fetch();
    
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
        'property_id' => $propertyId
    ]);
    
} catch (Exception $e) {
    error_log("Check Interaction Limits Error: " . $e->getMessage());
    sendError('Failed to check interaction limits', null, 500);
}

