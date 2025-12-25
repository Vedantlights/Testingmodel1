<?php
/**
 * Admin Dashboard Statistics API
 * GET /api/admin/dashboard/stats.php
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
    
    // Get date range filter
    $dateRange = $_GET['date_range'] ?? 'all';
    $days = null;
    if ($dateRange !== 'all') {
        // Parse date range (e.g., '7d', '30d', '90d')
        if (preg_match('/(\d+)d/', $dateRange, $matches)) {
            $days = intval($matches[1]);
        } else {
            $days = intval($dateRange);
        }
        // Validate days is positive and reasonable (max 365 days)
        if ($days <= 0 || $days > 365) {
            $days = null;
        }
    }
    
    // Build date filter clause safely
    $dateFilter = '';
    $dateParams = [];
    if ($days !== null) {
        $dateFilter = " AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)";
        $dateParams = [$days];
    }
    
    // Total Properties
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM properties WHERE 1=1" . $dateFilter);
    $stmt->execute($dateParams);
    $totalProperties = $stmt->fetch()['total'];
    
    // Active Properties
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM properties WHERE is_active = 1" . $dateFilter);
    $stmt->execute($dateParams);
    $activeProperties = $stmt->fetch()['total'];
    
    // Pending Properties (if admin_status column exists, otherwise use is_active = 0)
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM properties WHERE is_active = 0" . $dateFilter);
    $stmt->execute($dateParams);
    $pendingProperties = $stmt->fetch()['total'];
    
    // Total Users (date filter only applies to registration date)
    $userDateFilter = $dateFilter; // Same filter for users
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM users WHERE 1=1" . $userDateFilter);
    $stmt->execute($dateParams);
    $totalUsers = $stmt->fetch()['total'];
    
    // Users by type
    $stmt = $db->prepare("SELECT user_type, COUNT(*) as count FROM users WHERE 1=1" . $userDateFilter . " GROUP BY user_type");
    $stmt->execute($dateParams);
    $usersByType = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    // Active Agents
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM users WHERE user_type = 'agent'" . $userDateFilter);
    $stmt->execute($dateParams);
    $totalAgents = $stmt->fetch()['total'];
    
    // Total Inquiries
    $inquiryDateFilter = $dateFilter; // Same filter for inquiries
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM inquiries WHERE 1=1" . $inquiryDateFilter);
    $stmt->execute($dateParams);
    $totalInquiries = $stmt->fetch()['total'];
    
    // New Inquiries (last 7 days) - always relative to now, not date filter
    $stmt = $db->query("SELECT COUNT(*) as total FROM inquiries WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
    $newInquiries = $stmt->fetch()['total'];
    
    // Total Subscriptions
    $subscriptionDateFilter = $dateFilter; // Same filter for subscriptions
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM subscriptions WHERE 1=1" . $subscriptionDateFilter);
    $stmt->execute($dateParams);
    $totalSubscriptions = $stmt->fetch()['total'];
    
    // Active Subscriptions
    $stmt = $db->query("SELECT COUNT(*) as total FROM subscriptions WHERE is_active = 1 AND (end_date IS NULL OR end_date > NOW())");
    $activeSubscriptions = $stmt->fetch()['total'];
    
    // Expired Subscriptions
    $stmt = $db->query("SELECT COUNT(*) as total FROM subscriptions WHERE is_active = 0 OR (end_date IS NOT NULL AND end_date <= NOW())");
    $expiredSubscriptions = $stmt->fetch()['total'];
    
    // Properties by type
    $stmt = $db->query("SELECT property_type, COUNT(*) as count FROM properties WHERE is_active = 1 GROUP BY property_type");
    $propertiesByType = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    // Properties by status (sale/rent)
    $stmt = $db->query("SELECT status, COUNT(*) as count FROM properties WHERE is_active = 1 GROUP BY status");
    $propertiesByStatus = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    // Recent properties (last 5)
    $stmt = $db->query("
        SELECT p.*, u.full_name as seller_name 
        FROM properties p 
        LEFT JOIN users u ON p.user_id = u.id 
        ORDER BY p.created_at DESC 
        LIMIT 5
    ");
    $recentProperties = $stmt->fetchAll();
    
    // Recent inquiries (last 5)
    $stmt = $db->query("
        SELECT i.*, p.title as property_title, u.full_name as buyer_name 
        FROM inquiries i 
        LEFT JOIN properties p ON i.property_id = p.id 
        LEFT JOIN users u ON i.buyer_id = u.id 
        ORDER BY i.created_at DESC 
        LIMIT 5
    ");
    $recentInquiries = $stmt->fetchAll();
    
    // Calculate property type percentages
    $totalActiveProps = array_sum($propertiesByType);
    $propertyTypesDistribution = [];
    if ($totalActiveProps > 0) {
        foreach ($propertiesByType as $type => $count) {
            $propertyTypesDistribution[] = [
                'name' => $type,
                'count' => intval($count),
                'percentage' => round(($count / $totalActiveProps) * 100, 1)
            ];
        }
    }
    
    $stats = [
        'total_properties' => intval($totalProperties),
        'active_properties' => intval($activeProperties),
        'pending_properties' => intval($pendingProperties),
        'total_users' => intval($totalUsers),
        'users_by_type' => [
            'buyer' => intval($usersByType['buyer'] ?? 0),
            'seller' => intval($usersByType['seller'] ?? 0),
            'agent' => intval($usersByType['agent'] ?? 0)
        ],
        'total_agents' => intval($totalAgents),
        'total_inquiries' => intval($totalInquiries),
        'new_inquiries' => intval($newInquiries),
        'total_subscriptions' => intval($totalSubscriptions),
        'active_subscriptions' => intval($activeSubscriptions),
        'expired_subscriptions' => intval($expiredSubscriptions),
        'properties_by_type' => $propertiesByType,
        'properties_by_status' => [
            'sale' => intval($propertiesByStatus['sale'] ?? 0),
            'rent' => intval($propertiesByStatus['rent'] ?? 0)
        ],
        'property_types_distribution' => $propertyTypesDistribution,
        'recent_properties' => $recentProperties,
        'recent_inquiries' => $recentInquiries
    ];
    
    sendSuccess('Stats retrieved successfully', $stats);
    
} catch (Exception $e) {
    error_log("Admin Dashboard Stats Error: " . $e->getMessage());
    sendError('Failed to retrieve stats', null, 500);
}
