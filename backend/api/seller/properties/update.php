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
require_once __DIR__ . '/../../../utils/geocoding.php';

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
    
    // Check if property exists, belongs to user, and get its creation timestamp
    // Each property is tracked independently by its ID and created_at
    $stmt = $db->prepare("SELECT id, created_at FROM properties WHERE id = ? AND user_id = ?");
    $stmt->execute([$propertyId, $user['id']]);
    $property = $stmt->fetch();
    
    if (!$property) {
        sendError('Property not found or access denied', null, 404);
    }
    
    // Check if THIS specific property was created within 24 hours
    // This works correctly for multiple properties because each property has its own created_at
    $createdAt = new DateTime($property['created_at']);
    $now = new DateTime();
    $interval = $now->diff($createdAt);
    
    // Calculate total hours since creation
    $hoursSinceCreation = ($interval->days * 24) + $interval->h + ($interval->i / 60);
    $isOlderThan24Hours = $hoursSinceCreation >= 24;
    
    // Get input data
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);
    
    // Debug logging
    error_log('Update property request - Property ID: ' . $propertyId);
    error_log('Update property request - Raw input length: ' . strlen($rawInput));
    error_log('Update property request - Input keys: ' . (is_array($input) ? implode(', ', array_keys($input)) : 'NOT ARRAY'));
    
    if (isset($input['images'])) {
        error_log('Update property - Images received: ' . (is_array($input['images']) ? count($input['images']) . ' images' : 'NOT ARRAY'));
        if (is_array($input['images'])) {
            error_log('Update property - First image: ' . (isset($input['images'][0]) ? substr($input['images'][0], 0, 100) : 'NONE'));
        }
    } else {
        error_log('Update property - No images field in input');
    }
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log('Update property - JSON decode error: ' . json_last_error_msg());
        sendError('Invalid JSON in request body: ' . json_last_error_msg(), null, 400);
    }
    
    if (!is_array($input)) {
        error_log('Update property - Input is not an array after JSON decode');
        sendError('Invalid request data format', null, 400);
    }
    
    // If property is older than 24 hours, only allow price and title to be updated
    // Location-related fields (location, latitude, longitude, state, additional_address) are also restricted
    if ($isOlderThan24Hours) {
        $allowedFieldsAfter24Hours = ['title', 'price', 'price_negotiable', 'maintenance_charges', 'deposit_amount'];
        $restrictedFields = [];
        
        // Explicitly check for location-related fields
        $locationFields = ['location', 'latitude', 'longitude', 'state', 'additional_address'];
        foreach ($locationFields as $field) {
            if (isset($input[$field])) {
                $restrictedFields[] = $field;
            }
        }
        
        // Check all other fields
        foreach ($input as $field => $value) {
            if (!in_array($field, $allowedFieldsAfter24Hours) && !in_array($field, $locationFields)) {
                $restrictedFields[] = $field;
            }
        }
        
        if (!empty($restrictedFields)) {
            $locationFieldsFound = array_intersect($restrictedFields, $locationFields);
            if (!empty($locationFieldsFound)) {
                sendError('After 24 hours, location-related fields (location, state, additional address) cannot be modified. You can only edit the title and price-related fields (price, price negotiable, maintenance charges, deposit amount).', null, 403);
            } else {
                sendError('After 24 hours, you can only edit the title and price-related fields (price, price negotiable, maintenance charges, deposit amount). Other fields cannot be modified.', null, 403);
            }
        }
    }
    
    // Build update query dynamically
    $updateFields = [];
    $params = [];
    
    $allowedFields = [
        'title', 'status', 'property_type', 'location', 'latitude', 'longitude',
        'state', 'additional_address', 'bedrooms', 'bathrooms', 'balconies', 'area', 'carpet_area', 'floor',
        'total_floors', 'facing', 'age', 'furnishing', 'description', 'price',
        'price_negotiable', 'maintenance_charges', 'deposit_amount',
        'cover_image', 'video_url', 'brochure_url', 'is_active'
    ];
    
    // Check if location is being updated and if coordinates need geocoding
    // Only do this if property is NOT older than 24 hours (location changes are restricted after 24 hours)
    $location = isset($input['location']) ? sanitizeInput($input['location']) : null;
    $latitude = isset($input['latitude']) ? floatval($input['latitude']) : null;
    $longitude = isset($input['longitude']) ? floatval($input['longitude']) : null;
    
    // Auto-geocode location if coordinates are missing and location is being updated
    // Only geocode if property is not older than 24 hours (location changes allowed)
    if (!$isOlderThan24Hours && $location !== null && (empty($latitude) || empty($longitude) || $latitude == 0 || $longitude == 0)) {
        $geocoded = geocodeIfNeeded($location, $latitude, $longitude);
        if ($geocoded['latitude'] && $geocoded['longitude']) {
            $latitude = $geocoded['latitude'];
            $longitude = $geocoded['longitude'];
            // Add latitude and longitude to input so they get updated
            $input['latitude'] = $latitude;
            $input['longitude'] = $longitude;
            error_log("Auto-geocoded location '{$location}' to coordinates: {$latitude}, {$longitude}");
        } else {
            error_log("Failed to geocode location '{$location}'. Property will be updated without coordinates.");
        }
    }
    
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
        if (isset($input['images'])) {
            if (!is_array($input['images'])) {
                error_log('Update property - Images field is not an array: ' . gettype($input['images']));
                sendError('Images must be an array', null, 400);
            }
            
            // Delete existing images
            $stmt = $db->prepare("DELETE FROM property_images WHERE property_id = ?");
            $stmt->execute([$propertyId]);
            
            // Insert new images (only if array is not empty)
            if (count($input['images']) > 0) {
                $stmt = $db->prepare("INSERT INTO property_images (property_id, image_url, image_order, file_name, file_path, moderation_status, checked_at) VALUES (?, ?, ?, ?, ?, 'SAFE', NOW())");
                foreach ($input['images'] as $index => $imageUrl) {
                    if (!empty($imageUrl) && is_string($imageUrl)) {
                        // Extract filename from URL
                        $filename = basename(parse_url($imageUrl, PHP_URL_PATH));
                        $relativePath = str_replace(BASE_URL . '/uploads/', '', $imageUrl);
                        if (strpos($relativePath, 'uploads/') === 0) {
                            $relativePath = substr($relativePath, 8); // Remove 'uploads/' prefix
                        }
                        
                        $stmt->execute([
                            $propertyId, 
                            $imageUrl, 
                            $index,
                            $filename,
                            $relativePath
                        ]);
                    }
                }
                error_log('Update property - Inserted ' . count($input['images']) . ' images');
            } else {
                error_log('Update property - Images array is empty, all images removed');
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

