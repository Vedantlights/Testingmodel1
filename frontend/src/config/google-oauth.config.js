/**
 * Google OAuth Configuration
 * 
 * To get your Google Client ID:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing
 * 3. Enable Google+ API
 * 4. Go to Credentials > Create Credentials > OAuth 2.0 Client ID
 * 5. Application type: Web application
 * 6. Authorized JavaScript origins: 
 *    - Development: http://localhost:3000
 *    - Production: https://demo1.indiapropertys.com
 * 7. Authorized redirect URIs:
 *    - Development: http://localhost:3000/admin/login
 *    - Production: https://demo1.indiapropertys.com/admin/login
 * 8. Copy the Client ID and replace below
 */

export const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

// Replace 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com' with your actual Google Client ID
