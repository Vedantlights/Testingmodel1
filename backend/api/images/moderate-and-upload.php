<?php
/**
 * Image Upload and Moderation Endpoint
 * POST /api/images/moderate-and-upload
 * 
 * Handles image upload with automatic moderation using Google Cloud Vision API
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/auth.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/FileHelper.php';
require_once __DIR__ . '/../../services/GoogleVisionService.php';
require_once __DIR__ . '/../../services/ModerationDecisionService.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    // Check authentication
    $user = requireAuth();
    $userId = $user['id'];
    
    // Check if file was uploaded
    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        $errorMsg = 'No file uploaded';
        if (isset($_FILES['image']['error'])) {
            switch ($_FILES['image']['error']) {
                case UPLOAD_ERR_INI_SIZE:
                case UPLOAD_ERR_FORM_SIZE:
                    $errorMsg = 'File size exceeds limit';
                    break;
                case UPLOAD_ERR_PARTIAL:
                    $errorMsg = 'File upload was incomplete';
                    break;
                case UPLOAD_ERR_NO_FILE:
                    $errorMsg = 'No file was uploaded';
                    break;
                default:
                    $errorMsg = 'File upload error occurred';
            }
        }
        sendError($errorMsg, null, 400);
    }
    
    $file = $_FILES['image'];
    $propertyId = isset($_POST['property_id']) ? (int)$_POST['property_id'] : null;
    
    if (!$propertyId) {
        sendError('Property ID is required', null, 400);
    }
    
    // Validate property exists and belongs to user
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM properties WHERE id = ? AND user_id = ?");
    $stmt->execute([$propertyId, $userId]);
    $property = $stmt->fetch();
    
    if (!$property) {
        sendError('Property not found or access denied', null, 404);
    }
    
    // File validation
    $fileSize = $file['size'];
    $maxSizeBytes = MAX_IMAGE_SIZE_BYTES;
    
    if ($fileSize > $maxSizeBytes) {
        sendError("File size exceeds maximum allowed size of " . MAX_IMAGE_SIZE_MB . "MB", null, 400);
    }
    
    // Check file extension
    $originalFilename = $file['name'];
    $extension = strtolower(pathinfo($originalFilename, PATHINFO_EXTENSION));
    $allowedExtensions = array_map('strtolower', ALLOWED_IMAGE_TYPES_ARRAY);
    
    if (!in_array($extension, $allowedExtensions)) {
        sendError("File type not allowed. Allowed types: " . ALLOWED_IMAGE_TYPES_STR, null, 400);
    }
    
    // Check MIME type
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    $allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp'
    ];
    
    if (!in_array($mimeType, $allowedMimeTypes)) {
        sendError("Invalid file type. Only image files are allowed.", null, 400);
    }
    
    // Generate unique filename
    $uniqueFilename = FileHelper::generateUniqueFilename($originalFilename);
    $tempPath = UPLOAD_TEMP_DIR . $uniqueFilename;
    
    // Save file to temp folder
    if (!move_uploaded_file($file['tmp_name'], $tempPath)) {
        error_log("Failed to move uploaded file to temp: " . $tempPath);
        sendError('Failed to save uploaded file', null, 500);
    }
    
    // Verify file was saved
    if (!file_exists($tempPath)) {
        sendError('File was not saved correctly', null, 500);
    }
    
    // Call moderation services
    try {
        $visionService = new GoogleVisionService();
        $apiResponse = $visionService->analyzeImage($tempPath);
        
        $decisionService = new ModerationDecisionService();
        $decision = $decisionService->evaluate($apiResponse);
        
    } catch (Exception $e) {
        error_log("Moderation API error: " . $e->getMessage());
        
        // Save to database with PENDING status
        $stmt = $db->prepare("
            INSERT INTO property_images 
            (property_id, file_name, file_path, original_filename, file_size, mime_type, 
             moderation_status, moderation_reason, apis_used, confidence_scores, api_response, checked_at)
            VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, NOW())
        ");
        
        $filePath = FileHelper::getRelativePath($tempPath);
        $apisUsed = json_encode(['google_vision' => 'failed']);
        $confidenceScores = json_encode([]);
        $apiResponseJson = json_encode(['error' => $e->getMessage()]);
        
        $stmt->execute([
            $propertyId,
            $uniqueFilename,
            $filePath,
            $originalFilename,
            $fileSize,
            $mimeType,
            'Moderation API call failed: ' . $e->getMessage(),
            $apisUsed,
            $confidenceScores,
            $apiResponseJson
        ]);
        
        sendError('Image moderation service is temporarily unavailable. Please try again later.', null, 503);
    }
    
    $decisionResult = $decision['decision'];
    $decisionReason = $decision['reason'];
    $confidenceScores = $decision['confidence_scores'];
    $flaggedLabels = $decision['flagged_labels'];
    $propertyLabels = $decision['property_labels'];
    
    // Prepare data for database
    $apisUsed = json_encode(['google_vision' => 'success']);
    $confidenceScoresJson = json_encode($confidenceScores);
    $apiResponseJson = json_encode($apiResponse);
    
    // Handle SAFE decision
    if ($decisionResult === 'SAFE') {
        // Create property subfolder if not exists
        $propertyDir = UPLOAD_PROPERTIES_DIR . $propertyId . '/';
        if (!file_exists($propertyDir)) {
            mkdir($propertyDir, 0755, true);
        }
        
        // Move file from temp to property folder
        $finalPath = $propertyDir . $uniqueFilename;
        if (!FileHelper::moveFile($tempPath, $finalPath)) {
            error_log("Failed to move file from temp to property folder");
            sendError('Failed to save approved image', null, 500);
        }
        
        // Insert record into property_images table
        $filePath = FileHelper::getRelativePath($finalPath);
        $stmt = $db->prepare("
            INSERT INTO property_images 
            (property_id, file_name, file_path, original_filename, file_size, mime_type,
             moderation_status, moderation_reason, apis_used, confidence_scores, api_response, checked_at)
            VALUES (?, ?, ?, ?, ?, ?, 'SAFE', ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $propertyId,
            $uniqueFilename,
            $filePath,
            $originalFilename,
            $fileSize,
            $mimeType,
            $decisionReason,
            $apisUsed,
            $confidenceScoresJson,
            $apiResponseJson
        ]);
        
        $imageId = $db->lastInsertId();
        $imageUrl = FileHelper::getImageUrl($filePath);
        
        sendSuccess('Image approved', [
            'status' => 'success',
            'image_id' => $imageId,
            'image_url' => $imageUrl,
            'message' => 'Image approved'
        ]);
    }
    
    // Handle UNSAFE decision
    if ($decisionResult === 'UNSAFE') {
        // Delete file from temp folder
        FileHelper::deleteFile($tempPath);
        
        // Insert record into property_images table
        $stmt = $db->prepare("
            INSERT INTO property_images 
            (property_id, file_name, file_path, original_filename, file_size, mime_type,
             moderation_status, moderation_reason, apis_used, confidence_scores, api_response, checked_at)
            VALUES (?, ?, ?, ?, ?, ?, 'UNSAFE', ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $propertyId,
            $uniqueFilename,
            null, // No file path for rejected images
            $originalFilename,
            $fileSize,
            $mimeType,
            $decisionReason,
            $apisUsed,
            $confidenceScoresJson,
            $apiResponseJson
        ]);
        
        // Return generic error message without revealing specific reason
        sendError('Image rejected - contains inappropriate content', null, 400);
    }
    
    // Handle NEEDS_REVIEW decision
    if ($decisionResult === 'NEEDS_REVIEW') {
        // Move file from temp to review folder
        $reviewPath = UPLOAD_REVIEW_DIR . $uniqueFilename;
        if (!FileHelper::moveFile($tempPath, $reviewPath)) {
            error_log("Failed to move file from temp to review folder");
            sendError('Failed to queue image for review', null, 500);
        }
        
        // Insert record into property_images table
        $filePath = FileHelper::getRelativePath($reviewPath);
        $stmt = $db->prepare("
            INSERT INTO property_images 
            (property_id, file_name, file_path, original_filename, file_size, mime_type,
             moderation_status, moderation_reason, apis_used, confidence_scores, api_response, checked_at)
            VALUES (?, ?, ?, ?, ?, ?, 'NEEDS_REVIEW', ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $propertyId,
            $uniqueFilename,
            $filePath,
            $originalFilename,
            $fileSize,
            $mimeType,
            $decisionReason,
            $apisUsed,
            $confidenceScoresJson,
            $apiResponseJson
        ]);
        
        $imageId = $db->lastInsertId();
        
        // Insert record into moderation_review_queue table
        $stmt = $db->prepare("
            INSERT INTO moderation_review_queue 
            (property_image_id, status, reason_for_review, created_at)
            VALUES (?, 'OPEN', ?, NOW())
        ");
        
        $stmt->execute([
            $imageId,
            $decisionReason
        ]);
        
        sendSuccess('Image is under review. We will notify you once approved.', [
            'status' => 'pending_review',
            'image_id' => $imageId,
            'message' => 'Image is under review. We will notify you once approved.'
        ]);
    }
    
    // Should not reach here
    sendError('Unexpected moderation decision', null, 500);
    
} catch (Exception $e) {
    error_log("moderate-and-upload.php - Exception: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    sendError('An error occurred while processing your image', null, 500);
}

