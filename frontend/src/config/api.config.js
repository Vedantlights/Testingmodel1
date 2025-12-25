/**
 * API Configuration
 * Configure your backend connection here
 * 
 * This automatically detects the environment:
 * - Development: Uses localhost URL
 * - Production: Uses your subdomain URL
 */

// Detect environment
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.port !== '';

// Base URL for the PHP backend
// Production: Hostinger subdomain
// NOTE: Backend is in /backend/ folder, so API path is /backend/api
const PRODUCTION_API_URL = 'https://demo1.indiapropertys.com/backend/api';
const DEVELOPMENT_API_URL = 'http://localhost/Fullstack/backend/api';

export const API_BASE_URL = isDevelopment ? DEVELOPMENT_API_URL : PRODUCTION_API_URL;

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login.php',
  REGISTER: '/auth/register.php',
  VERIFY_TOKEN: '/auth/verify.php',
  
  // Seller Properties
  SELLER_PROPERTIES: '/seller/properties/list.php',
  SELLER_ADD_PROPERTY: '/seller/properties/add.php',
  SELLER_UPDATE_PROPERTY: '/seller/properties/update.php',
  SELLER_DELETE_PROPERTY: '/seller/properties/delete.php',
  
  // Seller Dashboard
  SELLER_STATS: '/seller/dashboard/stats.php',
  
  // Seller Inquiries
  SELLER_INQUIRIES: '/seller/inquiries/list.php',
  SELLER_UPDATE_INQUIRY: '/seller/inquiries/updateStatus.php',
  
  // Seller Buyers (for chat)
  SELLER_GET_BUYER: '/seller/buyers/get.php',
  
  // Seller Profile
  SELLER_PROFILE: '/seller/profile/get.php',
  SELLER_UPDATE_PROFILE: '/seller/profile/update.php',
  
  // Buyer Properties
  PROPERTIES: '/buyer/properties/list.php',
  PROPERTY_DETAILS: '/buyer/properties/details.php',
  
  // Buyer Inquiries
  SEND_INQUIRY: '/buyer/inquiries/send.php',
  
  // Buyer Profile
  BUYER_PROFILE: '/buyer/profile/get.php',
  BUYER_UPDATE_PROFILE: '/buyer/profile/update.php',
  
  // Favorites
  TOGGLE_FAVORITE: '/buyer/favorites/toggle.php',
  FAVORITES_LIST: '/buyer/favorites/list.php',
  
  // OTP
  SEND_EMAIL_OTP: '/otp/send-email.php',
  VERIFY_EMAIL_OTP: '/otp/verify-email.php',
  SEND_SMS_OTP: '/otp/send-sms.php',
  VERIFY_SMS_OTP: '/otp/verify-sms.php',
  RESEND_SMS_OTP: '/otp/resend-sms.php',
  
  // Upload
  UPLOAD_PROFILE_IMAGE: '/upload/profile-image.php',
  UPLOAD_PROPERTY_FILES: '/upload/property-files.php',
  
  // Admin
  ADMIN_LOGIN: '/admin/auth/login.php',
  ADMIN_VERIFY: '/admin/auth/verify.php',
  ADMIN_SEND_OTP: '/admin/auth/send-otp.php',
  ADMIN_VERIFY_OTP: '/admin/auth/verify-otp.php',
  ADMIN_RESEND_OTP: '/admin/auth/resend-otp.php',
  ADMIN_DASHBOARD_STATS: '/admin/dashboard/stats.php',
  ADMIN_USERS_LIST: '/admin/users/list.php',
  ADMIN_USERS_UPDATE: '/admin/users/update.php',
  ADMIN_USERS_DELETE: '/admin/users/delete.php',
  ADMIN_PROPERTIES_LIST: '/admin/properties/list.php',
  ADMIN_PROPERTIES_APPROVE: '/admin/properties/approve.php',
  ADMIN_PROPERTIES_REJECT: '/admin/properties/reject.php',
  ADMIN_PROPERTIES_DELETE: '/admin/properties/delete.php',
  ADMIN_AGENTS_LIST: '/admin/agents/list.php',
  ADMIN_AGENTS_VERIFY: '/admin/agents/verify.php',
  ADMIN_AGENTS_UNVERIFY: '/admin/agents/unverify.php',
  ADMIN_INQUIRIES_LIST: '/admin/inquiries/list.php',
  ADMIN_SUBSCRIPTIONS_LIST: '/admin/subscriptions/list.php',
  ADMIN_SUPPORT_LIST: '/admin/support/list.php',
  ADMIN_SUPPORT_UPDATE_STATUS: '/admin/support/update-status.php',
  ADMIN_CHANGE_PASSWORD: '/admin/auth/change-password.php',
  
  // Chat
  CHAT_CREATE_ROOM: '/chat/create-room.php',
  CHAT_LIST_ROOMS: '/chat/list-rooms.php',
};

export default API_BASE_URL;
