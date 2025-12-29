<?php
/**
 * Moderation Decision Service
 * Evaluates Google Vision API responses and makes moderation decisions
 * Checks in EXACT order: Quality → Blur → Humans (Faces) → Humans (Labels/Objects) → Animals → SafeSearch → Property Context
 */

require_once __DIR__ . '/../config/moderation.php';
require_once __DIR__ . '/../helpers/BlurDetector.php';
require_once __DIR__ . '/../helpers/FileHelper.php';

// Ensure error message function is available
if (!function_exists('getErrorMessage')) {
    require_once __DIR__ . '/../config/moderation.php';
}

class ModerationDecisionService {
    
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
            'human_detected' => false,
            'animal_detected' => false,
            'animal_labels' => [],
            'property_labels' => []
        ];
        
        // STEP 1: Check Image Quality First (Dimensions)
        $dimensions = FileHelper::getImageDimensions($imagePath);
        if ($dimensions) {
            $details['image_dimensions'] = $dimensions['width'] . 'x' . $dimensions['height'];
            
            // Check minimum dimensions
            if ($dimensions['width'] < MIN_IMAGE_WIDTH || $dimensions['height'] < MIN_IMAGE_HEIGHT) {
                return [
                    'status' => 'REJECTED',
                    'message' => getErrorMessage('low_quality', [
                        'width' => $dimensions['width'],
                        'height' => $dimensions['height']
                    ]),
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
        
        // STEP 2: Check Blur Score
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
        $faces = $visionResponse['faces'] ?? [];
        $objects = $visionResponse['objects'] ?? [];
        
        $adult = $scores['adult'] ?? 0.0;
        $racy = $scores['racy'] ?? 0.0;
        $violence = $scores['violence'] ?? 0.0;
        
        // STEP 3: Check for HUMANS using Face Detection (HIGHEST PRIORITY)
        // Face detection is the most reliable method for detecting humans
        if (!empty($faces)) {
            foreach ($faces as $face) {
                $faceConfidence = $face['detection_confidence'] ?? 0.0;
                if ($faceConfidence >= MODERATION_FACE_THRESHOLD) {
                    return [
                        'status' => 'REJECTED',
                        'message' => getErrorMessage('human_detected'),
                        'reason_code' => 'human_detected',
                        'details' => array_merge($details, [
                            'detected_issue' => "Human face detected (confidence: " . round($faceConfidence * 100, 1) . "%)",
                            'human_detected' => true,
                            'face_confidence' => round($faceConfidence * 100, 1),
                            'detection_method' => 'face_detection'
                        ])
                    ];
                }
            }
        }
        
        // STEP 4: Check for HUMANS in Objects (OBJECT_LOCALIZATION)
        // Check for "Person" object specifically
        if (!empty($objects)) {
            foreach ($objects as $object) {
                $objectName = strtolower($object['name'] ?? '');
                $objectScore = $object['score'] ?? 0.0;
                
                // Check if object is "Person" or human-related
                if (($objectName === 'person' || $objectName === 'people' || $objectName === 'human') && 
                    $objectScore >= MODERATION_HUMAN_THRESHOLD) {
                    return [
                        'status' => 'REJECTED',
                        'message' => getErrorMessage('human_detected'),
                        'reason_code' => 'human_detected',
                        'details' => array_merge($details, [
                            'detected_issue' => ucfirst($object['name']) . " detected (confidence: " . round($objectScore * 100, 1) . "%)",
                            'human_detected' => true,
                            'object_confidence' => round($objectScore * 100, 1),
                            'detection_method' => 'object_localization'
                        ])
                    ];
                }
            }
        }
        
        // STEP 5: Check for HUMANS in Labels
        $humanLabels = defined('HUMAN_LABELS') ? HUMAN_LABELS : [];
        $detectedHumans = [];
        
        foreach ($labels as $label) {
            $description = strtolower($label['description'] ?? '');
            $score = $label['score'] ?? 0.0;
            
            // Check if label matches any human label
            foreach ($humanLabels as $humanLabel) {
                $humanLabelLower = strtolower($humanLabel);
                if (stripos($description, $humanLabelLower) !== false || $description === $humanLabelLower) {
                    if ($score >= MODERATION_HUMAN_THRESHOLD) {
                        $detectedHumans[] = [
                            'name' => $label['description'],
                            'confidence' => round($score * 100, 1)
                        ];
                    }
                }
            }
        }
        
        if (!empty($detectedHumans)) {
            // Get the highest confidence human detection
            usort($detectedHumans, function($a, $b) {
                return $b['confidence'] <=> $a['confidence'];
            });
            $topHuman = $detectedHumans[0];
            
            return [
                'status' => 'REJECTED',
                'message' => getErrorMessage('human_detected'),
                'reason_code' => 'human_detected',
                'details' => array_merge($details, [
                    'detected_issue' => ucfirst($topHuman['name']) . " detected (confidence: {$topHuman['confidence']}%)",
                    'human_detected' => true,
                    'human_labels' => array_map(function($h) { return $h['name']; }, $detectedHumans),
                    'human_confidence' => $topHuman['confidence'],
                    'detection_method' => 'label_detection'
                ])
            ];
        }
        
        // STEP 6: Check for ANIMALS in Objects (OBJECT_LOCALIZATION)
        // Check for specific animal objects like "Dog", "Cat", etc.
        $animalLabels = defined('ANIMAL_LABELS') ? ANIMAL_LABELS : [];
        $detectedAnimals = [];
        
        if (!empty($objects)) {
            foreach ($objects as $object) {
                $objectName = strtolower($object['name'] ?? '');
                $objectScore = $object['score'] ?? 0.0;
                
                // Check if object matches any animal label
                foreach ($animalLabels as $animalLabel) {
                    $animalLabelLower = strtolower($animalLabel);
                    if ($objectName === $animalLabelLower || stripos($objectName, $animalLabelLower) !== false) {
                        if ($objectScore >= MODERATION_ANIMAL_THRESHOLD) {
                            $detectedAnimals[] = [
                                'name' => $object['name'],
                                'confidence' => round($objectScore * 100, 1)
                            ];
                        }
                    }
                }
            }
        }
        
        // STEP 7: Check for ANIMALS in Labels
        foreach ($labels as $label) {
            $description = strtolower($label['description'] ?? '');
            $score = $label['score'] ?? 0.0;
            
            // Check if label matches any animal label
            foreach ($animalLabels as $animalLabel) {
                $animalLabelLower = strtolower($animalLabel);
                if (stripos($description, $animalLabelLower) !== false || $description === $animalLabelLower) {
                    if ($score >= MODERATION_ANIMAL_THRESHOLD) {
                        // Check if already detected
                        $alreadyDetected = false;
                        foreach ($detectedAnimals as $detected) {
                            if (strtolower($detected['name']) === strtolower($label['description'])) {
                                $alreadyDetected = true;
                                break;
                            }
                        }
                        if (!$alreadyDetected) {
                            $detectedAnimals[] = [
                                'name' => $label['description'],
                                'confidence' => round($score * 100, 1)
                            ];
                        }
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
            
            return [
                'status' => 'REJECTED',
                'message' => getErrorMessage('animal_detected', [
                    'animal_name' => $topAnimal['name']
                ]),
                'reason_code' => 'animal_detected',
                'details' => array_merge($details, [
                    'detected_issue' => ucfirst($topAnimal['name']) . " detected (confidence: {$topAnimal['confidence']}%)",
                    'animal_detected' => true,
                    'animal_labels' => array_map(function($a) { return $a['name']; }, $detectedAnimals),
                    'animal_confidence' => $topAnimal['confidence']
                ])
            ];
        }
        
        // STEP 8: Check SafeSearch
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
        
        // STEP 9: Check Property Context (optional - for review queue)
        $propertyLabels = defined('PROPERTY_LABELS') ? PROPERTY_LABELS : [];
        $propertyLabelsFound = [];
        
        foreach ($labels as $label) {
            $description = $label['description'] ?? '';
            $score = $label['score'] ?? 0.0;
            
            foreach ($propertyLabels as $propertyLabel) {
                if (stripos($description, $propertyLabel) !== false && $score > 0.3) {
                    $propertyLabelsFound[] = $description;
                    break;
                }
            }
        }
        
        $details['property_labels'] = array_unique($propertyLabelsFound);
        
        // If no property context found but has other labels, mark for review
        if (empty($propertyLabelsFound) && !empty($labels)) {
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
        
        // STEP 10: All checks passed - APPROVED
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
}
