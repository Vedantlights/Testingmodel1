import React, { useState, useEffect, useRef } from 'react';
import {
  validateIndianPhone,
  validateEmail,
  validateGST,
  validateURL,
  validateTextLength,
  sanitizeInput,
  validateImageFile,
  validateImageDimensions
} from '../../utils/validation';
import { sellerProfileAPI } from '../../services/api.service';
import { useProperty } from './PropertyContext';
import '../styles/SellerProfile.css';

const SellerProfile = () => {
  const { getStats } = useProperty();
  const stats = getStats();
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [memberSince, setMemberSince] = useState(null);
  const [sellerVerified, setSellerVerified] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const imageMenuRef = useRef(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    alternatePhone: '',
    agencyName: '',
    agencyAddress: '',
    gstNumber: '',
    reraNumber: '',
    address: '',
    website: '',
    facebook: '',
    instagram: '',
    linkedin: ''
  });

  const [notifications, setNotifications] = useState({
    emailInquiries: true,
    smsInquiries: true,
    emailUpdates: true,
    smsUpdates: false,
    marketingEmails: false
  });

  // Fetch profile data from backend
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await sellerProfileAPI.get();
        
        if (response.success && response.data && response.data.profile) {
          const profile = response.data.profile;
          
          // Split full_name into firstName and lastName
          const nameParts = (profile.full_name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          // Parse social_links
          let socialLinks = profile.social_links || {};
          if (typeof socialLinks === 'string') {
            try {
              socialLinks = JSON.parse(socialLinks);
            } catch (e) {
              socialLinks = {};
            }
          }
          
          // Set profile image (from users table)
          setProfileImage(profile.profile_image || '');
          
          // Set member since date from created_at
          if (profile.created_at) {
            setMemberSince(profile.created_at);
          }
          
          // Store seller verified status (using agent_verified field from backend)
          setSellerVerified(profile.agent_verified === 1 || profile.agent_verified === true);
          
          setFormData({
            firstName: firstName,
            lastName: lastName,
            email: profile.email || '',
            phone: profile.phone || '',
            alternatePhone: '', // Not in backend yet
            agencyName: profile.company_name || '',
            agencyAddress: profile.address || '',
            gstNumber: '', // Not in backend yet
            reraNumber: profile.license_number || '',
            address: profile.address || '',
            website: profile.website || '',
            facebook: socialLinks.facebook || '',
            instagram: socialLinks.instagram || '',
            linkedin: socialLinks.linkedin || ''
          });
        } else {
          // If no profile, set empty values
          setProfileImage('');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        // Keep default empty values on error
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Format member since date
  const formatMemberSince = (dateString) => {
    if (!dateString) return 'Member since recently';
    
    try {
      const date = new Date(dateString);
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      const year = date.getFullYear();
      return `Member since ${month} ${year}`;
    } catch (error) {
      return 'Member since recently';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let sanitizedValue = value;
    
    // Convert firstName and lastName to uppercase, but keep email as is
    if (name === 'firstName' || name === 'lastName') {
      sanitizedValue = sanitizeInput(value.toUpperCase());
    } else if (['address', 'agencyName', 'agencyAddress'].includes(name)) {
      sanitizedValue = sanitizeInput(value);
    }
    
    setFormData({
      ...formData,
      [name]: sanitizedValue
    });
    
    // Clear error when user makes changes
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  const validateProfile = () => {
    const newErrors = {};
    
    // First Name validation
    const firstNameValidation = validateTextLength(formData.firstName, 2, 50, 'First name');
    if (!firstNameValidation.valid) {
      newErrors.firstName = firstNameValidation.message;
    } else if (!/^[a-zA-Z\s]+$/.test(formData.firstName)) {
      newErrors.firstName = 'First name should contain only letters';
    }
    
    // Last Name validation
    const lastNameValidation = validateTextLength(formData.lastName, 2, 50, 'Last name');
    if (!lastNameValidation.valid) {
      newErrors.lastName = lastNameValidation.message;
    } else if (!/^[a-zA-Z\s]+$/.test(formData.lastName)) {
      newErrors.lastName = 'Last name should contain only letters';
    }
    
    // Email validation
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      newErrors.email = emailValidation.message;
    }
    
    // Phone validation
    const phoneValidation = validateIndianPhone(formData.phone);
    if (!phoneValidation.valid) {
      newErrors.phone = phoneValidation.message;
    }
    
    // Alternate Phone validation (optional)
    if (formData.alternatePhone) {
      const altPhoneValidation = validateIndianPhone(formData.alternatePhone);
      if (!altPhoneValidation.valid) {
        newErrors.alternatePhone = altPhoneValidation.message;
      }
    }
    
    // Agency Name validation
    if (formData.agencyName) {
      const agencyValidation = validateTextLength(formData.agencyName, 2, 100, 'Agency name');
      if (!agencyValidation.valid) {
        newErrors.agencyName = agencyValidation.message;
      }
    }
    
    // GST validation
    if (formData.gstNumber) {
      const gstValidation = validateGST(formData.gstNumber);
      if (!gstValidation.valid) {
        newErrors.gstNumber = gstValidation.message;
      }
    }
    
    // Website validation
    if (formData.website) {
      const urlValidation = validateURL(formData.website);
      if (!urlValidation.valid) {
        newErrors.website = urlValidation.message;
      }
    }
    
    // Social media URL validations
    if (formData.facebook) {
      const fbValidation = validateURL(formData.facebook);
      if (!fbValidation.valid) {
        newErrors.facebook = 'Invalid Facebook URL';
      }
    }
    
    if (formData.instagram) {
      const igValidation = validateURL(formData.instagram);
      if (!igValidation.valid) {
        newErrors.instagram = 'Invalid Instagram URL';
      }
    }
    
    if (formData.linkedin) {
      const liValidation = validateURL(formData.linkedin);
      if (!liValidation.valid) {
        newErrors.linkedin = 'Invalid LinkedIn URL';
      }
    }
    
    // Address validation
    if (formData.address) {
      const addressValidation = validateTextLength(formData.address, 0, 500, 'Address');
      if (!addressValidation.valid) {
        newErrors.address = addressValidation.message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNotificationChange = (key) => {
    setNotifications({
      ...notifications,
      [key]: !notifications[key]
    });
  };

  const handleImageSelect = () => {
    setShowImageMenu(false);
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

    // Validate image
    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    // Validate dimensions
    try {
      const dimensionValidation = await validateImageDimensions(file, 200, 200);
      if (!dimensionValidation.valid) {
        alert(dimensionValidation.message);
        return;
      }
    } catch (error) {
      alert('Error validating image dimensions');
      return;
    }

    setUploadingImage(true);
    setImageError(false);

    try {
      // Upload image to backend
      const response = await sellerProfileAPI.uploadProfileImage(file);
      
      if (response.success && response.data && response.data.url) {
        setProfileImage(response.data.url);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        alert(response.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(error.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    }
  };

  const handleImageUpload = async (e) => {
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

  // Close image menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showImageMenu && imageMenuRef.current && !imageMenuRef.current.contains(event.target)) {
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

  const handleSave = async () => {
    if (!validateProfile()) {
      return; // Don't save if validation fails
    }
    
    try {
      setIsEditing(false);
      
      // Prepare data for backend
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      
      // Prepare address - use address field, fallback to agencyAddress, or empty string
      const addressValue = (formData.address || formData.agencyAddress || '').trim();
      
      // Exclude email and phone from update - they cannot be changed after login
      const updateData = {
        full_name: fullName,
        address: addressValue // Always send address, even if empty, so it can be cleared
      };
      
      console.log('Sending update data:', updateData);
      
      const response = await sellerProfileAPI.update(updateData);
      
      console.log('Update response:', response);
      
      if (response.success) {
        setShowSuccess(true);
        // Hide toast after 3 seconds with fade-out effect
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
        
        // Refetch profile to ensure we have the latest data
        try {
          const profileResponse = await sellerProfileAPI.get();
          if (profileResponse.success && profileResponse.data && profileResponse.data.profile) {
            const profile = profileResponse.data.profile;
            
            // Split full_name into firstName and lastName
            const nameParts = (profile.full_name || '').split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            // Parse social_links if needed
            let socialLinks = profile.social_links || {};
            if (typeof socialLinks === 'string') {
              try {
                socialLinks = JSON.parse(socialLinks);
              } catch (e) {
                socialLinks = {};
              }
            }
            
            // Update all form data with fresh data from backend
            setFormData(prev => ({
              ...prev,
              firstName: firstName,
              lastName: lastName,
              address: profile.address || '',
              email: profile.email || prev.email,
              phone: profile.phone || prev.phone,
              agencyName: profile.company_name || '',
              agencyAddress: profile.address || '',
              reraNumber: profile.license_number || '',
              website: profile.website || '',
              facebook: socialLinks.facebook || '',
              instagram: socialLinks.instagram || '',
              linkedin: socialLinks.linkedin || ''
            }));
            
            // Update profile image if returned
            if (profile.profile_image) {
              setProfileImage(profile.profile_image);
            }
          }
        } catch (fetchError) {
          console.error('Error refetching profile:', fetchError);
          // Still update with response data if refetch fails
          if (response.data && response.data.profile) {
            const profile = response.data.profile;
            const nameParts = (profile.full_name || '').split(' ');
            setFormData(prev => ({
              ...prev,
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || '',
              address: profile.address || prev.address || ''
            }));
          }
        }
      } else {
        alert(response.message || 'Failed to update profile');
        setIsEditing(true); // Re-enable editing on error
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(error.message || 'Failed to update profile. Please try again.');
      setIsEditing(true); // Re-enable editing on error
    }
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )},
    { id: 'notifications', label: 'Notifications', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    )},
    { id: 'security', label: 'Security', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )}
  ];

  if (loading) {
    return (
      <div className="seller-profile" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #003B73',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Loading profile...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-profile">
      {/* Success Toast */}
      {showSuccess && (
        <div className="seller-profile-success-toast">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Profile updated successfully!
        </div>
      )}

      {/* Header */}
      <div className="seller-profile-header">
        <h1>Profile Settings</h1>
        <p className="seller-profile-subtitle">Manage your account information and preferences</p>
      </div>

      <div className="seller-profile-layout">
        {/* Profile Card */}
        <div className="seller-profile-card">
          <div className="seller-profile-cover"></div>
          <div className="seller-seller-profile-avatar-img-section">
            <div className="seller-seller-profile-avatar-img-wrapper" ref={imageMenuRef}>
              {/* Hidden file inputs */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleCameraChange}
                style={{ display: 'none' }}
              />
              
              {profileImage && !imageError ? (
                <img 
                  src={profileImage} 
                  alt="Profile" 
                  className="seller-profile-avatar-img"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="seller-profile-avatar-initials">
                  {formData.firstName ? formData.firstName.charAt(0).toUpperCase() : ''}
                  {formData.lastName ? formData.lastName.charAt(0).toUpperCase() : ''}
                  {!formData.firstName && !formData.lastName ? 'U' : ''}
                </div>
              )}
              
              {/* Upload button with dropdown menu */}
              <div className="seller-avatar-upload-wrapper">
                <button 
                  className="seller-profile-avatar-seller-profile-edit-btn"
                  onClick={() => setShowImageMenu(!showImageMenu)}
                  disabled={uploadingImage}
                  title="Change profile photo"
                >
                  {uploadingImage ? (
                    <div className="spinner-small"></div>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  )}
                </button>
                
                {/* Dropdown menu */}
                {showImageMenu && !uploadingImage && (
                  <div className="seller-image-upload-menu">
                    <button 
                      onClick={handleImageSelect}
                      className="seller-upload-menu-item"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Upload from Device</span>
                    </button>
                    <button 
                      onClick={handleCameraCapture}
                      className="seller-upload-menu-item"
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
            
            <h2>
              {formData.firstName || formData.lastName 
                ? `${formData.firstName} ${formData.lastName}`.trim() 
                : 'Your Name'}
            </h2>
            <p className="seller-profile-role">
              {formData.agencyName || 'Your Agency'}
            </p>
            
            <div className="seller-profile-badges">
              <span className={`seller-profile-badge ${sellerVerified ? 'verified' : 'pending'}`}>
                {sellerVerified ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Verified
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Pending
                  </>
                )}
              </span>
              <span className="seller-profile-badge pro">Pro Seller</span>
            </div>
          </div>

          <div className="seller-profile-stats-grid">
            <div className="seller-profile-stat-box">
              <span className="seller-profile-stat-value">{stats.totalProperties || 0}</span>
              <span className="seller-profile-stat-label">Listed</span>
            </div>
            <div className="seller-profile-stat-box">
              <span className="seller-profile-stat-value">{stats.totalInquiries || 0}</span>
              <span className="seller-profile-stat-label">Inquiries</span>
            </div>
          </div>

          <div className="seller-profile-member-since">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {formatMemberSince(memberSince)}
          </div>
        </div>

        {/* Settings Content */}
        <div className="seller-profile-settings-content">
          {/* Tabs */}
          <div className="seller-profile-settings-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`seller-profile-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="seller-profile-tab-content">
            {activeTab === 'personal' && (
              <div className="seller-profile-settings-section">
                <div className="seller-profile-section-header">
                  <h3>Personal Information</h3>
                  {!isEditing && (
                    <button className="seller-profile-edit-btn" onClick={() => setIsEditing(true)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Edit
                    </button>
                  )}
                </div>

                <div className="seller-profile-form-grid">
                  <div className="seller-profile-form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="seller-profile-form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={errors.lastName ? 'error' : ''}
                    />
                    {errors.lastName && <span className="seller-profile-error-text">{errors.lastName}</span>}
                  </div>

                  <div className="seller-profile-form-group">
                    <label>Email Address</label>
                    <div className="seller-profile-input-with-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        readOnly
                        disabled
                        style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                        className={errors.email ? 'error' : ''}
                      />
                    </div>
                  </div>

                  <div className="seller-profile-form-group">
                    <label>Phone Number</label>
                    <div className="seller-profile-input-with-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        readOnly
                        disabled
                        style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                        className={errors.phone ? 'error' : ''}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="seller-profile-form-group seller-profile-full-width">
                    <label>Address</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      disabled={!isEditing}
                      rows={3}
                      className={errors.address ? 'error' : ''}
                    />
                    {errors.address && <span className="seller-profile-error-text">{errors.address}</span>}
                  </div>
                </div>

                {isEditing && (
                  <div className="seller-profile-form-actions">
                    <button className="seller-profile-cancel-btn" onClick={() => setIsEditing(false)}>
                      Cancel
                    </button>
                    <button className="seller-profile-save-btn" onClick={handleSave}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            )}


            {activeTab === 'notifications' && (
              <div className="seller-profile-settings-section">
                <div className="seller-profile-section-header">
                  <h3>Notification Preferences</h3>
                </div>

                <div className="seller-profile-notification-group">
                  <h4>Inquiry Notifications</h4>
                  <p className="seller-profile-group-desc">Get notified when buyers send inquiries for your properties</p>
                  
                  <div className="seller-profile-toggle-item">
                    <div className="seller-profile-toggle-info">
                      <span className="seller-profile-toggle-label">Email notifications</span>
                      <span className="seller-profile-toggle-desc">Receive inquiry details via email</span>
                    </div>
                    <button 
                      className={`seller-profile-toggle-switch ${notifications.emailInquiries ? 'active' : ''}`}
                      onClick={() => handleNotificationChange('emailInquiries')}
                    >
                      <span className="seller-profile-toggle-thumb"></span>
                    </button>
                  </div>

                  <div className="seller-profile-toggle-item">
                    <div className="seller-profile-toggle-info">
                      <span className="seller-profile-toggle-label">SMS notifications</span>
                      <span className="seller-profile-toggle-desc">Get SMS alerts for new inquiries</span>
                    </div>
                    <button 
                      className={`seller-profile-toggle-switch ${notifications.smsInquiries ? 'active' : ''}`}
                      onClick={() => handleNotificationChange('smsInquiries')}
                    >
                      <span className="seller-profile-toggle-thumb"></span>
                    </button>
                  </div>
                </div>

                <div className="seller-profile-notification-group">
                  <h4>Account Updates</h4>
                  <p className="seller-profile-group-desc">Stay updated with your account activity</p>
                  
                  <div className="seller-profile-toggle-item">
                    <div className="seller-profile-toggle-info">
                      <span className="seller-profile-toggle-label">Property updates</span>
                      <span className="seller-profile-toggle-desc">Notifications about your listings</span>
                    </div>
                    <button 
                      className={`seller-profile-toggle-switch ${notifications.emailUpdates ? 'active' : ''}`}
                      onClick={() => handleNotificationChange('emailUpdates')}
                    >
                      <span className="seller-profile-toggle-thumb"></span>
                    </button>
                  </div>

                </div>

                <div className="seller-profile-form-actions">
                  <button className="seller-profile-save-btn" onClick={handleSave}>
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="seller-profile-settings-section">
                <div className="seller-profile-section-header">
                  <h3>Security Settings</h3>
                </div>

                <div className="seller-profile-security-card">
                  <div className="seller-profile-security-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div className="seller-profile-security-info">
                    <h4>Change Password</h4>
                    <p>Update your password to keep your account secure</p>
                  </div>
                  <button className="seller-profile-security-btn">Change</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Camera Modal */}
      {showCameraModal && (
        <div className="seller-camera-modal-overlay" onClick={closeCameraModal}>
          <div className="seller-camera-modal" onClick={(e) => e.stopPropagation()}>
            <div className="seller-camera-modal-header">
              <h3>Take Photo</h3>
              <button 
                className="seller-camera-close-btn"
                onClick={closeCameraModal}
                aria-label="Close camera"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            
            <div className="seller-camera-content">
              {!capturedImage ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="seller-camera-video"
                  />
                  <div className="seller-camera-controls">
                    <button 
                      className="seller-camera-capture-btn"
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
                    className="seller-camera-preview"
                  />
                  <div className="seller-camera-preview-controls">
                    <button 
                      className="seller-camera-retake-btn"
                      onClick={retakePhoto}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Retake
                    </button>
                    <button 
                      className="seller-camera-use-btn"
                      onClick={useCapturedPhoto}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <div className="spinner-small"></div>
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

export default SellerProfile;