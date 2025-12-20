<?php
/**
 * Get Property Details API
 * GET /api/buyer/properties/details.php?id={property_id}
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
    $propertyId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if (!$propertyId) {
        sendError('Property ID is required', null, 400);
    }
    
    $db = getDB();
    
    // Get property details
    // Use user_full_name from properties for optimization (denormalized), but still join users for other data
    $stmt = $db->prepare("
        SELECT p.*,
               u.id as seller_id,
               u.user_type as seller_user_type,
               COALESCE(p.user_full_name, u.full_name) as seller_name,
               u.email as seller_email,
               u.phone as seller_phone,
               up.profile_image as seller_profile_image,
               GROUP_CONCAT(DISTINCT pi.image_url ORDER BY pi.image_order) as images,
               GROUP_CONCAT(DISTINCT pa.amenity_id) as amenities
        FROM properties p
        INNER JOIN users u ON p.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN property_images pi ON p.id = pi.property_id
        LEFT JOIN property_amenities pa ON p.id = pa.property_id
        WHERE p.id = ? AND p.is_active = 1
        GROUP BY p.id
    ");
    $stmt->execute([$propertyId]);
    $property = $stmt->fetch();
    
    if (!$property) {
        sendError('Property not found', null, 404);
    }
    
    // Increment views count
    $stmt = $db->prepare("UPDATE properties SET views_count = views_count + 1 WHERE id = ?");
    $stmt->execute([$propertyId]);
    
    // Check if user has favorited this property
    $isFavorite = false;
    try {
        $user = getCurrentUser();
        if ($user) {
            $stmt = $db->prepare("SELECT id FROM favorites WHERE user_id = ? AND property_id = ?");
            $stmt->execute([$user['id'], $propertyId]);
            $isFavorite = (bool)$stmt->fetch();
        }
    } catch (Exception $e) {
        // User not authenticated, that's fine
    }
    
    // Format response
    $property['images'] = $property['images'] ? explode(',', $property['images']) : [];
    $property['amenities'] = $property['amenities'] ? explode(',', $property['amenities']) : [];
    $property['is_favorite'] = $isFavorite;
    $property['price_negotiable'] = (bool)$property['price_negotiable'];
    $property['views_count'] = intval($property['views_count']);
    
    // Seller info
    $property['seller'] = [
        'id' => $property['seller_id'],
        'name' => $property['seller_name'],
        'email' => $property['seller_email'],
        'phone' => $property['seller_phone'],
        'profile_image' => $property['seller_profile_image'],
        'user_type' => $property['seller_user_type']
    ];
    
    // Add user_type directly to property for easy access
    $property['user_type'] = $property['seller_user_type'];
    
    // Remove individual seller fields
    unset($property['seller_id'], $property['seller_name'], $property['seller_email'], 
          $property['seller_phone'], $property['seller_profile_image'], $property['seller_user_type']);
    
    sendSuccess('Property details retrieved successfully', ['property' => $property]);
    
} catch (Exception $e) {
    error_log("Property Details Error: " . $e->getMessage());
    sendError('Failed to retrieve property details', null, 500);
}

