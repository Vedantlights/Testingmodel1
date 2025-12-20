<?php
/**
 * Send Inquiry API
 * POST /api/buyer/inquiries/send.php
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/validation.php';
require_once __DIR__ . '/../../../utils/auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $propertyId = isset($input['property_id']) ? intval($input['property_id']) : 0;
    $name = sanitizeInput($input['name'] ?? '');
    $email = sanitizeInput($input['email'] ?? '');
    $mobile = sanitizeInput($input['mobile'] ?? '');
    $message = sanitizeInput($input['message'] ?? '');
    
    // Validation
    $errors = [];
    
    if (!$propertyId) {
        $errors['property_id'] = 'Property ID is required';
    }
    
    if (empty($name)) {
        $errors['name'] = 'Name is required';
    }
    
    if (empty($email)) {
        $errors['email'] = 'Email is required';
    } elseif (!validateEmail($email)) {
        $errors['email'] = 'Invalid email format';
    }
    
    if (empty($mobile)) {
        $errors['mobile'] = 'Mobile number is required';
    }
    
    if (!empty($errors)) {
        sendValidationError($errors);
    }
    
    $db = getDB();
    
    // Check if property exists
    $stmt = $db->prepare("SELECT id, user_id FROM properties WHERE id = ? AND is_active = 1");
    $stmt->execute([$propertyId]);
    $property = $stmt->fetch();
    
    if (!$property) {
        sendError('Property not found', null, 404);
    }
    
    $sellerId = $property['user_id'];
    $buyerId = null;
    
    // Check if user is logged in
    try {
        $user = getCurrentUser();
        if ($user) {
            $buyerId = $user['id'];
            // Use logged-in user's info if available
            if (empty($name)) $name = $user['full_name'];
            if (empty($email)) $email = $user['email'];
            if (empty($mobile)) $mobile = $user['phone'];
        }
    } catch (Exception $e) {
        // User not authenticated, that's fine
    }
    
    // Create inquiry
    $stmt = $db->prepare("
        INSERT INTO inquiries (property_id, buyer_id, seller_id, name, email, mobile, message, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'new')
    ");
    $stmt->execute([$propertyId, $buyerId, $sellerId, $name, $email, $mobile, $message]);
    $inquiryId = $db->lastInsertId();
    
    // Get created inquiry
    $stmt = $db->prepare("
        SELECT i.*, p.title as property_title, p.location as property_location
        FROM inquiries i
        INNER JOIN properties p ON i.property_id = p.id
        WHERE i.id = ?
    ");
    $stmt->execute([$inquiryId]);
    $inquiry = $stmt->fetch();
    
    sendSuccess('Inquiry sent successfully', ['inquiry' => $inquiry]);
    
} catch (Exception $e) {
    error_log("Send Inquiry Error: " . $e->getMessage());
    sendError('Failed to send inquiry', null, 500);
}

