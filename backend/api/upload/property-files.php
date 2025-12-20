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
    $propertyId = isset($_POST['property_id']) ? intval($_POST['property_id']) : 0;
    
    // Generate temporary property ID if not provided (for new properties)
    if (!$propertyId) {
        $propertyId = 'temp_' . time() . '_' . $user['id'];
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
        sendError($errorMessage, ['errors' => $result['errors'] ?? []], 400);
    }
    
    // Log successful upload for debugging
    error_log("File uploaded successfully: {$result['filename']} to {$result['url']}");
    
    sendSuccess('File uploaded successfully', [
        'url' => $result['url'],
        'filename' => $result['filename'],
        'file_type' => $fileType
    ]);
    
} catch (PDOException $e) {
    error_log("File Upload Database Error: " . $e->getMessage());
    error_log("File Upload Error Code: " . $e->getCode());
    sendError('Database error during upload: ' . $e->getMessage(), null, 500);
} catch (Exception $e) {
    error_log("File Upload Error: " . $e->getMessage());
    error_log("File Upload Stack Trace: " . $e->getTraceAsString());
    
    // Check if it's a directory/permission issue
    if (strpos($e->getMessage(), 'Permission denied') !== false || 
        strpos($e->getMessage(), 'No such file or directory') !== false) {
        error_log("Upload directory permission issue detected");
        sendError('Upload directory error. Please check server permissions.', null, 500);
    } else {
        sendError('File upload failed: ' . $e->getMessage(), null, 500);
    }
}

