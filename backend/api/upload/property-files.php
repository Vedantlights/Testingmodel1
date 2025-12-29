<?php
/**
 * Upload Property Files API
 * POST /api/upload/property-files.php
 * 
 * Handles file uploads for properties (images, videos, brochures)
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
    $user = requireUserType(['seller', 'agent']);
    
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        sendError('No file uploaded or upload error', null, 400);
    }
    
    $file = $_FILES['file'];
    $fileType = sanitizeInput($_POST['file_type'] ?? 'image'); // image, video, brochure
    $propertyId = isset($_POST['property_id']) ? $_POST['property_id'] : 0;
    
    // Validate and convert property ID
    // For new properties, property should be created first, so we expect numeric ID
    // But handle string temp IDs for backward compatibility
    if (is_string($propertyId) && strpos($propertyId, 'temp_') === 0) {
        // Temp ID - allow it but moderation DB operations will be skipped
        // This is for backward compatibility only
    } elseif (is_numeric($propertyId)) {
        $propertyId = intval($propertyId);
    } else {
        // Invalid property ID - reject upload
        sendError('Invalid property ID. Property must be created first.', null, 400);
    }
    
    $result = null;
    
    switch ($fileType) {
        case 'image':
            $result = uploadPropertyImage($file, $propertyId);
            break;
        case 'video':
            $result = uploadPropertyVideo($file, $propertyId);
            break;
        case 'brochure':
            $result = uploadPropertyBrochure($file, $propertyId);
            break;
        default:
            sendError('Invalid file type. Allowed: image, video, brochure', null, 400);
    }
    
    if (!$result['success']) {
        $errorMessage = !empty($result['errors']) ? implode(', ', $result['errors']) : 'Upload failed';
        $errorData = ['errors' => $result['errors'] ?? []];
        
        // Include moderation information if available
        if (isset($result['moderation_status'])) {
            $errorData['moderation_status'] = $result['moderation_status'];
        }
        if (isset($result['moderation_reason'])) {
            $errorData['moderation_reason'] = $result['moderation_reason'];
        }
        
        sendError($errorMessage, $errorData, 400);
    }
    
    // Log successful upload for debugging
    error_log("File uploaded successfully: {$result['filename']} to {$result['url']}");
    
    // Prepare response data
    $responseData = [
        'url' => $result['url'],
        'filename' => $result['filename'],
        'file_type' => $fileType
    ];
    
    // Include moderation information if available
    if (isset($result['moderation_status'])) {
        $responseData['moderation_status'] = $result['moderation_status'];
    }
    if (isset($result['moderation_reason'])) {
        $responseData['moderation_reason'] = $result['moderation_reason'];
    }
    if (isset($result['message'])) {
        $responseData['message'] = $result['message'];
    }
    
    sendSuccess('File uploaded successfully', $responseData);
    
} catch (PDOException $e) {
    error_log("File Upload Database Error: " . $e->getMessage());
    error_log("File Upload Error Code: " . $e->getCode());
    // Don't expose database error details to users
    if (defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
        sendError('Database error during upload. Please try again later.', null, 500);
    } else {
        sendError('Database error during upload: ' . $e->getMessage(), null, 500);
    }
} catch (Exception $e) {
    error_log("File Upload Error: " . $e->getMessage());
    error_log("File Upload Stack Trace: " . $e->getTraceAsString());
    
    // Check if it's a directory/permission issue
    if (strpos($e->getMessage(), 'Permission denied') !== false || 
        strpos($e->getMessage(), 'No such file or directory') !== false) {
        error_log("Upload directory permission issue detected");
        sendError('Upload directory error. Please check server permissions.', null, 500);
    } else {
        // Don't expose internal error details in production
        if (defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
            sendError('File upload failed. Please try again later.', null, 500);
        } else {
            sendError('File upload failed: ' . $e->getMessage(), null, 500);
        }
    }
}

