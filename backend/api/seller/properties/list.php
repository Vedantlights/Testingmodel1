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
    } else {
        // Simplified query without JOINs
        $query = "
            SELECT p.*,
                   0 as image_count,
                   0 as inquiry_count,
                   p.cover_image as images,
                   '' as amenities,
                   p.cover_image as cover_image
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
        // Handle images
        if ($hasImagesTable && isset($property['images']) && !empty($property['images'])) {
            $imageArray = explode(',', $property['images']);
            // Ensure all image URLs are full URLs (not relative paths)
            $property['images'] = array_map(function($img) {
                $img = trim($img);
                // If already a full URL, return as is
                if (strpos($img, 'http://') === 0 || strpos($img, 'https://') === 0) {
                    // Fix old URLs that have /backend/uploads/ to /uploads/
                    return str_replace('/backend/uploads/', '/uploads/', $img);
                }
                // If relative path, make it full URL using UPLOAD_BASE_URL
                if (defined('UPLOAD_BASE_URL')) {
                    // Remove /uploads/ prefix if present
                    if (strpos($img, '/uploads/') === 0) {
                        return UPLOAD_BASE_URL . substr($img, 9); // Remove '/uploads/' prefix
                    }
                    if (strpos($img, 'uploads/') === 0) {
                        return UPLOAD_BASE_URL . '/' . substr($img, 8); // Remove 'uploads/' prefix
                    }
                    // Assume it's relative to uploads
                    return UPLOAD_BASE_URL . '/' . $img;
                }
                // Fallback to BASE_URL if UPLOAD_BASE_URL not defined
                if (defined('BASE_URL')) {
                    if (strpos($img, '/uploads/') === 0) {
                        // Remove /backend from BASE_URL for uploads
                        $host = $_SERVER['HTTP_HOST'] ?? 'demo1.indiapropertys.com';
                        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
                        return $protocol . '://' . $host . $img;
                    }
                    return BASE_URL . '/uploads/' . $img;
                }
                return $img;
            }, $imageArray);
        } else {
            // Use cover_image as single image
            $property['images'] = !empty($property['cover_image']) ? [$property['cover_image']] : [];
        }
        
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

