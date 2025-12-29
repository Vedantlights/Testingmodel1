<?php
/**
 * Image Moderation and Upload API
 * POST /api/images/moderate-and-upload.php
 * 
 * Processing Flow (ENFORCED ORDER):
 * 1. File validation (type, size, corruption check)
 * 2. Dimension check (400x300 minimum)
 * 3. Google Vision API call
 * 4. SafeSearch evaluation
 * 5. Human detection (face OR object localization only, NOT labels alone)
 * 6. Animal detection (object localization OR label+object, NOT labels alone)
 * 7. Property context scoring
 * 8. Final decision (approve / reject / manual review)
 */

// Step 1: Setup and Headers
ob_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/moderation.php';
require_once __DIR__ . '/../../utils/auth.php';
require_once __DIR__ . '/../../services/GoogleVisionService.php';
require_once __DIR__ . '/../../services/WatermarkService.php';
require_once __DIR__ . '/../../helpers/FileHelper.php';

// Load Composer autoload if available
if (file_exists(__DIR__ . '/../../vendor/autoload.php')) {
    require_once __DIR__ . '/../../vendor/autoload.php';
}

ob_clean();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

try {
    // Step 2: Check Authentication
    session_start();
    $user = getCurrentUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Please login to upload images']);
        exit;
    }
    
    $userId = $user['id'];
    
    // Check if this is validation-only mode (for new properties)
    $validateOnly = isset($_POST['validate_only']) && $_POST['validate_only'] === 'true';
    
    // Validate property_id
    $propertyId = isset($_POST['property_id']) ? intval($_POST['property_id']) : 0;
    
    // If validate_only mode, property_id can be 0
    if (!$validateOnly && $propertyId <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Valid property ID is required']);
        exit;
    }
    
    // Verify property belongs to user (skip if validate_only)
    if (!$validateOnly && $propertyId > 0) {
        $db = getDB();
        $stmt = $db->prepare("SELECT id, user_id FROM properties WHERE id = ?");
        $stmt->execute([$propertyId]);
        $property = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$property) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Property not found']);
            exit;
        }
        
        if ($property['user_id'] != $userId) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'You do not have permission to upload images for this property']);
            exit;
        }
    }
    
    // Step 3: Get Uploaded File
    $file = null;
    $fileKey = null;
    
    // Check multiple possible keys
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['image'];
        $fileKey = 'image';
    } elseif (isset($_FILES['images']) && $_FILES['images']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['images'];
        $fileKey = 'images';
    } elseif (isset($_FILES['images']) && is_array($_FILES['images']['error'])) {
        // Handle array of files - take first one
        if (isset($_FILES['images']['error'][0]) && $_FILES['images']['error'][0] === UPLOAD_ERR_OK) {
            $file = [
                'name' => $_FILES['images']['name'][0],
                'type' => $_FILES['images']['type'][0],
                'tmp_name' => $_FILES['images']['tmp_name'][0],
                'error' => $_FILES['images']['error'][0],
                'size' => $_FILES['images']['size'][0]
            ];
            $fileKey = 'images[0]';
        }
    } elseif (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['file'];
        $fileKey = 'file';
    }
    
    if (!$file || !isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'No image file uploaded']);
        exit;
    }
    
    // Step 4: File Type Validation (JPG, PNG, WebP only)
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    
    // Get MIME type using multiple methods
    $mimeType = null;
    if (function_exists('finfo_file')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo) {
            $mimeType = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);
        }
    }
    
    if (!$mimeType && function_exists('mime_content_type')) {
        $mimeType = mime_content_type($file['tmp_name']);
    }
    
    if (!$mimeType) {
        $imageInfo = @getimagesize($file['tmp_name']);
        if ($imageInfo && isset($imageInfo['mime'])) {
            $mimeType = $imageInfo['mime'];
        }
    }
    
    // Check if extension is valid
    $extensionValid = in_array($extension, ALLOWED_IMAGE_TYPES);
    
    // Check if MIME type is valid
    $mimeValid = $mimeType && in_array($mimeType, ALLOWED_MIME_TYPES);
    
    // Pass if EITHER extension OR mime type is valid
    if (!$extensionValid && !$mimeValid) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => getErrorMessage('invalid_type'),
            'error_code' => 'invalid_type',
            'details' => [
                'extension' => $extension,
                'mime_type' => $mimeType
            ]
        ]);
        exit;
    }
    
    // Step 4b: Validate file is not corrupted or unreadable
    $imageInfo = @getimagesize($file['tmp_name']);
    if ($imageInfo === false) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'File is not a valid or readable image',
            'error_code' => 'invalid_image'
        ]);
        exit;
    }
    
    // Step 5: File Size Validation (Maximum 5MB)
    $maxSizeBytes = MAX_IMAGE_SIZE_BYTES;
    if ($file['size'] > $maxSizeBytes) {
        $fileSizeMB = round($file['size'] / (1024 * 1024), 2);
        $maxSizeMB = round($maxSizeBytes / (1024 * 1024), 2);
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => getErrorMessage('file_too_large'),
            'error_code' => 'file_too_large'
        ]);
        exit;
    }
    
    // Step 6: Image Dimensions Check (Minimum 400x300 pixels)
    $width = $imageInfo[0];
    $height = $imageInfo[1];
    
    if ($width < MIN_IMAGE_WIDTH || $height < MIN_IMAGE_HEIGHT) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => getErrorMessage('low_quality', [
                'width' => $width,
                'height' => $height
            ]),
            'error_code' => 'low_quality',
            'details' => [
                'width' => $width,
                'height' => $height,
                'min_width' => MIN_IMAGE_WIDTH,
                'min_height' => MIN_IMAGE_HEIGHT
            ]
        ]);
        exit;
    }
    
    // Step 7: Blur Detection - DISABLED
    // Blur detection has been removed from the moderation system
    
    // Step 8: Save to Temp Folder
    $uniqueFilename = FileHelper::generateUniqueFilename($file['name']);
    $originalFilename = $file['name'];
    $fileSize = $file['size'];
    $mimeType = $mimeType ?: 'image/jpeg'; // Fallback
    
    // Ensure temp directory exists
    if (!FileHelper::createDirectory(UPLOAD_TEMP_PATH)) {
        error_log("Failed to create temp directory: " . UPLOAD_TEMP_PATH);
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to create upload directory']);
        exit;
    }
    
    // Save to temp directory
    $tempPath = UPLOAD_TEMP_PATH . $uniqueFilename;
    if (!move_uploaded_file($file['tmp_name'], $tempPath)) {
        error_log("Failed to move uploaded file to temp: {$tempPath}");
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to save uploaded file']);
        exit;
    }
    
    // Step 9: Call Google Vision API
    $apiResponse = null;
    try {
        $visionService = new GoogleVisionService();
        $apiResponse = $visionService->analyzeImage($tempPath);
        
        if (!$apiResponse['success']) {
            // API failed - delete temp file and return error
            FileHelper::deleteFile($tempPath);
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => 'Image verification failed. Please try again.',
                'error_code' => 'api_error'
            ]);
            exit;
        }
    } catch (Exception $e) {
        error_log("Google Vision API exception: " . $e->getMessage());
        FileHelper::deleteFile($tempPath);
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Image verification failed. Please try again.',
            'error_code' => 'api_error'
        ]);
        exit;
    }
    
    // Step 10: Check for HUMANS
    // Reject image ONLY IF:
    // - Face detection confidence ≥ 0.7 (increased to reduce false positives)
    // OR
    // - Object localization detects "Person" or "People" with confidence ≥ 0.7 (increased to reduce false positives)
    // Labels alone must NOT cause rejection (they are supporting signals only)
    
    $faces = $apiResponse['faces'] ?? [];
    $objects = $apiResponse['objects'] ?? [];
    
    // Log all detections for debugging
    error_log("Human detection check: faces_count=" . count($faces) . ", objects_count=" . count($objects));
    if (!empty($faces)) {
        foreach ($faces as $idx => $face) {
            $faceConfidence = $face['detection_confidence'] ?? 0.0;
            error_log("Face #{$idx}: confidence={$faceConfidence}, threshold=" . MODERATION_FACE_THRESHOLD);
        }
    }
    if (!empty($objects)) {
        foreach ($objects as $idx => $object) {
            $objectName = strtolower($object['name'] ?? '');
            $objectScore = $object['score'] ?? 0.0;
            error_log("Object #{$idx}: name={$objectName}, score={$objectScore}");
        }
    }
    
    // Check Face Detection (HIGHEST PRIORITY)
    if (!empty($faces)) {
        foreach ($faces as $face) {
            $faceConfidence = $face['detection_confidence'] ?? 0.0;
            if ($faceConfidence >= MODERATION_FACE_THRESHOLD) {
                error_log("REJECTED: Human face detected with confidence {$faceConfidence} (threshold: " . MODERATION_FACE_THRESHOLD . ")");
                FileHelper::deleteFile($tempPath);
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'message' => getErrorMessage('human_detected'),
                    'error_code' => 'human_detected',
                    'details' => [
                        'detection_method' => 'face_detection',
                        'confidence' => round($faceConfidence * 100, 1)
                    ]
                ]);
                exit;
            }
        }
    }
    
    // Check Object Localization for Person/People
    if (!empty($objects)) {
        foreach ($objects as $object) {
            $objectName = strtolower($object['name'] ?? '');
            $objectScore = $object['score'] ?? 0.0;
            
            // Check if object is "Person" or "People" with confidence ≥ 0.6
            if (($objectName === 'person' || $objectName === 'people' || $objectName === 'human') && 
                $objectScore >= MODERATION_HUMAN_OBJECT_THRESHOLD) {
                error_log("REJECTED: Human object detected - name={$objectName}, score={$objectScore} (threshold: " . MODERATION_HUMAN_OBJECT_THRESHOLD . ")");
                FileHelper::deleteFile($tempPath);
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'message' => getErrorMessage('human_detected'),
                    'error_code' => 'human_detected',
                    'details' => [
                        'detection_method' => 'object_localization',
                        'detected' => ucfirst($object['name']),
                        'confidence' => round($objectScore * 100, 1)
                    ]
                ]);
                exit;
            }
        }
    }
    
    // Labels are supporting signals only - do NOT reject based on labels alone
    
    // Step 11: Check for ANIMALS
    // Reject image ONLY IF:
    // - Object localization detects an animal with confidence ≥ 0.6
    // OR
    // - Animal label confidence ≥ 0.7 AND animal object is also detected
    // Do NOT reject based on animal labels alone (avoid false positives from paintings, logos, toys, sculptures)
    
    $labels = $apiResponse['labels'] ?? [];
    $animalLabels = defined('ANIMAL_LABELS') ? ANIMAL_LABELS : [];
    $detectedAnimalObjects = [];
    $detectedAnimalLabels = [];
    
    // Log for debugging
    error_log("Animal detection check: labels_count=" . count($labels) . ", objects_count=" . count($objects));
    
    // First, check Object Localization for animals
    if (!empty($objects)) {
        foreach ($objects as $object) {
            $objectName = strtolower($object['name'] ?? '');
            $objectScore = $object['score'] ?? 0.0;
            
            // Check if object matches any animal label
            foreach ($animalLabels as $animalLabel) {
                $animalLabelLower = strtolower($animalLabel);
                if ($objectName === $animalLabelLower || stripos($objectName, $animalLabelLower) !== false) {
                    if ($objectScore >= MODERATION_ANIMAL_OBJECT_THRESHOLD) {
                        $detectedAnimalObjects[] = [
                            'name' => $object['name'],
                            'confidence' => round($objectScore * 100, 1)
                        ];
                    }
                }
            }
        }
    }
    
    // Check Labels for animals (only used if combined with object detection)
    foreach ($labels as $label) {
        $description = strtolower($label['description'] ?? '');
        $score = $label['score'] ?? 0.0;
        
        // Check if label matches any animal label
        foreach ($animalLabels as $animalLabel) {
            $animalLabelLower = strtolower($animalLabel);
            if (stripos($description, $animalLabelLower) !== false || $description === $animalLabelLower) {
                if ($score >= MODERATION_ANIMAL_LABEL_THRESHOLD) {
                    $detectedAnimalLabels[] = [
                        'name' => $label['description'],
                        'confidence' => round($score * 100, 1)
                    ];
                }
            }
        }
    }
    
    // Reject if object detected with confidence ≥ 0.6
    if (!empty($detectedAnimalObjects)) {
        usort($detectedAnimalObjects, function($a, $b) {
            return $b['confidence'] <=> $a['confidence'];
        });
        $topAnimal = $detectedAnimalObjects[0];
        
        error_log("REJECTED: Animal object detected - name={$topAnimal['name']}, confidence={$topAnimal['confidence']}%");
        FileHelper::deleteFile($tempPath);
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => getErrorMessage('animal_detected', [
                'animal_name' => $topAnimal['name']
            ]),
            'error_code' => 'animal_detected',
            'details' => [
                'detected' => $topAnimal['name'],
                'confidence' => $topAnimal['confidence'],
                'detection_method' => 'object_localization'
            ]
        ]);
        exit;
    }
    
    // Reject if label ≥ 0.7 AND object also detected
    if (!empty($detectedAnimalLabels) && !empty($detectedAnimalObjects)) {
        usort($detectedAnimalLabels, function($a, $b) {
            return $b['confidence'] <=> $a['confidence'];
        });
        $topAnimalLabel = $detectedAnimalLabels[0];
        
        FileHelper::deleteFile($tempPath);
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => getErrorMessage('animal_detected', [
                'animal_name' => $topAnimalLabel['name']
            ]),
            'error_code' => 'animal_detected',
            'details' => [
                'detected' => $topAnimalLabel['name'],
                'confidence' => $topAnimalLabel['confidence'],
                'detection_method' => 'label_with_object'
            ]
        ]);
        exit;
    }
    
    // Step 12: Check SafeSearch (standardized thresholds: all 0.6)
    // SafeSearch checks must run AFTER image quality checks but BEFORE final approval
    $scores = $apiResponse['safesearch_scores'] ?? [];
    $adult = $scores['adult'] ?? 0.0;
    $violence = $scores['violence'] ?? 0.0;
    $racy = $scores['racy'] ?? 0.0;
    
    // Log SafeSearch scores for debugging
    error_log("SafeSearch scores: adult={$adult}, violence={$violence}, racy={$racy}");
    
    if ($adult >= MODERATION_ADULT_THRESHOLD) {
        error_log("REJECTED: Adult content detected - score={$adult} (threshold: " . MODERATION_ADULT_THRESHOLD . ")");
        FileHelper::deleteFile($tempPath);
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => getErrorMessage('adult_content'),
            'error_code' => 'adult_content'
        ]);
        exit;
    }
    
    if ($violence >= MODERATION_VIOLENCE_THRESHOLD) {
        error_log("REJECTED: Violence content detected - score={$violence} (threshold: " . MODERATION_VIOLENCE_THRESHOLD . ")");
        FileHelper::deleteFile($tempPath);
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => getErrorMessage('violence_content'),
            'error_code' => 'violence_content'
        ]);
        exit;
    }
    
    if ($racy >= MODERATION_RACY_THRESHOLD) {
        error_log("REJECTED: Racy content detected - score={$racy} (threshold: " . MODERATION_RACY_THRESHOLD . ")");
        FileHelper::deleteFile($tempPath);
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'This image contains suggestive content and cannot be uploaded.',
            'error_code' => 'racy_content'
        ]);
        exit;
    }
    
    // Log that image passed all checks
    error_log("Image passed all moderation checks - APPROVED");
    
    // Step 13: Image APPROVED - Handle based on mode
    
    // If validate_only mode, return success without saving to database
    if ($validateOnly) {
        // Keep temp file for now (will be uploaded when property is created)
        // Return validation result
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Image approved',
            'data' => [
                'validated' => true,
                'temp_file' => $tempPath, // Keep temp file path
                'filename' => $uniqueFilename,
                'moderation_status' => 'SAFE',
                'validate_only' => true
            ]
        ]);
        exit;
    }
    
    // Normal mode: Add Watermark and Save
    // Move to properties folder first
    $propertyFolder = UPLOAD_PROPERTIES_PATH . $propertyId . '/';
    if (!FileHelper::createDirectory($propertyFolder)) {
        error_log("Failed to create property folder: {$propertyFolder}");
        FileHelper::deleteFile($tempPath);
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to create property folder']);
        exit;
    }
    
    $finalPath = $propertyFolder . $uniqueFilename;
    if (!FileHelper::moveFile($tempPath, $finalPath)) {
        error_log("Failed to move file to property folder");
        FileHelper::deleteFile($tempPath);
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to save image']);
        exit;
    }
    
    // Add watermark
    try {
        if (!WatermarkService::addWatermark($finalPath)) {
            error_log("Failed to add watermark to image: {$finalPath}");
            // Continue even if watermark fails - image is still valid
        }
    } catch (Exception $e) {
        error_log("Watermark error: " . $e->getMessage());
        // Continue even if watermark fails
    }
    
    // Step 14: Move to Properties Folder (already done above)
    
    // Step 15: Save to Database
    $relativePath = 'properties/' . $propertyId . '/' . $uniqueFilename;
    $imageUrl = BASE_URL . '/uploads/' . $relativePath;
    
    $apisUsed = ['google_vision'];
    $confidenceScores = [
        'adult' => $adult,
        'violence' => $violence,
        'racy' => $scores['racy'] ?? 0.0
    ];
    $apiResponseJson = json_encode($apiResponse);
    
    try {
        $db = getDB();
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
            'Image approved successfully.',
            json_encode($apisUsed),
            json_encode($confidenceScores),
            $apiResponseJson
        ]);
        
        $imageId = $db->lastInsertId();
        
        // Step 16: Return Success
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Image approved',
            'data' => [
                'image_id' => $imageId,
                'image_url' => $imageUrl,
                'filename' => $uniqueFilename,
                'moderation_status' => 'SAFE'
            ]
        ]);
        exit;
        
    } catch (PDOException $e) {
        error_log("Failed to save image record: " . $e->getMessage());
        FileHelper::deleteFile($finalPath);
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to save image record']);
        exit;
    }
    
} catch (Exception $e) {
    error_log("Image moderation error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'An error occurred while processing the image']);
    exit;
}
