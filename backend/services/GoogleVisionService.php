<?php
/**
 * Google Cloud Vision API Service
 * Handles image analysis using Google Cloud Vision API
 */

require_once __DIR__ . '/../config/moderation.php';

use Google\Cloud\Vision\V1\ImageAnnotatorClient;
use Google\Cloud\Vision\V1\Feature\Type;
use Google\Cloud\Vision\V1\Image;

class GoogleVisionService {
    private $client;
    
    /**
     * Constructor - Initialize Google Cloud Vision client
     */
    public function __construct() {
        try {
            // Set credentials path from config
            $credentialsPath = GOOGLE_APPLICATION_CREDENTIALS;
            
            if (!file_exists($credentialsPath)) {
                throw new Exception("Google Cloud credentials file not found at: {$credentialsPath}");
            }
            
            // Set environment variable for Google Cloud SDK
            putenv('GOOGLE_APPLICATION_CREDENTIALS=' . $credentialsPath);
            
            // Create client
            $this->client = new ImageAnnotatorClient([
                'credentials' => $credentialsPath
            ]);
        } catch (Exception $e) {
            error_log("GoogleVisionService::__construct - Error initializing client: " . $e->getMessage());
            throw new Exception("Failed to initialize Google Vision API client: " . $e->getMessage());
        }
    }
    
    /**
     * Analyze image for moderation
     * 
     * @param string $imagePath Path to image file
     * @return array Response with SafeSearch scores and labels
     */
    public function analyzeImage($imagePath) {
        try {
            // Validate file exists
            if (!file_exists($imagePath)) {
                throw new Exception("Image file not found: {$imagePath}");
            }
            
            if (!is_readable($imagePath)) {
                throw new Exception("Image file is not readable: {$imagePath}");
            }
            
            // Read image file content
            $imageContent = file_get_contents($imagePath);
            if ($imageContent === false) {
                throw new Exception("Failed to read image file: {$imagePath}");
            }
            
            // Create image object
            $image = new Image();
            $image->setContent($imageContent);
            
            // Request SafeSearch, Label detection, and Image Properties
            $features = [
                Type::SAFE_SEARCH_DETECTION,
                Type::LABEL_DETECTION,
                Type::IMAGE_PROPERTIES
            ];
            
            // Perform annotation
            $response = $this->client->annotateImage($image, $features);
            
            // Extract SafeSearch results
            $safeSearchAnnotation = $response->getSafeSearchAnnotation();
            $safesearchScores = [
                'adult' => $this->likelihoodToScore($safeSearchAnnotation->getAdult()),
                'racy' => $this->likelihoodToScore($safeSearchAnnotation->getRacy()),
                'violence' => $this->likelihoodToScore($safeSearchAnnotation->getViolence()),
                'medical' => $this->likelihoodToScore($safeSearchAnnotation->getMedical()),
                'spoof' => $this->likelihoodToScore($safeSearchAnnotation->getSpoof())
            ];
            
            // Extract labels
            $labels = [];
            $labelAnnotations = $response->getLabelAnnotations();
            foreach ($labelAnnotations as $label) {
                $labels[] = [
                    'description' => $label->getDescription(),
                    'score' => $label->getScore()
                ];
            }
            
            // Extract image properties
            $imageProperties = [];
            $imagePropertiesAnnotation = $response->getImagePropertiesAnnotation();
            if ($imagePropertiesAnnotation) {
                $dominantColors = [];
                $colorInfo = $imagePropertiesAnnotation->getDominantColors();
                if ($colorInfo) {
                    foreach ($colorInfo->getColors() as $color) {
                        $dominantColors[] = [
                            'color' => [
                                'red' => $color->getColor()->getRed(),
                                'green' => $color->getColor()->getGreen(),
                                'blue' => $color->getColor()->getBlue()
                            ],
                            'score' => $color->getScore(),
                            'pixel_fraction' => $color->getPixelFraction()
                        ];
                    }
                }
                $imageProperties = [
                    'dominant_colors' => $dominantColors
                ];
            }
            
            // Get raw response as JSON
            $rawResponse = json_encode([
                'safesearch' => [
                    'adult' => $safeSearchAnnotation->getAdult(),
                    'racy' => $safeSearchAnnotation->getRacy(),
                    'violence' => $safeSearchAnnotation->getViolence(),
                    'medical' => $safeSearchAnnotation->getMedical(),
                    'spoof' => $safeSearchAnnotation->getSpoof()
                ],
                'labels' => $labels,
                'image_properties' => $imageProperties
            ]);
            
            return [
                'success' => true,
                'safesearch_scores' => $safesearchScores,
                'labels' => $labels,
                'image_properties' => $imageProperties,
                'raw_response' => $rawResponse,
                'error' => null
            ];
            
        } catch (Exception $e) {
            error_log("GoogleVisionService::analyzeImage - Error: " . $e->getMessage());
            return [
                'success' => false,
                'safesearch_scores' => [],
                'labels' => [],
                'image_properties' => [],
                'raw_response' => null,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get image dimensions
     * 
     * @param string $imagePath Path to image file
     * @return array ['width' => int, 'height' => int] or null on error
     */
    public function getImageDimensions($imagePath) {
        try {
            if (!file_exists($imagePath)) {
                return null;
            }
            
            $imageInfo = @getimagesize($imagePath);
            if ($imageInfo === false) {
                return null;
            }
            
            return [
                'width' => $imageInfo[0],
                'height' => $imageInfo[1]
            ];
        } catch (Exception $e) {
            error_log("GoogleVisionService::getImageDimensions - Error: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Convert likelihood string to numeric score
     * 
     * @param int $likelihood Likelihood enum value
     * @return float Numeric score (0.0 to 1.0)
     */
    private function likelihoodToScore($likelihood) {
        // Google Cloud Vision API likelihood enum values
        // VERY_UNLIKELY = 0
        // UNLIKELY = 1
        // POSSIBLE = 2
        // LIKELY = 3
        // VERY_LIKELY = 4
        // UNKNOWN = 5
        
        switch ($likelihood) {
            case 0: // VERY_UNLIKELY
                return 0.0;
            case 1: // UNLIKELY
                return 0.2;
            case 2: // POSSIBLE
                return 0.4;
            case 3: // LIKELY
                return 0.7;
            case 4: // VERY_LIKELY
                return 0.95;
            case 5: // UNKNOWN
            default:
                return 0.5;
        }
    }
    
    /**
     * Close client connection
     */
    public function __destruct() {
        if ($this->client) {
            try {
                $this->client->close();
            } catch (Exception $e) {
                error_log("GoogleVisionService::__destruct - Error closing client: " . $e->getMessage());
            }
        }
    }
}
