<?php
/**
 * Upload Profile Image API
 * POST /api/upload/profile-image.php
 * 
 * Handles profile image uploads for users
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/validation.php';
require_once __DIR__ . '/../../utils/auth.php';
require_once __DIR__ . '/../../utils/upload.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $user = requireAuth();
    
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        sendError('No file uploaded or upload error', null, 400);
    }
    
    $file = $_FILES['file'];
    
    // Validate file
    $errors = validateFileUpload($file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
    if (!empty($errors)) {
        sendError('File validation failed', ['errors' => $errors], 400);
    }
    
    // Generate unique filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'profile_' . $user['id'] . '_' . time() . '_' . uniqid() . '.' . $extension;
    $destination = USER_PROFILES_DIR . $filename;
    
    // Ensure upload directory exists and is writable
    if (!file_exists(USER_PROFILES_DIR)) {
        $created = @mkdir(USER_PROFILES_DIR, 0755, true);
        if (!$created && !file_exists(USER_PROFILES_DIR)) {
            error_log("Failed to create profile image directory: " . USER_PROFILES_DIR);
            sendError('Failed to create upload directory. Please check server permissions.', null, 500);
        }
    }
    
    if (!is_writable(USER_PROFILES_DIR)) {
        error_log("Profile image directory is not writable: " . USER_PROFILES_DIR);
        sendError('Upload directory is not writable. Please check server permissions.', null, 500);
    }
    
    // Delete old profile image if exists
    $db = getDB();
    
    // Check where profile_image column exists (users or user_profiles)
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
    
    // Get old profile image URL
    $oldImageUrl = null;
    if ($hasProfileImageInUsers) {
        $stmt = $db->prepare("SELECT profile_image FROM users WHERE id = ?");
        $stmt->execute([$user['id']]);
        $result = $stmt->fetch();
        $oldImageUrl = $result['profile_image'] ?? null;
    } elseif ($hasProfileImageInProfiles) {
        $stmt = $db->prepare("SELECT profile_image FROM user_profiles WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        $result = $stmt->fetch();
        $oldImageUrl = $result['profile_image'] ?? null;
    }
    
    // Delete old image file if exists
    if ($oldImageUrl) {
        $oldImagePath = str_replace(UPLOAD_BASE_URL, UPLOAD_DIR, $oldImageUrl);
        if (file_exists($oldImagePath)) {
            @unlink($oldImagePath);
        }
    }
    
    // Check if temp file exists and is readable
    if (!file_exists($file['tmp_name']) || !is_readable($file['tmp_name'])) {
        error_log("Temporary profile image file issue: {$file['tmp_name']}");
        sendError('Temporary file issue. Please try again.', null, 500);
    }
    
    // Upload new image
    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        $error = error_get_last();
        error_log("Failed to move uploaded profile image from {$file['tmp_name']} to {$destination}");
        error_log("PHP Error: " . ($error ? $error['message'] : 'Unknown error'));
        error_log("Upload error code: " . ($file['error'] ?? 'N/A'));
        sendError('Failed to upload image. Please check server permissions and try again.', null, 500);
    }
    
    // Verify file was saved
    if (!file_exists($destination) || !is_readable($destination)) {
        error_log("Profile image was not saved correctly to destination: {$destination}");
        sendError('File was not saved correctly. Please try again.', null, 500);
    }
    
    $url = UPLOAD_BASE_URL . '/users/profiles/' . $filename;
    
    // Update profile_image in the correct table
    if ($hasProfileImageInUsers) {
        // Update in users table
        $stmt = $db->prepare("UPDATE users SET profile_image = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$url, $user['id']]);
    } elseif ($hasProfileImageInProfiles) {
        // Ensure user_profiles record exists
        $stmt = $db->prepare("SELECT id FROM user_profiles WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        if (!$stmt->fetch()) {
            // Create user_profiles record if it doesn't exist
            $stmt = $db->prepare("INSERT INTO user_profiles (user_id) VALUES (?)");
            $stmt->execute([$user['id']]);
        }
        
        // Update profile_image in user_profiles table
        $stmt = $db->prepare("UPDATE user_profiles SET profile_image = ?, updated_at = NOW() WHERE user_id = ?");
        $stmt->execute([$url, $user['id']]);
    } else {
        // Neither table has profile_image column - just log and continue
        error_log("Warning: profile_image column not found in users or user_profiles table");
    }
    
    sendSuccess('Profile image uploaded successfully', [
        'url' => $url,
        'filename' => $filename
    ]);
    
} catch (Exception $e) {
    error_log("Profile Image Upload Error: " . $e->getMessage());
    sendError('Failed to upload profile image', null, 500);
}
