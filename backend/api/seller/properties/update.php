<?php
/**
 * Update Property API
 * PUT /api/seller/properties/update.php?id={property_id}
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/validation.php';
require_once __DIR__ . '/../../../utils/auth.php';
require_once __DIR__ . '/../../../utils/upload.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    sendError('Method not allowed', null, 405);
}

try {
    $user = requireUserType(['seller', 'agent']);
    
    $propertyId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if (!$propertyId) {
        sendError('Property ID is required', null, 400);
    }
    
    $db = getDB();
    
    // Check if property exists and belongs to user
    $stmt = $db->prepare("SELECT id FROM properties WHERE id = ? AND user_id = ?");
    $stmt->execute([$propertyId, $user['id']]);
    if (!$stmt->fetch()) {
        sendError('Property not found or access denied', null, 404);
    }
    
    // Get input data
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Build update query dynamically
    $updateFields = [];
    $params = [];
    
    $allowedFields = [
        'title', 'status', 'property_type', 'location', 'latitude', 'longitude',
        'bedrooms', 'bathrooms', 'balconies', 'area', 'carpet_area', 'floor',
        'total_floors', 'facing', 'age', 'furnishing', 'description', 'price',
        'price_negotiable', 'maintenance_charges', 'deposit_amount',
        'cover_image', 'video_url', 'brochure_url', 'is_active'
    ];
    
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $dbField = str_replace('_', '_', $field); // Keep as is
            $updateFields[] = "$dbField = ?";
            
            if (in_array($field, ['latitude', 'longitude', 'area', 'carpet_area', 'price', 'maintenance_charges', 'deposit_amount'])) {
                $params[] = floatval($input[$field]);
            } elseif (in_array($field, ['total_floors', 'is_active'])) {
                $params[] = intval($input[$field]);
            } elseif ($field === 'price_negotiable') {
                $params[] = (bool)$input[$field] ? 1 : 0;
            } else {
                $params[] = sanitizeInput($input[$field]);
            }
        }
    }
    
    if (empty($updateFields)) {
        sendError('No fields to update', null, 400);
    }
    
    // Start transaction
    $db->beginTransaction();
    
    try {
        // Update property
        $params[] = $propertyId;
        $query = "UPDATE properties SET " . implode(', ', $updateFields) . ", updated_at = NOW() WHERE id = ?";
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        
        // Update images if provided
        if (isset($input['images']) && is_array($input['images'])) {
            // Delete existing images
            $stmt = $db->prepare("DELETE FROM property_images WHERE property_id = ?");
            $stmt->execute([$propertyId]);
            
            // Insert new images
            $stmt = $db->prepare("INSERT INTO property_images (property_id, image_url, image_order) VALUES (?, ?, ?)");
            foreach ($input['images'] as $index => $imageUrl) {
                $stmt->execute([$propertyId, $imageUrl, $index]);
            }
        }
        
        // Update amenities if provided
        if (isset($input['amenities']) && is_array($input['amenities'])) {
            // Delete existing amenities
            $stmt = $db->prepare("DELETE FROM property_amenities WHERE property_id = ?");
            $stmt->execute([$propertyId]);
            
            // Insert new amenities
            $stmt = $db->prepare("INSERT INTO property_amenities (property_id, amenity_id) VALUES (?, ?)");
            foreach ($input['amenities'] as $amenityId) {
                $stmt->execute([$propertyId, sanitizeInput($amenityId)]);
            }
        }
        
        $db->commit();
        
        // Get updated property
        $stmt = $db->prepare("
            SELECT p.*,
                   GROUP_CONCAT(pi.image_url ORDER BY pi.image_order) as images,
                   GROUP_CONCAT(pa.amenity_id) as amenities
            FROM properties p
            LEFT JOIN property_images pi ON p.id = pi.property_id
            LEFT JOIN property_amenities pa ON p.id = pa.property_id
            WHERE p.id = ?
            GROUP BY p.id
        ");
        $stmt->execute([$propertyId]);
        $property = $stmt->fetch();
        
        if ($property) {
            $property['images'] = $property['images'] ? explode(',', $property['images']) : [];
            $property['amenities'] = $property['amenities'] ? explode(',', $property['amenities']) : [];
        }
        
        sendSuccess('Property updated successfully', ['property' => $property]);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Update Property Error: " . $e->getMessage());
    sendError('Failed to update property', null, 500);
}

