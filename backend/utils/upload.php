<?php
/**
 * File Upload Helper Functions
 */

require_once __DIR__ . '/../config/config.php';

/**
 * Upload property image
 */
function uploadPropertyImage($file, $propertyId) {
    $errors = validateFileUpload($file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
    if (!empty($errors)) {
        return ['success' => false, 'errors' => $errors];
    }
    
    // Ensure upload directory exists
    if (!file_exists(PROPERTY_IMAGES_DIR)) {
        $created = @mkdir(PROPERTY_IMAGES_DIR, 0755, true);
        if (!$created && !file_exists(PROPERTY_IMAGES_DIR)) {
            error_log("Failed to create upload directory: " . PROPERTY_IMAGES_DIR);
            return ['success' => false, 'errors' => ['Failed to create upload directory. Please check server permissions.']];
        }
    }
    
    // Check if directory is writable
    if (!is_writable(PROPERTY_IMAGES_DIR)) {
        error_log("Upload directory is not writable: " . PROPERTY_IMAGES_DIR);
        return ['success' => false, 'errors' => ['Upload directory is not writable. Please check server permissions.']];
    }
    
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'prop_' . $propertyId . '_' . time() . '_' . uniqid() . '.' . $extension;
    $destination = PROPERTY_IMAGES_DIR . $filename;
    
    // Check if temp file exists
    if (!file_exists($file['tmp_name'])) {
        error_log("Temporary file does not exist: {$file['tmp_name']}");
        return ['success' => false, 'errors' => ['Temporary file not found. Please try again.']];
    }
    
    // Check if temp file is readable
    if (!is_readable($file['tmp_name'])) {
        error_log("Temporary file is not readable: {$file['tmp_name']}");
        return ['success' => false, 'errors' => ['Temporary file cannot be read. Please try again.']];
    }
    
    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        $error = error_get_last();
        error_log("Failed to move uploaded file from {$file['tmp_name']} to {$destination}");
        error_log("PHP Error: " . ($error ? $error['message'] : 'Unknown error'));
        error_log("Upload error code: " . ($file['error'] ?? 'N/A'));
        return ['success' => false, 'errors' => ['Failed to upload image. Please check server permissions and try again.']];
    }
    
    // Verify file was saved
    if (!file_exists($destination)) {
        error_log("File was not saved to destination: {$destination}");
        return ['success' => false, 'errors' => ['File was not saved correctly. Please try again.']];
    }
    
    // Verify file is readable
    if (!is_readable($destination)) {
        error_log("Uploaded file is not readable: {$destination}");
        return ['success' => false, 'errors' => ['Uploaded file cannot be read. Please try again.']];
    }
    
    $url = UPLOAD_BASE_URL . '/properties/images/' . $filename;
    return ['success' => true, 'url' => $url, 'filename' => $filename];
}

/**
 * Upload property video
 */
function uploadPropertyVideo($file, $propertyId) {
    $errors = validateFileUpload($file, ALLOWED_VIDEO_TYPES, MAX_VIDEO_SIZE);
    if (!empty($errors)) {
        return ['success' => false, 'errors' => $errors];
    }
    
    // Ensure upload directory exists
    if (!file_exists(PROPERTY_VIDEOS_DIR)) {
        $created = @mkdir(PROPERTY_VIDEOS_DIR, 0755, true);
        if (!$created && !file_exists(PROPERTY_VIDEOS_DIR)) {
            error_log("Failed to create upload directory: " . PROPERTY_VIDEOS_DIR);
            return ['success' => false, 'errors' => ['Failed to create upload directory. Please check server permissions.']];
        }
    }
    
    // Check if directory is writable
    if (!is_writable(PROPERTY_VIDEOS_DIR)) {
        error_log("Upload directory is not writable: " . PROPERTY_VIDEOS_DIR);
        return ['success' => false, 'errors' => ['Upload directory is not writable. Please check server permissions.']];
    }
    
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'prop_' . $propertyId . '_' . time() . '_' . uniqid() . '.' . $extension;
    $destination = PROPERTY_VIDEOS_DIR . $filename;
    
    // Check if temp file exists and is readable
    if (!file_exists($file['tmp_name']) || !is_readable($file['tmp_name'])) {
        error_log("Temporary video file issue: {$file['tmp_name']}");
        return ['success' => false, 'errors' => ['Temporary file issue. Please try again.']];
    }
    
    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        $error = error_get_last();
        error_log("Failed to move uploaded video from {$file['tmp_name']} to {$destination}");
        error_log("PHP Error: " . ($error ? $error['message'] : 'Unknown error'));
        return ['success' => false, 'errors' => ['Failed to upload video. Please check server permissions and try again.']];
    }
    
    // Verify file was saved
    if (!file_exists($destination) || !is_readable($destination)) {
        error_log("Video file was not saved correctly to destination: {$destination}");
        return ['success' => false, 'errors' => ['Video file was not saved correctly. Please try again.']];
    }
    
    $url = UPLOAD_BASE_URL . '/properties/videos/' . $filename;
    return ['success' => true, 'url' => $url, 'filename' => $filename];
}

/**
 * Upload property brochure
 */
function uploadPropertyBrochure($file, $propertyId) {
    $errors = validateFileUpload($file, ALLOWED_BROCHURE_TYPES, MAX_BROCHURE_SIZE);
    if (!empty($errors)) {
        return ['success' => false, 'errors' => $errors];
    }
    
    // Ensure upload directory exists
    if (!file_exists(PROPERTY_BROCHURES_DIR)) {
        $created = @mkdir(PROPERTY_BROCHURES_DIR, 0755, true);
        if (!$created && !file_exists(PROPERTY_BROCHURES_DIR)) {
            error_log("Failed to create upload directory: " . PROPERTY_BROCHURES_DIR);
            return ['success' => false, 'errors' => ['Failed to create upload directory. Please check server permissions.']];
        }
    }
    
    // Check if directory is writable
    if (!is_writable(PROPERTY_BROCHURES_DIR)) {
        error_log("Upload directory is not writable: " . PROPERTY_BROCHURES_DIR);
        return ['success' => false, 'errors' => ['Upload directory is not writable. Please check server permissions.']];
    }
    
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'prop_' . $propertyId . '_' . time() . '_' . uniqid() . '.' . $extension;
    $destination = PROPERTY_BROCHURES_DIR . $filename;
    
    // Check if temp file exists and is readable
    if (!file_exists($file['tmp_name']) || !is_readable($file['tmp_name'])) {
        error_log("Temporary brochure file issue: {$file['tmp_name']}");
        return ['success' => false, 'errors' => ['Temporary file issue. Please try again.']];
    }
    
    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        $error = error_get_last();
        error_log("Failed to move uploaded brochure from {$file['tmp_name']} to {$destination}");
        error_log("PHP Error: " . ($error ? $error['message'] : 'Unknown error'));
        return ['success' => false, 'errors' => ['Failed to upload brochure. Please check server permissions and try again.']];
    }
    
    // Verify file was saved
    if (!file_exists($destination) || !is_readable($destination)) {
        error_log("Brochure file was not saved correctly to destination: {$destination}");
        return ['success' => false, 'errors' => ['Brochure file was not saved correctly. Please try again.']];
    }
    
    $url = UPLOAD_BASE_URL . '/properties/brochures/' . $filename;
    return ['success' => true, 'url' => $url, 'filename' => $filename];
}

/**
 * Delete file
 */
function deleteFile($filePath) {
    if (file_exists($filePath)) {
        return unlink($filePath);
    }
    return false;
}

/**
 * Extract filename from URL
 */
function getFilenameFromUrl($url) {
    return basename(parse_url($url, PHP_URL_PATH));
}

