<?php
/**
 * Admin Properties List API
 * GET /api/admin/properties/list.php
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/admin_auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', null, 405);
}

try {
    $admin = requireAdmin();
    $db = getDB();
    
    // Pagination
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(100, max(1, intval($_GET['limit']))) : 20;
    $offset = ($page - 1) * $limit;
    
    // Filters
    $status = isset($_GET['status']) ? $_GET['status'] : null; // approved, pending, rejected, all
    $propertyType = isset($_GET['property_type']) ? $_GET['property_type'] : null;
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    
    // Build query
    $where = [];
    $params = [];
    
    if ($status && $status !== 'all') {
        // Check if admin_status column exists
        $where[] = "p.is_active = ?";
        if ($status === 'approved') {
            $params[] = 1;
        } elseif ($status === 'pending') {
            $params[] = 0;
        }
    }
    
    if ($propertyType) {
        $where[] = "p.property_type = ?";
        $params[] = $propertyType;
    }
    
    if ($search) {
        $where[] = "(p.title LIKE ? OR p.location LIKE ? OR p.description LIKE ?)";
        $searchTerm = "%{$search}%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";
    
    // Get properties
    $query = "
        SELECT 
            p.*,
            u.full_name as seller_name,
            u.email as seller_email,
            u.phone as seller_phone,
            (SELECT COUNT(*) FROM inquiries WHERE property_id = p.id) as inquiry_count,
            (SELECT image_url FROM property_images WHERE property_id = p.id ORDER BY image_order LIMIT 1) as cover_image
        FROM properties p
        LEFT JOIN users u ON p.user_id = u.id
        {$whereClause}
        ORDER BY p.created_at DESC
        LIMIT " . intval($limit) . " OFFSET " . intval($offset) . "
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $properties = $stmt->fetchAll();
    
    // Get total count
    $countQuery = "SELECT COUNT(*) as total FROM properties p {$whereClause}";
    $countStmt = $db->prepare($countQuery);
    $countParams = array_slice($params, 0, -2);
    $countStmt->execute($countParams);
    $total = $countStmt->fetch()['total'];
    
    // Format properties
    foreach ($properties as &$property) {
        $property['id'] = intval($property['id']);
        $property['price'] = floatval($property['price']);
        $property['area'] = floatval($property['area']);
        $property['is_active'] = (bool)$property['is_active'];
        $property['inquiry_count'] = intval($property['inquiry_count']);
        $property['views_count'] = intval($property['views_count']);
    }
    
    sendSuccess('Properties retrieved successfully', [
        'properties' => $properties,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => intval($total),
            'pages' => ceil($total / $limit)
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Admin Properties List Error: " . $e->getMessage());
    sendError('Failed to retrieve properties', null, 500);
}
