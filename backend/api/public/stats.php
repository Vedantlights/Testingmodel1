<?php
/**
 * Public Statistics API
 * GET /api/public/stats.php
 * Returns public statistics for About Us page (no authentication required)
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', null, 405);
}

try {
    $db = getDB();
    if (!$db) {
        sendError('Database connection failed', null, 500);
    }
    
    // Total Active Properties (only show active/approved properties)
    $stmt = $db->query("SELECT COUNT(*) as total FROM properties WHERE is_active = 1");
    $totalProperties = $stmt->fetch()['total'];
    
    // Total Users (all users including buyers, sellers, agents)
    $stmt = $db->query("SELECT COUNT(*) as total FROM users");
    $totalUsers = $stmt->fetch()['total'];
    
    // Verified Agents (agents with agent_verified = 1 or all agents if column doesn't exist)
    try {
        $stmt = $db->query("SELECT COUNT(*) as total FROM users WHERE user_type = 'agent' AND agent_verified = 1");
        $totalAgents = $stmt->fetch()['total'];
    } catch (PDOException $e) {
        // If agent_verified column doesn't exist, just count all agents
        $stmt = $db->query("SELECT COUNT(*) as total FROM users WHERE user_type = 'agent'");
        $totalAgents = $stmt->fetch()['total'];
    }
    
    // Total Cities (distinct cities from active properties)
    // Extract city from location field (format: "City, State" or just "City")
    try {
        $stmt = $db->query("
            SELECT COUNT(DISTINCT 
                CASE 
                    WHEN location LIKE '%,%' THEN TRIM(SUBSTRING_INDEX(location, ',', 1))
                    ELSE TRIM(location)
                END
            ) as total 
            FROM properties 
            WHERE is_active = 1 
            AND location IS NOT NULL 
            AND location != ''
        ");
        $totalCities = $stmt->fetch()['total'];
    } catch (PDOException $e) {
        // Fallback: count distinct locations if city extraction fails
        $stmt = $db->query("SELECT COUNT(DISTINCT location) as total FROM properties WHERE is_active = 1 AND location IS NOT NULL AND location != ''");
        $totalCities = $stmt->fetch()['total'];
    }
    
    $stats = [
        'total_properties' => intval($totalProperties),
        'total_users' => intval($totalUsers),
        'total_agents' => intval($totalAgents),
        'total_cities' => intval($totalCities),
    ];
    
    sendSuccess('Statistics retrieved successfully', $stats);
    
} catch (Exception $e) {
    sendError('Failed to retrieve statistics: ' . $e->getMessage(), null, 500);
}

