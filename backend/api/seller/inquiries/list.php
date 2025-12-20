<?php
/**
 * List Seller Inquiries API
 * GET /api/seller/inquiries/list.php
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
    
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(MAX_PAGE_SIZE, max(1, intval($_GET['limit']))) : DEFAULT_PAGE_SIZE;
    $offset = ($page - 1) * $limit;
    $status = isset($_GET['status']) ? sanitizeInput($_GET['status']) : null;
    $propertyId = isset($_GET['property_id']) ? intval($_GET['property_id']) : null;
    
    // Build query
    $query = "
        SELECT i.*,
               p.id as property_id,
               p.title as property_title,
               p.location as property_location,
               p.price as property_price,
               p.cover_image as property_image,
               u.full_name as buyer_name,
               u.email as buyer_email,
               u.phone as buyer_phone,
               up.profile_image as buyer_profile_image
        FROM inquiries i
        INNER JOIN properties p ON i.property_id = p.id
        LEFT JOIN users u ON i.buyer_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE i.seller_id = ?
    ";
    
    $params = [$user['id']];
    
    if ($status && in_array($status, ['new', 'contacted', 'viewed', 'interested', 'not_interested', 'closed'])) {
        $query .= " AND i.status = ?";
        $params[] = $status;
    }
    
    if ($propertyId) {
        $query .= " AND i.property_id = ?";
        $params[] = $propertyId;
    }
    
    $query .= " ORDER BY i.created_at DESC LIMIT " . intval($limit) . " OFFSET " . intval($offset);
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $inquiries = $stmt->fetchAll();
    
    // Get total count
    $countQuery = "SELECT COUNT(*) as total FROM inquiries WHERE seller_id = ?";
    $countParams = [$user['id']];
    
    if ($status) {
        $countQuery .= " AND status = ?";
        $countParams[] = $status;
    }
    if ($propertyId) {
        $countQuery .= " AND property_id = ?";
        $countParams[] = $propertyId;
    }
    
    $stmt = $db->prepare($countQuery);
    $stmt->execute($countParams);
    $total = $stmt->fetch()['total'];
    
    // Format inquiries
    foreach ($inquiries as &$inquiry) {
        $inquiry['property'] = [
            'id' => $inquiry['property_id'],
            'title' => $inquiry['property_title'],
            'location' => $inquiry['property_location'],
            'price' => $inquiry['property_price'],
            'cover_image' => $inquiry['property_image']
        ];
        
        if ($inquiry['buyer_id']) {
            $inquiry['buyer'] = [
                'id' => $inquiry['buyer_id'],
                'name' => $inquiry['buyer_name'],
                'email' => $inquiry['buyer_email'],
                'phone' => $inquiry['buyer_phone'],
                'profile_image' => $inquiry['buyer_profile_image']
            ];
        } else {
            $inquiry['buyer'] = null;
        }
        
        // Remove individual fields
        unset($inquiry['property_id'], $inquiry['property_title'], $inquiry['property_location'],
              $inquiry['property_price'], $inquiry['property_image'], $inquiry['buyer_name'],
              $inquiry['buyer_email'], $inquiry['buyer_phone'], $inquiry['buyer_profile_image']);
    }
    
    sendSuccess('Inquiries retrieved successfully', [
        'inquiries' => $inquiries,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => intval($total),
            'total_pages' => ceil($total / $limit)
        ]
    ]);
    
} catch (Exception $e) {
    error_log("List Inquiries Error: " . $e->getMessage());
    sendError('Failed to retrieve inquiries', null, 500);
}

