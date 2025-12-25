# Database Schema Documentation

## Overview

**Database Name:** `indiapropertys_db`  
**Character Set:** `utf8mb4`  
**Collation:** `utf8mb4_unicode_ci`  
**Engine:** InnoDB

This document describes the complete database schema for the IndiaPropertys application, including all tables, columns, relationships, and constraints.

---

## Table of Contents

1. [Users](#users)
2. [User Profiles](#user-profiles)
3. [OTP Verifications](#otp-verifications)
4. [Properties](#properties)
5. [Property Images](#property-images)
6. [Property Amenities](#property-amenities)
7. [Inquiries](#inquiries)
8. [Favorites](#favorites)
9. [Subscriptions](#subscriptions)
10. [User Sessions](#user-sessions)
11. [Admin Users](#admin-users)
12. [Admin OTP Logs](#admin-otp-logs)
13. [Support Tickets](#support-tickets)

---

## Users

Stores basic user account information for buyers, sellers, and agents.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT(11) | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier |
| `full_name` | VARCHAR(255) | NOT NULL | User's full name |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | User's email address |
| `phone` | VARCHAR(20) | NOT NULL | User's phone number |
| `password` | VARCHAR(255) | NOT NULL | Hashed password |
| `user_type` | ENUM('buyer', 'seller', 'agent') | NOT NULL, DEFAULT 'buyer' | Type of user account |
| `email_verified` | TINYINT(1) | DEFAULT 0 | Email verification status |
| `phone_verified` | TINYINT(1) | DEFAULT 0 | Phone verification status |
| `is_banned` | TINYINT(1) | DEFAULT 0 | User ban status |
| `ban_reason` | TEXT | DEFAULT NULL | Reason for ban |
| `agent_verified` | TINYINT(1) | DEFAULT 0 | Agent verification status |
| `verification_documents` | JSON | DEFAULT NULL | Agent verification documents |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

### Indexes
- `idx_email` on `email`
- `idx_phone` on `phone`
- `idx_user_type` on `user_type`
- `idx_is_banned` on `is_banned`
- `idx_agent_verified` on `agent_verified`

### Relationships
- One-to-one with `user_profiles`
- One-to-many with `properties`
- One-to-many with `inquiries` (as buyer)
- One-to-many with `inquiries` (as seller)
- One-to-many with `favorites`
- One-to-many with `subscriptions`
- One-to-many with `user_sessions`

---

## User Profiles

Extended profile information for users (moved from users table via migration).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT(11) | PRIMARY KEY, AUTO_INCREMENT | Unique profile identifier |
| `user_id` | INT(11) | NOT NULL, UNIQUE, FOREIGN KEY | Reference to users.id |
| `full_name` | VARCHAR(255) | DEFAULT NULL | User's full name (migrated from users) |
| `user_type` | ENUM('buyer', 'seller', 'agent') | DEFAULT NULL | User type (migrated from users) |
| `profile_image` | VARCHAR(255) | DEFAULT NULL | Profile image URL (migrated from users) |
| `address` | TEXT | DEFAULT NULL | User's address |
| `company_name` | VARCHAR(255) | DEFAULT NULL | Company/business name |
| `license_number` | VARCHAR(100) | DEFAULT NULL | License number (for agents) |
| `gst_number` | VARCHAR(50) | DEFAULT NULL | GST number for business |
| `website` | VARCHAR(255) | DEFAULT NULL | Website URL |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Profile creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

### Indexes
- `idx_gst_number` on `gst_number`

### Foreign Keys
- `user_id` → `users.id` (ON DELETE CASCADE)

---

## OTP Verifications

Stores OTP codes for email and SMS verification.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT(11) | PRIMARY KEY, AUTO_INCREMENT | Unique OTP record identifier |
| `user_id` | INT(11) | DEFAULT NULL | Reference to users.id (optional) |
| `email` | VARCHAR(255) | DEFAULT NULL | Email address for verification |
| `phone` | VARCHAR(20) | DEFAULT NULL | Phone number for verification |
| `otp` | VARCHAR(6) | NOT NULL | OTP code |
| `otp_type` | ENUM('email', 'sms') | NOT NULL | Type of OTP |
| `verified` | TINYINT(1) | DEFAULT 0 | Verification status |
| `expires_at` | TIMESTAMP | NOT NULL | OTP expiration timestamp |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | OTP creation timestamp |

### Indexes
- `idx_email` on `email`
- `idx_phone` on `phone`
- `idx_otp` on `otp`
- `idx_expires` on `expires_at`

---

## Properties

Stores property listings posted by sellers/agents.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT(11) | PRIMARY KEY, AUTO_INCREMENT | Unique property identifier |
| `user_id` | INT(11) | NOT NULL, FOREIGN KEY | Reference to users.id (seller/agent) |
| `user_full_name` | VARCHAR(255) | DEFAULT NULL | Seller/agent full name (denormalized) |
| `title` | VARCHAR(255) | NOT NULL | Property title |
| `status` | ENUM('sale', 'rent') | NOT NULL, DEFAULT 'sale' | Property listing status |
| `property_type` | VARCHAR(100) | NOT NULL | Type of property |
| `location` | VARCHAR(255) | NOT NULL | Property location |
| `latitude` | DECIMAL(10, 8) | DEFAULT NULL | Latitude coordinate |
| `longitude` | DECIMAL(11, 8) | DEFAULT NULL | Longitude coordinate |
| `bedrooms` | VARCHAR(10) | DEFAULT NULL | Number of bedrooms |
| `bathrooms` | VARCHAR(10) | DEFAULT NULL | Number of bathrooms |
| `balconies` | VARCHAR(10) | DEFAULT NULL | Number of balconies |
| `area` | DECIMAL(10, 2) | NOT NULL | Property area (sq ft) |
| `carpet_area` | DECIMAL(10, 2) | DEFAULT NULL | Carpet area (sq ft) |
| `floor` | VARCHAR(50) | DEFAULT NULL | Floor number |
| `total_floors` | INT(11) | DEFAULT NULL | Total floors in building |
| `facing` | VARCHAR(50) | DEFAULT NULL | Property facing direction |
| `age` | VARCHAR(50) | DEFAULT NULL | Property age |
| `furnishing` | VARCHAR(50) | DEFAULT NULL | Furnishing status |
| `description` | TEXT | DEFAULT NULL | Property description |
| `price` | DECIMAL(15, 2) | NOT NULL | Property price |
| `price_negotiable` | TINYINT(1) | DEFAULT 0 | Whether price is negotiable |
| `maintenance_charges` | DECIMAL(10, 2) | DEFAULT NULL | Monthly maintenance charges |
| `deposit_amount` | DECIMAL(10, 2) | DEFAULT NULL | Deposit amount (for rent) |
| `cover_image` | VARCHAR(255) | DEFAULT NULL | Cover image URL |
| `video_url` | VARCHAR(255) | DEFAULT NULL | Video URL |
| `brochure_url` | VARCHAR(255) | DEFAULT NULL | Brochure PDF URL |
| `is_active` | TINYINT(1) | DEFAULT 1 | Active status |
| `admin_status` | ENUM('pending', 'approved', 'rejected') | DEFAULT 'approved' | Admin approval status |
| `is_featured` | TINYINT(1) | DEFAULT 0 | Featured property flag |
| `rejection_reason` | TEXT | DEFAULT NULL | Reason for rejection (if rejected) |
| `views_count` | INT(11) | DEFAULT 0 | Number of views |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Listing creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

### Indexes
- `idx_user_id` on `user_id`
- `idx_status` on `status`
- `idx_property_type` on `property_type`
- `idx_location` on `location`
- `idx_price` on `price`
- `idx_created_at` on `created_at`
- `idx_admin_status` on `admin_status`
- `idx_is_featured` on `is_featured`
- `ft_search` FULLTEXT on (`title`, `location`, `description`)

### Foreign Keys
- `user_id` → `users.id` (ON DELETE CASCADE)

### Relationships
- Many-to-one with `users`
- One-to-many with `property_images`
- One-to-many with `property_amenities`
- One-to-many with `inquiries`
- One-to-many with `favorites`

---

## Property Images

Stores multiple images for each property.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT(11) | PRIMARY KEY, AUTO_INCREMENT | Unique image identifier |
| `property_id` | INT(11) | NOT NULL, FOREIGN KEY | Reference to properties.id |
| `image_url` | VARCHAR(255) | NOT NULL | Image URL |
| `image_order` | INT(11) | DEFAULT 0 | Display order |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Image upload timestamp |

### Indexes
- `idx_property_id` on `property_id`

### Foreign Keys
- `property_id` → `properties.id` (ON DELETE CASCADE)

### Relationships
- Many-to-one with `properties`

---

## Property Amenities

Stores amenities associated with each property.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT(11) | PRIMARY KEY, AUTO_INCREMENT | Unique amenity record identifier |
| `property_id` | INT(11) | NOT NULL, FOREIGN KEY | Reference to properties.id |
| `amenity_id` | VARCHAR(50) | NOT NULL | Amenity identifier |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

### Indexes
- `idx_property_id` on `property_id`
- `unique_property_amenity` UNIQUE on (`property_id`, `amenity_id`)

### Foreign Keys
- `property_id` → `properties.id` (ON DELETE CASCADE)

### Relationships
- Many-to-one with `properties`

---

## Inquiries

Stores inquiries/leads from buyers interested in properties.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT(11) | PRIMARY KEY, AUTO_INCREMENT | Unique inquiry identifier |
| `property_id` | INT(11) | NOT NULL, FOREIGN KEY | Reference to properties.id |
| `buyer_id` | INT(11) | DEFAULT NULL, FOREIGN KEY | Reference to users.id (buyer) |
| `seller_id` | INT(11) | NOT NULL, FOREIGN KEY | Reference to users.id (seller) |
| `name` | VARCHAR(255) | NOT NULL | Buyer's name |
| `email` | VARCHAR(255) | NOT NULL | Buyer's email |
| `mobile` | VARCHAR(20) | NOT NULL | Buyer's mobile number |
| `message` | TEXT | DEFAULT NULL | Inquiry message |
| `status` | ENUM('new', 'contacted', 'viewed', 'interested', 'not_interested', 'closed') | DEFAULT 'new' | Inquiry status |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Inquiry creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

### Indexes
- `idx_property_id` on `property_id`
- `idx_buyer_id` on `buyer_id`
- `idx_seller_id` on `seller_id`
- `idx_status` on `status`
- `idx_created_at` on `created_at`

### Foreign Keys
- `property_id` → `properties.id` (ON DELETE CASCADE)
- `buyer_id` → `users.id` (ON DELETE SET NULL)
- `seller_id` → `users.id` (ON DELETE CASCADE)

### Relationships
- Many-to-one with `properties`
- Many-to-one with `users` (as buyer)
- Many-to-one with `users` (as seller)

---

## Favorites

Stores user's favorite/saved properties.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT(11) | PRIMARY KEY, AUTO_INCREMENT | Unique favorite record identifier |
| `user_id` | INT(11) | NOT NULL, FOREIGN KEY | Reference to users.id |
| `property_id` | INT(11) | NOT NULL, FOREIGN KEY | Reference to properties.id |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Favorite creation timestamp |

### Indexes
- `idx_user_id` on `user_id`
- `idx_property_id` on `property_id`
- `unique_user_property` UNIQUE on (`user_id`, `property_id`)

### Foreign Keys
- `user_id` → `users.id` (ON DELETE CASCADE)
- `property_id` → `properties.id` (ON DELETE CASCADE)

### Relationships
- Many-to-one with `users`
- Many-to-one with `properties`

---

## Subscriptions

Stores user subscription plans.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT(11) | PRIMARY KEY, AUTO_INCREMENT | Unique subscription identifier |
| `user_id` | INT(11) | NOT NULL, FOREIGN KEY | Reference to users.id |
| `plan_type` | ENUM('free', 'basic', 'pro', 'premium') | DEFAULT 'free' | Subscription plan type |
| `start_date` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Subscription start date |
| `end_date` | TIMESTAMP | DEFAULT NULL | Subscription end date |
| `is_active` | TINYINT(1) | DEFAULT 1 | Active status |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Subscription creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

### Indexes
- `idx_user_id` on `user_id`
- `idx_is_active` on `is_active`

### Foreign Keys
- `user_id` → `users.id` (ON DELETE CASCADE)

### Relationships
- Many-to-one with `users`

---

## User Sessions

Stores user session tokens for authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT(11) | PRIMARY KEY, AUTO_INCREMENT | Unique session identifier |
| `user_id` | INT(11) | NOT NULL, FOREIGN KEY | Reference to users.id |
| `token` | VARCHAR(255) | NOT NULL, UNIQUE | Session token |
| `expires_at` | TIMESTAMP | NOT NULL | Token expiration timestamp |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Session creation timestamp |

### Indexes
- `idx_token` on `token`
- `idx_user_id` on `user_id`
- `idx_expires_at` on `expires_at`

### Foreign Keys
- `user_id` → `users.id` (ON DELETE CASCADE)

### Relationships
- Many-to-one with `users`

---

## Admin Users

Stores admin panel user accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT(11) | PRIMARY KEY, AUTO_INCREMENT | Unique admin identifier |
| `username` | VARCHAR(100) | NOT NULL, UNIQUE | Admin username |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Admin email |
| `password` | VARCHAR(255) | NOT NULL | Hashed password |
| `full_name` | VARCHAR(255) | DEFAULT NULL | Admin full name |
| `role` | ENUM('super_admin', 'admin', 'moderator') | DEFAULT 'admin' | Admin role |
| `google2fa_secret` | VARCHAR(32) | DEFAULT NULL | Google 2FA secret key |
| `is_2fa_enabled` | TINYINT(1) | DEFAULT 0 | 2FA enabled status |
| `is_active` | TINYINT(1) | DEFAULT 1 | Active status |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

### Indexes
- `idx_email` on `email`
- `idx_username` on `username`

### Relationships
- One-to-many with `support_tickets` (as assigned_to)

---

## Admin OTP Logs

Stores OTP logs for admin authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT(11) | PRIMARY KEY, AUTO_INCREMENT | Unique log identifier |
| `mobile` | VARCHAR(15) | NOT NULL | Mobile number |
| `request_id` | VARCHAR(100) | DEFAULT NULL | OTP request ID |
| `status` | ENUM('pending', 'verified', 'expired', 'failed') | DEFAULT 'pending' | OTP status |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Log creation timestamp |
| `verified_at` | TIMESTAMP | DEFAULT NULL | Verification timestamp |

### Indexes
- `idx_mobile` on `mobile`
- `idx_request_id` on `request_id`
- `idx_status` on `status`
- `idx_created_at` on `created_at`

---

## Support Tickets

Stores customer support tickets.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT(11) | PRIMARY KEY, AUTO_INCREMENT | Unique ticket identifier |
| `user_id` | INT(11) | DEFAULT NULL, FOREIGN KEY | Reference to users.id |
| `subject` | VARCHAR(255) | NOT NULL | Ticket subject |
| `message` | TEXT | NOT NULL | Ticket message |
| `priority` | ENUM('low', 'medium', 'high', 'urgent') | DEFAULT 'medium' | Ticket priority |
| `status` | ENUM('open', 'in_progress', 'resolved', 'closed') | DEFAULT 'open' | Ticket status |
| `assigned_to` | INT(11) | DEFAULT NULL, FOREIGN KEY | Reference to admin_users.id |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Ticket creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

### Indexes
- `idx_user_id` on `user_id`
- `idx_status` on `status`
- `idx_priority` on `priority`

### Foreign Keys
- `user_id` → `users.id` (ON DELETE SET NULL)
- `assigned_to` → `admin_users.id` (ON DELETE SET NULL)

### Relationships
- Many-to-one with `users`
- Many-to-one with `admin_users`

---

## Entity Relationship Diagram Summary

```
users (1) ────< (1) user_profiles
users (1) ────< (*) properties
users (1) ────< (*) inquiries (as buyer)
users (1) ────< (*) inquiries (as seller)
users (1) ────< (*) favorites
users (1) ────< (*) subscriptions
users (1) ────< (*) user_sessions
users (1) ────< (*) support_tickets

properties (1) ────< (*) property_images
properties (1) ────< (*) property_amenities
properties (1) ────< (*) inquiries
properties (1) ────< (*) favorites

admin_users (1) ────< (*) support_tickets (as assigned_to)
```

---

## Notes

1. **Character Set**: All tables use `utf8mb4` character set with `utf8mb4_unicode_ci` collation to support full Unicode including emojis.

2. **Timestamps**: Most tables include `created_at` and `updated_at` timestamps for audit trails.

3. **Soft Deletes**: The schema uses `is_active` flags rather than hard deletes for properties and users.

4. **Denormalization**: The `properties` table includes `user_full_name` for performance optimization, avoiding joins in common queries.

5. **Full-Text Search**: The `properties` table includes a FULLTEXT index on `title`, `location`, and `description` for efficient search functionality.

6. **JSON Fields**: Some tables use JSON columns (`verification_documents`, `social_links`) for flexible data storage.

7. **Migration History**: The schema has evolved through several migrations:
   - Schema refactor migration (moved profile_image from users to user_profiles)
   - Admin panel migration (added admin_status, is_featured, is_banned, etc.)
   - Business info migration (added gst_number)
   - 2FA migration (added Google 2FA support for admins)
   - OTP logs migration (added admin_otp_logs table)

---

## Default Data

- **Admin User**: A default admin user is created with:
  - Username: `admin`
  - Email: `admin@indiapropertys.com`
  - Role: `super_admin`
  - **Note**: Default password should be changed in production!

---

*Last Updated: Based on schema.sql and migration files*

