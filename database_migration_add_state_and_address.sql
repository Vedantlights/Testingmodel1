-- ============================================
-- SQL Migration: Add State and Additional Address Columns
-- ============================================
-- Run this query in phpMyAdmin to add the new columns to the properties table
-- 
-- Description:
-- This migration adds two optional columns to the properties table:
-- 1. state - VARCHAR(100) - Optional field to store the state of the property
-- 2. additional_address - VARCHAR(255) - Optional field to store additional address details
--
-- Both columns are nullable and have no default values since they are optional fields.
-- ============================================

-- Add state column to properties table
ALTER TABLE `properties` 
ADD COLUMN `state` VARCHAR(100) DEFAULT NULL AFTER `longitude`;

-- Add additional_address column to properties table
ALTER TABLE `properties` 
ADD COLUMN `additional_address` VARCHAR(255) DEFAULT NULL AFTER `state`;

-- Optional: Add indexes for better search performance (if needed)
-- ALTER TABLE `properties` ADD INDEX `idx_state` (`state`);

-- ============================================
-- Verification Query
-- ============================================
-- Run this query to verify the columns were added successfully:
-- DESCRIBE `properties`;
-- 
-- You should see both 'state' and 'additional_address' columns in the output.
-- ============================================

