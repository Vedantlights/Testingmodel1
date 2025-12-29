/**
 * API Service
 * Handles all HTTP requests to the backend
 */

import { API_BASE_URL, API_ENDPOINTS } from '../config/api.config';

// Token management
const getToken = () => localStorage.getItem('authToken');
const setToken = (token) => localStorage.setItem('authToken', token);
const removeToken = () => localStorage.removeItem('authToken');

// User data management
const getUser = () => {
  const user = localStorage.getItem('userData');
  return user ? JSON.parse(user) : null;
};
const setUser = (user) => localStorage.setItem('userData', JSON.stringify(user));
const removeUser = () => localStorage.removeItem('userData');

// Generic fetch wrapper
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };
  
  try {
    const response = await fetch(url, config);
    
    // Get response text first to check if it's empty
    const responseText = await response.text();
    
    // Check if response is empty
    if (!responseText || responseText.trim() === '') {
      console.error('Empty response from server:', url);
      throw {
        status: response.status || 500,
        message: 'Empty response from server. The API may have encountered an error.',
        errors: null,
      };
    }
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response text:', responseText.substring(0, 500));
        throw {
          status: response.status || 500,
          message: 'Invalid JSON response from server. Response: ' + responseText.substring(0, 200),
          errors: null,
          rawResponse: responseText.substring(0, 500)
        };
      }
    } else {
      // Not JSON - might be HTML error page or plain text
      console.error('Non-JSON response:', responseText.substring(0, 500));
      throw {
        status: response.status || 500,
        message: responseText.substring(0, 200) || 'Invalid response from server',
        errors: null,
        rawResponse: responseText.substring(0, 500)
      };
    }
    
    if (!response.ok) {
      // Handle 401 Unauthorized (expired/invalid token)
      if (response.status === 401) {
        // Clear invalid token
        removeToken();
        removeUser();
        console.log("❌ 401 Unauthorized - Token expired or invalid, clearing auth data");
      }
      
      // Include more details in error for debugging
      const errorDetails = {
        status: response.status,
        message: data.message || 'Request failed',
        errors: data.errors || null,
        data: data // Include full response for debugging
      };
      throw errorDetails;
    }
    
    return data;
  } catch (error) {
    if (error.status) {
      // Don't override error messages from backend - they're more specific
      // Only add generic messages if backend didn't provide one
      if (!error.message || error.message === 'Request failed') {
        if (error.status === 401) {
          error.message = 'Authentication required. Please log in to add properties.';
        } else if (error.status === 403) {
          error.message = 'Access denied. You do not have permission to perform this action.';
        }
      }
      throw error;
    }
    // Handle network errors or JSON parse errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw {
        status: 0,
        message: 'Network error. Please check your connection and ensure the backend server is running.',
      };
    }
    // JSON parse error or other error
    throw {
      status: 0,
      message: error.message || 'Network error. Please check your connection and ensure the backend server is running.',
      originalError: error.message
    };
  }
};

// =====================
// AUTH API
// =====================
export const authAPI = {
  login: async (email, password, userType) => {
    console.log("authAPI.login called:", { email, userType });
    try {
      const response = await apiRequest(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        body: JSON.stringify({ email, password, userType }),
      });
      
      console.log("authAPI.login response:", response);
      
      if (response.success && response.data) {
        setToken(response.data.token);
        setUser(response.data.user);
        console.log("Token and user set successfully");
      } else {
        console.error("Login response not successful:", response);
      }
      
      return response;
    } catch (error) {
      console.error("authAPI.login error:", error);
      throw error;
    }
  },
  
  register: async (userData) => {
    const response = await apiRequest(API_ENDPOINTS.REGISTER, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (response.success && response.data) {
      setToken(response.data.token);
      setUser(response.data.user);
    }
    
    return response;
  },
  
  verifyToken: async () => {
    const token = getToken();
    if (!token) {
      return { success: false, message: 'No token' };
    }
    
    try {
      // Backend expects GET request with token in Authorization header
      const response = await apiRequest(API_ENDPOINTS.VERIFY_TOKEN, {
        method: 'GET'
      });
      if (response.success && response.data) {
        // Update user data if provided
        if (response.data.user) {
          setUser(response.data.user);
        }
        // Update token if a new one is provided (refresh token scenario)
        if (response.data.token) {
          setToken(response.data.token);
        }
      }
      return response;
    } catch (error) {
      // Token is invalid or expired - clear everything
      if (error.status === 401) {
        console.log("❌ Token verification failed - 401 Unauthorized");
        removeToken();
        removeUser();
      }
      throw error;
    }
  },
  
  logout: () => {
    removeToken();
    removeUser();
    localStorage.removeItem('currentSession');
    localStorage.removeItem('registeredUser');
  },
  
  getToken,
  getUser,
  setToken, // Export setToken for AuthContext
  setUser,  // Export setUser for AuthContext
  isAuthenticated: () => !!getToken(),
};

// =====================
// SELLER PROPERTIES API
// =====================
export const sellerPropertiesAPI = {
  list: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`${API_ENDPOINTS.SELLER_PROPERTIES}?${queryString}`);
  },
  
  add: async (propertyData) => {
    return apiRequest(API_ENDPOINTS.SELLER_ADD_PROPERTY, {
      method: 'POST',
      body: JSON.stringify(propertyData),
    });
  },
  
  update: async (id, propertyData) => {
    return apiRequest(`${API_ENDPOINTS.SELLER_UPDATE_PROPERTY}?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(propertyData),
    });
  },
  
  delete: async (id) => {
    return apiRequest(`${API_ENDPOINTS.SELLER_DELETE_PROPERTY}?id=${id}`, {
      method: 'DELETE',
    });
  },
  
  // CRITICAL FIX: Upload image through MODERATION endpoint
  uploadImage: async (file, propertyId = 0) => {
    if (!propertyId || propertyId <= 0) {
      throw {
        status: 400,
        message: 'Property ID is required for image upload',
        errors: ['Property ID is required'],
      };
    }
    
    const formData = new FormData();
    formData.append('image', file);  // CRITICAL: Field name must be 'image' not 'file'
    formData.append('property_id', propertyId);
    
    // Use MODERATION endpoint, not the old upload endpoint
    const url = `${API_BASE_URL}${API_ENDPOINTS.MODERATE_AND_UPLOAD}`;
    const token = getToken();
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      // Get response text first
      const responseText = await response.text();
      
      // Check if response is empty
      if (!responseText || responseText.trim() === '') {
        throw {
          status: response.status || 500,
          message: 'Empty response from server. The upload may have failed.',
          errors: null,
        };
      }
      
      // Parse JSON response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response text:', responseText.substring(0, 500));
        throw {
          status: response.status || 500,
          message: 'Invalid JSON response from server',
          errors: null,
          rawResponse: responseText.substring(0, 500)
        };
      }
      
      // Handle different response statuses from moderation endpoint
      if (data.status === 'success') {
        // APPROVED - Image passed moderation
        return {
          success: true,
          data: {
            url: data.data?.image_url || data.data?.url,
            image_id: data.data?.image_id,
            filename: data.data?.filename,
            moderation_status: data.data?.moderation_status || 'SAFE'
          },
          message: data.message || 'Image uploaded successfully',
        };
      } else if (data.status === 'pending_review') {
        // NEEDS_REVIEW - Image under review
        return {
          success: true,
          pending: true,
          data: {
            url: data.data?.image_url || null,
            image_id: data.data?.image_id,
            moderation_status: 'NEEDS_REVIEW',
            moderation_reason: data.data?.moderation_reason || data.message
          },
          message: data.message || 'Image is under review',
        };
      } else if (data.status === 'error') {
        // REJECTED - Image failed moderation
        // CRITICAL: Return the specific error message from API
        throw {
          status: response.status || 400,
          message: data.message || 'Image was rejected',
          error_code: data.error_code || 'rejected',
          details: data.details || {},
          rejected: true,
          data: data
        };
      } else {
        // Unknown status
        throw {
          status: response.status || 500,
          message: data.message || 'Upload failed',
          errors: data.errors || null,
          data: data
        };
      }
    } catch (error) {
      if (error.status) {
        throw error;
      }
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw {
          status: 0,
          message: 'Network error. Please check your connection and ensure the backend server is running.',
        };
      }
      throw {
        status: 0,
        message: error.message || 'Unknown error occurred',
      };
    }
  },
};

// =====================
// SELLER DASHBOARD API
// =====================
export const sellerDashboardAPI = {
  getStats: async () => {
    return apiRequest(API_ENDPOINTS.SELLER_STATS);
  },
};

// =====================
// SELLER INQUIRIES API
// =====================
export const sellerInquiriesAPI = {
  list: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`${API_ENDPOINTS.SELLER_INQUIRIES}?${queryString}`);
  },
  
  updateStatus: async (id, status) => {
    return apiRequest(`${API_ENDPOINTS.SELLER_UPDATE_INQUIRY}?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
  
  getBuyer: async (buyerId) => {
    return apiRequest(`${API_ENDPOINTS.SELLER_GET_BUYER}?id=${buyerId}`);
  },
};

// =====================
// SELLER PROFILE API
// =====================
export const sellerProfileAPI = {
  get: async () => {
    return apiRequest(API_ENDPOINTS.SELLER_PROFILE);
  },
  
  update: async (profileData) => {
    return apiRequest(API_ENDPOINTS.SELLER_UPDATE_PROFILE, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },
  
  uploadProfileImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const url = `${API_BASE_URL}${API_ENDPOINTS.UPLOAD_PROFILE_IMAGE}`;
    const token = getToken();
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      // Get response text first to check if it's empty
      const responseText = await response.text();
      
      // Check if response is empty
      if (!responseText || responseText.trim() === '') {
        throw {
          status: response.status || 500,
          message: 'Empty response from server. The upload may have failed.',
          errors: null,
        };
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          console.error('Response text:', responseText.substring(0, 500));
          throw {
            status: response.status || 500,
            message: 'Invalid JSON response from server. Response: ' + responseText.substring(0, 200),
            errors: null,
            rawResponse: responseText.substring(0, 500)
          };
        }
      } else {
        // Not JSON - might be HTML error page or plain text
        console.error('Non-JSON response:', responseText.substring(0, 500));
        throw {
          status: response.status || 500,
          message: responseText.substring(0, 200) || 'Invalid response from server',
          errors: null,
          rawResponse: responseText.substring(0, 500)
        };
      }
      
      if (!response.ok) {
        throw {
          status: response.status,
          message: data.message || 'Upload failed',
          errors: data.errors || null,
          data: data
        };
      }
      
      return data;
    } catch (error) {
      if (error.status) {
        throw error;
      }
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw {
          status: 0,
          message: 'Network error. Please check your connection and ensure the backend server is running.',
        };
      }
      throw {
        status: 0,
        message: error.message || 'Upload failed. Please try again.',
        originalError: error.message
      };
    }
  },
};

// =====================
// BUYER PROPERTIES API
// =====================
export const propertiesAPI = {
  list: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`${API_ENDPOINTS.PROPERTIES}?${queryString}`);
  },
  
  getDetails: async (id) => {
    return apiRequest(`${API_ENDPOINTS.PROPERTY_DETAILS}?id=${id}`);
  },
  
  sendInquiry: async (inquiryData) => {
    return apiRequest(API_ENDPOINTS.SEND_INQUIRY, {
      method: 'POST',
      body: JSON.stringify(inquiryData),
    });
  },
};

// =====================
// BUYER PROFILE API
// =====================
export const buyerProfileAPI = {
  get: async () => {
    return apiRequest(API_ENDPOINTS.BUYER_PROFILE);
  },
  
  update: async (profileData) => {
    return apiRequest(API_ENDPOINTS.BUYER_UPDATE_PROFILE, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },
};

// =====================
// FAVORITES API
// =====================
export const favoritesAPI = {
  toggle: async (propertyId) => {
    return apiRequest(API_ENDPOINTS.TOGGLE_FAVORITE, {
      method: 'POST',
      body: JSON.stringify({ property_id: propertyId }),
    });
  },
  
  list: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`${API_ENDPOINTS.FAVORITES_LIST}?${queryString}`);
  },
};

// =====================
// CHAT API
// =====================
export const chatAPI = {
  createRoom: async (receiverId, propertyId) => {
    return apiRequest(API_ENDPOINTS.CHAT_CREATE_ROOM, {
      method: 'POST',
      body: JSON.stringify({ receiverId, propertyId }),
    });
  },
  
  listRooms: async () => {
    return apiRequest(API_ENDPOINTS.CHAT_LIST_ROOMS, {
      method: 'GET',
    });
  },
};

// =====================
// OTP API
// =====================
export const otpAPI = {
  sendEmailOTP: async (email) => {
    return apiRequest(API_ENDPOINTS.SEND_EMAIL_OTP, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  
  verifyEmailOTP: async (email, otp) => {
    return apiRequest(API_ENDPOINTS.VERIFY_EMAIL_OTP, {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  },
  
  sendSMSOTP: async (phone) => {
    return apiRequest(API_ENDPOINTS.SEND_SMS_OTP, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },
  
  verifySMSOTP: async (phone, otp, reqId = null) => {
    const body = { phone, otp };
    if (reqId) {
      body.reqId = reqId;
    }
    return apiRequest(API_ENDPOINTS.VERIFY_SMS_OTP, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  
  resendSMSOTP: async (phone) => {
    return apiRequest(API_ENDPOINTS.RESEND_SMS_OTP, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },
};

// =====================
// BUYER INTERACTIONS API (Rate Limiting)
// =====================
export const buyerInteractionsAPI = {
  checkLimit: async (propertyId, actionType) => {
    const queryString = new URLSearchParams({
      property_id: propertyId,
      action_type: actionType,
    }).toString();
    return apiRequest(`${API_ENDPOINTS.BUYER_INTERACTIONS_CHECK}?${queryString}`);
  },
  
  recordInteraction: async (propertyId, actionType) => {
    return apiRequest(API_ENDPOINTS.BUYER_INTERACTIONS_RECORD, {
      method: 'POST',
      body: JSON.stringify({ property_id: propertyId, action_type: actionType }),
    });
  },
};

// Export all APIs
export default {
  auth: authAPI,
  sellerProperties: sellerPropertiesAPI,
  sellerDashboard: sellerDashboardAPI,
  sellerInquiries: sellerInquiriesAPI,
  sellerProfile: sellerProfileAPI,
  properties: propertiesAPI,
  buyerProfile: buyerProfileAPI,
  favorites: favoritesAPI,
  chat: chatAPI,
  otp: otpAPI,
  buyerInteractions: buyerInteractionsAPI,
};
