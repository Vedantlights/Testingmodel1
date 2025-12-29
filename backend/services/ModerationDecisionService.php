<?php
/**
 * Moderation Decision Service
 * Evaluates Google Vision API responses and makes moderation decisions
 */

require_once __DIR__ . '/../config/moderation.php';

class ModerationDecisionService {
    
    // Animal labels to check (case insensitive)
    private $animalLabels = [
        'Dog', 'Cat', 'Pet', 'Animal', 'Wildlife', 'Bird', 'Fish', 'Reptile', 
        'Mammal', 'Puppy', 'Kitten', 'Canine', 'Feline', 'Horse', 'Cow', 
        'Livestock', 'Insect', 'Spider', 'Rabbit', 'Hamster', 'Snake', 
        'Lizard', 'Parrot', 'Chicken', 'Goat', 'Sheep', 'Pig', 'Mouse', 'Rat'
    ];
    
    // Property-related labels (for context)
    private $propertyLabels = [
        'House', 'Building', 'Room', 'Interior', 'Exterior', 'Garden', 'Kitchen', 
        'Bedroom', 'Bathroom', 'Living Room', 'Property', 'Real Estate', 
        'Architecture', 'Home', 'Apartment', 'Floor', 'Wall', 'Ceiling', 
        'Door', 'Window', 'Furniture', 'Land', 'Plot', 'Balcony', 'Terrace', 
        'Pool', 'Garage', 'Driveway', 'Yard', 'Patio'
    ];
    
    /**
     * Evaluate vision API response and make moderation decision
     * 
     * @param array $visionResponse Response from GoogleVisionService
     * @return array Decision with status, reason, and metadata
     */
    public function evaluate($visionResponse) {
        // Check if API call was successful
        if (!$visionResponse['success']) {
            return [
                'decision' => 'PENDING',
                'reason' => 'Moderation API error: ' . ($visionResponse['error'] ?? 'Unknown error'),
                'confidence_scores' => [],
                'flagged_labels' => [],
                'property_labels' => []
            ];
        }
        
        $scores = $visionResponse['safesearch_scores'] ?? [];
        $labels = $visionResponse['labels'] ?? [];
        
        $adult = $scores['adult'] ?? 0.0;
        $racy = $scores['racy'] ?? 0.0;
        $violence = $scores['violence'] ?? 0.0;
        $medical = $scores['medical'] ?? 0.0;
        
        $flaggedLabels = [];
        $propertyLabels = [];
        
        // Check SafeSearch scores against thresholds
        // UNSAFE checks (highest priority)
        if ($adult >= MODERATION_ADULT_THRESHOLD) {
            return [
                'decision' => 'UNSAFE',
                'reason' => 'Adult content detected',
                'confidence_scores' => $scores,
                'flagged_labels' => ['Adult content'],
                'property_labels' => $this->extractPropertyLabels($labels)
            ];
        }
        
        if ($racy >= MODERATION_RACY_THRESHOLD) {
            return [
                'decision' => 'UNSAFE',
                'reason' => 'Suggestive content detected',
                'confidence_scores' => $scores,
                'flagged_labels' => ['Suggestive content'],
                'property_labels' => $this->extractPropertyLabels($labels)
            ];
        }
        
        if ($violence >= MODERATION_VIOLENCE_THRESHOLD) {
            return [
                'decision' => 'UNSAFE',
                'reason' => 'Violent content detected',
                'confidence_scores' => $scores,
                'flagged_labels' => ['Violent content'],
                'property_labels' => $this->extractPropertyLabels($labels)
            ];
        }
        
        if ($medical >= MODERATION_MEDICAL_THRESHOLD) {
            return [
                'decision' => 'UNSAFE',
                'reason' => 'Medical or graphic content detected',
                'confidence_scores' => $scores,
                'flagged_labels' => ['Medical/graphic content'],
                'property_labels' => $this->extractPropertyLabels($labels)
            ];
        }
        
        // Check labels for animals
        foreach ($labels as $label) {
            $description = strtolower($label['description'] ?? '');
            $score = $label['score'] ?? 0.0;
            
            // Check if label matches any animal label
            foreach ($this->animalLabels as $animalLabel) {
                if (stripos($description, strtolower($animalLabel)) !== false) {
                    if ($score >= MODERATION_ANIMAL_THRESHOLD) {
                        return [
                            'decision' => 'UNSAFE',
                            'reason' => 'Animal detected in image: ' . $label['description'],
                            'confidence_scores' => $scores,
                            'flagged_labels' => [$label['description']],
                            'property_labels' => $this->extractPropertyLabels($labels)
                        ];
                    }
                }
            }
        }
        
        // Check for borderline cases (NEEDS_REVIEW)
        if ($adult >= 0.4 && $adult < MODERATION_ADULT_THRESHOLD) {
            return [
                'decision' => 'NEEDS_REVIEW',
                'reason' => 'Borderline adult content score',
                'confidence_scores' => $scores,
                'flagged_labels' => [],
                'property_labels' => $this->extractPropertyLabels($labels)
            ];
        }
        
        if ($racy >= 0.5 && $racy < MODERATION_RACY_THRESHOLD) {
            return [
                'decision' => 'NEEDS_REVIEW',
                'reason' => 'Borderline suggestive content score',
                'confidence_scores' => $scores,
                'flagged_labels' => [],
                'property_labels' => $this->extractPropertyLabels($labels)
            ];
        }
        
        if ($violence >= 0.3 && $violence < MODERATION_VIOLENCE_THRESHOLD) {
            return [
                'decision' => 'NEEDS_REVIEW',
                'reason' => 'Borderline violence score',
                'confidence_scores' => $scores,
                'flagged_labels' => [],
                'property_labels' => $this->extractPropertyLabels($labels)
            ];
        }
        
        // Extract property labels for context
        $propertyLabels = $this->extractPropertyLabels($labels);
        
        // If no UNSAFE or NEEDS_REVIEW triggered → SAFE
        return [
            'decision' => 'SAFE',
            'reason' => 'Image passed all moderation checks',
            'confidence_scores' => $scores,
            'flagged_labels' => [],
            'property_labels' => $propertyLabels
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
            
            foreach ($this->propertyLabels as $propertyLabel) {
                if (stripos($description, $propertyLabel) !== false) {
                    $propertyLabels[] = $description;
                    break; // Avoid duplicates
                }
            }
        }
        
        return array_unique($propertyLabels);
    }
}
