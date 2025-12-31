<?php
/**
 * Google Vision API Diagnostic Tool
 * This script identifies the exact issue with your Vision API setup
 * 
 * Upload to: /backend/api/test-vision.php
 * Run via: https://demo1.indiapropertys.com/backend/api/test-vision.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
set_time_limit(60);

header('Content-Type: text/html; charset=utf-8');

// Store all diagnostic results
$diagnostics = [];
$criticalError = null;

function addResult($category, $test, $status, $details = '', $fix = '') {
    global $diagnostics;
    $diagnostics[] = [
        'category' => $category,
        'test' => $test,
        'status' => $status, // 'pass', 'fail', 'warning'
        'details' => $details,
        'fix' => $fix
    ];
}

function getStatusIcon($status) {
    switch ($status) {
        case 'pass': return '✅';
        case 'fail': return '❌';
        case 'warning': return '⚠️';
        default: return '❓';
    }
}

echo "<!DOCTYPE html>
<html>
<head>
    <title>Google Vision API Diagnostics</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        h1 { color: #333; border-bottom: 3px solid #4285f4; padding-bottom: 10px; }
        h2 { color: #4285f4; margin-top: 30px; }
        .category { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .test { padding: 12px; border-bottom: 1px solid #eee; display: flex; align-items: flex-start; }
        .test:last-child { border-bottom: none; }
        .test-icon { font-size: 20px; margin-right: 12px; min-width: 30px; }
        .test-content { flex: 1; }
        .test-name { font-weight: 600; color: #333; }
        .test-details { color: #666; font-size: 14px; margin-top: 4px; }
        .test-fix { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin-top: 8px; font-size: 13px; }
        .pass { color: #28a745; }
        .fail { color: #dc3545; }
        .warning { color: #ffc107; }
        .critical-error { background: #f8d7da; border: 2px solid #dc3545; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .critical-error h3 { color: #dc3545; margin-top: 0; }
        pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 13px; }
        .summary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .summary h2 { color: white; margin-top: 0; }
        .json-output { background: #1e1e1e; color: #9cdcfe; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 12px; max-height: 300px; overflow: auto; }
    </style>
</head>
<body>
<h1>🔍 Google Vision API Diagnostic Report</h1>
<p>Generated: " . date('Y-m-d H:i:s') . "</p>";

// ============================================
// CATEGORY 1: PHP Environment
// ============================================
echo "<div class='category'><h2>1. PHP Environment</h2>";

// PHP Version
$phpVersion = phpversion();
$phpOk = version_compare($phpVersion, '7.4', '>=');
addResult('PHP', 'PHP Version', $phpOk ? 'pass' : 'fail', 
    "Current: PHP {$phpVersion}", 
    $phpOk ? '' : 'Google Cloud SDK requires PHP 7.4 or higher');

// Required Extensions
$requiredExtensions = ['json', 'curl', 'openssl', 'mbstring', 'fileinfo'];
foreach ($requiredExtensions as $ext) {
    $loaded = extension_loaded($ext);
    addResult('PHP', "Extension: {$ext}", $loaded ? 'pass' : 'fail',
        $loaded ? 'Loaded' : 'Not loaded',
        $loaded ? '' : "Install/enable the {$ext} PHP extension");
}

// cURL SSL Support
if (extension_loaded('curl')) {
    $curlVersion = curl_version();
    $sslSupport = !empty($curlVersion['ssl_version']);
    addResult('PHP', 'cURL SSL Support', $sslSupport ? 'pass' : 'fail',
        $sslSupport ? "SSL: {$curlVersion['ssl_version']}" : 'No SSL support',
        $sslSupport ? '' : 'cURL needs SSL support for HTTPS API calls');
}

// Memory Limit
$memoryLimit = ini_get('memory_limit');
$memoryBytes = convertToBytes($memoryLimit);
$memoryOk = $memoryBytes >= 128 * 1024 * 1024; // 128MB minimum
addResult('PHP', 'Memory Limit', $memoryOk ? 'pass' : 'warning',
    "Current: {$memoryLimit}",
    $memoryOk ? '' : 'Recommend at least 128M for image processing');

// Max Execution Time
$maxExecTime = ini_get('max_execution_time');
$execTimeOk = $maxExecTime == 0 || $maxExecTime >= 30;
addResult('PHP', 'Max Execution Time', $execTimeOk ? 'pass' : 'warning',
    "Current: {$maxExecTime}s",
    $execTimeOk ? '' : 'API calls may timeout. Increase to at least 30 seconds');

// Upload Max Filesize
$uploadMax = ini_get('upload_max_filesize');
addResult('PHP', 'Upload Max Filesize', 'pass', "Current: {$uploadMax}");

echo "</div>";

// ============================================
// CATEGORY 2: Config Files
// ============================================
echo "<div class='category'><h2>2. Configuration Files</h2>";

// Check if config files exist
$configPath = __DIR__ . '/../config/config.php';
$moderationPath = __DIR__ . '/../config/moderation.php';

$configExists = file_exists($configPath);
addResult('Config', 'config.php exists', $configExists ? 'pass' : 'fail',
    $configExists ? $configPath : 'File not found',
    $configExists ? '' : 'Create config/config.php with your settings');

$moderationExists = file_exists($moderationPath);
addResult('Config', 'moderation.php exists', $moderationExists ? 'pass' : 'fail',
    $moderationExists ? $moderationPath : 'File not found',
    $moderationExists ? '' : 'Create config/moderation.php with GOOGLE_APPLICATION_CREDENTIALS');

// Load configs
if ($configExists) {
    try {
        require_once $configPath;
        addResult('Config', 'config.php loads', 'pass', 'No syntax errors');
    } catch (Throwable $e) {
        addResult('Config', 'config.php loads', 'fail', $e->getMessage(), 'Fix syntax error in config.php');
        $criticalError = "Config file error: " . $e->getMessage();
    }
}

if ($moderationExists) {
    try {
        require_once $moderationPath;
        addResult('Config', 'moderation.php loads', 'pass', 'No syntax errors');
    } catch (Throwable $e) {
        addResult('Config', 'moderation.php loads', 'fail', $e->getMessage(), 'Fix syntax error in moderation.php');
        $criticalError = "Moderation config error: " . $e->getMessage();
    }
}

// Check GOOGLE_APPLICATION_CREDENTIALS constant
if (defined('GOOGLE_APPLICATION_CREDENTIALS')) {
    $credPath = GOOGLE_APPLICATION_CREDENTIALS;
    addResult('Config', 'GOOGLE_APPLICATION_CREDENTIALS defined', 'pass', $credPath);
} else {
    addResult('Config', 'GOOGLE_APPLICATION_CREDENTIALS defined', 'fail', 
        'Constant not defined',
        "Add to moderation.php: define('GOOGLE_APPLICATION_CREDENTIALS', '/path/to/credentials.json');");
    $criticalError = "GOOGLE_APPLICATION_CREDENTIALS constant is not defined";
}

echo "</div>";

// ============================================
// CATEGORY 3: Credentials File
// ============================================
echo "<div class='category'><h2>3. Google Cloud Credentials</h2>";

if (defined('GOOGLE_APPLICATION_CREDENTIALS')) {
    $credPath = GOOGLE_APPLICATION_CREDENTIALS;
    
    // File exists
    $fileExists = file_exists($credPath);
    addResult('Credentials', 'Credentials file exists', $fileExists ? 'pass' : 'fail',
        $fileExists ? "Found at: {$credPath}" : "Not found at: {$credPath}",
        $fileExists ? '' : 'Download service account JSON from Google Cloud Console and place at this path');
    
    if ($fileExists) {
        // File readable
        $readable = is_readable($credPath);
        addResult('Credentials', 'File is readable', $readable ? 'pass' : 'fail',
            $readable ? 'Web server can read the file' : 'Permission denied',
            $readable ? '' : 'Run: chmod 644 ' . $credPath);
        
        // File permissions
        $perms = substr(sprintf('%o', fileperms($credPath)), -4);
        $permsOk = in_array($perms, ['0644', '0640', '0600', '0755']);
        addResult('Credentials', 'File permissions', $permsOk ? 'pass' : 'warning',
            "Permissions: {$perms}",
            $permsOk ? '' : 'Recommended: chmod 644 (or 640 for more security)');
        
        // File size
        $fileSize = filesize($credPath);
        $sizeOk = $fileSize > 100; // Minimum reasonable size for JSON
        addResult('Credentials', 'File size check', $sizeOk ? 'pass' : 'fail',
            "Size: {$fileSize} bytes",
            $sizeOk ? '' : 'File appears empty or corrupted. Re-download from Google Cloud Console');
        
        if ($readable && $sizeOk) {
            // Parse JSON
            $jsonContent = file_get_contents($credPath);
            $credentials = json_decode($jsonContent, true);
            $jsonValid = ($credentials !== null && json_last_error() === JSON_ERROR_NONE);
            
            addResult('Credentials', 'Valid JSON format', $jsonValid ? 'pass' : 'fail',
                $jsonValid ? 'JSON parsed successfully' : 'JSON error: ' . json_last_error_msg(),
                $jsonValid ? '' : 'Re-download credentials file from Google Cloud Console');
            
            if ($jsonValid) {
                // Check required fields
                $requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email', 'client_id'];
                $missingFields = [];
                
                foreach ($requiredFields as $field) {
                    if (empty($credentials[$field])) {
                        $missingFields[] = $field;
                    }
                }
                
                if (empty($missingFields)) {
                    addResult('Credentials', 'Required fields present', 'pass', 'All required fields found');
                    
                    // Display credential info (sanitized)
                    addResult('Credentials', 'Credential Type', 'pass', $credentials['type']);
                    addResult('Credentials', 'Project ID', 'pass', $credentials['project_id']);
                    addResult('Credentials', 'Client Email', 'pass', $credentials['client_email']);
                    addResult('Credentials', 'Private Key', 
                        !empty($credentials['private_key']) ? 'pass' : 'fail',
                        !empty($credentials['private_key']) ? 'Present (' . strlen($credentials['private_key']) . ' chars)' : 'Missing!');
                    
                    // Check if it's a service account
                    if ($credentials['type'] !== 'service_account') {
                        addResult('Credentials', 'Account Type Warning', 'warning',
                            "Type is '{$credentials['type']}' not 'service_account'",
                            'Make sure you downloaded a Service Account key, not OAuth credentials');
                    }
                } else {
                    addResult('Credentials', 'Required fields present', 'fail',
                        'Missing: ' . implode(', ', $missingFields),
                        'Re-download credentials file from Google Cloud Console');
                    $criticalError = "Credentials file missing required fields: " . implode(', ', $missingFields);
                }
            } else {
                $criticalError = "Credentials file is not valid JSON";
            }
        }
    } else {
        $criticalError = "Credentials file not found at: {$credPath}";
    }
} else {
    addResult('Credentials', 'Credentials path', 'fail', 'GOOGLE_APPLICATION_CREDENTIALS not defined');
}

echo "</div>";

// ============================================
// CATEGORY 4: Composer & Dependencies
// ============================================
echo "<div class='category'><h2>4. Composer & Dependencies</h2>";

$vendorPath = __DIR__ . '/../vendor/autoload.php';
$vendorExists = file_exists($vendorPath);

addResult('Composer', 'vendor/autoload.php exists', $vendorExists ? 'pass' : 'fail',
    $vendorExists ? $vendorPath : 'Not found',
    $vendorExists ? '' : 'Run: composer install in your backend directory');

if ($vendorExists) {
    try {
        require_once $vendorPath;
        addResult('Composer', 'Autoloader loads', 'pass', 'No errors');
        
        // Check for Google Cloud Vision classes
        $classes = [
            'Google\Cloud\Vision\V1\Client\ImageAnnotatorClient' => 'Main Vision API client',
            'Google\Cloud\Vision\V1\Feature' => 'Feature detection class',
            'Google\Cloud\Vision\V1\Image' => 'Image class',
            'Google\Cloud\Vision\V1\AnnotateImageRequest' => 'Request class',
            'Google\Cloud\Vision\V1\BatchAnnotateImagesRequest' => 'Batch request class',
        ];
        
        foreach ($classes as $class => $description) {
            $exists = class_exists($class);
            addResult('Composer', "Class: " . basename(str_replace('\\', '/', $class)), $exists ? 'pass' : 'fail',
                $exists ? $description : 'Class not found',
                $exists ? '' : 'Run: composer require google/cloud-vision');
        }
        
        // Check Google Cloud Vision version
        $composerLock = __DIR__ . '/../composer.lock';
        if (file_exists($composerLock)) {
            $lockContent = json_decode(file_get_contents($composerLock), true);
            if ($lockContent && isset($lockContent['packages'])) {
                foreach ($lockContent['packages'] as $package) {
                    if ($package['name'] === 'google/cloud-vision') {
                        addResult('Composer', 'google/cloud-vision version', 'pass', 
                            "Version: {$package['version']}");
                        break;
                    }
                }
            }
        }
        
    } catch (Throwable $e) {
        addResult('Composer', 'Autoloader loads', 'fail', $e->getMessage());
        $criticalError = "Composer autoload error: " . $e->getMessage();
    }
} else {
    $criticalError = "Composer vendor directory not found. Run 'composer install'";
}

echo "</div>";

// ============================================
// CATEGORY 5: Network Connectivity
// ============================================
echo "<div class='category'><h2>5. Network Connectivity</h2>";

// Test DNS resolution
$googleDns = gethostbyname('vision.googleapis.com');
$dnsWorks = ($googleDns !== 'vision.googleapis.com');
addResult('Network', 'DNS Resolution', $dnsWorks ? 'pass' : 'fail',
    $dnsWorks ? "vision.googleapis.com → {$googleDns}" : 'Cannot resolve hostname',
    $dnsWorks ? '' : 'Check server DNS settings');

// Test HTTPS connection
if (extension_loaded('curl')) {
    $ch = curl_init('https://vision.googleapis.com/');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_NOBODY => true,
    ]);
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    $httpsWorks = ($httpCode > 0 && empty($curlError));
    addResult('Network', 'HTTPS to Google APIs', $httpsWorks ? 'pass' : 'fail',
        $httpsWorks ? "HTTP {$httpCode}" : "Error: {$curlError}",
        $httpsWorks ? '' : 'Check firewall rules, SSL certificates, or proxy settings');
}

// Test OAuth endpoint
$ch = curl_init('https://oauth2.googleapis.com/token');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_NOBODY => true,
]);
curl_exec($ch);
$oauthCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$oauthError = curl_error($ch);
curl_close($ch);

$oauthWorks = ($oauthCode > 0 && empty($oauthError));
addResult('Network', 'HTTPS to Google OAuth', $oauthWorks ? 'pass' : 'fail',
    $oauthWorks ? "HTTP {$oauthCode}" : "Error: {$oauthError}",
    $oauthWorks ? '' : 'OAuth endpoint required for authentication');

echo "</div>";

// ============================================
// CATEGORY 6: Client Initialization
// ============================================
echo "<div class='category'><h2>6. Vision API Client Initialization</h2>";

$clientInitialized = false;
$client = null;

if ($vendorExists && defined('GOOGLE_APPLICATION_CREDENTIALS') && file_exists(GOOGLE_APPLICATION_CREDENTIALS)) {
    try {
        // Set environment variable
        putenv('GOOGLE_APPLICATION_CREDENTIALS=' . GOOGLE_APPLICATION_CREDENTIALS);
        
        $client = new Google\Cloud\Vision\V1\Client\ImageAnnotatorClient([
            'credentials' => GOOGLE_APPLICATION_CREDENTIALS
        ]);
        
        $clientInitialized = true;
        addResult('Client', 'ImageAnnotatorClient created', 'pass', 'Client initialized successfully');
        
    } catch (Google\ApiCore\ValidationException $e) {
        addResult('Client', 'ImageAnnotatorClient created', 'fail',
            "Validation Error: " . $e->getMessage(),
            'Check credentials file format and permissions');
        $criticalError = "Client validation error: " . $e->getMessage();
        
    } catch (Google\ApiCore\ApiException $e) {
        addResult('Client', 'ImageAnnotatorClient created', 'fail',
            "API Error: " . $e->getMessage(),
            'Check if Vision API is enabled in Google Cloud Console');
        $criticalError = "API error: " . $e->getMessage();
        
    } catch (InvalidArgumentException $e) {
        addResult('Client', 'ImageAnnotatorClient created', 'fail',
            "Invalid Argument: " . $e->getMessage(),
            'Check credentials path and format');
        $criticalError = "Invalid argument: " . $e->getMessage();
        
    } catch (Throwable $e) {
        addResult('Client', 'ImageAnnotatorClient created', 'fail',
            get_class($e) . ": " . $e->getMessage(),
            'See error details below');
        $criticalError = get_class($e) . ": " . $e->getMessage();
        
        // Log full stack trace
        echo "<pre style='background:#2d2d2d;color:#f92672;padding:10px;font-size:11px;'>";
        echo "Exception: " . get_class($e) . "\n";
        echo "Message: " . $e->getMessage() . "\n";
        echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n\n";
        echo "Stack Trace:\n" . $e->getTraceAsString();
        echo "</pre>";
    }
} else {
    addResult('Client', 'ImageAnnotatorClient created', 'fail',
        'Prerequisites not met',
        'Fix credential and composer issues first');
}

echo "</div>";

// ============================================
// CATEGORY 7: Live API Test
// ============================================
echo "<div class='category'><h2>7. Live API Test</h2>";

if ($clientInitialized && $client) {
    try {
        // Create a simple 1x1 white PNG for testing
        $testImage = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
        
        // Create image object
        $image = new Google\Cloud\Vision\V1\Image();
        $image->setContent($testImage);
        
        // Create feature request
        $feature = new Google\Cloud\Vision\V1\Feature();
        $feature->setType(Google\Cloud\Vision\V1\Feature\Type::SAFE_SEARCH_DETECTION);
        
        // Create annotate request
        $annotateRequest = new Google\Cloud\Vision\V1\AnnotateImageRequest();
        $annotateRequest->setImage($image);
        $annotateRequest->setFeatures([$feature]);
        
        // Create batch request
        $batchRequest = new Google\Cloud\Vision\V1\BatchAnnotateImagesRequest();
        $batchRequest->setRequests([$annotateRequest]);
        
        // Make API call
        $startTime = microtime(true);
        $response = $client->batchAnnotateImages($batchRequest);
        $endTime = microtime(true);
        $duration = round(($endTime - $startTime) * 1000);
        
        addResult('API Test', 'API Call Successful', 'pass', 
            "Response received in {$duration}ms");
        
        // Check response
        $responses = $response->getResponses();
        if (!empty($responses)) {
            $firstResponse = $responses[0];
            
            // Check for API error in response
            if (method_exists($firstResponse, 'hasError') && $firstResponse->hasError()) {
                $error = $firstResponse->getError();
                $errorMsg = method_exists($error, 'getMessage') ? $error->getMessage() : 'Unknown error';
                $errorCode = method_exists($error, 'getCode') ? $error->getCode() : 'Unknown';
                
                addResult('API Test', 'Response Status', 'fail',
                    "Error {$errorCode}: {$errorMsg}",
                    'Check Google Cloud Console for API status and quotas');
                $criticalError = "API returned error: {$errorMsg}";
            } else {
                addResult('API Test', 'Response Status', 'pass', 'No errors in response');
                
                // Check SafeSearch
                $safeSearch = $firstResponse->getSafeSearchAnnotation();
                if ($safeSearch) {
                    addResult('API Test', 'SafeSearch Detection', 'pass', 'Working correctly');
                }
            }
        } else {
            addResult('API Test', 'Response Status', 'fail', 
                'Empty response array',
                'API returned no results');
        }
        
    } catch (Google\ApiCore\ApiException $e) {
        $message = $e->getMessage();
        $code = $e->getCode();
        
        addResult('API Test', 'API Call', 'fail', "API Exception (Code {$code}): {$message}");
        
        // Provide specific fixes based on error code
        if (strpos($message, 'Cloud Vision API has not been used') !== false || 
            strpos($message, 'it is disabled') !== false) {
            addResult('API Test', 'API Enabled Check', 'fail',
                'Cloud Vision API is not enabled',
                '1. Go to https://console.cloud.google.com/apis/library/vision.googleapis.com
2. Select your project
3. Click "Enable"');
            $criticalError = "Cloud Vision API is not enabled for this project";
            
        } elseif (strpos($message, 'PERMISSION_DENIED') !== false) {
            addResult('API Test', 'Permission Check', 'fail',
                'Service account lacks permissions',
                '1. Go to Google Cloud Console → IAM
2. Find your service account
3. Add role: "Cloud Vision API User" or "Cloud Vision API Admin"');
            $criticalError = "Permission denied - check service account roles";
            
        } elseif (strpos($message, 'UNAUTHENTICATED') !== false) {
            addResult('API Test', 'Authentication Check', 'fail',
                'Authentication failed',
                'Verify service account credentials are valid and not expired');
            $criticalError = "Authentication failed";
            
        } elseif (strpos($message, 'billing') !== false || $code === 403) {
            addResult('API Test', 'Billing Check', 'fail',
                'Billing may not be enabled',
                '1. Go to https://console.cloud.google.com/billing
2. Ensure billing is enabled for your project
3. Vision API requires an active billing account');
            $criticalError = "Billing not enabled or quota exceeded";
            
        } elseif (strpos($message, 'quota') !== false || $code === 429) {
            addResult('API Test', 'Quota Check', 'fail',
                'API quota exceeded',
                'Check your quotas at: https://console.cloud.google.com/apis/api/vision.googleapis.com/quotas');
            $criticalError = "API quota exceeded";
        }
        
        echo "<pre style='background:#2d2d2d;color:#f92672;padding:10px;font-size:11px;'>";
        echo "API Exception Details:\n";
        echo "Code: {$code}\n";
        echo "Message: {$message}\n";
        echo "</pre>";
        
    } catch (Throwable $e) {
        addResult('API Test', 'API Call', 'fail',
            get_class($e) . ": " . $e->getMessage(),
            'See error details below');
        $criticalError = "API call failed: " . $e->getMessage();
        
        echo "<pre style='background:#2d2d2d;color:#f92672;padding:10px;font-size:11px;'>";
        echo "Exception: " . get_class($e) . "\n";
        echo "Message: " . $e->getMessage() . "\n";
        echo "Stack Trace:\n" . $e->getTraceAsString();
        echo "</pre>";
    }
    
    // Close client
    try {
        $client->close();
    } catch (Exception $e) {
        // Ignore close errors
    }
} else {
    addResult('API Test', 'API Call', 'fail', 
        'Client not initialized',
        'Fix client initialization errors first');
}

echo "</div>";

// ============================================
// SUMMARY
// ============================================
$passCount = 0;
$failCount = 0;
$warningCount = 0;

foreach ($diagnostics as $d) {
    switch ($d['status']) {
        case 'pass': $passCount++; break;
        case 'fail': $failCount++; break;
        case 'warning': $warningCount++; break;
    }
}

echo "<div class='summary'>
<h2>📊 Summary</h2>
<p style='font-size:24px;'>
    <span style='color:#a8e6cf;'>✅ {$passCount} Passed</span> &nbsp;|&nbsp; 
    <span style='color:#ff8b94;'>❌ {$failCount} Failed</span> &nbsp;|&nbsp; 
    <span style='color:#ffeaa7;'>⚠️ {$warningCount} Warnings</span>
</p>";

if ($criticalError) {
    echo "<div style='background:rgba(255,255,255,0.2);padding:15px;border-radius:5px;margin-top:15px;'>
        <strong>🚨 Critical Issue Found:</strong><br>
        {$criticalError}
    </div>";
}

echo "</div>";

// ============================================
// DETAILED RESULTS
// ============================================
echo "<div class='category'><h2>📋 Detailed Results</h2>";

$currentCategory = '';
foreach ($diagnostics as $d) {
    if ($d['category'] !== $currentCategory) {
        if ($currentCategory !== '') {
            echo "</div>";
        }
        $currentCategory = $d['category'];
        echo "<div style='margin: 15px 0;'><h3 style='color:#666;font-size:14px;text-transform:uppercase;'>{$currentCategory}</h3>";
    }
    
    echo "<div class='test'>
        <span class='test-icon'>" . getStatusIcon($d['status']) . "</span>
        <div class='test-content'>
            <div class='test-name'>{$d['test']}</div>
            <div class='test-details'>{$d['details']}</div>";
    if (!empty($d['fix'])) {
        echo "<div class='test-fix'>💡 <strong>Fix:</strong> {$d['fix']}</div>";
    }
    echo "</div></div>";
}
echo "</div></div>";

// ============================================
// JSON Export
// ============================================
echo "<div class='category'><h2>📤 JSON Export (for debugging)</h2>
<div class='json-output'>" . htmlspecialchars(json_encode([
    'timestamp' => date('c'),
    'php_version' => phpversion(),
    'critical_error' => $criticalError,
    'summary' => [
        'passed' => $passCount,
        'failed' => $failCount,
        'warnings' => $warningCount
    ],
    'diagnostics' => $diagnostics
], JSON_PRETTY_PRINT)) . "</div></div>";

echo "</body></html>";

// Helper function
function convertToBytes($val) {
    $val = trim($val);
    $last = strtolower($val[strlen($val)-1]);
    $val = (int)$val;
    switch($last) {
        case 'g': $val *= 1024;
        case 'm': $val *= 1024;
        case 'k': $val *= 1024;
    }
    return $val;
}