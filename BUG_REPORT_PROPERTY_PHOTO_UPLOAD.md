# Bug Report: Property Photo Upload System

## Executive Summary
This report identifies critical bugs in the property photo upload functionality located in `backend/api/images/moderate-and-upload.php`. The main issues involve inconsistent JSON response handling that can cause frontend parsing errors, and potential path construction issues.

---

## Critical Bugs

### BUG #1: Inconsistent JSON Response Handling (CRITICAL)

**Location**: Multiple locations in `backend/api/images/moderate-and-upload.php`

**Severity**: CRITICAL - Causes frontend JSON parsing errors

**Description**:
The code inconsistently uses two different methods to send JSON responses:
1. `sendJsonResponse()` function (correct method) - cleans output buffer, sets headers properly
2. `http_response_code()` + `echo json_encode()` + `exit` (incorrect method) - bypasses buffer cleaning

**Affected Code Sections**:

1. **File Size Validation Error** (Lines 368-374):
```php
http_response_code(400);
echo json_encode([
    'status' => 'error',
    'message' => getErrorMessage('file_too_large'),
    'error_code' => 'file_too_large'
]);
exit;
```

2. **Image Dimensions Error** (Lines 382-397):
```php
http_response_code(400);
echo json_encode([
    'status' => 'error',
    'message' => getErrorMessage('low_quality', [...]),
    'error_code' => 'low_quality',
    'details' => [...]
]);
exit;
```

3. **Human Face Detection Error** (Lines 559-569):
```php
FileHelper::deleteFile($tempPath);
http_response_code(400);
echo json_encode([
    'status' => 'error',
    'message' => getErrorMessage('human_detected'),
    'error_code' => 'human_detected',
    'details' => [...]
]);
exit;
```

4. **Human Object Detection Error** (Lines 585-596):
```php
FileHelper::deleteFile($tempPath);
http_response_code(400);
echo json_encode([...]);
exit;
```

5. **Animal Detection Errors** (Lines 668-681, 692-705):
```php
FileHelper::deleteFile($tempPath);
http_response_code(400);
echo json_encode([...]);
exit;
```

6. **SafeSearch Content Errors** (Lines 716-723, 726-736, 739-747):
```php
FileHelper::deleteFile($tempPath);
http_response_code(400);
echo json_encode([...]);
exit;
```

7. **Upload Path Configuration Error** (Lines 412-414):
```php
http_response_code(500);
echo json_encode(['status' => 'error', 'message' => 'Upload path configuration error']);
exit;
```

8. **Failed to Create Temp Directory** (Lines 420-427):
```php
http_response_code(500);
echo json_encode([
    'status' => 'error', 
    'message' => 'Failed to create upload directory',
    'error_code' => 'directory_error',
    'path' => $tempDir
]);
exit;
```

9. **Failed to Move Uploaded File** (Lines 435-437):
```php
http_response_code(500);
echo json_encode(['status' => 'error', 'message' => 'Failed to save uploaded file']);
exit;
```

10. **Failed to Create Property Folder** (Lines 828-839):
```php
FileHelper::deleteFile($tempPath);
http_response_code(500);
echo json_encode([
    'status' => 'error', 
    'message' => 'Failed to create property folder',
    'debug' => [...]
]);
exit;
```

11. **Failed to Save Image File** (Lines 879-892):
```php
FileHelper::deleteFile($tempPath);
http_response_code(500);
echo json_encode([
    'status' => 'error', 
    'message' => 'Failed to save image file',
    'debug' => [...]
]);
exit;
```

12. **Validate-Only Mode Response** (Lines 765-777):
```php
http_response_code(200);
echo json_encode([
    'status' => 'success',
    'message' => 'Image approved',
    'data' => [...]
]);
exit;
```

**Impact**:
- PHP warnings, notices, or other output before these responses will corrupt the JSON
- Frontend may receive malformed JSON causing `JSON.parse()` errors
- Output buffer is not cleaned, so any previous output (including from included files) will be included
- Headers may not be set correctly, causing CORS issues in some cases
- Inconsistent error handling makes debugging difficult

**Expected Behavior**:
All JSON responses should use the `sendJsonResponse()` function which:
- Cleans output buffers properly
- Sets correct headers (Content-Type, CORS)
- Ensures clean JSON output
- Uses consistent error format

**Fix Required**:
Replace all instances of:
```php
http_response_code(XXX);
echo json_encode([...]);
exit;
```

With:
```php
sendJsonResponse([...], XXX);
```

---

### BUG #2: Validate-Only Mode Temp File Path Issue

**Location**: Lines 761-777 in `backend/api/images/moderate-and-upload.php`

**Severity**: HIGH - Functional issue in validate-only mode

**Description**:
In validate-only mode (used for new properties before property creation), the API returns an absolute server path in the `temp_file` field, which is not useful for the frontend and could be a security issue.

**Affected Code**:
```php
if ($validateOnly) {
    // Keep temp file for now (will be uploaded when property is created)
    // Return validation result
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Image approved',
        'data' => [
            'validated' => true,
            'temp_file' => $tempPath, // ⚠️ Returns absolute server path
            'filename' => $uniqueFilename,
            'moderation_status' => 'SAFE',
            'validate_only' => true
        ]
    ]);
    exit;
}
```

**Issues**:
1. Returns absolute server file path (`/home/u449667423/...`) which frontend cannot use
2. Uses incorrect response method (should use `sendJsonResponse()`)
3. No mechanism to link temp files to the property when it's created later
4. Temp files may accumulate if property creation fails

**Impact**:
- Frontend receives unusable server path
- No way to associate validated images with newly created properties
- Potential file system leakage (temp files not cleaned up)
- Security risk (exposes server directory structure)

**Expected Behavior**:
- Should return only the filename, not full path
- Should use `sendJsonResponse()` for consistent formatting
- Frontend should handle images differently in validate-only mode (likely keep in memory/blob until property is created)

**Fix Required**:
1. Return only filename, not full path
2. Use `sendJsonResponse()` 
3. Consider returning a token/ID that can be used to retrieve the temp file when property is created

---

### BUG #3: Potential Path Construction Issues

**Location**: Lines 432, 789 in `backend/api/images/moderate-and-upload.php`

**Severity**: MEDIUM - May cause file save failures under edge cases

**Description**:
Path construction assumes trailing slashes in directory constants without explicit verification.

**Affected Code**:

1. **Temp Path Construction** (Line 432):
```php
$tempPath = $tempDir . $uniqueFilename;
```
Where `$tempDir = UPLOAD_TEMP_PATH;`

2. **Property Folder Construction** (Line 789):
```php
$propertyFolder = $basePropertiesDir . $propertyId . '/';
```
Where `$basePropertiesDir = UPLOAD_PROPERTIES_PATH;`

**Issues**:
- Code assumes `UPLOAD_TEMP_PATH` and `UPLOAD_PROPERTIES_PATH` have trailing slashes
- If constants are defined without trailing slashes, files will be saved to wrong locations
- While `moderation.php` defines these with trailing slashes, there's no runtime validation

**Impact**:
- Files may be saved to incorrect locations if constants are misconfigured
- Difficult to debug path-related upload failures

**Expected Behavior**:
- Explicitly ensure trailing slashes exist
- Or use path joining functions that handle this automatically

**Fix Required**:
```php
// Ensure trailing slash
$tempDir = rtrim(UPLOAD_TEMP_PATH, '/') . '/';
$tempPath = $tempDir . $uniqueFilename;

// Or use a helper function
$propertyFolder = rtrim(UPLOAD_PROPERTIES_PATH, '/') . '/' . $propertyId . '/';
```

---

## API Path Configuration

### Endpoint Definition
**Frontend Config**: `frontend/src/config/api.config.js`
```javascript
MODERATE_AND_UPLOAD: '/images/moderate-and-upload.php',
```

**Full URL**: `{API_BASE_URL}/images/moderate-and-upload.php`

### Request Format
- **Method**: POST
- **Content-Type**: multipart/form-data
- **Required Fields**:
  - `image`: File upload (FormData field name must be 'image')
  - `property_id`: Integer (0 for validate-only mode)
  - `validate_only`: String 'true' (optional, for new properties)

### Response Format
**Success Response** (should be consistent):
```json
{
  "status": "success",
  "message": "Image approved",
  "data": {
    "image_id": 123,
    "image_url": "https://demo1.indiapropertys.com/backend/uploads/properties/74/img.webp",
    "relative_path": "properties/74/img.webp",
    "filename": "img_1234567890_abc123.webp",
    "moderation_status": "SAFE"
  }
}
```

**Error Response** (should be consistent):
```json
{
  "status": "error",
  "message": "Error description",
  "error_code": "error_code_name",
  "details": {}
}
```

---

## Testing Recommendations

1. **Test JSON Response Parsing**:
   - Upload images that trigger each error condition
   - Verify frontend can parse all error responses
   - Check browser console for JSON parsing errors

2. **Test Validate-Only Mode**:
   - Upload images for new properties (property_id = 0)
   - Verify response format is correct
   - Test property creation flow with validated images

3. **Test Path Construction**:
   - Verify files are saved to correct directories
   - Check file permissions and accessibility
   - Test with various property IDs

---

## Priority Fix Order

1. **BUG #1** (CRITICAL) - Fix immediately as it affects all error responses
2. **BUG #2** (HIGH) - Fix validate-only mode response format
3. **BUG #3** (MEDIUM) - Add path validation for robustness

---

## Summary of Affected Line Numbers

### BUG #1 - Inconsistent JSON Response Handling
All instances using `http_response_code()` + `echo json_encode()` instead of `sendJsonResponse()`:

| Line Range | Error Type | Status Code |
|------------|------------|-------------|
| 368-374 | File size validation | 400 |
| 382-397 | Image dimensions | 400 |
| 412-414 | Upload path config | 500 |
| 420-427 | Temp directory creation | 500 |
| 435-437 | File move error | 500 |
| 559-569 | Human face detection | 400 |
| 585-596 | Human object detection | 400 |
| 668-681 | Animal object detection | 400 |
| 692-705 | Animal label+object detection | 400 |
| 716-723 | Adult content | 400 |
| 726-736 | Violence content | 400 |
| 739-747 | Racy content | 400 |
| 765-777 | Validate-only mode response | 200 |
| 828-839 | Property folder creation | 500 |
| 879-892 | Image file save error | 500 |

**Total: 15 instances** that need to be fixed.

### BUG #2 - Validate-Only Mode
- Lines 765-777: Returns absolute server path instead of relative path/filename

### BUG #3 - Path Construction
- Line 432: Temp path construction
- Line 789: Property folder path construction

---

## Additional Notes

- The code has good error handling and logging in most places
- Output buffering is set up correctly at the start of the file
- Error handlers are properly configured
- The inconsistent response handling is the main issue affecting reliability
- Note: Lines 39-41, 62-69, and 91-99 are within `sendJsonResponse()` or error handler fallbacks and are correct as-is

