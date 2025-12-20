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
    
    // Build query
    $query = "
        SELECT p.*,
               COUNT(DISTINCT pi.id) as image_count,
               COUNT(DISTINCT i.id) as inquiry_count,
               GROUP_CONCAT(DISTINCT pi.image_url ORDER BY pi.image_order) as images,
               GROUP_CONCAT(DISTINCT pa.amenity_id) as amenities,
               SUBSTRING_INDEX(GROUP_CONCAT(DISTINCT pi.image_url ORDER BY pi.image_order), ',', 1) as cover_image
        FROM properties p
        LEFT JOIN property_images pi ON p.id = pi.property_id
        LEFT JOIN property_amenities pa ON p.id = pa.property_id
        LEFT JOIN inquiries i ON p.id = i.property_id
        WHERE p.user_id = ?
    ";
    
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
        $property['images'] = $property['images'] ? explode(',', $property['images']) : [];
        
        // Ensure image URLs are full URLs (prepend base URL if relative)
        // Filter out empty values and normalize URLs
        if (!empty($property['images'])) {
            $property['images'] = array_filter(array_map(function($img) {
                // Remove whitespace and check if empty
                $img = trim($img);
                if (empty($img)) {
                    return null;
                }
                
                // If it's already a full URL (http/https), return as is
                if (strpos($img, 'http://') === 0 || strpos($img, 'https://') === 0) {
                    return $img;
                }
                
                // If it starts with /uploads, it's already a relative path from base
                if (strpos($img, '/uploads/') === 0) {
                    return BASE_URL . $img;
                }
                
                // If it starts with uploads/, prepend base URL
                if (strpos($img, 'uploads/') === 0) {
                    return BASE_URL . '/' . $img;
                }
                
                // Otherwise, prepend the upload base URL
                return UPLOAD_BASE_URL . '/' . ltrim($img, '/');
            }, $property['images']), function($img) {
                return $img !== null && $img !== '';
            });
            
            // Re-index array after filtering
            $property['images'] = array_values($property['images']);
        }
        
        // Set cover_image if not set, use first image
        if (empty($property['cover_image']) && !empty($property['images'][0])) {
            $property['cover_image'] = $property['images'][0];
        } elseif (!empty($property['cover_image'])) {
            $coverImg = trim($property['cover_image']);
            // Ensure cover_image is also a full URL
            if (strpos($coverImg, 'http://') === 0 || strpos($coverImg, 'https://') === 0) {
                $property['cover_image'] = $coverImg;
            } elseif (strpos($coverImg, '/uploads/') === 0) {
                $property['cover_image'] = BASE_URL . $coverImg;
            } elseif (strpos($coverImg, 'uploads/') === 0) {
                $property['cover_image'] = BASE_URL . '/' . $coverImg;
            } else {
                $property['cover_image'] = UPLOAD_BASE_URL . '/' . ltrim($coverImg, '/');
            }
        } else {
            $property['cover_image'] = null;
        }
        
        $property['amenities'] = $property['amenities'] ? explode(',', $property['amenities']) : [];
        $property['image_count'] = intval($property['image_count']);
        $property['inquiry_count'] = intval($property['inquiry_count']);
        $property['price_negotiable'] = (bool)$property['price_negotiable'];
        $property['is_active'] = (bool)$property['is_active'];
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
    error_log("List Properties Error: " . $e->getMessage());
    sendError('Failed to retrieve properties', null, 500);
}

