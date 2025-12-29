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
// Face detection threshold (for face detection API)
define('MODERATION_FACE_THRESHOLD', 0.5);
// Object localization threshold for Person/People detection
define('MODERATION_HUMAN_OBJECT_THRESHOLD', 0.6);

// Animal Detection Thresholds
// Object localization threshold for animal detection
define('MODERATION_ANIMAL_OBJECT_THRESHOLD', 0.6);
// Label threshold (only used when combined with object detection)
define('MODERATION_ANIMAL_LABEL_THRESHOLD', 0.7);

// Image Quality Thresholds
define('MIN_IMAGE_WIDTH', 400);
define('MIN_IMAGE_HEIGHT', 300);

// Blur Detection Thresholds (Laplacian variance)
// LOW Laplacian variance = blurry image
// HIGH Laplacian variance = sharp image
// 
// Blur decision logic:
// - If variance < HIGH_BLUR_THRESHOLD: REJECT (highly blurry - motion blur / defocus)
// - If variance >= HIGH_BLUR_THRESHOLD: ACCEPT (includes medium blur and clear images)
// 
// Medium blur (50-100) is common for:
// - Outdoor properties, landscape shots, wide-angle photos, mobile camera uploads
// These images are ACCEPTED as they have visible edges and structures
define('HIGH_BLUR_THRESHOLD', 50);      // only reject below this (highly blurry)
define('MEDIUM_BLUR_THRESHOLD', 100);   // informational only (for logging)
// Backward compatibility
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
define('WATERMARK_COLOR_R', 200);  // Light grey
define('WATERMARK_COLOR_G', 200);
define('WATERMARK_COLOR_B', 200);
define('WATERMARK_OPACITY', 30);  // 0-127, lower = more transparent (30 = semi-transparent)
define('WATERMARK_FONT_SIZE', 24);
define('WATERMARK_ANGLE', -45);  // Diagonal angle
define('WATERMARK_SPACING_X', 200);  // Horizontal spacing for repeating pattern
define('WATERMARK_SPACING_Y', 150);  // Vertical spacing for repeating pattern

// Comprehensive Human Labels to Detect (50+ terms)
define('HUMAN_LABELS', [
    // Basic human terms
    'Person', 'People', 'Human', 'Humans', 'Man', 'Men', 'Woman', 'Women',
    'Child', 'Children', 'Baby', 'Babies', 'Infant', 'Toddler', 'Kid', 'Kids',
    'Boy', 'Boys', 'Girl', 'Girls', 'Teenager', 'Teen', 'Adult', 'Adults',
    // Face and body parts
    'Face', 'Faces', 'Portrait', 'Portraits', 'Selfie', 'Selfies', 'Head', 'Heads',
    'Hand', 'Hands', 'Arm', 'Arms', 'Leg', 'Legs', 'Foot', 'Feet',
    // Groups and relationships
    'Family', 'Families', 'Crowd', 'Crowds', 'Group', 'Groups', 'Team', 'Teams',
    'Couple', 'Couples', 'Pair', 'Pairs', 'Friends', 'Friend', 'Colleagues',
    // Activities involving humans
    'Dancing', 'Running', 'Walking', 'Sitting', 'Standing', 'Playing',
    // Professional/occupational
    'Worker', 'Workers', 'Employee', 'Employees', 'Staff', 'Personnel',
    // Age-specific
    'Elderly', 'Senior', 'Youth', 'Young', 'Old'
]);

// Comprehensive Animal Labels to Detect (100+ terms)
define('ANIMAL_LABELS', [
    // Dogs (20+ breeds and terms)
    'Dog', 'Dogs', 'Puppy', 'Puppies', 'Canine', 'Canines', 'Hound', 'Hounds',
    'Terrier', 'Bulldog', 'Labrador', 'German Shepherd', 'Poodle', 'Golden Retriever',
    'Beagle', 'Rottweiler', 'Boxer', 'Dachshund', 'Siberian Husky', 'Border Collie',
    'Chihuahua', 'Shih Tzu', 'Yorkshire Terrier', 'Great Dane', 'Mastiff',
    // Cats (15+ breeds and terms)
    'Cat', 'Cats', 'Kitten', 'Kittens', 'Feline', 'Felines', 'Persian', 'Siamese',
    'Maine Coon', 'Tabby', 'British Shorthair', 'Ragdoll', 'Bengal', 'Scottish Fold',
    'Sphynx', 'Russian Blue', 'American Shorthair',
    // Birds (20+ types)
    'Bird', 'Birds', 'Parrot', 'Parrots', 'Pigeon', 'Pigeons', 'Sparrow', 'Sparrows',
    'Crow', 'Crows', 'Eagle', 'Eagles', 'Owl', 'Owls', 'Hawk', 'Hawks',
    'Chicken', 'Chickens', 'Rooster', 'Hen', 'Duck', 'Ducks', 'Goose', 'Geese',
    'Turkey', 'Turkeys', 'Peacock', 'Peacocks', 'Flamingo', 'Flamingos',
    // Fish and aquatic
    'Fish', 'Fishes', 'Aquarium', 'Goldfish', 'Tropical Fish', 'Shark', 'Sharks',
    'Dolphin', 'Dolphins', 'Whale', 'Whales', 'Seal', 'Seals', 'Sea Lion',
    // Large animals
    'Horse', 'Horses', 'Pony', 'Ponies', 'Donkey', 'Donkeys', 'Mule', 'Mules',
    'Cow', 'Cows', 'Bull', 'Bulls', 'Buffalo', 'Buffaloes', 'Cattle', 'Livestock',
    'Goat', 'Goats', 'Sheep', 'Lambs', 'Lamb', 'Ram', 'Rams', 'Pig', 'Pigs', 'Piglet',
    // Small animals
    'Rabbit', 'Rabbits', 'Bunny', 'Bunnies', 'Hamster', 'Hamsters', 'Guinea Pig',
    'Gerbil', 'Gerbils', 'Mouse', 'Mice', 'Rat', 'Rats', 'Squirrel', 'Squirrels',
    'Chipmunk', 'Chipmunks',
    // Reptiles
    'Reptile', 'Reptiles', 'Snake', 'Snakes', 'Lizard', 'Lizards', 'Turtle', 'Turtles',
    'Tortoise', 'Crocodile', 'Crocodiles', 'Alligator', 'Alligators', 'Gecko', 'Geckos',
    'Iguana', 'Iguanas', 'Chameleon', 'Chameleons',
    // Insects
    'Insect', 'Insects', 'Spider', 'Spiders', 'Butterfly', 'Butterflies', 'Bee', 'Bees',
    'Wasp', 'Wasps', 'Ant', 'Ants', 'Beetle', 'Beetles', 'Moth', 'Moths',
    // Wild animals
    'Monkey', 'Monkeys', 'Ape', 'Apes', 'Chimpanzee', 'Chimpanzees', 'Gorilla', 'Gorillas',
    'Elephant', 'Elephants', 'Tiger', 'Tigers', 'Lion', 'Lions', 'Bear', 'Bears',
    'Deer', 'Wolf', 'Wolves', 'Fox', 'Foxes', 'Zebra', 'Zebras', 'Giraffe', 'Giraffes',
    'Hippopotamus', 'Rhinoceros', 'Kangaroo', 'Kangaroos',
    // General terms
    'Pet', 'Pets', 'Animal', 'Animals', 'Wildlife', 'Mammal', 'Mammals', 'Domestic Animal'
]);

// Property Labels for Positive Detection
define('PROPERTY_LABELS', [
    'House', 'Building', 'Room', 'Interior', 'Exterior', 'Garden', 'Kitchen',
    'Bedroom', 'Bathroom', 'Living Room', 'Property', 'Real Estate',
    'Architecture', 'Home', 'Apartment', 'Floor', 'Wall', 'Ceiling',
    'Door', 'Window', 'Furniture', 'Land', 'Plot', 'Balcony', 'Terrace',
    'Pool', 'Garage', 'Driveway', 'Yard', 'Patio', 'Stairs', 'Lobby',
    'Hall', 'Office', 'Commercial', 'Residential', 'Construction', 'Structure'
]);

// Property Context Scoring Threshold
// propertyContextScore = (property-related detections) / (total meaningful detections)
// If propertyContextScore >= PROPERTY_CONTEXT_THRESHOLD → Acceptable
// If propertyContextScore < PROPERTY_CONTEXT_THRESHOLD → Flag for manual review
define('PROPERTY_CONTEXT_THRESHOLD', 0.3);

// Error Messages (User-Friendly)
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
        
        // Replace placeholders
        foreach ($replacements as $key => $value) {
            $message = str_replace('{' . $key . '}', $value, $message);
        }
        
        return $message;
    }
}
