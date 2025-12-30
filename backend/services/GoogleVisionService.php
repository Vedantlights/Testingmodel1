<?php
/**
 * Google Cloud Vision API Service
 * Handles image analysis using Google Cloud Vision API
 * Includes: SafeSearch, Labels, Faces, and Object Localization
 */

// Load Composer autoload if available
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
}

require_once __DIR__ . '/../config/moderation.php';

use Google\Cloud\Vision\V1\Client\ImageAnnotatorClient;
use Google\Cloud\Vision\V1\Feature;
use Google\Cloud\Vision\V1\Feature\Type;
use Google\Cloud\Vision\V1\Image;
use Google\Cloud\Vision\V1\AnnotateImageRequest;
use Google\Cloud\Vision\V1\Likelihood;

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
     * @return array Response with SafeSearch scores, labels, faces, and objects
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
            
            // Request FOUR detection features for comprehensive detection (v2.x format)
            $feature1 = new Feature();
            $feature1->setType(Type::SAFE_SEARCH_DETECTION);
            
            $feature2 = new Feature();
            $feature2->setType(Type::LABEL_DETECTION);
            
            $feature3 = new Feature();
            $feature3->setType(Type::FACE_DETECTION);
            
            $feature4 = new Feature();
            $feature4->setType(Type::OBJECT_LOCALIZATION);
            
            $features = [$feature1, $feature2, $feature3, $feature4];
            
            // Create annotate image request (v2.x format)
            $request = new AnnotateImageRequest();
            $request->setImage($image);
            $request->setFeatures($features);
            
            // Perform annotation (v2.x may return batch response)
            $batchResponse = $this->client->annotateImage($request);
            
            // Handle response - v2.x may return BatchAnnotateImagesResponse
            // If it's a batch response, get the first response
            if (method_exists($batchResponse, 'getResponses')) {
                $responses = $batchResponse->getResponses();
                if (empty($responses)) {
                    throw new Exception("No responses from Vision API");
                }
                $response = $responses[0];
            } else {
                // Single response (v1.x style)
                $response = $batchResponse;
            }
            
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
            
            // Extract faces (CRITICAL for human detection)
            $faces = [];
            $faceAnnotations = $response->getFaceAnnotations();
            foreach ($faceAnnotations as $face) {
                $faces[] = [
                    'detection_confidence' => $face->getDetectionConfidence(),
                    'landmarking_confidence' => $face->getLandmarkingConfidence(),
                    'joy_likelihood' => $this->likelihoodToScore($face->getJoyLikelihood()),
                    'sorrow_likelihood' => $this->likelihoodToScore($face->getSorrowLikelihood()),
                    'anger_likelihood' => $this->likelihoodToScore($face->getAngerLikelihood()),
                    'surprise_likelihood' => $this->likelihoodToScore($face->getSurpriseLikelihood())
                ];
            }
            
            // Extract objects (CRITICAL for detecting "Person", "Dog", "Cat", etc.)
            $objects = [];
            $objectAnnotations = $response->getLocalizedObjectAnnotations();
            foreach ($objectAnnotations as $object) {
                $objects[] = [
                    'name' => $object->getName(),
                    'score' => $object->getScore()
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
                'faces' => $faces,
                'objects' => $objects,
                'image_properties' => $imageProperties
            ]);
            
            return [
                'success' => true,
                'safesearch_scores' => $safesearchScores,
                'labels' => $labels,
                'faces' => $faces,
                'objects' => $objects,
                'image_properties' => $imageProperties,
                'raw_response' => $rawResponse,
                'error' => null
            ];
            
        } catch (Exception $e) {
            error_log("GoogleVisionService::analyzeImage - Error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            return [
                'success' => false,
                'safesearch_scores' => [],
                'labels' => [],
                'faces' => [],
                'objects' => [],
                'image_properties' => [],
                'raw_response' => null,
                'error' => $e->getMessage()
            ];
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
