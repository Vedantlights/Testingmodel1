<?php
/**
 * Record Buyer Interaction API
 * POST /api/buyer/interactions/record.php
 * 
 * Records a buyer interaction (view owner details or chat) and enforces rate limits
 * Body: { property_id: int, action_type: 'view_owner'|'chat_owner' }
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $user = requireUserType(['buyer']);
    $buyerId = $user['id'];
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $propertyId = isset($input['property_id']) ? intval($input['property_id']) : 0;
    $actionType = isset($input['action_type']) ? trim($input['action_type']) : '';
    
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
    
    // Check if limit is reached
    if ($attemptCount >= $MAX_ATTEMPTS) {
        $firstAttemptTime = strtotime($result['first_attempt_time'] ?? date('Y-m-d H:i:s'));
        $resetTimeSeconds = $firstAttemptTime + ($WINDOW_HOURS * 3600);
        $resetTime = date('Y-m-d H:i:s', $resetTimeSeconds);
        
        sendError('Rate limit exceeded', [
            'remaining_attempts' => 0,
            'max_attempts' => $MAX_ATTEMPTS,
            'used_attempts' => $attemptCount,
            'reset_time' => $resetTime,
            'reset_time_seconds' => $resetTimeSeconds,
            'message' => "You have reached the maximum limit of {$MAX_ATTEMPTS} attempts for this action. Please try again after the reset time."
        ], 429);
    }
    
    // Record the interaction
    $stmt = $db->prepare("
        INSERT INTO buyer_interaction_limits (buyer_id, property_id, action_type, timestamp)
        VALUES (?, ?, ?, NOW())
    ");
    $stmt->execute([$buyerId, $propertyId, $actionType]);
    
    // Get updated count
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
    $updatedResult = $stmt->fetch();
    
    $updatedAttemptCount = intval($updatedResult['attempt_count'] ?? 0);
    $remainingAttempts = max(0, $MAX_ATTEMPTS - $updatedAttemptCount);
    
    // Calculate reset time
    $resetTime = null;
    $resetTimeSeconds = null;
    if ($updatedResult['first_attempt_time']) {
        $firstAttemptTime = strtotime($updatedResult['first_attempt_time']);
        $resetTimeSeconds = $firstAttemptTime + ($WINDOW_HOURS * 3600);
        $resetTime = date('Y-m-d H:i:s', $resetTimeSeconds);
    }
    
    sendSuccess('Interaction recorded', [
        'remaining_attempts' => $remainingAttempts,
        'max_attempts' => $MAX_ATTEMPTS,
        'used_attempts' => $updatedAttemptCount,
        'reset_time' => $resetTime,
        'reset_time_seconds' => $resetTimeSeconds,
        'action_type' => $actionType,
        'property_id' => $propertyId
    ]);
    
} catch (Exception $e) {
    error_log("Record Interaction Error: " . $e->getMessage());
    
    // Check if it's a rate limit error (429)
    if (isset($e->getCode()) && $e->getCode() === 429) {
        throw $e;
    }
    
    sendError('Failed to record interaction', null, 500);
}

