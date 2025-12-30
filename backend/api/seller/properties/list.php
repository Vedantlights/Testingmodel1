<?php
/**
 * List Seller Properties API
 * GET /api/seller/properties/list.php
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/auth.php';
require_once __DIR__ . '/../../../utils/validation.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', null, 405);
}

try {
    $user = requireUserType(['seller', 'agent']);
    
    $db = getDB();
    
    // Get query parameters
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(MAX_PAGE_SIZE, max(1, intval($_GET['limit']))) : DEFAULT_PAGE_SIZE;
    $offset = ($page - 1) * $limit;
    $status = isset($_GET['status']) ? sanitizeInput($_GET['status']) : null;
    
    // Check which tables exist
    $checkImages = $db->query("SHOW TABLES LIKE 'property_images'");
    $hasImagesTable = $checkImages->rowCount() > 0;
    
    $checkAmenities = $db->query("SHOW TABLES LIKE 'property_amenities'");
    $hasAmenitiesTable = $checkAmenities->rowCount() > 0;
    
    $checkInquiries = $db->query("SHOW TABLES LIKE 'inquiries'");
    $hasInquiriesTable = $checkInquiries->rowCount() > 0;
    
    // Build query based on available tables
    if ($hasImagesTable && $hasAmenitiesTable && $hasInquiriesTable) {
        $query = "
            SELECT 
                p.*,
                COUNT(DISTINCT pi.id) as image_count,
                COUNT(DISTINCT i.id) as inquiry_count,
                (SELECT image_url FROM property_images WHERE property_id = p.id ORDER BY image_order ASC LIMIT 1) as first_image,
                (SELECT GROUP_CONCAT(image_url ORDER BY image_order) FROM property_images WHERE property_id = p.id) as all_images,
                GROUP_CONCAT(DISTINCT pa.amenity_id) as amenities
            FROM properties p
            LEFT JOIN property_images pi ON p.id = pi.property_id
            LEFT JOIN property_amenities pa ON p.id = pa.property_id
            LEFT JOIN inquiries i ON p.id = i.property_id
            WHERE p.user_id = ?
            GROUP BY p.id
        ";
    } else {
        // Simplified query without JOINs
        $query = "
            SELECT p.*,
                   0 as image_count,
                   0 as inquiry_count,
                   p.cover_image as first_image,
                   p.cover_image as all_images,
                   '' as amenities
            FROM properties p
            WHERE p.user_id = ?
        ";
    }
    
    $params = [$user['id']];
    
    if ($status && in_array($status, ['sale', 'rent'])) {
        $query .= " AND p.status = ?";
        $params[] = $status;
    }
    
    $query .= " GROUP BY p.id ORDER BY p.created_at DESC LIMIT " . intval($limit) . " OFFSET " . intval($offset);
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $properties = $stmt->fetchAll();
    
    // Get total count
    $countQuery = "SELECT COUNT(*) as total FROM properties WHERE user_id = ?";
    $countParams = [$user['id']];
    
    if ($status) {
        $countQuery .= " AND status = ?";
        $countParams[] = $status;
    }
    
    $stmt = $db->prepare($countQuery);
    $stmt->execute($countParams);
    $total = $stmt->fetch()['total'];
    
    // Format properties
    foreach ($properties as &$property) {
        // Handle images - prioritize first_image from property_images, fallback to cover_image
        $displayImage = null;
        $allImages = [];
        
        if ($hasImagesTable) {
            // Use first_image from property_images table (first image by image_order)
            if (!empty($property['first_image'])) {
                $displayImage = $property['first_image'];
            }
            
            // Get all images from property_images table
            if (!empty($property['all_images'])) {
                $allImages = explode(',', $property['all_images']);
            }
        }
        
        // Fallback to cover_image if no images from property_images table
        if (empty($displayImage) && !empty($property['cover_image'])) {
            $displayImage = $property['cover_image'];
            if (empty($allImages)) {
                $allImages = [$property['cover_image']];
            }
        }
        
        // Normalize image URLs - ensure all are full URLs
        $normalizeImageUrl = function($img) {
            if (empty($img)) return null;
            $img = trim($img);
            
            // If already a full URL, return as is (but fix old /backend/uploads/ paths)
            if (strpos($img, 'http://') === 0 || strpos($img, 'https://') === 0) {
                return str_replace('/backend/uploads/', '/uploads/', $img);
            }
            
            // If relative path, make it full URL using UPLOAD_BASE_URL
            if (defined('UPLOAD_BASE_URL')) {
                if (strpos($img, '/uploads/') === 0) {
                    return UPLOAD_BASE_URL . substr($img, 9); // Remove '/uploads/' prefix
                }
                if (strpos($img, 'uploads/') === 0) {
                    return UPLOAD_BASE_URL . '/' . substr($img, 8); // Remove 'uploads/' prefix
                }
                return UPLOAD_BASE_URL . '/' . $img;
            }
            
            // Fallback
            $host = $_SERVER['HTTP_HOST'] ?? 'demo1.indiapropertys.com';
            $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
            if (strpos($img, '/uploads/') === 0) {
                return $protocol . '://' . $host . $img;
            }
            return $protocol . '://' . $host . '/uploads/' . $img;
        };
        
        // Normalize all images
        $allImages = array_filter(array_map($normalizeImageUrl, $allImages), function($img) {
            return $img !== null && $img !== '';
        });
        $allImages = array_values($allImages);
        
        // Set display_image (for property cards) - prioritize first_image, then first of all_images, then cover_image
        $property['display_image'] = $displayImage ? $normalizeImageUrl($displayImage) : (!empty($allImages[0]) ? $allImages[0] : null);
        
        // Set images array
        $property['images'] = $allImages;
        
        // Set cover_image (normalized)
        if (!empty($property['cover_image'])) {
            $property['cover_image'] = $normalizeImageUrl($property['cover_image']);
        } else {
            $property['cover_image'] = !empty($allImages[0]) ? $allImages[0] : null;
        }
        
        // Handle amenities
        if ($hasAmenitiesTable && isset($property['amenities']) && !empty($property['amenities'])) {
            $property['amenities'] = explode(',', $property['amenities']);
        } else {
            $property['amenities'] = [];
        }
        
        $property['image_count'] = intval($property['image_count'] ?? 0);
        $property['inquiry_count'] = intval($property['inquiry_count'] ?? 0);
        $property['price_negotiable'] = (bool)($property['price_negotiable'] ?? false);
        $property['is_active'] = (bool)($property['is_active'] ?? true);
    }
    
    sendSuccess('Properties retrieved successfully', [
        'properties' => $properties,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => intval($total),
            'total_pages' => ceil($total / $limit)
        ]
    ]);
    
} catch (Exception $e) {
    $errorDetails = [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ];
    error_log("List Properties Error: " . json_encode($errorDetails));
    
    // In production, don't expose internal error details
    if (defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
        sendError('Failed to retrieve properties. Please try again later.', null, 500);
    } else {
        // Don't expose internal error details in production
        if (defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
            sendError('Failed to retrieve properties. Please try again later.', null, 500);
        } else {
            sendError('Failed to retrieve properties: ' . $e->getMessage(), null, 500);
        }
    }
}

