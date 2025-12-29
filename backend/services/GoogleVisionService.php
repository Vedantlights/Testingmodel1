<?php
/**
 * Google Cloud Vision API Service
 * Handles image analysis using Google Cloud Vision API
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../vendor/autoload.php';

use Google\Cloud\Vision\V1\ImageAnnotatorClient;
use Google\Cloud\Vision\V1\Feature;
use Google\Cloud\Vision\V1\Feature\Type;
use Google\Cloud\Vision\V1\Likelihood;
use Google\Cloud\Vision\V1\AnnotateImageRequest;
use Google\Cloud\Vision\V1\Image;

class GoogleVisionService {
    private $client;
    
    /**
     * Constructor - Initialize Google Cloud Vision client
     */
    public function __construct() {
        try {
            // Set credentials path from environment or config
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
     * Analyze image using Google Cloud Vision API
     * 
     * @param string $imagePath Path to image file
     * @return array Associative array with safesearch_scores, labels, and raw_response
     * @throws Exception If API call fails
     */
    public function analyzeImage($imagePath) {
        try {
            // Check if image file exists
            if (!file_exists($imagePath)) {
                throw new Exception("Image file not found: {$imagePath}");
            }
            
            // Read image file
            $imageContent = file_get_contents($imagePath);
            if ($imageContent === false) {
                throw new Exception("Failed to read image file: {$imagePath}");
            }
            
            // Create image resource
            $image = (new Image())->setContent($imageContent);
            
            // Request features: SAFE_SEARCH_DETECTION and LABEL_DETECTION
            $features = [
                (new Feature())->setType(Type::SAFE_SEARCH_DETECTION),
                (new Feature())->setType(Type::LABEL_DETECTION)
            ];
            
            // Create annotate image request
            $request = (new AnnotateImageRequest())
                ->setImage($image)
                ->setFeatures($features);
            
            // Perform annotation
            $response = $this->client->annotateImage($request);
            
            // Extract SafeSearch annotation
            $safeSearch = $response->getSafeSearchAnnotation();
            $safesearchScores = [
                'adult' => $this->likelihoodToScore($safeSearch->getAdult()),
                'racy' => $this->likelihoodToScore($safeSearch->getRacy()),
                'violence' => $this->likelihoodToScore($safeSearch->getViolence()),
                'medical' => $this->likelihoodToScore($safeSearch->getMedical()),
                'spoof' => $this->likelihoodToScore($safeSearch->getSpoof())
            ];
            
            // Extract labels
            $labels = [];
            $labelAnnotations = $response->getLabelAnnotations();
            if ($labelAnnotations) {
                foreach ($labelAnnotations as $label) {
                    $labels[] = [
                        'description' => $label->getDescription(),
                        'score' => $label->getScore()
                    ];
                }
            }
            
            // Get full API response for debugging
            $rawResponse = [
                'safesearch' => [
                    'adult' => $safeSearch->getAdult(),
                    'racy' => $safeSearch->getRacy(),
                    'violence' => $safeSearch->getViolence(),
                    'medical' => $safeSearch->getMedical(),
                    'spoof' => $safeSearch->getSpoof()
                ],
                'labels' => $labels
            ];
            
            return [
                'safesearch_scores' => $safesearchScores,
                'labels' => $labels,
                'raw_response' => $rawResponse
            ];
            
        } catch (Exception $e) {
            error_log("GoogleVisionService::analyzeImage - Error: " . $e->getMessage());
            error_log("GoogleVisionService::analyzeImage - Stack trace: " . $e->getTraceAsString());
            throw new Exception("Failed to analyze image: " . $e->getMessage());
        }
    }
    
    /**
     * Convert likelihood enum to numeric score
     * VERY_UNLIKELY = 0.0, UNLIKELY = 0.2, POSSIBLE = 0.4, LIKELY = 0.7, VERY_LIKELY = 0.95
     * 
     * @param int $likelihood Likelihood enum value
     * @return float Numeric score between 0.0 and 1.0
     */
    private function likelihoodToScore($likelihood) {
        switch ($likelihood) {
            case Likelihood::VERY_UNLIKELY:
                return 0.0;
            case Likelihood::UNLIKELY:
                return 0.2;
            case Likelihood::POSSIBLE:
                return 0.4;
            case Likelihood::LIKELY:
                return 0.7;
            case Likelihood::VERY_LIKELY:
                return 0.95;
            default:
                return 0.0;
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

