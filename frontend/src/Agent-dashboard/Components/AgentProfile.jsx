import React, { useState, useEffect, useRef } from 'react';
import { sellerProfileAPI } from '../../services/api.service';
import { useProperty } from './PropertyContext';
import { authAPI } from '../../services/api.service';
import '../styles/AgentProfile.css';

const AgentProfile = () => {
  const { getStats } = useProperty();
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingBusiness, setIsEditingBusiness] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    alternatePhone: '',
    agencyName: '',
    agencyAddress: '',
    gstNumber: '',
    reraNumber: '',
    website: '',
    profileImage: ""
  });


  const [createdAt, setCreatedAt] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [agentVerified, setAgentVerified] = useState(false);

  // Fetch profile data from backend
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        setImageError(false); // Reset image error when fetching new profile
        const response = await sellerProfileAPI.get();
        
        if (response.success && response.data && response.data.profile) {
          const profile = response.data.profile;
          
          // Split full_name into firstName and lastName
          const nameParts = (profile.full_name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          // Get location from address or set empty
          const location = profile.address ? profile.address.split(',')[0] + (profile.address.split(',')[1] ? ', ' + profile.address.split(',')[1] : '') : '';
          
          setFormData({
            firstName: firstName,
            lastName: lastName,
            email: profile.email || '',
            phone: profile.phone || '',
            location: location,
            alternatePhone: '', // Not in backend yet
            agencyName: profile.company_name || '',
            agencyAddress: profile.address || '',
            gstNumber: '', // Not in backend yet
            reraNumber: profile.license_number || '',
            website: profile.website || '',
            profileImage: profile.profile_image || ""
          });
          
          // Store created_at for member since
          if (profile.created_at) {
            setCreatedAt(profile.created_at);
          }
          
          // Store agent_verified status
          setAgentVerified(profile.agent_verified === 1 || profile.agent_verified === true);
        } else {
          // If no profile, try to get basic info from logged-in user
          const user = authAPI.getUser();
          if (user) {
            const nameParts = (user.full_name || '').split(' ');
            setFormData(prev => ({
              ...prev,
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || '',
              email: user.email || '',
              phone: user.phone || '',
              profileImage: user.profile_image || ""
            }));
            // Try to get created_at from user if available
            if (user.created_at) {
              setCreatedAt(user.created_at);
            }
            // Try to get agent_verified from user if available
            if (user.agent_verified !== undefined) {
              setAgentVerified(user.agent_verified === 1 || user.agent_verified === true);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError(error.message || 'Failed to load profile data');
        
        // Fallback to logged-in user data
        const user = authAPI.getUser();
        if (user) {
          const nameParts = (user.full_name || '').split(' ');
          setFormData(prev => ({
            ...prev,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: user.email || '',
            phone: user.phone || '',
            profileImage: user.profile_image || ""
          }));
          // Try to get created_at from user if available
          if (user.created_at) {
            setCreatedAt(user.created_at);
          }
          // Try to get agent_verified from user if available
          if (user.agent_verified !== undefined) {
            setAgentVerified(user.agent_verified === 1 || user.agent_verified === true);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Convert firstName and lastName to uppercase, but keep email as is
    const processedValue = (name === 'firstName' || name === 'lastName') 
      ? value.toUpperCase() 
      : value;
    setFormData({
      ...formData,
      [name]: processedValue
    });
  };


  const handleSave = async () => {
    try {
      setIsEditing(false);
      setError(null);
      
      // Prepare data for backend
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      
      // Exclude email and phone from update - they cannot be changed after login
      // Send empty strings instead of null to allow clearing fields
      const updateData = {
        full_name: fullName,
        address: (formData.agencyAddress || '').trim(),
        company_name: (formData.agencyName || '').trim(),
        license_number: (formData.reraNumber || '').trim(),
        website: (formData.website || '').trim()
      };
      
      const response = await sellerProfileAPI.update(updateData);
      
      if (response.success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        
        // Update formData with response if needed
        if (response.data && response.data.profile) {
          const profile = response.data.profile;
          const nameParts = (profile.full_name || '').split(' ');
          setFormData(prev => ({
            ...prev,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: profile.email || prev.email,
            phone: profile.phone || prev.phone
          }));
          
          // Update agent_verified status if available
          if (profile.agent_verified !== undefined) {
            setAgentVerified(profile.agent_verified === 1 || profile.agent_verified === true);
          }
          
          // Update localStorage with updated user data
          const currentUser = authAPI.getUser();
          if (currentUser) {
            const updatedUser = {
              ...currentUser,
              full_name: profile.full_name || currentUser.full_name,
              email: profile.email || currentUser.email,
              phone: profile.phone || currentUser.phone,
              profile_image: profile.profile_image || currentUser.profile_image,
              address: profile.address || currentUser.address,
              company_name: profile.company_name || currentUser.company_name,
              agent_verified: profile.agent_verified !== undefined ? profile.agent_verified : currentUser.agent_verified
            };
            localStorage.setItem('userData', JSON.stringify(updatedUser));
            // Dispatch custom event to notify dashboard to refresh
            window.dispatchEvent(new CustomEvent('userDataUpdated'));
          }
        }
      } else {
        setError(response.message || 'Failed to update profile');
        setIsEditing(true); // Re-enable editing on error
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile. Please try again.');
      setIsEditing(true); // Re-enable editing on error
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic file validation
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('Image size should be less than 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      // Upload image to backend
      const response = await sellerProfileAPI.uploadProfileImage(file);
      
      if (response.success && response.data && response.data.url) {
        setFormData(prev => ({ ...prev, profileImage: response.data.url }));
        setImageError(false); // Reset image error when new image is uploaded
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        
        // Update localStorage with new profile image
        const currentUser = authAPI.getUser();
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            profile_image: response.data.url
          };
          localStorage.setItem('userData', JSON.stringify(updatedUser));
          // Dispatch custom event to notify dashboard to refresh
          window.dispatchEvent(new CustomEvent('userDataUpdated'));
        }
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
    }
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info' },
    { id: 'business', label: 'Business Info' }
  ];

  return (
    <div className="agent-profile">

      {showSuccess && (
        <div className="success-toast">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" />
          </svg>
          Profile updated successfully!
        </div>
      )}

      <div className="profile-header">
        <h1>Profile Settings</h1>
        <p className="subtitle">Manage your account information and preferences</p>
      </div>

      <div className="profile-layout">

        {/* Profile Card */}
        <div className="profile-card">
          <div className="profile-cover"></div>

          <div className="profile-avatar-section">

            <div className="avatar-wrapper">
              {formData.profileImage && !imageError ? (
                <img
                  src={formData.profileImage}
                  alt="Profile"
                  className="profile-avatar"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="profile-avatar-initials">
                  {formData.firstName ? formData.firstName.charAt(0).toUpperCase() : ''}
                  {formData.lastName ? formData.lastName.charAt(0).toUpperCase() : ''}
                  {!formData.firstName && !formData.lastName ? 'U' : ''}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                id="profileImageInput"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageUpload}
              />

              <button
                className="avatar-edit-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                title={uploadingImage ? 'Uploading...' : 'Change profile picture'}
              >
                {uploadingImage ? '⏳' : '📸'}
              </button>
            </div>

            <h2>{formData.firstName} {formData.lastName}</h2>
            <p className="profile-role">{formData.agencyName}</p>
          </div>

          <div className="profile-stats-grid">
            <div className="stat-box">
              <span className="stat-value">{getStats().totalProperties}</span>
              <span className="stat-label">Listed</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">{getStats().totalInquiries}</span>
              <span className="stat-label">Inquiries</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">{getStats().totalViews}</span>
              <span className="stat-label">Views</span>
            </div>
          </div>

          <div className="member-since">
            {(() => {
              if (!createdAt) {
                return formData.email ? 'Loading...' : 'Loading...';
              }
              try {
                const date = new Date(createdAt);
                const month = date.toLocaleString('default', { month: 'long' });
                const year = date.getFullYear();
                return `Member since ${month} ${year}`;
              } catch (e) {
                return formData.email ? `Member since ${new Date().getFullYear()}` : 'Loading...';
              }
            })()}
          </div>
        </div>

        {/* Right Section */}
        <div className="settings-content">

          <div className="settings-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="tab-content">

            {loading && !formData.email ? (
              <div className="settings-section" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  border: '4px solid #f3f3f3',
                  borderTop: '4px solid #3498db',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 20px'
                }}></div>
                <p>Loading profile data...</p>
              </div>
            ) : activeTab === 'personal' && (
              <div className="settings-section">
                <div className="section-header">
                  <h3>Personal Information</h3>
                  {!isEditing && (
                    <button className="edit-btn" onClick={() => setIsEditing(true)}>
                      Edit
                    </button>
                  )}
                </div>

                <div className="form-grid">

                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      readOnly
                      disabled
                      style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      readOnly
                      disabled
                      style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                    />
                  </div>

                  {/* ⭐ NEW LOCATION FIELD ⭐ */}
                  <div className="form-group">
                    <label>Location</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="City, State"
                    />
                  </div>

                </div>

                {isEditing && (
                  <div className="form-actions">
                    <button className="cancel-btn" onClick={() => setIsEditing(false)}>
                      Cancel
                    </button>
                    <button 
                      className="save-btn" 
                      onClick={handleSave}
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>
            )}

           
            {activeTab === 'business' && (
              <div className="settings-section">
                <div className="section-header">
                  <h3>Business Information</h3>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Agency/Company Name</label>
                    <input
                      type="text"
                      name="agencyName"
                      value={formData.agencyName}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Website</label>
                    <div className="input-with-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <input
                        type="text"
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <label>Business Address</label>
                    <div className="input-with-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <input
                        type="text"
                        name="agencyAddress"
                        value={formData.agencyAddress}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>GST Number (Optional)</label>
                    <input
                      type="text"
                      name="gstNumber"
                      value={formData.gstNumber}
                      onChange={handleChange}
                      placeholder="Enter GST number"
                    />
                  </div>

                  <div className="form-group">
                    <label>RERA Number (Optional)</label>
                    <input
                      type="text"
                      name="reraNumber"
                      value={formData.reraNumber}
                      onChange={handleChange}
                      placeholder="Enter RERA number"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button 
                    className="save-btn" 
                    onClick={handleSave}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentProfile;