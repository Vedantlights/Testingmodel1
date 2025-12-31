<?php
/**
 * Debug Upload Test - Tests each step of moderate-and-upload.php
 * Visit: https://demo1.indiapropertys.com/backend/api/images/debug-upload-test.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

header('Content-Type: text/plain; charset=utf-8');

echo "=== IMAGE UPLOAD DEBUG TEST ===\n\n";

$errors = [];
$success = [];

// Step 1: Load config files
echo "STEP 1: Loading config files...\n";
try {
    require_once __DIR__ . '/../../config/config.php';
    $success[] = "Config loaded";
    echo "✓ Config loaded successfully\n";
    echo "  - BASE_URL: " . (defined('BASE_URL') ? BASE_URL : 'NOT DEFINED') . "\n";
    echo "  - UPLOAD_DIR: " . (defined('UPLOAD_DIR') ? UPLOAD_DIR : 'NOT DEFINED') . "\n";
    echo "  - UPLOAD_PROPERTIES_PATH: " . (defined('UPLOAD_PROPERTIES_PATH') ? UPLOAD_PROPERTIES_PATH : 'NOT DEFINED') . "\n";
    echo "  - UPLOAD_BASE_URL: " . (defined('UPLOAD_BASE_URL') ? UPLOAD_BASE_URL : 'NOT DEFINED') . "\n";
} catch (Exception $e) {
    $errors[] = "Config load failed: " . $e->getMessage();
    echo "✗ Config load failed: " . $e->getMessage() . "\n";
    echo "  File: " . $e->getFile() . " Line: " . $e->getLine() . "\n";
}

echo "\n";

// Step 2: Load database
echo "STEP 2: Loading database...\n";
try {
    require_once __DIR__ . '/../../config/database.php';
    $db = getDB();
    $success[] = "Database loaded";
    echo "✓ Database connection successful\n";
} catch (Exception $e) {
    $errors[] = "Database load failed: " . $e->getMessage();
    echo "✗ Database load failed: " . $e->getMessage() . "\n";
    echo "  File: " . $e->getFile() . " Line: " . $e->getLine() . "\n";
}

echo "\n";

// Step 3: Load vendor/autoload.php
echo "STEP 3: Loading Composer autoload...\n";
$vendorPath = __DIR__ . '/../../vendor/autoload.php';
if (file_exists($vendorPath)) {
    try {
        require_once $vendorPath;
        $success[] = "Composer autoload loaded";
        echo "✓ Composer autoload loaded successfully\n";
        echo "  Path: {$vendorPath}\n";
    } catch (Exception $e) {
        $errors[] = "Composer autoload failed: " . $e->getMessage();
        echo "✗ Composer autoload failed: " . $e->getMessage() . "\n";
    }
} else {
    $errors[] = "Composer autoload file not found";
    echo "✗ Composer autoload file not found at: {$vendorPath}\n";
}

echo "\n";

// Step 4: Check Google credentials file
echo "STEP 4: Checking Google credentials...\n";
$credentialsPath = '/home/u449667423/domains/indiapropertys.com/Secure/indiapropertys-8fab286d41e4.json';
if (file_exists($credentialsPath)) {
    echo "✓ Credentials file exists\n";
    echo "  Path: {$credentialsPath}\n";
    echo "  Readable: " . (is_readable($credentialsPath) ? 'YES' : 'NO') . "\n";
    echo "  Size: " . filesize($credentialsPath) . " bytes\n";
    
    // Try to read and parse JSON
    try {
        $credentialsContent = file_get_contents($credentialsPath);
        $credentialsJson = json_decode($credentialsContent, true);
        if ($credentialsJson && isset($credentialsJson['type'])) {
            echo "  Type: " . $credentialsJson['type'] . "\n";
            echo "  Project ID: " . ($credentialsJson['project_id'] ?? 'NOT FOUND') . "\n";
            $success[] = "Credentials file valid";
        } else {
            $errors[] = "Credentials file is not valid JSON";
            echo "✗ Credentials file is not valid JSON\n";
        }
    } catch (Exception $e) {
        $errors[] = "Failed to read credentials: " . $e->getMessage();
        echo "✗ Failed to read credentials: " . $e->getMessage() . "\n";
    }
} else {
    $errors[] = "Credentials file not found";
    echo "✗ Credentials file not found at: {$credentialsPath}\n";
}

echo "\n";

// Step 5: Try to create Google Vision client
echo "STEP 5: Creating Google Vision client...\n";
if (file_exists($vendorPath) && file_exists($credentialsPath)) {
    try {
        // Set environment variable
        putenv('GOOGLE_APPLICATION_CREDENTIALS=' . $credentialsPath);
        echo "  Set GOOGLE_APPLICATION_CREDENTIALS environment variable\n";
        
        // Check if class exists
        if (class_exists('Google\Cloud\Vision\V1\ImageAnnotatorClient')) {
            echo "  ✓ ImageAnnotatorClient class found\n";
            
            try {
                $vision = new Google\Cloud\Vision\V1\ImageAnnotatorClient();
                $success[] = "Google Vision client created";
                echo "✓ Google Vision client created successfully\n";
                
                // Close it immediately
                $vision->close();
            } catch (Exception $e) {
                $errors[] = "Google Vision client creation failed: " . $e->getMessage();
                echo "✗ Google Vision client creation failed: " . $e->getMessage() . "\n";
                echo "  Type: " . get_class($e) . "\n";
                echo "  File: " . $e->getFile() . " Line: " . $e->getLine() . "\n";
                if ($e->getPrevious()) {
                    echo "  Previous: " . $e->getPrevious()->getMessage() . "\n";
                }
            }
        } else {
            $errors[] = "ImageAnnotatorClient class not found";
            echo "✗ ImageAnnotatorClient class not found\n";
            echo "  Check if Google Cloud Vision library is installed via Composer\n";
        }
    } catch (Exception $e) {
        $errors[] = "Google Vision setup failed: " . $e->getMessage();
        echo "✗ Google Vision setup failed: " . $e->getMessage() . "\n";
    }
} else {
    $errors[] = "Cannot test Google Vision - missing dependencies";
    echo "✗ Cannot test Google Vision - missing dependencies\n";
}

echo "\n";

// Step 6: Test a simple Vision API call (if we have a test image)
echo "STEP 6: Testing Vision API call...\n";
if (file_exists($vendorPath) && file_exists($credentialsPath)) {
    // Try to find a test image in the uploads folder
    $testImagePath = null;
    $testPaths = [
        __DIR__ . '/../../uploads/properties/',
        __DIR__ . '/../../uploads/temp/',
        '/home/u449667423/domains/indiapropertys.com/public_html/demo1/backend/uploads/properties/'
    ];
    
    foreach ($testPaths as $testPath) {
        if (is_dir($testPath)) {
            $files = glob($testPath . '*/*.{jpg,jpeg,png,webp}', GLOB_BRACE);
            if (!empty($files)) {
                $testImagePath = $files[0];
                break;
            }
        }
    }
    
    if ($testImagePath && file_exists($testImagePath)) {
        echo "  Test image found: " . basename($testImagePath) . "\n";
        try {
            putenv('GOOGLE_APPLICATION_CREDENTIALS=' . $credentialsPath);
            $vision = new Google\Cloud\Vision\V1\ImageAnnotatorClient();
            
            $imageContent = file_get_contents($testImagePath);
            $image = (new Google\Cloud\Vision\V1\Image())->setContent($imageContent);
            
            echo "  Calling SafeSearch detection...\n";
            $response = $vision->safeSearchDetection($image);
            $safe = $response->getSafeSearchAnnotation();
            
            if ($safe) {
                echo "✓ Vision API call successful\n";
                echo "  Adult: " . $safe->getAdult() . "\n";
                echo "  Violence: " . $safe->getViolence() . "\n";
                echo "  Racy: " . $safe->getRacy() . "\n";
                $success[] = "Vision API call successful";
            } else {
                echo "⚠ Vision API returned no SafeSearch annotation\n";
            }
            
            $vision->close();
        } catch (Exception $e) {
            $errors[] = "Vision API call failed: " . $e->getMessage();
            echo "✗ Vision API call failed: " . $e->getMessage() . "\n";
            echo "  Type: " . get_class($e) . "\n";
            echo "  File: " . $e->getFile() . " Line: " . $e->getLine() . "\n";
            if ($e->getPrevious()) {
                echo "  Previous: " . $e->getPrevious()->getMessage() . "\n";
            }
            echo "  Trace:\n";
            $trace = $e->getTraceAsString();
            echo "  " . str_replace("\n", "\n  ", $trace) . "\n";
        }
    } else {
        echo "⚠ No test image found - skipping API call test\n";
        echo "  Searched paths:\n";
        foreach ($testPaths as $path) {
            echo "    - {$path}\n";
        }
    }
} else {
    echo "⚠ Cannot test Vision API - missing dependencies\n";
}

echo "\n";

// Step 7: Check upload directories
echo "STEP 7: Checking upload directories...\n";
$dirsToCheck = [
    'UPLOAD_DIR' => defined('UPLOAD_DIR') ? UPLOAD_DIR : null,
    'UPLOAD_PROPERTIES_PATH' => defined('UPLOAD_PROPERTIES_PATH') ? UPLOAD_PROPERTIES_PATH : null,
];

foreach ($dirsToCheck as $name => $path) {
    if ($path) {
        echo "  {$name}: {$path}\n";
        echo "    Exists: " . (is_dir($path) ? 'YES' : 'NO') . "\n";
        echo "    Writable: " . (is_writable($path) ? 'YES' : 'NO') . "\n";
        if (is_dir($path)) {
            $files = glob($path . '*');
            echo "    Items: " . count($files) . "\n";
        }
    } else {
        echo "  {$name}: NOT DEFINED\n";
    }
}

echo "\n";

// Summary
echo "=== SUMMARY ===\n";
echo "Successful steps: " . count($success) . "\n";
foreach ($success as $s) {
    echo "  ✓ {$s}\n";
}

echo "\n";
echo "Failed steps: " . count($errors) . "\n";
if (count($errors) > 0) {
    foreach ($errors as $e) {
        echo "  ✗ {$e}\n";
    }
} else {
    echo "  ✓ All steps passed!\n";
}

echo "\n";
echo "=== RECOMMENDATIONS ===\n";
if (count($errors) > 0) {
    echo "Fix the errors above, then test again.\n";
} else {
    echo "All checks passed! The issue might be in the actual upload flow.\n";
    echo "Check the error logs when uploading an image.\n";
}

