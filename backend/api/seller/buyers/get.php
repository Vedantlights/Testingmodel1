<?php
/**
 * Get Buyer Details by ID API
 * GET /api/seller/buyers/get.php?id={buyer_id}
 * Allows sellers to get buyer information for chat conversations
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
    $user = requireUserType(['seller', 'agent']);
    
    $buyerId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if (!$buyerId) {
        sendError('Buyer ID is required', null, 400);
    }
    
    $db = getDB();
    
    // Get buyer details with profile image
    $stmt = $db->prepare("
        SELECT u.id, u.full_name, u.email, u.phone, u.user_type,
               up.profile_image
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.id = ? AND u.user_type = 'buyer'
    ");
    $stmt->execute([$buyerId]);
    $buyer = $stmt->fetch();
    
    if (!$buyer) {
        sendError('Buyer not found', null, 404);
    }
    
    // Format response
    $buyerData = [
        'id' => $buyer['id'],
        'name' => $buyer['full_name'],
        'email' => $buyer['email'],
        'phone' => $buyer['phone'],
        'profile_image' => $buyer['profile_image']
    ];
    
    sendSuccess('Buyer details retrieved successfully', ['buyer' => $buyerData]);
    
} catch (Exception $e) {
    error_log("Get Buyer Details Error: " . $e->getMessage());
    sendError('Failed to retrieve buyer details', null, 500);
}
