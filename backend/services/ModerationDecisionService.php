<?php
/**
 * Moderation Decision Service
 * Evaluates Google Vision API responses and makes moderation decisions
 * Checks: Image Quality → Animals → SafeSearch → Property Context
 */

require_once __DIR__ . '/../config/moderation.php';
require_once __DIR__ . '/../helpers/BlurDetector.php';
require_once __DIR__ . '/../helpers/FileHelper.php';

class ModerationDecisionService {
    
    // Comprehensive animal labels to detect (case insensitive)
    private $animalLabels = [
        // Dogs
        'Dog', 'Puppy', 'Canine', 'Hound', 'Terrier', 'Bulldog', 'Labrador', 
        'German Shepherd', 'Poodle', 'Golden Retriever', 'Beagle', 'Rottweiler',
        // Cats
        'Cat', 'Kitten', 'Feline', 'Persian', 'Siamese', 'Maine Coon', 'Tabby',
        // General
        'Pet', 'Animal', 'Wildlife', 'Mammal', 'Domestic Animal',
        // Birds
        'Bird', 'Parrot', 'Pigeon', 'Sparrow', 'Crow', 'Eagle', 'Owl', 'Hawk',
        'Chicken', 'Duck', 'Goose', 'Turkey', 'Rooster', 'Hen',
        // Fish
        'Fish', 'Aquarium', 'Goldfish', 'Tropical Fish',
        // Large Animals
        'Horse', 'Pony', 'Donkey', 'Mule',
        'Cow', 'Bull', 'Buffalo', 'Cattle', 'Livestock', 'Ox',
        'Goat', 'Sheep', 'Lamb', 'Ram',
        'Pig', 'Piglet', 'Boar', 'Swine',
        // Small Animals
        'Rabbit', 'Bunny', 'Hamster', 'Guinea Pig', 'Gerbil',
        'Mouse', 'Rat', 'Squirrel', 'Chipmunk',
        // Reptiles
        'Reptile', 'Snake', 'Lizard', 'Turtle', 'Tortoise', 'Crocodile', 'Alligator',
        'Gecko', 'Iguana', 'Chameleon',
        // Insects
        'Insect', 'Spider', 'Butterfly', 'Bee', 'Wasp', 'Ant', 'Beetle', 'Moth',
        // Wild Animals
        'Monkey', 'Ape', 'Chimpanzee', 'Gorilla',
        'Elephant', 'Tiger', 'Lion', 'Bear', 'Deer', 'Wolf', 'Fox',
        'Zebra', 'Giraffe', 'Hippopotamus', 'Rhinoceros', 'Kangaroo',
        // Marine
        'Dolphin', 'Whale', 'Shark', 'Seal', 'Sea Lion',
        // Other
        'Frog', 'Toad', 'Salamander'
    ];
    
    // Property-related labels (for context)
    private $propertyLabels = [
        'House', 'Building', 'Room', 'Interior', 'Exterior', 'Garden', 'Kitchen', 
        'Bedroom', 'Bathroom', 'Living Room', 'Property', 'Real Estate', 
        'Architecture', 'Home', 'Apartment', 'Floor', 'Wall', 'Ceiling', 
        'Door', 'Window', 'Furniture', 'Land', 'Plot', 'Balcony', 'Terrace', 
        'Pool', 'Garage', 'Driveway', 'Yard', 'Patio', 'Stairs', 'Lobby', 
        'Hall', 'Office', 'Commercial', 'Residential', 'Construction', 'Structure'
    ];
    
    /**
     * Evaluate vision API response and make moderation decision
     * 
     * @param array $visionResponse Response from GoogleVisionService
     * @param string $imagePath Path to image file for quality checks
     * @return array Decision with status, message, reason_code, and details
     */
    public function evaluate($visionResponse, $imagePath) {
        $details = [
            'detected_issue' => null,
            'image_dimensions' => null,
            'blur_score' => null,
            'animal_labels' => [],
            'property_labels' => []
        ];
        
        // STEP 1: Check Image Quality First
        $dimensions = FileHelper::getImageDimensions($imagePath);
        if ($dimensions) {
            $details['image_dimensions'] = $dimensions['width'] . 'x' . $dimensions['height'];
            
            // Check minimum dimensions
            if ($dimensions['width'] < MIN_IMAGE_WIDTH || $dimensions['height'] < MIN_IMAGE_HEIGHT) {
                return [
                    'status' => 'REJECTED',
                    'message' => "Image too small. Your image is {$dimensions['width']}x{$dimensions['height']}. Minimum required is " . MIN_IMAGE_WIDTH . "x" . MIN_IMAGE_HEIGHT . " pixels.",
                    'reason_code' => 'low_quality',
                    'details' => array_merge($details, [
                        'detected_issue' => "Image dimensions too small: {$dimensions['width']}x{$dimensions['height']}",
                        'required_dimensions' => MIN_IMAGE_WIDTH . 'x' . MIN_IMAGE_HEIGHT
                    ])
                ];
            }
        } else {
            // Could not read dimensions, but continue with other checks
            error_log("ModerationDecisionService: Could not read image dimensions for: {$imagePath}");
        }
        
        // Check blur score
        $blurResult = BlurDetector::calculateBlurScore($imagePath);
        $details['blur_score'] = $blurResult['blur_score'];
        
        if ($blurResult['is_blurry']) {
            return [
                'status' => 'REJECTED',
                'message' => getErrorMessage('blur_detected'),
                'reason_code' => 'blur_detected',
                'details' => array_merge($details, [
                    'detected_issue' => "Image is too blurry (score: {$blurResult['blur_score']})",
                    'quality_rating' => $blurResult['quality_rating']
                ])
            ];
        }
        
        // Check if API call was successful
        if (!$visionResponse['success']) {
            return [
                'status' => 'PENDING',
                'message' => 'Moderation service temporarily unavailable. Image will be reviewed manually.',
                'reason_code' => 'api_error',
                'details' => array_merge($details, [
                    'detected_issue' => 'Google Vision API error: ' . ($visionResponse['error'] ?? 'Unknown error')
                ])
            ];
        }
        
        $scores = $visionResponse['safesearch_scores'] ?? [];
        $labels = $visionResponse['labels'] ?? [];
        
        $adult = $scores['adult'] ?? 0.0;
        $racy = $scores['racy'] ?? 0.0;
        $violence = $scores['violence'] ?? 0.0;
        
        // STEP 2: Check for Animals
        $detectedAnimals = [];
        foreach ($labels as $label) {
            $description = strtolower($label['description'] ?? '');
            $score = $label['score'] ?? 0.0;
            
            // Check if label matches any animal label
            foreach ($this->animalLabels as $animalLabel) {
                $animalLabelLower = strtolower($animalLabel);
                if (stripos($description, $animalLabelLower) !== false || $description === $animalLabelLower) {
                    if ($score >= MODERATION_ANIMAL_THRESHOLD) {
                        $detectedAnimals[] = [
                            'name' => $label['description'],
                            'confidence' => round($score * 100, 1)
                        ];
                    }
                }
            }
        }
        
        if (!empty($detectedAnimals)) {
            // Get the highest confidence animal
            usort($detectedAnimals, function($a, $b) {
                return $b['confidence'] <=> $a['confidence'];
            });
            $topAnimal = $detectedAnimals[0];
            
            $message = getErrorMessage('animal_detected', [
                'animal_name' => $topAnimal['name']
            ]);
            
            return [
                'status' => 'REJECTED',
                'message' => $message,
                'reason_code' => 'animal_detected',
                'details' => array_merge($details, [
                    'detected_issue' => "Animal detected: {$topAnimal['name']} ({$topAnimal['confidence']}% confidence)",
                    'animal_labels' => array_map(function($a) { return $a['name']; }, $detectedAnimals),
                    'animal_confidence' => $topAnimal['confidence']
                ])
            ];
        }
        
        // STEP 3: Check SafeSearch
        if ($adult >= MODERATION_ADULT_THRESHOLD) {
            return [
                'status' => 'REJECTED',
                'message' => getErrorMessage('adult_content'),
                'reason_code' => 'adult_content',
                'details' => array_merge($details, [
                    'detected_issue' => "Adult content detected (score: {$adult})",
                    'confidence_scores' => $scores
                ])
            ];
        }
        
        if ($violence >= MODERATION_VIOLENCE_THRESHOLD) {
            return [
                'status' => 'REJECTED',
                'message' => getErrorMessage('violence_content'),
                'reason_code' => 'violence_content',
                'details' => array_merge($details, [
                    'detected_issue' => "Violent content detected (score: {$violence})",
                    'confidence_scores' => $scores
                ])
            ];
        }
        
        if ($racy >= MODERATION_RACY_THRESHOLD) {
            return [
                'status' => 'REJECTED',
                'message' => 'This image contains suggestive content and cannot be uploaded.',
                'reason_code' => 'racy_content',
                'details' => array_merge($details, [
                    'detected_issue' => "Suggestive content detected (score: {$racy})",
                    'confidence_scores' => $scores
                ])
            ];
        }
        
        // STEP 4: Check if it looks like a property
        $propertyLabelsFound = $this->extractPropertyLabels($labels);
        $details['property_labels'] = $propertyLabelsFound;
        
        // Check if at least one property label exists with confidence > 0.5
        $hasPropertyContext = false;
        foreach ($labels as $label) {
            $description = strtolower($label['description'] ?? '');
            $score = $label['score'] ?? 0.0;
            
            foreach ($this->propertyLabels as $propertyLabel) {
                if (stripos($description, strtolower($propertyLabel)) !== false && $score > 0.5) {
                    $hasPropertyContext = true;
                    break 2;
                }
            }
        }
        
        if (!$hasPropertyContext && !empty($labels)) {
            // No property context found, but has other labels - needs review
            return [
                'status' => 'NEEDS_REVIEW',
                'message' => 'This image may not be a property photo. Under review.',
                'reason_code' => 'not_property',
                'details' => array_merge($details, [
                    'detected_issue' => 'No clear property context detected',
                    'detected_labels' => array_slice(array_map(function($l) { return $l['description']; }, $labels), 0, 5)
                ])
            ];
        }
        
        // STEP 5: All checks passed
        return [
            'status' => 'APPROVED',
            'message' => 'Image approved successfully.',
            'reason_code' => 'approved',
            'details' => array_merge($details, [
                'detected_issue' => 'Image passed all moderation checks',
                'property_labels' => $propertyLabelsFound
            ])
        ];
    }
    
    /**
     * Extract property-related labels from detected labels
     * 
     * @param array $labels Array of label objects
     * @return array Array of property label descriptions
     */
    private function extractPropertyLabels($labels) {
        $propertyLabels = [];
        
        foreach ($labels as $label) {
            $description = $label['description'] ?? '';
            $score = $label['score'] ?? 0.0;
            
            foreach ($this->propertyLabels as $propertyLabel) {
                if (stripos($description, $propertyLabel) !== false && $score > 0.3) {
                    $propertyLabels[] = $description;
                    break; // Avoid duplicates
                }
            }
        }
        
        return array_unique($propertyLabels);
    }
}
