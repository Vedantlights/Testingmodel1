<?php
/**
 * Add Property API (Seller/Agent)
 * POST /api/seller/properties/add.php
 */

// Start output buffering to catch any unexpected output
ob_start();

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/validation.php';
require_once __DIR__ . '/../../../utils/auth.php';
require_once __DIR__ . '/../../../utils/upload.php';
require_once __DIR__ . '/../../../utils/geocoding.php';

// Clear any output that might have been generated during require
ob_clean();

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $user = requireUserType(['seller', 'agent']);
    
    // Check property limit based on subscription
    $db = getDB();
    $planType = 'free'; // Default
    try {
        // Check if subscriptions table exists
        $checkStmt = $db->query("SHOW TABLES LIKE 'subscriptions'");
        if ($checkStmt->rowCount() > 0) {
            $stmt = $db->prepare("SELECT plan_type FROM subscriptions WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1");
            $stmt->execute([$user['id']]);
            $subscription = $stmt->fetch();
            $planType = $subscription['plan_type'] ?? 'free';
        }
    } catch (Exception $e) {
        // Table doesn't exist or error, use default
        error_log("Add Property: Subscriptions table check failed: " . $e->getMessage());
        $planType = 'free';
    }
    
    // Get current property count
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM properties WHERE user_id = ?");
    $stmt->execute([$user['id']]);
    $countResult = $stmt->fetch();
    $currentCount = $countResult['count'];
    
    // Check limit
    $limits = [
        'free' => FREE_PLAN_PROPERTY_LIMIT,
        'basic' => BASIC_PLAN_PROPERTY_LIMIT,
        'pro' => PRO_PLAN_PROPERTY_LIMIT,
        'premium' => PREMIUM_PLAN_PROPERTY_LIMIT
    ];
    
    $limit = $limits[$planType] ?? FREE_PLAN_PROPERTY_LIMIT;
    if ($limit > 0 && $currentCount >= $limit) {
        sendError("Property limit reached. You can list up to $limit properties in your current plan.", null, 403);
    }
    
    // Get input data
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields (bedrooms/bathrooms are conditional based on property type)
    $requiredFields = ['title', 'property_type', 'location', 'area', 'price', 'description'];
    
    // Check if property type requires bedrooms/bathrooms
    $propertyType = sanitizeInput($input['property_type'] ?? '');
    
    // Studio Apartment doesn't need bedrooms (it's 0 bedrooms by definition)
    $needsBedrooms = in_array($propertyType, ['Apartment', 'Flat', 'Villa', 'Independent House', 'Row House', 'Penthouse', 'Farm House', 'PG / Hostel']);
    $needsBathrooms = in_array($propertyType, ['Apartment', 'Flat', 'Villa', 'Independent House', 'Row House', 'Penthouse', 'Studio Apartment', 'Farm House', 'PG / Hostel', 'Commercial Office', 'Commercial Shop']);
    
    if ($needsBedrooms) {
        $requiredFields[] = 'bedrooms';
    }
    if ($needsBathrooms) {
        $requiredFields[] = 'bathrooms';
    }
    
    $errors = validateRequired($input, $requiredFields);
    
    if (!empty($errors)) {
        sendValidationError($errors);
    }
    
    // Extract and validate data
    $title = sanitizeInput($input['title']);
    $status = in_array($input['status'] ?? 'sale', ['sale', 'rent']) ? $input['status'] : 'sale';
    $propertyType = sanitizeInput($input['property_type']);
    $location = sanitizeInput($input['location']);
    
    // Handle latitude/longitude - convert empty strings to null
    $latitude = null;
    $longitude = null;
    if (isset($input['latitude']) && $input['latitude'] !== '' && $input['latitude'] !== null) {
        $latitude = floatval($input['latitude']);
        // Validate latitude range
        if ($latitude < -90 || $latitude > 90) {
            $latitude = null;
        }
    }
    if (isset($input['longitude']) && $input['longitude'] !== '' && $input['longitude'] !== null) {
        $longitude = floatval($input['longitude']);
        // Validate longitude range
        if ($longitude < -180 || $longitude > 180) {
            $longitude = null;
        }
    }
    
    // Auto-geocode location if coordinates are missing or invalid
    if (($latitude === null || $longitude === null || $latitude == 0 || $longitude == 0) && !empty($location)) {
        $geocoded = geocodeIfNeeded($location, $latitude, $longitude);
        if ($geocoded['latitude'] && $geocoded['longitude']) {
            $latitude = $geocoded['latitude'];
            $longitude = $geocoded['longitude'];
            error_log("Auto-geocoded location '{$location}' to coordinates: {$latitude}, {$longitude}");
        } else {
            error_log("Failed to geocode location '{$location}'. Property will be saved without coordinates.");
        }
    }
    // Studio Apartment should have bedrooms as "0" or null
    $bedrooms = isset($input['bedrooms']) && !empty($input['bedrooms']) && $input['bedrooms'] !== '0' 
      ? sanitizeInput($input['bedrooms']) 
      : ($propertyType === 'Studio Apartment' ? '0' : null);
    $bathrooms = isset($input['bathrooms']) && !empty($input['bathrooms']) ? sanitizeInput($input['bathrooms']) : null;
    $balconies = isset($input['balconies']) && !empty($input['balconies']) ? sanitizeInput($input['balconies']) : null;
    $area = floatval($input['area']);
    $carpetArea = isset($input['carpet_area']) && !empty($input['carpet_area']) ? floatval($input['carpet_area']) : null;
    $floor = isset($input['floor']) && !empty($input['floor']) ? sanitizeInput($input['floor']) : null;
    $totalFloors = isset($input['total_floors']) && !empty($input['total_floors']) ? intval($input['total_floors']) : null;
    $facing = isset($input['facing']) && !empty($input['facing']) ? sanitizeInput($input['facing']) : null;
    $age = isset($input['age']) && !empty($input['age']) ? sanitizeInput($input['age']) : null;
    $furnishing = isset($input['furnishing']) && !empty($input['furnishing']) ? sanitizeInput($input['furnishing']) : null;
    $state = isset($input['state']) && !empty($input['state']) ? sanitizeInput($input['state']) : null;
    $additionalAddress = isset($input['additional_address']) && !empty($input['additional_address']) ? sanitizeInput($input['additional_address']) : null;
    $description = sanitizeInput($input['description']);
    $price = floatval($input['price']);
    $priceNegotiable = isset($input['price_negotiable']) ? (bool)$input['price_negotiable'] : false;
    $maintenanceCharges = isset($input['maintenance_charges']) ? floatval($input['maintenance_charges']) : null;
    $depositAmount = isset($input['deposit_amount']) ? floatval($input['deposit_amount']) : null;
    $amenities = $input['amenities'] ?? [];
    $images = $input['images'] ?? []; // Array of base64 or URLs
    $videoUrl = $input['video_url'] ?? null;
    $brochureUrl = $input['brochure_url'] ?? null;
    
    // Validate images
    if (empty($images) || !is_array($images)) {
        sendError('At least one image is required', null, 400);
    }
    
    // Start transaction
    $transactionStarted = false;
    try {
        $db->beginTransaction();
        $transactionStarted = true;
    } catch (PDOException $e) {
        error_log("Add Property: Failed to start transaction: " . $e->getMessage());
        sendError('Failed to start database transaction: ' . $e->getMessage(), null, 500);
        return;
    }
    
    try {
        // Get user's full_name for denormalized storage
        $stmt = $db->prepare("SELECT full_name FROM users WHERE id = ?");
        $stmt->execute([$user['id']]);
        $userData = $stmt->fetch();
        $userFullName = $userData['full_name'] ?? $user['full_name'] ?? '';
        
        // Insert property (is_active defaults to 1, but explicitly set it)
        $stmt = $db->prepare("
            INSERT INTO properties (
                user_id, user_full_name, title, status, property_type, location, latitude, longitude,
                state, additional_address, bedrooms, bathrooms, balconies, area, carpet_area, floor, total_floors,
                facing, age, furnishing, description, price, price_negotiable,
                maintenance_charges, deposit_amount, cover_image, video_url, brochure_url, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $coverImage = !empty($images[0]) ? $images[0] : null;
        
        $stmt->execute([
            $user['id'], $userFullName, $title, $status, $propertyType, $location, $latitude, $longitude,
            $state, $additionalAddress, $bedrooms, $bathrooms, $balconies, $area, $carpetArea, $floor, $totalFloors,
            $facing, $age, $furnishing, $description, $price, $priceNegotiable,
            $maintenanceCharges, $depositAmount, $coverImage, $videoUrl, $brochureUrl, 1
        ]);
        
        $propertyId = $db->lastInsertId();
        
        // Insert images (only if table exists)
        if (!empty($images)) {
            try {
                // Check if property_images table exists
                $checkStmt = $db->query("SHOW TABLES LIKE 'property_images'");
                if ($checkStmt->rowCount() > 0) {
                    $stmt = $db->prepare("INSERT INTO property_images (property_id, image_url, image_order) VALUES (?, ?, ?)");
                    foreach ($images as $index => $imageUrl) {
                        $stmt->execute([$propertyId, $imageUrl, $index]);
                    }
                }
            } catch (Exception $e) {
                error_log("Add Property: Failed to insert images: " . $e->getMessage());
                // Continue - property is already saved
            }
            
            // Update cover image if not set (always do this)
            if (!$coverImage && !empty($images[0])) {
                $stmt = $db->prepare("UPDATE properties SET cover_image = ? WHERE id = ?");
                $stmt->execute([$images[0], $propertyId]);
                $coverImage = $images[0];
            }
        }
        
        // Insert amenities (only if table exists)
        if (!empty($amenities) && is_array($amenities)) {
            try {
                // Check if property_amenities table exists
                $checkStmt = $db->query("SHOW TABLES LIKE 'property_amenities'");
                if ($checkStmt->rowCount() > 0) {
                    $stmt = $db->prepare("INSERT INTO property_amenities (property_id, amenity_id) VALUES (?, ?)");
                    foreach ($amenities as $amenityId) {
                        $stmt->execute([$propertyId, sanitizeInput($amenityId)]);
                    }
                }
            } catch (Exception $e) {
                error_log("Add Property: Failed to insert amenities: " . $e->getMessage());
                // Continue - property is already saved
            }
        }
        
        $db->commit();
        $transactionStarted = false;
        
        // Get created property (handle missing tables gracefully)
        try {
            // Check which tables exist
            $checkImages = $db->query("SHOW TABLES LIKE 'property_images'");
            $hasImagesTable = $checkImages->rowCount() > 0;
            
            $checkAmenities = $db->query("SHOW TABLES LIKE 'property_amenities'");
            $hasAmenitiesTable = $checkAmenities->rowCount() > 0;
            
            if ($hasImagesTable && $hasAmenitiesTable) {
                // Full query with JOINs
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
            } else {
                // Simple query without JOINs
                $stmt = $db->prepare("SELECT * FROM properties WHERE id = ?");
            }
            
            $stmt->execute([$propertyId]);
            $property = $stmt->fetch();
            
            // Format response
            if ($property) {
                if ($hasImagesTable && isset($property['images']) && !empty($property['images'])) {
                    $property['images'] = explode(',', $property['images']);
                } else {
                    // Use cover_image or first image from input
                    $property['images'] = !empty($coverImage) ? [$coverImage] : (!empty($images[0]) ? [$images[0]] : []);
                }
                
                if ($hasAmenitiesTable && isset($property['amenities']) && !empty($property['amenities'])) {
                    $property['amenities'] = explode(',', $property['amenities']);
                } else {
                    $property['amenities'] = is_array($amenities) ? $amenities : [];
                }
            } else {
                // Property not found after insert - this shouldn't happen, but handle it
                error_log("Add Property: Property not found after insert. ID: $propertyId");
                // Get basic property info
                $stmt = $db->prepare("SELECT * FROM properties WHERE id = ?");
                $stmt->execute([$propertyId]);
                $property = $stmt->fetch();
                if ($property) {
                    $property['images'] = !empty($coverImage) ? [$coverImage] : (!empty($images[0]) ? [$images[0]] : []);
                    $property['amenities'] = is_array($amenities) ? $amenities : [];
                } else {
                    // Still not found - return minimal data
                    $property = [
                        'id' => $propertyId,
                        'title' => $title,
                        'status' => $status,
                        'images' => !empty($coverImage) ? [$coverImage] : (!empty($images[0]) ? [$images[0]] : []),
                        'amenities' => is_array($amenities) ? $amenities : []
                    ];
                }
            }
        } catch (Exception $e) {
            error_log("Add Property: Failed to fetch property: " . $e->getMessage());
            // Fallback: Get basic property info
            try {
                $stmt = $db->prepare("SELECT * FROM properties WHERE id = ?");
                $stmt->execute([$propertyId]);
                $property = $stmt->fetch();
                if ($property) {
                    $property['images'] = !empty($coverImage) ? [$coverImage] : (!empty($images[0]) ? [$images[0]] : []);
                    $property['amenities'] = is_array($amenities) ? $amenities : [];
                } else {
                    // Return minimal data
                    $property = [
                        'id' => $propertyId,
                        'title' => $title,
                        'status' => $status,
                        'images' => !empty($coverImage) ? [$coverImage] : (!empty($images[0]) ? [$images[0]] : []),
                        'amenities' => is_array($amenities) ? $amenities : []
                    ];
                }
            } catch (Exception $e2) {
                error_log("Add Property: Fallback fetch also failed: " . $e2->getMessage());
                // Return minimal data
                $property = [
                    'id' => $propertyId,
                    'title' => $title,
                    'status' => $status,
                    'images' => !empty($coverImage) ? [$coverImage] : (!empty($images[0]) ? [$images[0]] : []),
                    'amenities' => is_array($amenities) ? $amenities : []
                ];
            }
        }
        
        // Clear any output buffer before sending response
        ob_clean();
        sendSuccess('Property added successfully', ['property' => $property]);
        
    } catch (PDOException $e) {
        if ($transactionStarted) {
            try {
                $db->rollBack();
            } catch (Exception $rollbackError) {
                error_log("Add Property: Failed to rollback transaction: " . $rollbackError->getMessage());
            }
        }
        error_log("Add Property PDO Error: " . $e->getMessage());
        error_log("Add Property Error Code: " . $e->getCode());
        error_log("Add Property SQL State: " . ($e->errorInfo[0] ?? 'N/A'));
        error_log("Add Property Error Info: " . print_r($e->errorInfo ?? [], true));
        ob_clean();
        // Don't expose database error details in production
        if (defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
            sendError('Database error during property creation. Please try again later.', null, 500);
        } else {
            sendError('Database error: ' . $e->getMessage(), ['error_code' => $e->getCode(), 'error_info' => $e->errorInfo ?? []], 500);
        }
    } catch (Exception $e) {
        if ($transactionStarted) {
            try {
                $db->rollBack();
            } catch (Exception $rollbackError) {
                error_log("Add Property: Failed to rollback transaction: " . $rollbackError->getMessage());
            }
        }
        error_log("Add Property Error: " . $e->getMessage());
        error_log("Add Property Stack Trace: " . $e->getTraceAsString());
        ob_clean();
        // Don't expose internal error details in production
        if (defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
            sendError('Failed to add property. Please try again later.', null, 500);
        } else {
            sendError('Failed to add property: ' . $e->getMessage(), null, 500);
        }
    }
    
} catch (PDOException $e) {
    error_log("Add Property PDO Error (outer): " . $e->getMessage());
    error_log("Add Property Error Code: " . $e->getCode());
    error_log("Add Property SQL State: " . ($e->errorInfo[0] ?? 'N/A'));
    ob_clean();
    // Don't expose database error details in production
    if (defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
        sendError('Database error during property creation. Please try again later.', null, 500);
    } else {
        sendError('Database error during property creation: ' . $e->getMessage(), ['error_code' => $e->getCode()], 500);
    }
} catch (Exception $e) {
    error_log("Add Property Error (outer): " . $e->getMessage());
    error_log("Add Property Stack Trace: " . $e->getTraceAsString());
    ob_clean();
    // Don't expose internal error details in production
    if (defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
        sendError('Failed to add property. Please try again later.', null, 500);
    } else {
        sendError('Failed to add property: ' . $e->getMessage(), null, 500);
    }
}

