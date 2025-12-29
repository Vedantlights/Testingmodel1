# Database Schema Check - Google Vision API Integration

## Current Database Status

Based on your provided schema, you only showed the `users` table. Here's what's **REQUIRED** for the Google Vision API feature to work:

---

## ✅ REQUIRED TABLES

### 1. `properties` Table
**Status**: ❓ **NOT VERIFIED** (You didn't provide this table)

**Required Columns**:
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- user_id (INT, FOREIGN KEY to users.id)
- title (VARCHAR(255))
- status (ENUM('sale', 'rent'))
- property_type (VARCHAR(100))
- location (VARCHAR(255))
- latitude (DECIMAL(10,8))
- longitude (DECIMAL(11,8))
- bedrooms, bathrooms, balconies, area, carpet_area
- floor, total_floors, facing, age, furnishing
- description (TEXT)
- price (DECIMAL(15,2))
- price_negotiable (TINYINT(1))
- maintenance_charges, deposit_amount
- cover_image (VARCHAR(255))
- video_url, brochure_url
- is_active (TINYINT(1))
- views_count (INT)
- created_at, updated_at (TIMESTAMP)
- user_full_name (VARCHAR(255)) - for denormalized storage
- state (VARCHAR(100)) - optional
- additional_address (VARCHAR(255)) - optional
```

---

### 2. `property_images` Table ⚠️ **CRITICAL**
**Status**: ❓ **NOT VERIFIED** (You didn't provide this table)

**Base Columns** (from schema.sql):
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- property_id (INT, FOREIGN KEY to properties.id)
- image_url (VARCHAR(255))
- image_order (INT)
- created_at (TIMESTAMP)
```

**⚠️ MISSING MODERATION COLUMNS** (Required for Google Vision API):
```sql
- file_name (VARCHAR(255)) - ❌ MISSING
- file_path (VARCHAR(500)) - ❌ MISSING
- original_filename (VARCHAR(255)) - ❌ MISSING
- file_size (INT) - ❌ MISSING
- mime_type (VARCHAR(50)) - ❌ MISSING
- moderation_status (ENUM('PENDING', 'SAFE', 'UNSAFE', 'NEEDS_REVIEW', 'REJECTED')) - ❌ MISSING
- moderation_reason (TEXT) - ❌ MISSING
- apis_used (JSON) - ❌ MISSING
- confidence_scores (JSON) - ❌ MISSING
- api_response (JSON) - ❌ MISSING
- manual_reviewed (BOOLEAN) - ❌ MISSING
- manual_reviewer_id (INT) - ❌ MISSING
- manual_review_notes (TEXT) - ❌ MISSING
- checked_at (TIMESTAMP) - ❌ MISSING
```

**Required Indexes**:
```sql
- idx_moderation_status - ❌ MISSING
- idx_checked_at - ❌ MISSING
```

---

### 3. `moderation_review_queue` Table ⚠️ **CRITICAL**
**Status**: ❌ **MISSING** (Required for admin review functionality)

**Required Structure**:
```sql
CREATE TABLE IF NOT EXISTS `moderation_review_queue` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `property_image_id` INT(11) NOT NULL,
  `status` ENUM('OPEN', 'APPROVED', 'REJECTED') DEFAULT 'OPEN',
  `reviewer_id` INT(11) DEFAULT NULL,
  `review_notes` TEXT DEFAULT NULL,
  `reason_for_review` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`),
  FOREIGN KEY (`property_image_id`) REFERENCES `property_images`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`reviewer_id`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 4. `admin_users` Table
**Status**: ❓ **NOT VERIFIED** (Required for moderation_review_queue foreign key)

**Required**:
```sql
- id (INT, PRIMARY KEY)
- (Other admin columns)
```

---

### 5. `property_amenities` Table
**Status**: ❓ **NOT VERIFIED** (Not critical for Vision API, but used by properties)

---

## 🔧 MIGRATION REQUIRED

You **MUST** run the migration file to add moderation support:

**File**: `backend/database/image_moderation_migration.sql`

This migration will:
1. ✅ Add all missing columns to `property_images` table
2. ✅ Create `moderation_review_queue` table
3. ✅ Add required indexes
4. ✅ Handle existing data safely

---

## 📋 QUICK CHECK SCRIPT

Run this SQL to check what's missing:

```sql
-- Check if property_images table exists
SHOW TABLES LIKE 'property_images';

-- Check if moderation columns exist
SHOW COLUMNS FROM property_images LIKE 'moderation_status';
SHOW COLUMNS FROM property_images LIKE 'file_name';
SHOW COLUMNS FROM property_images LIKE 'file_path';
SHOW COLUMNS FROM property_images LIKE 'moderation_reason';
SHOW COLUMNS FROM property_images LIKE 'apis_used';
SHOW COLUMNS FROM property_images LIKE 'confidence_scores';
SHOW COLUMNS FROM property_images LIKE 'api_response';
SHOW COLUMNS FROM property_images LIKE 'checked_at';

-- Check if moderation_review_queue table exists
SHOW TABLES LIKE 'moderation_review_queue';

-- Check if properties table exists
SHOW TABLES LIKE 'properties';
```

---

## ⚠️ CRITICAL ISSUES

### Issue #1: Missing Moderation Columns
**Impact**: Google Vision API integration **WILL NOT WORK** properly
- Images will upload but moderation data won't be saved
- No tracking of moderation status
- Admin review queue won't work

### Issue #2: Missing Review Queue Table
**Impact**: Images flagged for review **CANNOT** be processed by admins
- NEEDS_REVIEW images will be saved but no way to approve/reject them
- No admin interface for moderation

### Issue #3: Database Name Mismatch
**Note**: Migration file uses `indiapropertys_db` but your database is `u449667423_lastdata`
- You'll need to update the migration file or run it with correct database name

---

## ✅ ACTION REQUIRED

1. **Run the migration**: Execute `backend/database/image_moderation_migration.sql`
   - Update database name from `indiapropertys_db` to `u449667423_lastdata`

2. **Verify tables exist**:
   ```sql
   SHOW TABLES;
   ```
   Should show: `properties`, `property_images`, `moderation_review_queue`

3. **Verify columns exist**:
   ```sql
   DESCRIBE property_images;
   ```
   Should show all moderation columns listed above

4. **Test the integration**:
   - Upload a property image
   - Check if moderation_status is saved in database
   - Verify moderation_review_queue entries are created for NEEDS_REVIEW images

---

## 📝 UPDATED MIGRATION SCRIPT

I'll create an updated migration script with your database name.

