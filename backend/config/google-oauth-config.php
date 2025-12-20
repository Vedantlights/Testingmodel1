<?php
/**
 * Google OAuth Configuration
 * 
 * To get your Google Client ID:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing
 * 3. Enable Google+ API
 * 4. Go to Credentials > Create Credentials > OAuth 2.0 Client ID
 * 5. Application type: Web application
 * 6. Authorized JavaScript origins: http://localhost:3000
 * 7. Authorized redirect URIs: http://localhost:3000/admin/login
 * 8. Copy the Client ID
 */

// Google OAuth Client ID
// Replace with your actual Google Client ID
define('GOOGLE_CLIENT_ID', 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com');

// Allowed admin email (only this email can login)
define('GOOGLE_ALLOWED_ADMIN_EMAIL', 'admin@indiapropertys.com');
