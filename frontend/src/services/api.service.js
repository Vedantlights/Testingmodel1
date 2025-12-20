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
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw {
        status: response.status,
        message: text || 'Invalid response from server',
        errors: null,
      };
    }
    
    if (!response.ok) {
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
          error.message = 'Authentication required. Please log in to continue.';
        } else if (error.status === 403) {
          error.message = 'Access denied. You do not have permission to perform this action.';
        }
      }
      throw error;
    }
    // Handle network errors or JSON parse errors
    throw {
      status: 0,
      message: error.message || 'Network error. Please check your connection and ensure the backend server is running.',
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
        setUser(response.data.user);
      }
      return response;
    } catch (error) {
      removeToken();
      removeUser();
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
  
  uploadImage: async (file, propertyId = 0) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', 'image');
    if (propertyId) {
      formData.append('property_id', propertyId);
    }
    
    const url = `${API_BASE_URL}${API_ENDPOINTS.UPLOAD_PROPERTY_FILES}`;
    const token = getToken();
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw {
        status: response.status,
        message: text || 'Invalid response from server',
      };
    }
    
    if (!response.ok) {
      throw {
        status: response.status,
        message: data.message || 'Upload failed',
        errors: data.errors || null,
      };
    }
    
    return data;
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
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw {
        status: response.status,
        message: text || 'Invalid response from server',
      };
    }
    
    if (!response.ok) {
      throw {
        status: response.status,
        message: data.message || 'Upload failed',
        errors: data.errors || null,
      };
    }
    
    return data;
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
      body: JSON.stringify({ propertyId }),
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
};
