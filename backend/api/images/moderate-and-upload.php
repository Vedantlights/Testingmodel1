<?php
/**
 * Image Moderation and Upload API
 * POST /api/images/moderate-and-upload.php
 * Handles image upload with Google Vision API moderation
 * Blocks: Animals, Blurry images, Low quality, Inappropriate content
 */

// Start output buffering
ob_start();

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/moderation.php';
require_once __DIR__ . '/../../utils/auth.php';
require_once __DIR__ . '/../../services/GoogleVisionService.php';
require_once __DIR__ . '/../../services/ModerationDecisionService.php';
require_once __DIR__ . '/../../helpers/FileHelper.php';
require_once __DIR__ . '/../../helpers/ResponseHelper.php';
require_once __DIR__ . '/../../helpers/BlurDetector.php';

// Load Composer autoload if available
if (file_exists(__DIR__ . '/../../vendor/autoload.php')) {
    require_once __DIR__ . '/../../vendor/autoload.php';
}

// Clear output buffer
ob_clean();

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ResponseHelper::error('Method not allowed', 405);
}

try {
    // Check authentication
    $user = getCurrentUser();
    if (!$user) {
        ResponseHelper::unauthorized('Please login to upload images');
    }
    
    $userId = $user['id'];
    
    // Validate property_id
    $propertyId = isset($_POST['property_id']) ? intval($_POST['property_id']) : 0;
    if ($propertyId <= 0) {
        ResponseHelper::errorWithDetails(
            'Valid property ID is required',
            'validation_error',
            ['field' => 'property_id']
        );
    }
    
    // Verify property belongs to user
    $db = getDB();
    $stmt = $db->prepare("SELECT id, user_id FROM properties WHERE id = ?");
    $stmt->execute([$propertyId]);
    $property = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$property) {
        ResponseHelper::error('Property not found', 404);
    }
    
    if ($property['user_id'] != $userId) {
        ResponseHelper::forbidden('You do not have permission to upload images for this property');
    }
    
    // Validate file upload
    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        $errorMsg = 'Image file is required';
        if (isset($_FILES['image']['error'])) {
            $uploadErrors = [
                UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize directive',
                UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE directive',
                UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
                UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                UPLOAD_ERR_EXTENSION => 'File upload stopped by extension'
            ];
            $errorMsg = $uploadErrors[$_FILES['image']['error']] ?? 'File upload error';
        }
        ResponseHelper::errorWithDetails($errorMsg, 'file_upload_error');
    }
    
    $file = $_FILES['image'];
    
    // Validate file using FileHelper
    $validation = FileHelper::validateImageFile($file, MAX_IMAGE_SIZE_BYTES, ALLOWED_IMAGE_TYPES);
    if (!$validation['valid']) {
        // Map validation errors to error codes
        $errorCode = 'validation_error';
        if (strpos($validation['error'], 'size') !== false) {
            $errorCode = 'file_too_large';
        } elseif (strpos($validation['error'], 'type') !== false || strpos($validation['error'], 'Invalid') !== false) {
            $errorCode = 'invalid_type';
        }
        
        ResponseHelper::errorWithDetails($validation['error'], $errorCode);
    }
    
    // Generate unique filename
    $uniqueFilename = FileHelper::generateUniqueFilename($file['name']);
    $originalFilename = $file['name'];
    $fileSize = $file['size'];
    $mimeType = FileHelper::getMimeType($file['tmp_name']);
    
    // Ensure temp directory exists
    if (!FileHelper::createDirectory(UPLOAD_TEMP_PATH)) {
        error_log("Failed to create temp directory: " . UPLOAD_TEMP_PATH);
        ResponseHelper::serverError('Failed to create upload directory');
    }
    
    // Save to temp directory
    $tempPath = UPLOAD_TEMP_PATH . $uniqueFilename;
    if (!move_uploaded_file($file['tmp_name'], $tempPath)) {
        error_log("Failed to move uploaded file to temp: {$tempPath}");
        ResponseHelper::serverError('Failed to save uploaded file');
    }
    
    // Initialize moderation variables
    $decision = null;
    $apiResponse = null;
    $moderationStatus = 'PENDING';
    $moderationReason = null;
    $apisUsed = ['google_vision'];
    $confidenceScores = [];
    $apiResponseJson = null;
    
    // Call Google Vision API
    try {
        $visionService = new GoogleVisionService();
        $apiResponse = $visionService->analyzeImage($tempPath);
        
        // Evaluate moderation decision (includes quality checks, animal detection, SafeSearch, property check)
        // Quality checks happen first, even if API fails
        $decisionService = new ModerationDecisionService();
        $decision = $decisionService->evaluate($apiResponse, $tempPath);
        
        $moderationStatus = $decision['status'];
        $moderationReason = $decision['message'];
        $confidenceScores = $decision['details']['confidence_scores'] ?? [];
        
        if ($apiResponse['success']) {
            $apiResponseJson = $apiResponse['raw_response'];
        } else {
            error_log("Google Vision API error: " . ($apiResponse['error'] ?? 'Unknown error'));
            // Quality checks still performed, API error logged but decision made
        }
    } catch (Exception $e) {
        error_log("Google Vision API exception: " . $e->getMessage());
        
        // Still check quality even if API fails
        try {
            $decisionService = new ModerationDecisionService();
            $decision = $decisionService->evaluate(['success' => false, 'error' => $e->getMessage()], $tempPath);
            $moderationStatus = $decision['status'];
            $moderationReason = $decision['message'];
        } catch (Exception $e2) {
            error_log("Quality check exception: " . $e2->getMessage());
            $moderationStatus = 'PENDING';
            $moderationReason = 'Moderation service error';
        }
    }
    
    // Handle based on moderation decision
    // REJECTED status includes: animal_detected, blur_detected, low_quality, adult_content, violence_content
    if ($moderationStatus === 'REJECTED') {
        // Delete temp file
        FileHelper::deleteFile($tempPath);
        
        // Save record with REJECTED status
        try {
            $stmt = $db->prepare("
                INSERT INTO property_images (
                    property_id, image_url, file_name, file_path, original_filename,
                    file_size, mime_type, moderation_status, moderation_reason,
                    apis_used, confidence_scores, api_response, checked_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            
            $stmt->execute([
                $propertyId,
                null, // No URL for rejected images
                $uniqueFilename,
                null, // No path for rejected images
                $originalFilename,
                $fileSize,
                $mimeType,
                'REJECTED',
                $moderationReason,
                json_encode($apisUsed),
                json_encode($confidenceScores),
                $apiResponseJson
            ]);
        } catch (PDOException $e) {
            error_log("Failed to save REJECTED image record: " . $e->getMessage());
        }
        
        // Return specific error message with details
        $errorCode = $decision['reason_code'] ?? 'rejected';
        $errorDetails = $decision['details'] ?? [];
        
        ResponseHelper::errorWithDetails(
            $moderationReason,
            $errorCode,
            $errorDetails,
            400
        );
    }
    
    if ($moderationStatus === 'NEEDS_REVIEW') {
        // Ensure review directory exists
        if (!FileHelper::createDirectory(UPLOAD_REVIEW_PATH)) {
            error_log("Failed to create review directory: " . UPLOAD_REVIEW_PATH);
            FileHelper::deleteFile($tempPath);
            ResponseHelper::serverError('Failed to create review directory');
        }
        
        // Move file to review directory
        $reviewPath = UPLOAD_REVIEW_PATH . $uniqueFilename;
        if (!FileHelper::moveFile($tempPath, $reviewPath)) {
            error_log("Failed to move file to review directory");
            FileHelper::deleteFile($tempPath);
            ResponseHelper::serverError('Failed to queue image for review');
        }
        
        // Save record with NEEDS_REVIEW status
        try {
            $db->beginTransaction();
            
            $stmt = $db->prepare("
                INSERT INTO property_images (
                    property_id, image_url, file_name, file_path, original_filename,
                    file_size, mime_type, moderation_status, moderation_reason,
                    apis_used, confidence_scores, api_response, checked_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            
            $relativePath = 'review/' . $uniqueFilename;
            $imageUrl = BASE_URL . '/uploads/' . $relativePath;
            
            $stmt->execute([
                $propertyId,
                $imageUrl,
                $uniqueFilename,
                $relativePath,
                $originalFilename,
                $fileSize,
                $mimeType,
                'NEEDS_REVIEW',
                $moderationReason,
                json_encode($apisUsed),
                json_encode($confidenceScores),
                $apiResponseJson
            ]);
            
            $imageId = $db->lastInsertId();
            
            // Insert into moderation_review_queue
            $stmt = $db->prepare("
                INSERT INTO moderation_review_queue (
                    property_image_id, status, reason_for_review, created_at
                ) VALUES (?, 'OPEN', ?, NOW())
            ");
            
            $stmt->execute([$imageId, $moderationReason]);
            
            $db->commit();
            
            ResponseHelper::pending(
                'Your image is being reviewed and will be approved shortly.',
                [
                    'image_id' => $imageId,
                    'moderation_status' => 'NEEDS_REVIEW',
                    'moderation_reason' => $moderationReason
                ]
            );
            
        } catch (PDOException $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("Failed to save NEEDS_REVIEW image record: " . $e->getMessage());
            FileHelper::deleteFile($reviewPath);
            ResponseHelper::serverError('Failed to save image record');
        }
    }
    
    // Handle APPROVED images
    // Create property-specific folder
    $propertyFolder = UPLOAD_PROPERTIES_PATH . $propertyId . '/';
    if (!FileHelper::createDirectory($propertyFolder)) {
        error_log("Failed to create property folder: {$propertyFolder}");
        FileHelper::deleteFile($tempPath);
        ResponseHelper::serverError('Failed to create property folder');
    }
    
    // Move file from temp to property folder
    $finalPath = $propertyFolder . $uniqueFilename;
    if (!FileHelper::moveFile($tempPath, $finalPath)) {
        error_log("Failed to move file to property folder");
        FileHelper::deleteFile($tempPath);
        ResponseHelper::serverError('Failed to save image');
    }
    
    // Generate public URL
    $relativePath = 'properties/' . $propertyId . '/' . $uniqueFilename;
    $imageUrl = BASE_URL . '/uploads/' . $relativePath;
    
    // Save to database
    try {
        $stmt = $db->prepare("
            INSERT INTO property_images (
                property_id, image_url, file_name, file_path, original_filename,
                file_size, mime_type, moderation_status, moderation_reason,
                apis_used, confidence_scores, api_response, checked_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $propertyId,
            $imageUrl,
            $uniqueFilename,
            $relativePath,
            $originalFilename,
            $fileSize,
            $mimeType,
            'SAFE',
            $moderationReason ?? 'Image approved successfully.',
            json_encode($apisUsed),
            json_encode($confidenceScores),
            $apiResponseJson
        ]);
        
        $imageId = $db->lastInsertId();
        
        ResponseHelper::success('Image uploaded successfully', [
            'image_id' => $imageId,
            'image_url' => $imageUrl,
            'filename' => $uniqueFilename,
            'moderation_status' => 'SAFE'
        ]);
        
    } catch (PDOException $e) {
        error_log("Failed to save image record: " . $e->getMessage());
        FileHelper::deleteFile($finalPath);
        ResponseHelper::serverError('Failed to save image record');
    }
    
} catch (Exception $e) {
    error_log("Image moderation error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    ResponseHelper::serverError('An error occurred while processing the image');
}
