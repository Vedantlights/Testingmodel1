<?php
/**
 * Moderation Decision Service
 * Evaluates Google Vision API results and makes moderation decisions
 */

require_once __DIR__ . '/../config/config.php';

class ModerationDecisionService {
    // Animal labels to detect
    private $animalLabels = [
        'Dog', 'Cat', 'Pet', 'Animal', 'Wildlife', 'Bird', 'Fish', 'Reptile', 
        'Mammal', 'Puppy', 'Kitten', 'Canine', 'Feline', 'Horse', 'Cow', 
        'Livestock', 'Insect', 'Spider'
    ];
    
    // Property-related labels (positive signals)
    private $propertyLabels = [
        'House', 'Building', 'Room', 'Interior', 'Exterior', 'Garden', 
        'Kitchen', 'Bedroom', 'Bathroom', 'Living Room', 'Property', 
        'Real Estate', 'Architecture', 'Home', 'Apartment', 'Floor', 
        'Wall', 'Ceiling', 'Door', 'Window', 'Furniture', 'Land', 'Plot'
    ];
    
    /**
     * Evaluate API response and make moderation decision
     * 
     * @param array $apiResponse Response from GoogleVisionService
     * @return array Decision array with decision, reason, confidence_scores, flagged_labels, property_labels
     */
    public function evaluate($apiResponse) {
        $safesearchScores = $apiResponse['safesearch_scores'] ?? [];
        $labels = $apiResponse['labels'] ?? [];
        
        $decision = 'SAFE';
        $reason = 'Image passed all moderation checks';
        $flaggedLabels = [];
        $propertyLabelsFound = [];
        $confidenceScores = [];
        
        // Check SafeSearch scores first
        $adultScore = $safesearchScores['adult'] ?? 0.0;
        $racyScore = $safesearchScores['racy'] ?? 0.0;
        $violenceScore = $safesearchScores['violence'] ?? 0.0;
        $medicalScore = $safesearchScores['medical'] ?? 0.0;
        
        $confidenceScores['adult'] = $adultScore;
        $confidenceScores['racy'] = $racyScore;
        $confidenceScores['violence'] = $violenceScore;
        $confidenceScores['medical'] = $medicalScore;
        
        // Check for UNSAFE content (high priority)
        if ($adultScore >= MODERATION_ADULT_THRESHOLD) {
            $decision = 'UNSAFE';
            $reason = 'Adult content detected';
            return $this->buildResponse($decision, $reason, $confidenceScores, $flaggedLabels, $propertyLabelsFound);
        }
        
        if ($racyScore >= MODERATION_RACY_THRESHOLD) {
            $decision = 'UNSAFE';
            $reason = 'Suggestive content detected';
            return $this->buildResponse($decision, $reason, $confidenceScores, $flaggedLabels, $propertyLabelsFound);
        }
        
        if ($violenceScore >= MODERATION_VIOLENCE_THRESHOLD) {
            $decision = 'UNSAFE';
            $reason = 'Violent content detected';
            return $this->buildResponse($decision, $reason, $confidenceScores, $flaggedLabels, $propertyLabelsFound);
        }
        
        if ($medicalScore >= MODERATION_MEDICAL_THRESHOLD) {
            $decision = 'UNSAFE';
            $reason = 'Medical or graphic content detected';
            return $this->buildResponse($decision, $reason, $confidenceScores, $flaggedLabels, $propertyLabelsFound);
        }
        
        // Check for animals
        foreach ($labels as $label) {
            $description = $label['description'] ?? '';
            $score = $label['score'] ?? 0.0;
            
            // Check if label matches animal labels (case insensitive)
            foreach ($this->animalLabels as $animalLabel) {
                if (stripos($description, $animalLabel) !== false && $score >= MODERATION_ANIMAL_THRESHOLD) {
                    $decision = 'UNSAFE';
                    $reason = "Animal detected in image: {$description}";
                    $flaggedLabels[] = [
                        'description' => $description,
                        'score' => $score,
                        'type' => 'animal'
                    ];
                    return $this->buildResponse($decision, $reason, $confidenceScores, $flaggedLabels, $propertyLabelsFound);
                }
            }
        }
        
        // Check for borderline cases (NEEDS_REVIEW)
        if ($adultScore >= 0.4 && $adultScore < MODERATION_ADULT_THRESHOLD) {
            $decision = 'NEEDS_REVIEW';
            $reason = 'Borderline adult content score';
            return $this->buildResponse($decision, $reason, $confidenceScores, $flaggedLabels, $propertyLabelsFound);
        }
        
        if ($racyScore >= 0.5 && $racyScore < MODERATION_RACY_THRESHOLD) {
            $decision = 'NEEDS_REVIEW';
            $reason = 'Borderline suggestive content score';
            return $this->buildResponse($decision, $reason, $confidenceScores, $flaggedLabels, $propertyLabelsFound);
        }
        
        if ($violenceScore >= 0.3 && $violenceScore < MODERATION_VIOLENCE_THRESHOLD) {
            $decision = 'NEEDS_REVIEW';
            $reason = 'Borderline violence score';
            return $this->buildResponse($decision, $reason, $confidenceScores, $flaggedLabels, $propertyLabelsFound);
        }
        
        // Check for property context (positive signal)
        foreach ($labels as $label) {
            $description = $label['description'] ?? '';
            
            foreach ($this->propertyLabels as $propertyLabel) {
                if (stripos($description, $propertyLabel) !== false) {
                    $propertyLabelsFound[] = [
                        'description' => $description,
                        'score' => $label['score'] ?? 0.0
                    ];
                    break; // Found a match, no need to check other property labels for this label
                }
            }
        }
        
        // If we get here, image is SAFE
        return $this->buildResponse($decision, $reason, $confidenceScores, $flaggedLabels, $propertyLabelsFound);
    }
    
    /**
     * Build response array
     * 
     * @param string $decision Decision (SAFE, UNSAFE, NEEDS_REVIEW)
     * @param string $reason Reason for decision
     * @param array $confidenceScores Confidence scores
     * @param array $flaggedLabels Flagged labels
     * @param array $propertyLabels Property labels found
     * @return array Complete response array
     */
    private function buildResponse($decision, $reason, $confidenceScores, $flaggedLabels, $propertyLabels) {
        return [
            'decision' => $decision,
            'reason' => $reason,
            'confidence_scores' => $confidenceScores,
            'flagged_labels' => $flaggedLabels,
            'property_labels' => $propertyLabels
        ];
    }
}

