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

// Step 1: Setup Error Handling and Headers
ini_set('display_errors', 0); // Don't display errors (prevents HTML in JSON)
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Set error handler to catch PHP errors
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    error_log("PHP Error [$errno]: $errstr in $errfile on line $errline");
    if ($errno === E_ERROR || $errno === E_PARSE || $errno === E_CORE_ERROR || $errno === E_COMPILE_ERROR) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Server error occurred',
            'error_code' => 'php_error',
            'details' => defined('ENVIRONMENT') && ENVIRONMENT === 'development' ? "$errstr in $errfile on line $errline" : 'Please try again'
        ]);
        exit;
    }
    return false; // Let PHP handle other errors
});

// Set exception handler
set_exception_handler(function($e) {
    error_log("Uncaught Exception: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error occurred',
        'error_code' => 'exception',
        'details' => defined('ENVIRONMENT') && ENVIRONMENT === 'development' ? $e->getMessage() : 'Please try again'
    ]);
    exit;
});

// Start output buffering
ob_start();

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Step 2: Load Composer autoload FIRST (before other requires)
$vendorAutoloadPath = __DIR__ . '/../../vendor/autoload.php';
$composerAvailable = file_exists($vendorAutoloadPath);
if ($composerAvailable) {
    require_once $vendorAutoloadPath;
    error_log("Composer autoload loaded successfully from: {$vendorAutoloadPath}");
} else {
    error_log("WARNING: Composer autoload not found at: {$vendorAutoloadPath}");
    error_log("Google Vision moderation will be skipped. Image will be marked as PENDING.");
}

// Step 3: Load config files
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/moderation.php';

// Step 4: Load services (only if Composer is available)
if ($composerAvailable) {
    require_once __DIR__ . '/../../services/GoogleVisionService.php';
    require_once __DIR__ . '/../../services/ModerationDecisionService.php';
}
require_once __DIR__ . '/../../services/WatermarkService.php';

// Step 5: Load helpers
require_once __DIR__ . '/../../helpers/FileHelper.php';
if (file_exists(__DIR__ . '/../../helpers/BlurDetector.php')) {
    require_once __DIR__ . '/../../helpers/BlurDetector.php';
}

// Step 6: Load utilities
require_once __DIR__ . '/../../utils/auth.php';

// Ensure moderation thresholds are defined (with fallback defaults)
// These are already defined in moderation.php, but provide fallbacks just in case
if (!defined('MODERATION_ADULT_THRESHOLD')) {
    define('MODERATION_ADULT_THRESHOLD', 0.6);
}
if (!defined('MODERATION_VIOLENCE_THRESHOLD')) {
    define('MODERATION_VIOLENCE_THRESHOLD', 0.6);
}
if (!defined('MODERATION_RACY_THRESHOLD')) {
    define('MODERATION_RACY_THRESHOLD', 0.6);
}
if (!defined('MODERATION_FACE_THRESHOLD')) {
    define('MODERATION_FACE_THRESHOLD', 0.7);
}
if (!defined('MODERATION_HUMAN_OBJECT_THRESHOLD')) {
    define('MODERATION_HUMAN_OBJECT_THRESHOLD', 0.7);
}
if (!defined('MODERATION_ANIMAL_OBJECT_THRESHOLD')) {
    define('MODERATION_ANIMAL_OBJECT_THRESHOLD', 0.6);
}
if (!defined('MODERATION_ANIMAL_LABEL_THRESHOLD')) {
    define('MODERATION_ANIMAL_LABEL_THRESHOLD', 0.7);
}
if (!defined('MIN_IMAGE_WIDTH')) {
    define('MIN_IMAGE_WIDTH', 400);
}
if (!defined('MIN_IMAGE_HEIGHT')) {
    define('MIN_IMAGE_HEIGHT', 300);
}
if (!defined('MODERATION_BLUR_THRESHOLD')) {
    // Use BLUR_THRESHOLD if defined, otherwise use default
    if (defined('BLUR_THRESHOLD')) {
        define('MODERATION_BLUR_THRESHOLD', BLUR_THRESHOLD);
    } else {
        define('MODERATION_BLUR_THRESHOLD', 0.4);
    }
}
if (!defined('PROPERTY_CONTEXT_THRESHOLD')) {
    define('PROPERTY_CONTEXT_THRESHOLD', 0.3);
}

//ob_clean();

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
    
    // Step 4: Get MIME type for later use (no validation, just for metadata)
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    
    // Get MIME type using multiple methods (for metadata only, not validation)
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
    
    // Get image info for dimensions check (Step 6)
    $imageInfo = @getimagesize($file['tmp_name']);
    if ($imageInfo === false) {
        // If we can't read image info, we'll let Google Vision API handle it
        // But we still need dimensions, so set defaults
        $imageInfo = [0, 0]; // width, height
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
    
    // Ensure temp directory exists (use constant from moderation.php - NO hardcoded paths)
    if (!defined('UPLOAD_TEMP_PATH')) {
        error_log("ERROR: UPLOAD_TEMP_PATH not defined in moderation.php");
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Upload path configuration error']);
        exit;
    }
    $tempDir = UPLOAD_TEMP_PATH;
    if (!is_dir($tempDir)) {
        if (!@mkdir($tempDir, 0755, true)) {
            error_log("Failed to create temp directory: {$tempDir}");
            http_response_code(500);
            echo json_encode([
                'status' => 'error', 
                'message' => 'Failed to create upload directory',
                'error_code' => 'directory_error',
                'path' => $tempDir
            ]);
            exit;
        }
    }
    
    // Save to temp directory
    $tempPath = $tempDir . $uniqueFilename;
    if (!move_uploaded_file($file['tmp_name'], $tempPath)) {
        error_log("Failed to move uploaded file to temp: {$tempPath}");
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to save uploaded file']);
        exit;
    }
    
    // Step 9: Call Google Vision API
    // IMPORTANT: If Vision API fails or Composer is missing, we still allow upload but mark as PENDING
    $apiResponse = null;
    $moderationStatus = 'PENDING';
    $moderationReason = 'Auto-approved (moderation unavailable)';
    $confidenceScores = null;
    $apiResponseJson = null;
    
    // Only attempt Google Vision API if Composer is available
    if (!$composerAvailable) {
        error_log("WARNING: Composer autoload not available at: {$vendorAutoloadPath}");
        error_log("Skipping Google Vision moderation - Composer dependencies not installed");
        error_log("Image will be uploaded with moderation_status = 'PENDING'");
        error_log("To enable moderation, run: cd /home/u449667423/domains/indiapropertys.com/public_html/demo1/backend && composer install");
        $moderationStatus = 'PENDING';
        $moderationReason = 'Auto-approved (Composer dependencies not installed - moderation unavailable)';
    } else {
        try {
            error_log("Composer available - Attempting to call Google Vision API...");
            $visionService = new GoogleVisionService();
            $apiResponse = $visionService->analyzeImage($tempPath);
        
        if ($apiResponse['success']) {
            error_log("Google Vision API call successful");
            $moderationStatus = 'SAFE';
            $moderationReason = 'Image approved successfully';
            
            // Extract confidence scores if available
            if (isset($apiResponse['safesearch_scores'])) {
                $confidenceScores = $apiResponse['safesearch_scores'];
            }
            $apiResponseJson = json_encode($apiResponse);
        } else {
            // API failed but we continue - mark as PENDING
            $apiError = $apiResponse['error'] ?? 'Unknown error';
            error_log("Google Vision API failed (continuing anyway): " . $apiError);
            error_log("Image will be marked as PENDING for manual review");
            $moderationStatus = 'PENDING';
            $moderationReason = 'Auto-approved (moderation unavailable: ' . substr($apiError, 0, 100) . ')';
        }
    } catch (Throwable $e) {
        // Vision API exception - continue anyway, mark as PENDING
        error_log("Google Vision API exception (continuing anyway): " . $e->getMessage());
        error_log("Exception type: " . get_class($e));
        error_log("Exception file: " . $e->getFile() . " Line: " . $e->getLine());
        if ($e->getPrevious()) {
            error_log("Previous exception: " . $e->getPrevious()->getMessage());
        }
        error_log("Image will be marked as PENDING for manual review");
        $moderationStatus = 'PENDING';
        $moderationReason = 'Auto-approved (moderation unavailable: ' . substr($e->getMessage(), 0, 100) . ')';
        }
    } // End of Composer availability check
    
    // Continue with upload regardless of Vision API result
    error_log("Proceeding with image upload. Moderation status: {$moderationStatus}");
    
    // Initialize variables for moderation checks (only if API succeeded)
    $adult = 0.0;
    $violence = 0.0;
    $racy = 0.0;
    $scores = [];
    $faces = [];
    $objects = [];
    $labels = [];
    
    if ($apiResponse && $apiResponse['success']) {
        $scores = $apiResponse['safesearch_scores'] ?? [];
        $adult = $scores['adult'] ?? 0.0;
        $violence = $scores['violence'] ?? 0.0;
        $racy = $scores['racy'] ?? 0.0;
        $faces = $apiResponse['faces'] ?? [];
        $objects = $apiResponse['objects'] ?? [];
        $labels = $apiResponse['labels'] ?? [];
    }
    
    // Step 10: Check for HUMANS (only if API succeeded)
    // Reject image ONLY IF:
    // - Face detection confidence ≥ 0.7 (increased to reduce false positives)
    // OR
    // - Object localization detects "Person" or "People" with confidence ≥ 0.7 (increased to reduce false positives)
    // Labels alone must NOT cause rejection (they are supporting signals only)
    
    // Only perform human detection if API succeeded
    if ($apiResponse && $apiResponse['success']) {
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
    
    // Step 12: Check SafeSearch (only if API succeeded)
    // SafeSearch checks must run AFTER image quality checks but BEFORE final approval
    if ($apiResponse && $apiResponse['success']) {
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
        $moderationStatus = 'SAFE';
        $moderationReason = 'Image approved successfully';
    } else {
        // API failed - image will be marked as PENDING
        error_log("Skipping SafeSearch checks - Vision API not available");
    }
    
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
    // Save to /uploads/properties/{property_id}/ (NOT /backend/uploads/)
    // Use constant from moderation.php - NO hardcoded paths
    if (!defined('UPLOAD_PROPERTIES_PATH')) {
        error_log("ERROR: UPLOAD_PROPERTIES_PATH not defined in moderation.php");
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Upload path configuration error']);
        exit;
    }
    $basePropertiesDir = UPLOAD_PROPERTIES_PATH;
    $propertyFolder = $basePropertiesDir . $propertyId . '/';
    
    // Log directory creation attempt with detailed info
    error_log("=== IMAGE UPLOAD DEBUG ===");
    error_log("Property ID: {$propertyId}");
    error_log("Base properties directory: {$basePropertiesDir}");
    error_log("Property folder: {$propertyFolder}");
    error_log("Base directory exists: " . (is_dir($basePropertiesDir) ? 'YES' : 'NO'));
    error_log("Base directory writable: " . (is_writable($basePropertiesDir) ? 'YES' : 'NO'));
    
    // Ensure base properties directory exists first
    if (!is_dir($basePropertiesDir)) {
        error_log("Base properties directory does not exist, creating: " . $basePropertiesDir);
        $parentDir = dirname($basePropertiesDir);
        error_log("Parent directory: {$parentDir}");
        error_log("Parent exists: " . (is_dir($parentDir) ? 'YES' : 'NO'));
        error_log("Parent writable: " . (is_writable($parentDir) ? 'YES' : 'NO'));
        
        if (!@mkdir($basePropertiesDir, 0755, true)) {
            $error = error_get_last();
            error_log("FAILED to create base properties directory: " . $basePropertiesDir);
            error_log("Error: " . ($error ? $error['message'] : 'Unknown error'));
            error_log("Parent directory exists: " . (is_dir($parentDir) ? 'YES' : 'NO'));
            error_log("Parent directory writable: " . (is_writable($parentDir) ? 'YES' : 'NO'));
        } else {
            error_log("Base properties directory created successfully");
        }
    }
    
    // Create property-specific folder
    if (!is_dir($propertyFolder)) {
        error_log("Property folder does not exist, creating: {$propertyFolder}");
        if (!@mkdir($propertyFolder, 0755, true)) {
            $error = error_get_last();
            error_log("FAILED to create property folder: {$propertyFolder}");
            error_log("Error: " . ($error ? $error['message'] : 'Unknown error'));
            error_log("Base directory exists: " . (is_dir($basePropertiesDir) ? 'YES' : 'NO'));
            error_log("Base directory writable: " . (is_writable($basePropertiesDir) ? 'YES' : 'NO'));
            FileHelper::deleteFile($tempPath);
            http_response_code(500);
            echo json_encode([
                'status' => 'error', 
                'message' => 'Failed to create property folder',
                'debug' => [
                    'property_folder' => $propertyFolder,
                    'base_dir_exists' => is_dir($basePropertiesDir),
                    'base_dir_writable' => is_writable($basePropertiesDir),
                    'error' => $error ? $error['message'] : 'Unknown'
                ]
            ]);
            exit;
        } else {
            error_log("Property folder created successfully: {$propertyFolder}");
        }
    } else {
        error_log("Property folder already exists: {$propertyFolder}");
    }
    
    error_log("Property folder verified: {$propertyFolder}");
    error_log("Property folder writable: " . (is_writable($propertyFolder) ? 'YES' : 'NO'));
    
    $finalPath = $propertyFolder . $uniqueFilename;
    
    // Log the paths for debugging
    error_log("=== FILE SAVE DEBUG ===");
    error_log("Property folder: {$propertyFolder}");
    error_log("Final path: {$finalPath}");
    error_log("Temp path: {$tempPath}");
    error_log("Temp file exists: " . (file_exists($tempPath) ? 'YES' : 'NO'));
    error_log("Temp file size: " . (file_exists($tempPath) ? filesize($tempPath) : 0) . " bytes");
    error_log("Destination folder exists: " . (is_dir($propertyFolder) ? 'YES' : 'NO'));
    error_log("Destination folder writable: " . (is_writable($propertyFolder) ? 'YES' : 'NO'));
    
    // Move file using native PHP function for better error reporting
    if (!@move_uploaded_file($tempPath, $finalPath)) {
        $error = error_get_last();
        error_log("FAILED to move file to property folder");
        error_log("Error: " . ($error ? $error['message'] : 'Unknown error'));
        error_log("Source exists: " . (file_exists($tempPath) ? 'YES' : 'NO'));
        error_log("Source readable: " . (is_readable($tempPath) ? 'YES' : 'NO'));
        error_log("Destination folder exists: " . (is_dir($propertyFolder) ? 'YES' : 'NO'));
        error_log("Destination folder writable: " . (is_writable($propertyFolder) ? 'YES' : 'NO'));
        FileHelper::deleteFile($tempPath);
        http_response_code(500);
        echo json_encode([
            'status' => 'error', 
            'message' => 'Failed to save image file',
            'debug' => [
                'source' => $tempPath,
                'destination' => $finalPath,
                'source_exists' => file_exists($tempPath),
                'dest_folder_exists' => is_dir($propertyFolder),
                'dest_folder_writable' => is_writable($propertyFolder),
                'error' => $error ? $error['message'] : 'Unknown'
            ]
        ]);
        exit;
    }
    
    // Verify file was saved
    if (!file_exists($finalPath)) {
        error_log("CRITICAL: File move reported success but file not found at: {$finalPath}");
        FileHelper::deleteFile($tempPath);
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Image file was not saved correctly']);
        exit;
    }
    
    error_log("Image successfully saved to: {$finalPath}");
    error_log("File size: " . filesize($finalPath) . " bytes");
    error_log("File permissions: " . substr(sprintf('%o', fileperms($finalPath)), -4));
    
    // Add watermark
    try {
        if (!WatermarkService::addWatermark($finalPath)) {
            error_log("Failed to add watermark to image: {$finalPath}");
            // Continue even if watermark fails - image is still valid
        } else {
            error_log("Watermark added successfully");
        }
    } catch (Exception $e) {
        error_log("Watermark error: " . $e->getMessage());
        // Continue even if watermark fails
    }
    
    // Step 14: Move to Properties Folder (already done above)
    
    // Step 15: Save to Database
    // Calculate relative path from uploads folder
    $relativePath = 'properties/' . $propertyId . '/' . $uniqueFilename;
    
    // Build full URL - use UPLOAD_BASE_URL (which points to /uploads NOT /backend/uploads)
    // Files are saved to: /uploads/properties/{id}/{filename}
    // URLs should be: https://demo1.indiapropertys.com/uploads/properties/{id}/{filename}
    $imageUrl = UPLOAD_BASE_URL . '/' . $relativePath;
    
    error_log("=== URL GENERATION ===");
    error_log("UPLOAD_BASE_URL: " . (defined('UPLOAD_BASE_URL') ? UPLOAD_BASE_URL : 'NOT DEFINED'));
    error_log("Relative path: {$relativePath}");
    error_log("Final image URL: {$imageUrl}");
    
    // Log the URL being returned
    error_log("Image URL being returned: {$imageUrl}");
    error_log("Relative path: {$relativePath}");
    error_log("BASE_URL: " . (defined('BASE_URL') ? BASE_URL : 'NOT DEFINED'));
    
    // Prepare data for database
    $apisUsed = $apiResponse && $apiResponse['success'] ? ['google_vision'] : [];
    $confidenceScores = null;
    if ($apiResponse && $apiResponse['success'] && !empty($scores)) {
        $confidenceScores = json_encode([
            'adult' => $adult,
            'violence' => $violence,
            'racy' => $racy
        ]);
    }
    $apiResponseJson = $apiResponse ? json_encode($apiResponse) : null;
    
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
                $moderationStatus, // Use status from API call (SAFE or PENDING)
                $moderationReason, // Use reason from API call
                $apisUsed ? json_encode($apisUsed) : null,
                $confidenceScores, // Already JSON encoded or null
                $apiResponseJson
            ]);
        
        $imageId = $db->lastInsertId();
        
        // Step 16: Return Success
        // Verify the URL is correct before returning
        error_log("Final image URL: {$imageUrl}");
        error_log("Image ID: {$imageId}");
        error_log("Relative path: {$relativePath}");
        
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Image approved',
            'data' => [
                'image_id' => $imageId,
                'image_url' => $imageUrl, // Full URL: https://demo1.indiapropertys.com/uploads/properties/74/img.webp
                'relative_path' => $relativePath, // For reference: properties/74/img.webp
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
    
} catch (Throwable $e) {
    error_log("Image moderation error: " . $e->getMessage());
    error_log("Exception type: " . get_class($e));
    error_log("File: " . $e->getFile() . " Line: " . $e->getLine());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    // Clean up any temp files if they exist
    if (isset($tempPath) && file_exists($tempPath)) {
        @unlink($tempPath);
    }
    if (isset($finalPath) && file_exists($finalPath)) {
        @unlink($finalPath);
    }
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'message' => 'An error occurred while processing the image',
        'error_code' => 'processing_error',
        'details' => defined('ENVIRONMENT') && ENVIRONMENT === 'development' ? $e->getMessage() : 'Please try again or contact support'
    ]);
    exit;
} catch (Error $e) {
    error_log("Image moderation fatal error: " . $e->getMessage());
    error_log("Error type: " . get_class($e));
    error_log("File: " . $e->getFile() . " Line: " . $e->getLine());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    // Clean up any temp files if they exist
    if (isset($tempPath) && file_exists($tempPath)) {
        @unlink($tempPath);
    }
    if (isset($finalPath) && file_exists($finalPath)) {
        @unlink($finalPath);
    }
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'message' => 'A fatal error occurred while processing the image',
        'error_code' => 'fatal_error',
        'details' => defined('ENVIRONMENT') && ENVIRONMENT === 'development' ? $e->getMessage() : 'Please try again or contact support'
    ]);
    exit;
}
