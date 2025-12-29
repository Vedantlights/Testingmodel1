<?php
/**
 * Image Moderation Configuration
 * Google Cloud Vision API Configuration for IndiaProperties.com
 */

// Google Cloud Vision API Configuration
define('GOOGLE_APPLICATION_CREDENTIALS', '/home/u123456789/Secure/indiapropertys-8fab286d41e4.json');

// Moderation Thresholds (0.0 to 1.0)
// These values determine when content is flagged as unsafe or needs review
define('MODERATION_ADULT_THRESHOLD', 0.6);
define('MODERATION_RACY_THRESHOLD', 0.7);
define('MODERATION_VIOLENCE_THRESHOLD', 0.5);
define('MODERATION_MEDICAL_THRESHOLD', 0.6);
define('MODERATION_ANIMAL_THRESHOLD', 0.7);

// File Upload Settings
define('MAX_IMAGE_SIZE_MB', 5);
define('MAX_IMAGE_SIZE_BYTES', MAX_IMAGE_SIZE_MB * 1024 * 1024);
define('ALLOWED_IMAGE_TYPES', ['jpg', 'jpeg', 'png', 'webp']);
define('ALLOWED_MIME_TYPES', ['image/jpeg', 'image/png', 'image/webp']);

// Upload Paths
// Using DOCUMENT_ROOT to ensure absolute paths work correctly
define('UPLOAD_TEMP_PATH', $_SERVER['DOCUMENT_ROOT'] . '/uploads/temp/');
define('UPLOAD_PROPERTIES_PATH', $_SERVER['DOCUMENT_ROOT'] . '/uploads/properties/');
define('UPLOAD_REVIEW_PATH', $_SERVER['DOCUMENT_ROOT'] . '/uploads/review/');
define('UPLOAD_REJECTED_PATH', $_SERVER['DOCUMENT_ROOT'] . '/uploads/rejected/');

