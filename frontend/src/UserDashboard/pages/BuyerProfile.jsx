import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI, buyerProfileAPI } from '../../services/api.service';
import PropertyCard, { FavoritesManager} from '../components/PropertyCard';
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api.config';
import '../styles/BuyerProfile.css';


const BuyerProfile = () => {
  const { user, login } = useAuth();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [profileImage, setProfileImage] = useState(user?.profile_image || null);
  
  // Initialize form data with user data or empty
  const [formData, setFormData] = useState({
    firstName: user?.full_name?.split(' ')[0] || user?.first_name || '',
    lastName: user?.full_name?.split(' ').slice(1).join(' ') || user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: ''
  });
  
  const [saving, setSaving] = useState(false);
  
  // Load user profile data on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        try {
          const response = await buyerProfileAPI.get();
          if (response.success && response.data && response.data.profile) {
            const profile = response.data.profile;
            const nameParts = profile.full_name?.split(' ') || [];
            setFormData({
              firstName: nameParts[0] || profile.first_name || '',
              lastName: nameParts.slice(1).join(' ') || profile.last_name || '',
              email: profile.email || '',
              phone: profile.phone || '',
              address: profile.address || ''
            });
            setProfileImage(profile.profile_image || null);
          } else {
            // Fallback to user data if profile API fails
            const nameParts = user.full_name?.split(' ') || [];
            setFormData({
              firstName: nameParts[0] || user.first_name || '',
              lastName: nameParts.slice(1).join(' ') || user.last_name || '',
              email: user.email || '',
              phone: user.phone || '',
              address: ''
            });
            setProfileImage(user.profile_image || null);
          }
        } catch (error) {
          console.error('Error loading profile:', error);
          // Fallback to user data
          const nameParts = user.full_name?.split(' ') || [];
          setFormData({
            firstName: nameParts[0] || user.first_name || '',
            lastName: nameParts.slice(1).join(' ') || user.last_name || '',
            email: user.email || '',
            phone: user.phone || '',
            address: ''
          });
          setProfileImage(user.profile_image || null);
        }
      }
    };
    
    loadProfile();
  }, [user]);
  
  // Handle image selection from device
  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };
  
  // Handle camera capture - Open camera modal
  const handleCameraCapture = async () => {
    setShowImageMenu(false);
    
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Use back camera by default, fallback to front
        } 
      });
      
      streamRef.current = stream;
      setShowCameraModal(true);
      
      // Set video stream when modal opens
      setTimeout(() => {
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        alert('Camera access denied. Please allow camera permission in your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        alert('No camera found on this device.');
      } else {
        alert('Unable to access camera. Please try using "Upload from Device" instead.');
      }
    }
  };
  
  // Capture photo from camera
  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          // Create a File object from blob
          const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
          setCapturedImage(file);
        }
      }, 'image/jpeg', 0.9);
    }
  };
  
  // Use captured photo
  const useCapturedPhoto = () => {
    if (capturedImage) {
      uploadProfileImage(capturedImage);
      closeCameraModal();
    }
  };
  
  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null);
  };
  
  // Close camera modal and stop stream
  const closeCameraModal = () => {
    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setShowCameraModal(false);
    setCapturedImage(null);
  };
  
  // Upload profile image
  const uploadProfileImage = async (file) => {
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('Image size should be less than 5MB');
      return;
    }
    
    setUploadingImage(true);
    setShowImageMenu(false);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('authToken');
      const url = `${API_BASE_URL}${API_ENDPOINTS.UPLOAD_PROFILE_IMAGE}`;
      
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
        throw new Error(text || 'Invalid response from server');
      }
      
      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }
      
      if (data.success && data.data && data.data.url) {
        // Update local state
        setProfileImage(data.data.url);
        
        // Update user in localStorage
        if (user) {
          const updatedUser = { ...user, profile_image: data.data.url };
          localStorage.setItem('userData', JSON.stringify(updatedUser));
        }
        
        // Refresh user data from backend to ensure consistency
        try {
          const verifyResponse = await authAPI.verifyToken();
          if (verifyResponse.success && verifyResponse.data) {
            // User data will be updated in AuthContext automatically
            // The profile image state is already updated above
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
          // Continue anyway - image is uploaded
        }
        
        alert('Profile image uploaded successfully!');
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(error.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      // Reset file inputs
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    }
  };
  
  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadProfileImage(file);
    }
  };
  
  // Handle camera input change
  const handleCameraChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadProfileImage(file);
    }
  };

  // Favorites state
  const [favoriteProperties, setFavoriteProperties] = useState([]);
  const [activeSection, setActiveSection] = useState('profile'); // 'profile' or 'favorites'

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = () => {
    const favorites = FavoritesManager.getFavoriteProperties();
    setFavoriteProperties(favorites);
  };

  const handleFavoriteToggle = () => {
    loadFavorites();
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Prepare profile data for API
      const profileData = {
        full_name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone,
        address: formData.address
      };
      
      // Call API to update profile
      const response = await buyerProfileAPI.update(profileData);
      
      if (response.success) {
        // Update user data in localStorage
        if (user) {
          const updatedUser = {
            ...user,
            full_name: profileData.full_name,
            email: profileData.email,
            phone: profileData.phone
          };
          localStorage.setItem('userData', JSON.stringify(updatedUser));
        }
        
        // Refresh user data from backend
        try {
          const verifyResponse = await authAPI.verifyToken();
          if (verifyResponse.success && verifyResponse.data) {
            // User data will be updated in AuthContext automatically
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
        }
        
        alert('Profile updated successfully!');
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Close image menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showImageMenu && !event.target.closest('.buyer-avatar-upload-wrapper')) {
        setShowImageMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showImageMenu]);
  
  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  return (
    <div className="buyer-seller-profile">
      <div className="buyer-profile-header">
        <h1>Profile Settings</h1>
        
        {/* Section Toggle Buttons */}
        <div className="buyer-profile-section-toggle">
          <button 
            className={`buyer-section-btn ${activeSection === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveSection('profile')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
            </svg>
            Profile Info
          </button>
          <button 
            className={`buyer-section-btn ${activeSection === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveSection('favorites')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            My Favorites ({favoriteProperties.length})
          </button>
        </div>
      </div>

      {activeSection === 'profile' ? (
        <div className="buyer-profile-content">
          {/* Profile Card */}
          <div className="buyer-profile-card">
            <div className="buyer-profile-avatar-section">
              <div className="buyer-avatar-container">
                {/* Hidden file inputs */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                {/* Camera input kept for fallback on older devices */}
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleCameraChange}
                  style={{ display: 'none' }}
                />
                
                <img 
                  src={profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=886ace&color=fff&size=200`}
                  alt="Profile" 
                  className="buyer-profile-avatar"
                />
                
                {/* Upload button with dropdown menu */}
                <div className="buyer-avatar-upload-wrapper">
                  <button 
                    className="buyer-avatar-upload-btn"
                    onClick={() => setShowImageMenu(!showImageMenu)}
                    disabled={uploadingImage}
                    title="Change profile photo"
                  >
                    {uploadingImage ? (
                      <div className="buyer-upload-spinner"></div>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="white" strokeWidth="2"/>
                        <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="2"/>
                      </svg>
                    )}
                  </button>
                  
                  {/* Dropdown menu */}
                  {showImageMenu && !uploadingImage && (
                    <div className="buyer-image-upload-menu">
                      <button 
                        onClick={handleImageSelect}
                        className="buyer-upload-menu-item"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>Upload from Device</span>
                      </button>
                      <button 
                        onClick={handleCameraCapture}
                        className="buyer-upload-menu-item"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="currentColor" strokeWidth="2"/>
                          <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        <span>Take Photo</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="buyer-profile-name-section">
                <h2>{user?.full_name || user?.first_name + ' ' + user?.last_name || 'User'}</h2>
                <p className="buyer-profile-role">
                  {user?.user_type === 'buyer' ? 'Buyer' : 
                   user?.user_type === 'seller' ? 'Seller' : 
                   user?.user_type === 'agent' ? 'Agent' : 'User'}
                </p>
                <div className="buyer-profile-badges">
                  {user?.email_verified && <span className="buyer-badge buyer-verified">Verified</span>}
                  {user?.user_type === 'agent' && <span className="buyer-badge buyer-pro-agent">Pro Agent</span>}
                </div>
              </div>
            </div>

            <div className="buyer-profile-stats">
              <div className="buyer-stat-item">
                <span className="buyer-stat-label">Member since</span>
                <span className="buyer-stat-value">
                  {user?.created_at 
                    ? (() => {
                        try {
                          const date = new Date(user.created_at);
                          const month = date.toLocaleDateString('en-US', { month: 'long' });
                          const year = date.getFullYear();
                          return `${month} ${year}`;
                        } catch (error) {
                          return 'Recently';
                        }
                      })()
                    : 'Recently'}
                </span>
              </div>
            </div>
          </div>

          {/* Personal Information Form */}
          <div className="buyer-profile-form-card">
            <h3>Personal Information</h3>
            
            <div className="buyer-form-row">
              <div className="buyer-form-group">
                <label>First Name</label>
                <div className="buyer-input-wrapper">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <input 
                    type="text" 
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="buyer-form-group">
                <label>Last Name</label>
                <div className="buyer-input-wrapper">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <input 
                    type="text" 
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="buyer-form-row">
              <div className="buyer-form-group">
                <label>Email Address</label>
                <div className="buyer-input-wrapper">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="buyer-form-group">
                <label>Phone Number</label>
                <div className="buyer-input-wrapper">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <input 
                    type="tel" 
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="buyer-form-group buyer-full-width">
              <label>Address</label>
              <div className="buyer-input-wrapper">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <input 
                  type="text" 
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter your address"
                />
              </div>
            </div>

            <div className="buyer-form-actions">
              <button className="buyer-cancel-btn" onClick={() => {
                // Reset form to original values
                const nameParts = user?.full_name?.split(' ') || [];
                setFormData({
                  firstName: nameParts[0] || user?.first_name || '',
                  lastName: nameParts.slice(1).join(' ') || user?.last_name || '',
                  email: user?.email || '',
                  phone: user?.phone || '',
                  address: ''
                });
              }}>Cancel</button>
              <button 
                className="buyer-save-btn" 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="buyer-upload-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="white" strokeWidth="2"/>
                      <path d="M17 21v-8H7v8M7 3v5h8" stroke="white" strokeWidth="2"/>
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* FAVORITES SECTION */
        <div className="buyer-favorites-section">
          {favoriteProperties.length === 0 ? (
            <div className="buyer-empty-favorites">
              <svg 
                width="80" 
                height="80" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#cbd5e0" 
                strokeWidth="1.5"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              <h3>No Favorites Yet</h3>
              <p>Start exploring properties and add them to your favorites by clicking the heart icon</p>
            </div>
          ) : (
            <div className="buyer-favorites-grid">
              {favoriteProperties.map(property => (
                <PropertyCard 
                  key={property.id} 
                  property={property}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Camera Modal */}
      {showCameraModal && (
        <div className="buyer-camera-modal-overlay" onClick={closeCameraModal}>
          <div className="buyer-camera-modal" onClick={(e) => e.stopPropagation()}>
            <div className="buyer-camera-modal-header">
              <h3>Take Photo</h3>
              <button 
                className="buyer-camera-close-btn"
                onClick={closeCameraModal}
                aria-label="Close camera"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            
            <div className="buyer-camera-content">
              {!capturedImage ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="buyer-camera-video"
                  />
                  <div className="buyer-camera-controls">
                    <button 
                      className="buyer-camera-capture-btn"
                      onClick={capturePhoto}
                      aria-label="Capture photo"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="4" fill="white"/>
                      </svg>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <img 
                    src={URL.createObjectURL(capturedImage)} 
                    alt="Captured" 
                    className="buyer-camera-preview"
                  />
                  <div className="buyer-camera-preview-controls">
                    <button 
                      className="buyer-camera-retake-btn"
                      onClick={retakePhoto}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Retake
                    </button>
                    <button 
                      className="buyer-camera-use-btn"
                      onClick={useCapturedPhoto}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <div className="buyer-upload-spinner"></div>
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Use Photo
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerProfile;