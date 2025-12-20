<?php
/**
 * Get Buyer Profile API
 * GET /api/buyer/profile/get.php
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', null, 405);
}

try {
    $user = requireAuth(); // Accepts any authenticated user
    
    $db = getDB();
    
    // Check if profile_image exists in users table or user_profiles table
    $hasProfileImageInUsers = false;
    $hasProfileImageInProfiles = false;
    
    try {
        $checkStmt = $db->query("SHOW COLUMNS FROM users LIKE 'profile_image'");
        $hasProfileImageInUsers = $checkStmt->rowCount() > 0;
    } catch (PDOException $e) {
        $hasProfileImageInUsers = false;
    }
    
    try {
        $checkStmt = $db->query("SHOW COLUMNS FROM user_profiles LIKE 'profile_image'");
        $hasProfileImageInProfiles = $checkStmt->rowCount() > 0;
    } catch (PDOException $e) {
        $hasProfileImageInProfiles = false;
    }
    
    // Build SELECT query based on where profile_image column exists
    if ($hasProfileImageInUsers && $hasProfileImageInProfiles) {
        // Both exist - prefer users table, fallback to user_profiles
        $stmt = $db->prepare("
            SELECT u.id, u.full_name, u.email, u.phone, u.user_type, u.email_verified, u.phone_verified,
                   u.is_banned, u.ban_reason, u.agent_verified, u.verification_documents,
                   u.created_at, u.updated_at,
                   up.id as profile_id, up.full_name as profile_full_name, up.user_type as profile_user_type,
                   COALESCE(u.profile_image, up.profile_image) as profile_image, 
                   up.address,
                   up.created_at as profile_created_at, up.updated_at as profile_updated_at
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = ?
        ");
    } elseif ($hasProfileImageInUsers) {
        // Only in users table
        $stmt = $db->prepare("
            SELECT u.id, u.full_name, u.email, u.phone, u.user_type, u.email_verified, u.phone_verified,
                   u.is_banned, u.ban_reason, u.agent_verified, u.verification_documents,
                   u.created_at, u.updated_at,
                   up.id as profile_id, up.full_name as profile_full_name, up.user_type as profile_user_type,
                   u.profile_image, 
                   up.address,
                   up.created_at as profile_created_at, up.updated_at as profile_updated_at
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = ?
        ");
    } elseif ($hasProfileImageInProfiles) {
        // Only in user_profiles table (legacy)
        $stmt = $db->prepare("
            SELECT u.id, u.full_name, u.email, u.phone, u.user_type, u.email_verified, u.phone_verified,
                   u.is_banned, u.ban_reason, u.agent_verified, u.verification_documents,
                   u.created_at, u.updated_at,
                   up.id as profile_id, up.full_name as profile_full_name, up.user_type as profile_user_type,
                   up.profile_image, 
                   up.address,
                   up.created_at as profile_created_at, up.updated_at as profile_updated_at
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = ?
        ");
    } else {
        // Neither exists
        $stmt = $db->prepare("
            SELECT u.id, u.full_name, u.email, u.phone, u.user_type, u.email_verified, u.phone_verified,
                   u.is_banned, u.ban_reason, u.agent_verified, u.verification_documents,
                   u.created_at, u.updated_at,
                   up.id as profile_id, up.full_name as profile_full_name, up.user_type as profile_user_type,
                   NULL as profile_image, 
                   up.address,
                   up.created_at as profile_created_at, up.updated_at as profile_updated_at
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = ?
        ");
    }
    $stmt->execute([$user['id']]);
    $profile = $stmt->fetch();
    
    if (!$profile) {
        sendError('Profile not found', null, 404);
    }
    
    unset($profile['password']);
    
    // Use profile_image from user_profiles
    $profile['profile_image'] = $profile['profile_image'] ?? null;
    
    sendSuccess('Profile retrieved successfully', ['profile' => $profile]);
    
} catch (Exception $e) {
    error_log("Get Buyer Profile Error: " . $e->getMessage());
    sendError('Failed to get profile', null, 500);
}

