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
        $spacingX = WATERMARK_SPACING_X;
        $spacingY = WATERMARK_SPACING_Y;
        
        // Use built-in font (1-5) or try to use TrueType font
        $font = 5; // Built-in font
        
        // Calculate text dimensions
        $textWidth = imagefontwidth($font) * strlen($text);
        $textHeight = imagefontheight($font);
        
        // Calculate diagonal spacing
        $diagonalSpacing = sqrt($spacingX * $spacingX + $spacingY * $spacingY);
        
        // Add watermark in repeating diagonal pattern
        // Start from top-left and go diagonally
        $startX = -$width;
        $startY = -$height;
        
        for ($x = $startX; $x < $width * 2; $x += $spacingX) {
            for ($y = $startY; $y < $height * 2; $y += $spacingY) {
                // Calculate rotated position
                $rad = deg2rad($angle);
                $rotX = $x * cos($rad) - $y * sin($rad);
                $rotY = $x * sin($rad) + $y * cos($rad);
                
                // Adjust to center of image
                $posX = $rotX + ($width / 2);
                $posY = $rotY + ($height / 2);
                
                // Only draw if within image bounds
                if ($posX >= -$textWidth && $posX <= $width + $textWidth &&
                    $posY >= -$textHeight && $posY <= $height + $textHeight) {
                    imagestring($image, $font, (int)$posX, (int)$posY, $text, $color);
                }
            }
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

