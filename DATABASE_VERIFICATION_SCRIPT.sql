-- ============================================
-- Database Verification Script
-- Google Vision API Integration
-- ============================================
-- Run this to check what's missing in your database
-- ============================================

USE `u449667423_lastdata`;

-- ============================================
-- CHECK 1: Required Tables
-- ============================================
SELECT '=== REQUIRED TABLES ===' AS 'Check';
SELECT 
    TABLE_NAME AS 'Table Name',
    CASE 
        WHEN TABLE_NAME = 'properties' THEN 'REQUIRED'
        WHEN TABLE_NAME = 'property_images' THEN 'REQUIRED'
        WHEN TABLE_NAME = 'moderation_review_queue' THEN 'REQUIRED'
        WHEN TABLE_NAME = 'admin_users' THEN 'REQUIRED (for review queue)'
        ELSE 'OPTIONAL'
    END AS 'Status'
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN ('properties', 'property_images', 'moderation_review_queue', 'admin_users', 'property_amenities', 'users')
ORDER BY TABLE_NAME;

-- ============================================
-- CHECK 2: property_images Table Structure
-- ============================================
SELECT '=== property_images TABLE COLUMNS ===' AS 'Check';

-- Check if table exists
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Table EXISTS'
        ELSE '❌ Table MISSING - Run migration!'
    END AS 'Table Status'
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_images';

-- Check required moderation columns
SELECT 
    COLUMN_NAME AS 'Column',
    DATA_TYPE AS 'Type',
    CASE 
        WHEN COLUMN_NAME = 'moderation_status' THEN '✅ CRITICAL'
        WHEN COLUMN_NAME = 'file_name' THEN '✅ CRITICAL'
        WHEN COLUMN_NAME = 'file_path' THEN '✅ CRITICAL'
        WHEN COLUMN_NAME = 'moderation_reason' THEN '✅ CRITICAL'
        WHEN COLUMN_NAME = 'apis_used' THEN '✅ CRITICAL'
        WHEN COLUMN_NAME = 'confidence_scores' THEN '✅ CRITICAL'
        WHEN COLUMN_NAME = 'api_response' THEN '✅ CRITICAL'
        WHEN COLUMN_NAME = 'checked_at' THEN '✅ CRITICAL'
        WHEN COLUMN_NAME = 'original_filename' THEN '⚠️ IMPORTANT'
        WHEN COLUMN_NAME = 'file_size' THEN '⚠️ IMPORTANT'
        WHEN COLUMN_NAME = 'mime_type' THEN '⚠️ IMPORTANT'
        WHEN COLUMN_NAME = 'manual_reviewed' THEN '⚠️ IMPORTANT'
        WHEN COLUMN_NAME = 'manual_reviewer_id' THEN '⚠️ IMPORTANT'
        WHEN COLUMN_NAME = 'manual_review_notes' THEN '⚠️ IMPORTANT'
        ELSE '✅ Base Column'
    END AS 'Status'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'property_images'
ORDER BY ORDINAL_POSITION;

-- ============================================
-- CHECK 3: Missing Moderation Columns
-- ============================================
SELECT '=== MISSING MODERATION COLUMNS ===' AS 'Check';

SELECT 
    'file_name' AS 'Missing Column',
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END AS 'Status'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'property_images'
    AND COLUMN_NAME = 'file_name'

UNION ALL

SELECT 
    'file_path',
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'property_images'
    AND COLUMN_NAME = 'file_path'

UNION ALL

SELECT 
    'moderation_status',
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ EXISTS'
        ELSE '❌ MISSING - CRITICAL!'
    END
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'property_images'
    AND COLUMN_NAME = 'moderation_status'

UNION ALL

SELECT 
    'moderation_reason',
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ EXISTS'
        ELSE '❌ MISSING - CRITICAL!'
    END
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'property_images'
    AND COLUMN_NAME = 'moderation_reason'

UNION ALL

SELECT 
    'apis_used',
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ EXISTS'
        ELSE '❌ MISSING - CRITICAL!'
    END
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'property_images'
    AND COLUMN_NAME = 'apis_used'

UNION ALL

SELECT 
    'confidence_scores',
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ EXISTS'
        ELSE '❌ MISSING - CRITICAL!'
    END
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'property_images'
    AND COLUMN_NAME = 'confidence_scores'

UNION ALL

SELECT 
    'api_response',
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ EXISTS'
        ELSE '❌ MISSING - CRITICAL!'
    END
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'property_images'
    AND COLUMN_NAME = 'api_response'

UNION ALL

SELECT 
    'checked_at',
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ EXISTS'
        ELSE '❌ MISSING - CRITICAL!'
    END
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'property_images'
    AND COLUMN_NAME = 'checked_at';

-- ============================================
-- CHECK 4: moderation_review_queue Table
-- ============================================
SELECT '=== moderation_review_queue TABLE ===' AS 'Check';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Table EXISTS'
        ELSE '❌ Table MISSING - Run migration!'
    END AS 'Table Status'
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'moderation_review_queue';

-- Show table structure if exists
SELECT 
    COLUMN_NAME AS 'Column',
    DATA_TYPE AS 'Type',
    IS_NULLABLE AS 'Nullable',
    COLUMN_DEFAULT AS 'Default'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'moderation_review_queue'
ORDER BY ORDINAL_POSITION;

-- ============================================
-- CHECK 5: Required Indexes
-- ============================================
SELECT '=== REQUIRED INDEXES ===' AS 'Check';

SELECT 
    INDEX_NAME AS 'Index Name',
    TABLE_NAME AS 'Table',
    CASE 
        WHEN INDEX_NAME = 'idx_moderation_status' THEN '✅ CRITICAL'
        WHEN INDEX_NAME = 'idx_checked_at' THEN '✅ CRITICAL'
        WHEN INDEX_NAME = 'idx_property_id' THEN '✅ IMPORTANT'
        WHEN INDEX_NAME = 'idx_status' THEN '✅ IMPORTANT (review queue)'
        ELSE '✅ EXISTS'
    END AS 'Status'
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
    AND (
        (TABLE_NAME = 'property_images' AND INDEX_NAME IN ('idx_moderation_status', 'idx_checked_at', 'idx_property_id'))
        OR (TABLE_NAME = 'moderation_review_queue' AND INDEX_NAME = 'idx_status')
    )
ORDER BY TABLE_NAME, INDEX_NAME;

-- ============================================
-- CHECK 6: properties Table (Basic Check)
-- ============================================
SELECT '=== properties TABLE ===' AS 'Check';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Table EXISTS'
        ELSE '❌ Table MISSING - CRITICAL!'
    END AS 'Table Status'
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'properties';

-- Check for user_full_name column (used in code)
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ user_full_name column EXISTS'
        ELSE '⚠️ user_full_name column MISSING (optional but recommended)'
    END AS 'Column Status'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'properties'
    AND COLUMN_NAME = 'user_full_name';

-- ============================================
-- SUMMARY
-- ============================================
SELECT '=== SUMMARY ===' AS 'Check';

SELECT 
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'properties') AS 'properties_table',
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_images') AS 'property_images_table',
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'moderation_review_queue') AS 'moderation_review_queue_table',
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_images' AND COLUMN_NAME = 'moderation_status') AS 'moderation_status_column',
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_images' AND COLUMN_NAME = 'file_path') AS 'file_path_column',
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_images' AND COLUMN_NAME = 'checked_at') AS 'checked_at_column';

