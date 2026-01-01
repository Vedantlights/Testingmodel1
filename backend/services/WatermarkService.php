<?php
/**
 * Watermark Service
 * Adds "indiapropertys" watermark to approved images
 * Similar to NoBroker style - diagonal repeating pattern + bottom-right corner
 */

require_once __DIR__ . '/../config/moderation.php';

class WatermarkService {
    
    /**
     * Add watermark to image
     * 
     * @param string $imagePath Path to image file
     * @return bool True on success, false on failure
     */
    public static function addWatermark($imagePath) {
        try {
            if (!file_exists($imagePath)) {
                error_log("WatermarkService: Image file not found: {$imagePath}");
                return false;
            }
            
            // Check if GD extension is available
            if (!extension_loaded('gd')) {
                error_log("WatermarkService: GD extension not loaded");
                return false;
            }
            
            // Get image info
            $imageInfo = @getimagesize($imagePath);
            if ($imageInfo === false) {
                error_log("WatermarkService: Invalid image file: {$imagePath}");
                return false;
            }
            
            $width = $imageInfo[0];
            $height = $imageInfo[1];
            $mimeType = $imageInfo['mime'];
            
            // Load image based on type
            $image = null;
            switch ($mimeType) {
                case 'image/jpeg':
                case 'image/jpg':
                    $image = @imagecreatefromjpeg($imagePath);
                    break;
                case 'image/png':
                    $image = @imagecreatefrompng($imagePath);
                    // Preserve transparency
                    imagealphablending($image, false);
                    imagesavealpha($image, true);
                    break;
                case 'image/webp':
                    if (function_exists('imagecreatefromwebp')) {
                        $image = @imagecreatefromwebp($imagePath);
                    }
                    break;
                default:
                    error_log("WatermarkService: Unsupported image type: {$mimeType}");
                    return false;
            }
            
            if ($image === false || $image === null) {
                error_log("WatermarkService: Failed to load image: {$imagePath}");
                return false;
            }
            
            // Create watermark color (light grey with transparency)
            $watermarkColor = imagecolorallocatealpha(
                $image,
                WATERMARK_COLOR_R,
                WATERMARK_COLOR_G,
                WATERMARK_COLOR_B,
                WATERMARK_OPACITY
            );
            
            // Calculate font size based on image dimensions
            $fontSize = max(16, min(32, (int)(min($width, $height) / 20)));
            
            // Add diagonal repeating watermark pattern
            self::addDiagonalWatermark($image, $width, $height, $watermarkColor, $fontSize);
            
            // Add bottom-right corner watermark
            self::addCornerWatermark($image, $width, $height, $watermarkColor, $fontSize);
            
            // Save image
            $success = false;
            switch ($mimeType) {
                case 'image/jpeg':
                case 'image/jpg':
                    $success = @imagejpeg($image, $imagePath, 90); // 90% quality
                    break;
                case 'image/png':
                    $success = @imagepng($image, $imagePath, 9); // 9 = highest compression
                    break;
                case 'image/webp':
                    if (function_exists('imagewebp')) {
                        $success = @imagewebp($image, $imagePath, 90);
                    }
                    break;
            }
            
            // Clean up
            imagedestroy($image);
            
            if (!$success) {
                error_log("WatermarkService: Failed to save watermarked image: {$imagePath}");
                return false;
            }
            
            return true;
            
        } catch (Exception $e) {
            error_log("WatermarkService::addWatermark - Error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            return false;
        }
    }
    
    /**
     * Add diagonal repeating watermark pattern
     * Limited to maximum 7 diagonal watermarks (plus 1 corner = 8 total)
     * 
     * @param resource $image Image resource
     * @param int $width Image width
     * @param int $height Image height
     * @param int $color Watermark color
     * @param int $fontSize Font size
     */
    private static function addDiagonalWatermark($image, $width, $height, $color, $fontSize) {
        $text = WATERMARK_TEXT;
        $angle = WATERMARK_ANGLE;
        $maxDiagonalWatermarks = 7; // Maximum 7 diagonal watermarks (plus 1 corner = 8 total)
        
        // Use built-in font (1-5) or try to use TrueType font
        $font = 5; // Built-in font
        
        // Calculate text dimensions
        $textWidth = imagefontwidth($font) * strlen($text);
        $textHeight = imagefontheight($font);
        
        // Calculate positions for 7 watermarks distributed across the image
        // Use a pattern that spreads them evenly while maintaining diagonal orientation
        $marginX = $width * 0.12; // 12% margin from edges
        $marginY = $height * 0.12;
        $usableWidth = $width - (2 * $marginX);
        $usableHeight = $height - (2 * $marginY);
        
        // Distribute 7 watermarks in a pattern (2 rows: 3 + 4, or similar distribution)
        // Position coordinates as percentages of usable area
        $positions = [
            // Top row (3 positions)
            [0.15, 0.25], [0.50, 0.25], [0.85, 0.25],
            // Bottom row (4 positions)
            [0.10, 0.75], [0.35, 0.75], [0.65, 0.75], [0.90, 0.75]
        ];
        
        for ($i = 0; $i < $maxDiagonalWatermarks && $i < count($positions); $i++) {
            list($xRatio, $yRatio) = $positions[$i];
            
            // Calculate base position
            $baseX = $marginX + ($xRatio * $usableWidth);
            $baseY = $marginY + ($yRatio * $usableHeight);
            
            // Apply rotation for diagonal watermark text (-45 degrees)
            $rad = deg2rad($angle);
            $centerX = $width / 2;
            $centerY = $height / 2;
            
            // Translate to center, rotate, translate back
            $dx = $baseX - $centerX;
            $dy = $baseY - $centerY;
            
            $posX = $centerX + ($dx * cos($rad) - $dy * sin($rad)) - ($textWidth / 2);
            $posY = $centerY + ($dx * sin($rad) + $dy * cos($rad)) - ($textHeight / 2);
            
            // Ensure position is within image bounds
            $posX = max(0, min($posX, $width - $textWidth));
            $posY = max(0, min($posY, $height - $textHeight));
            
            // Draw watermark
            imagestring($image, $font, (int)$posX, (int)$posY, $text, $color);
        }
    }
    
    /**
     * Add bottom-right corner watermark
     * 
     * @param resource $image Image resource
     * @param int $width Image width
     * @param int $height Image height
     * @param int $color Watermark color
     * @param int $fontSize Font size
     */
    private static function addCornerWatermark($image, $width, $height, $color, $fontSize) {
        $text = WATERMARK_TEXT;
        $font = 5; // Built-in font
        
        // Calculate text dimensions
        $textWidth = imagefontwidth($font) * strlen($text);
        $textHeight = imagefontheight($font);
        
        // Position at bottom-right with padding
        $padding = 10;
        $posX = $width - $textWidth - $padding;
        $posY = $height - $textHeight - $padding;
        
        // Draw watermark
        imagestring($image, $font, $posX, $posY, $text, $color);
    }
}

