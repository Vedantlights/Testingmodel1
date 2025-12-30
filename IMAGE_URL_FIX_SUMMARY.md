# Image URL Fix Summary

## Problem
Images were saved to `/uploads/properties/` but URLs pointed to `/backend/uploads/properties/`, causing 404 errors.

**Physical location:**
```
/home/u449667423/domains/indiapropertys.com/public_html/demo1/uploads/properties/
```

**Wrong URL format:**
```
https://demo1.indiapropertys.com/backend/uploads/properties/74/img_xxx.webp
```

**Correct URL format:**
```
https://demo1.indiapropertys.com/uploads/properties/74/img_xxx.webp
```

---

## Changes Made

### 1. Fixed `backend/config/config.php`
**Changed:**
```php
// OLD (WRONG)
define('UPLOAD_BASE_URL', BASE_URL . '/uploads');
// This created: https://demo1.indiapropertys.com/backend/uploads

// NEW (CORRECT)
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'];
define('UPLOAD_BASE_URL', $protocol . '://' . $host . '/uploads');
// This creates: https://demo1.indiapropertys.com/uploads
```

### 2. Fixed `backend/api/images/moderate-and-upload.php`
**Changed:**
```php
// OLD (WRONG)
$imageUrl = BASE_URL . '/uploads/' . $relativePath;
// Created: https://demo1.indiapropertys.com/backend/uploads/properties/74/img.webp

// NEW (CORRECT)
$imageUrl = UPLOAD_BASE_URL . '/' . $relativePath;
// Creates: https://demo1.indiapropertys.com/uploads/properties/74/img.webp
```

### 3. Fixed `backend/api/seller/properties/list.php`
**Added:**
- URL normalization to use `UPLOAD_BASE_URL`
- Automatic fix for old URLs containing `/backend/uploads/` → `/uploads/`

### 4. Fixed `backend/api/seller/properties/update.php`
**Added:**
- URL normalization to use `UPLOAD_BASE_URL`
- Automatic fix for old URLs containing `/backend/uploads/` → `/uploads/`

### 5. Created SQL Fix Script
**File:** `backend/database/fix-image-urls.sql`

This script fixes existing database records:
- Updates `property_images` table
- Updates `properties` table (main_image, cover_image)
- Includes verification queries

---

## Testing Steps

### 1. Run SQL Fix Script
```sql
-- Execute the SQL script to fix existing records
-- File: backend/database/fix-image-urls.sql
```

### 2. Test New Image Upload
1. Upload a new image through the frontend
2. Check the returned URL in browser console
3. Expected format: `https://demo1.indiapropertys.com/uploads/properties/{id}/{filename}`
4. Open the URL in browser - image should display

### 3. Verify Existing Images
1. Check property cards - images should display
2. Check property detail pages - images should display
3. Verify no 404 errors in browser console

### 4. Check Backend Logs
Look for these log messages:
```
Image URL being returned: https://demo1.indiapropertys.com/uploads/properties/74/img_xxx.webp
```

---

## Files Modified

1. ✅ `backend/config/config.php` - Fixed UPLOAD_BASE_URL
2. ✅ `backend/api/images/moderate-and-upload.php` - Fixed URL generation
3. ✅ `backend/api/seller/properties/list.php` - Fixed URL normalization
4. ✅ `backend/api/seller/properties/update.php` - Fixed URL normalization
5. ✅ `backend/database/fix-image-urls.sql` - Created SQL fix script

---

## Important Notes

1. **New uploads** will automatically use the correct URL format
2. **Existing database records** need to be fixed using the SQL script
3. **Frontend** will automatically receive correct URLs from the API
4. **Old URLs** in the database are automatically fixed when fetched (via `list.php` and `update.php`)

---

## Verification

After applying fixes:

1. ✅ New images upload with correct URLs
2. ✅ Existing images display correctly (after SQL fix)
3. ✅ No 404 errors for image URLs
4. ✅ All image URLs follow format: `https://demo1.indiapropertys.com/uploads/properties/{id}/{filename}`

---

## Rollback (if needed)

If you need to rollback:

1. Revert `backend/config/config.php`:
```php
define('UPLOAD_BASE_URL', BASE_URL . '/uploads');
```

2. Revert `backend/api/images/moderate-and-upload.php`:
```php
$imageUrl = BASE_URL . '/uploads/' . $relativePath;
```

3. Run reverse SQL:
```sql
UPDATE property_images 
SET image_url = REPLACE(image_url, '/uploads/', '/backend/uploads/') 
WHERE image_url LIKE '%/uploads/%' AND image_url NOT LIKE '%/backend/%';
```

