<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "=== GOOGLE VISION API TEST ===\n\n";

// Load dependencies
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/moderation.php';

if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
    echo "✅ Composer autoload loaded\n";
} else {
    echo "❌ Composer autoload NOT FOUND\n";
    echo "   Run: composer install\n";
    exit;
}

require_once __DIR__ . '/services/GoogleVisionService.php';

echo "\n1. CREDENTIALS CHECK\n";
$credPath = GOOGLE_APPLICATION_CREDENTIALS;
echo "   Path: $credPath\n";
echo "   Exists: " . (file_exists($credPath) ? 'YES' : 'NO') . "\n";

echo "\n2. ENVIRONMENT VARIABLE\n";
putenv('GOOGLE_APPLICATION_CREDENTIALS=' . $credPath);
echo "   Set to: " . getenv('GOOGLE_APPLICATION_CREDENTIALS') . "\n";

echo "\n3. TESTING GOOGLE VISION SERVICE\n";
try {
    $service = new GoogleVisionService();
    echo "   ✅ Service created\n";
    
    // Create a simple test image (1x1 pixel)
    $testImagePath = __DIR__ . '/uploads/temp/test_image.jpg';
    
    // Check if temp directory exists
    $tempDir = __DIR__ . '/uploads/temp/';
    if (!is_dir($tempDir)) {
        mkdir($tempDir, 0755, true);
    }
    
    // Create a simple test image
    $img = imagecreatetruecolor(100, 100);
    $white = imagecolorallocate($img, 255, 255, 255);
    imagefill($img, 0, 0, $white);
    imagejpeg($img, $testImagePath);
    imagedestroy($img);
    echo "   ✅ Test image created\n";
    
    // Try to analyze
    echo "\n4. CALLING VISION API...\n";
    $result = $service->analyzeImage($testImagePath);
    
    echo "\n5. RESULT:\n";
    print_r($result);
    
    // Cleanup
    unlink($testImagePath);
    
} catch (Throwable $e) {
    echo "\n❌ ERROR:\n";
    echo "   Message: " . $e->getMessage() . "\n";
    echo "   File: " . $e->getFile() . "\n";
    echo "   Line: " . $e->getLine() . "\n";
    echo "\n   Full trace:\n";
    echo $e->getTraceAsString();
}

echo "\n\n=== END TEST ===\n";