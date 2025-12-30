<?php
/**
 * Image Moderation Configuration
 * Google Cloud Vision API Configuration for IndiaProperties.com
 */

// Google Cloud Vision API Configuration
define('GOOGLE_APPLICATION_CREDENTIALS', '/home/u123456789/Secure/indiapropertys-8fab286d41e4.json');

// Content Moderation Thresholds (0.0 to 1.0)
// Standardized SafeSearch thresholds
define('MODERATION_ADULT_THRESHOLD', 0.6);
define('MODERATION_RACY_THRESHOLD', 0.6);
define('MODERATION_VIOLENCE_THRESHOLD', 0.6);

// Human Detection Thresholds
define('MODERATION_FACE_THRESHOLD', 0.7);
define('MODERATION_HUMAN_OBJECT_THRESHOLD', 0.7);

// Animal Detection Thresholds
define('MODERATION_ANIMAL_OBJECT_THRESHOLD', 0.6);
define('MODERATION_ANIMAL_LABEL_THRESHOLD', 0.7);

// Image Quality Thresholds
define('MIN_IMAGE_WIDTH', 400);
define('MIN_IMAGE_HEIGHT', 300);

// Blur Detection Thresholds
define('HIGH_BLUR_THRESHOLD', 50);
define('MEDIUM_BLUR_THRESHOLD', 100);
define('BLUR_THRESHOLD', HIGH_BLUR_THRESHOLD);

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

// Watermark Settings
define('WATERMARK_TEXT', 'indiapropertys');
define('WATERMARK_COLOR_R', 200);
define('WATERMARK_COLOR_G', 200);
define('WATERMARK_COLOR_B', 200);
define('WATERMARK_OPACITY', 30);
define('WATERMARK_FONT_SIZE', 24);
define('WATERMARK_ANGLE', -45);
define('WATERMARK_SPACING_X', 200);
define('WATERMARK_SPACING_Y', 150);

// =======================
// HUMAN LABELS (MODIFIED)
// =======================
define('HUMAN_LABELS', [
    // Basic human terms
    'Person', 'People', 'Human', 'Humans', 'Man', 'Men', 'Woman', 'Women',
    'Child', 'Children', 'Baby', 'Babies', 'Infant', 'Toddler', 'Kid', 'Kids',
    'Boy', 'Boys', 'Girl', 'Girls', 'Teenager', 'Teen', 'Adult', 'Adults',

    // Face-related (kept)
    'Face', 'Faces', 'Portrait', 'Portraits', 'Selfie', 'Selfies',

    // Groups
    'Family', 'Families', 'Crowd', 'Crowds', 'Group', 'Groups',
    'Team', 'Teams', 'Couple', 'Couples', 'Friends', 'Friend',

    // Professional
    'Worker', 'Workers', 'Employee', 'Employees', 'Staff', 'Personnel',

    // Age-specific
    'Elderly', 'Senior', 'Youth', 'Young', 'Old'
]);

// =======================
// ANIMAL LABELS (MODIFIED)
// =======================
define('ANIMAL_LABELS', [
    // Dogs
    'Dog', 'Dogs', 'Puppy', 'Puppies', 'Canine', 'Canines', 'Hound', 'Hounds',
    'Terrier', 'Bulldog', 'Labrador', 'German Shepherd', 'Poodle',
    'Golden Retriever', 'Beagle', 'Rottweiler', 'Boxer',

    // Cats
    'Cat', 'Cats', 'Kitten', 'Kittens', 'Feline', 'Felines',
    'Persian', 'Siamese', 'Maine Coon', 'Bengal',

    // Birds
    'Bird', 'Birds', 'Parrot', 'Parrots', 'Pigeon', 'Pigeons',
    'Crow', 'Crows', 'Eagle', 'Eagles', 'Owl', 'Owls',

    // Farm & large animals
    'Horse', 'Horses', 'Cow', 'Cows', 'Buffalo', 'Goat', 'Goats',
    'Sheep', 'Pig', 'Pigs',

    // Wild animals (specific only)
    'Monkey', 'Monkeys', 'Elephant', 'Elephants',
    'Tiger', 'Tigers', 'Lion', 'Lions', 'Bear', 'Bears'
]);

// =======================
// PROPERTY LABELS (MODIFIED)
// =======================
define('PROPERTY_LABELS', [
    'House', 'Building', 'Room', 'Interior', 'Exterior',
    'Kitchen', 'Bedroom', 'Bathroom', 'Living Room',
    'Property', 'Real Estate', 'Architecture', 'Home',
    'Apartment', 'Floor', 'Wall', 'Ceiling',
    'Door', 'Window', 'Furniture',
    'Land', 'Plot', 'Balcony', 'Terrace',
    'Pool', 'Garage', 'Driveway',

    // Outdoor / landscape property support (ADDED)
    'Tree', 'Trees', 'Grass', 'Field', 'Meadow',
    'Landscape', 'Countryside', 'Rural',
    'Hillside', 'Mountain', 'Farm', 'Yard'
]);

// Property Context Threshold
define('PROPERTY_CONTEXT_THRESHOLD', 0.3);

// Error Messages (UNCHANGED)
if (!function_exists('getErrorMessage')) {
    function getErrorMessage($code, $replacements = []) {
        $messages = [
            'human_detected' => 'You have uploaded an image with human appearance. Please upload only property images without any people.',
            'animal_detected' => 'You have uploaded an image with animal appearance ({animal_name}). Please upload only property images without any animals or pets.',
            'blur_detected' => 'You have uploaded a blurry image. Please upload a clear and sharp photo.',
            'low_quality' => 'You have uploaded a low quality image. Your image is {width}x{height} pixels. Minimum required is 400x300 pixels.',
            'adult_content' => 'This image contains inappropriate content and cannot be uploaded.',
            'violence_content' => 'This image contains violent content and cannot be uploaded.',
            'not_property' => 'This image does not appear to be a property photo. Please upload images of the property only.',
            'file_too_large' => 'Image file is too large. Maximum size is 5MB.',
            'invalid_type' => 'Invalid file type. Please upload JPG, PNG, or WebP images only.'
        ];

        $message = $messages[$code] ?? 'An error occurred.';

        foreach ($replacements as $key => $value) {
            $message = str_replace('{' . $key . '}', $value, $message);
        }

        return $message;
    }
}
