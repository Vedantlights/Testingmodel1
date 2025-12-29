<?php
/**
 * Image Moderation Configuration
 * Google Cloud Vision API Configuration for IndiaProperties.com
 */

// Google Cloud Vision API Configuration
define('GOOGLE_APPLICATION_CREDENTIALS', '/home/u123456789/Secure/indiapropertys-8fab286d41e4.json');

// Content Moderation Thresholds (0.0 to 1.0)
define('MODERATION_ADULT_THRESHOLD', 0.6);
define('MODERATION_RACY_THRESHOLD', 0.7);
define('MODERATION_VIOLENCE_THRESHOLD', 0.5);

// Animal Detection Threshold
define('MODERATION_ANIMAL_THRESHOLD', 0.6);

// Image Quality Thresholds
define('MIN_IMAGE_WIDTH', 400);
define('MIN_IMAGE_HEIGHT', 300);
define('MAX_BLUR_SCORE', 0.4);  // Higher score = more blurry, reject if above this

// File Upload Settings
define('MAX_IMAGE_SIZE_MB', 5);
define('MAX_IMAGE_SIZE_BYTES', MAX_IMAGE_SIZE_MB * 1024 * 1024);
define('ALLOWED_IMAGE_TYPES', ['jpg', 'jpeg', 'png', 'webp']);
define('ALLOWED_MIME_TYPES', ['image/jpeg', 'image/png', 'image/webp']);

// Upload Paths
define('UPLOAD_TEMP_PATH', $_SERVER['DOCUMENT_ROOT'] . '/uploads/temp/');
define('UPLOAD_PROPERTIES_PATH', $_SERVER['DOCUMENT_ROOT'] . '/uploads/properties/');
define('UPLOAD_REVIEW_PATH', $_SERVER['DOCUMENT_ROOT'] . '/uploads/review/');
define('UPLOAD_REJECTED_PATH', $_SERVER['DOCUMENT_ROOT'] . '/uploads/rejected/');

// Error Messages (User-Friendly)
// Note: Using function to handle dynamic replacements
if (!function_exists('getErrorMessage')) {
    function getErrorMessage($code, $replacements = []) {
        $messages = [
            'animal_detected' => 'This image contains an animal ({animal_name}). Please upload only property images without pets or animals.',
            'blur_detected' => 'This image is too blurry. Please upload a clearer photo.',
            'low_quality' => 'This image quality is too low. Please upload a higher resolution image (minimum 400x300 pixels).',
            'adult_content' => 'This image contains inappropriate content and cannot be uploaded.',
            'violence_content' => 'This image contains violent content and cannot be uploaded.',
            'not_property' => 'This image does not appear to be a property photo. Please upload images of the property only.',
            'file_too_large' => 'Image file is too large. Maximum size is 5MB.',
            'invalid_type' => 'Invalid file type. Please upload JPG, PNG, or WebP images only.'
        ];
        
        $message = $messages[$code] ?? 'An error occurred.';
        
        // Replace placeholders
        foreach ($replacements as $key => $value) {
            $message = str_replace('{' . $key . '}', $value, $message);
        }
        
        return $message;
    }
}

