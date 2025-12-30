// src/pages/AgentOverview.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProperty } from "./PropertyContext";
import { authAPI, sellerDashboardAPI } from "../../services/api.service";
import { API_BASE_URL } from "../../config/api.config";
import AddPropertyPopup from "./AddPropertyPopup";
import AddUpcomingProjectPopup from "./AddUpcomingProjectPopup";
import "../styles/AgentOverview.css";

const MAX_PROPERTIES = 10;

const AgentOverview = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { 
    properties, 
    inquiries, 
    getStats, 
    loading, 
    error, 
    inquiriesLoading, 
    inquiriesError,
    refreshData 
  } = useProperty();
  const [showPopup, setShowPopup] = useState(false);
  const [showUpcomingProjectPopup, setShowUpcomingProjectPopup] = useState(false);
  const [userName, setUserName] = useState('');
  const [viewsPercentageChange, setViewsPercentageChange] = useState(0);

  useEffect(() => {
    const user = authAPI.getUser();
    if (user && user.full_name) {
      const nameParts = user.full_name.split(' ');
      setUserName(nameParts[0] || 'User');
    } else {
      setUserName('User');
    }
  }, []);

  // Fetch dashboard stats to get views percentage change
  useEffect(() => {
    const fetchViewsPercentage = async () => {
      try {
        const response = await sellerDashboardAPI.getStats();
        if (response.success && response.data && response.data.views_percentage_change !== undefined) {
          setViewsPercentageChange(response.data.views_percentage_change);
        }
      } catch (error) {
        console.error('Error fetching views percentage:', error);
        // Keep default 0 if error
      }
    };
    
    fetchViewsPercentage();
    // Refresh every 5 minutes
    const interval = setInterval(fetchViewsPercentage, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const stats = getStats();

  const handleAddProperty = () => {
    if (properties.length >= MAX_PROPERTIES) {
      alert(`You can add maximum ${MAX_PROPERTIES} properties.`);
      return;
    }
    setShowPopup(true);
  };

  const handleAddUpcomingProject = () => {
    if (properties.length >= MAX_PROPERTIES) {
      alert(`You can add maximum ${MAX_PROPERTIES} properties.`);
      return;
    }
    setShowUpcomingProjectPopup(true);
  };

  const formatPrice = (price) => {
    const num = parseFloat(price);
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    } else if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} Lac`;
    } else if (num >= 1000) {
      return `₹${(num / 1000).toFixed(1)}K`;
    }
    return `₹${num}`;
  };

  const formatNumber = (num) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num;
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const recentInquiries = inquiries
    .filter(i => i.status === 'new')
    .slice(0, 4);

  return (
    <div className="agent-overview">
      {/* Welcome Header */}
      <div className="overview-header">
        <div className="header-content">
          <div className="greeting-section">
            <h1>Welcome back, {userName}! 👋</h1>
            <p className="subtitle">
              {loading ? 'Loading dashboard...' : "Here's what's happening with your properties today"}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {(error || inquiriesError) && (
              <button 
                onClick={refreshData}
                title="Refresh data"
                style={{ 
                  padding: '8px 12px', 
                  background: '#f0f0f0', 
                  border: '1px solid #ddd', 
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🔄 Refresh
              </button>
            )}
            <button className="add-property-header-btn" onClick={handleAddProperty}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Add New Property</span>
            </button>
            <button className="add-property-header-btn" onClick={handleAddUpcomingProject}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Add Upcoming Project</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {error && (
        <div style={{ 
          margin: '16px', 
          padding: '12px', 
          background: '#fee', 
          border: '1px solid #fcc', 
          borderRadius: '6px',
          color: '#c33'
        }}>
          ⚠️ {error}
        </div>
      )}
      {inquiriesError && (
        <div style={{ 
          margin: '16px', 
          padding: '12px', 
          background: '#fee', 
          border: '1px solid #fcc', 
          borderRadius: '6px',
          color: '#c33'
        }}>
          ⚠️ Inquiries: {inquiriesError}
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon-wrapper">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2"/>
              <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Properties</span>
            <div className="stat-value-row">
              <span className="stat-value">{stats.totalProperties}</span>
              <span className="stat-badge success">Active</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Views</span>
            <div className="stat-value-row">
              <span className="stat-value">{formatNumber(stats.totalViews)}</span>
              {viewsPercentageChange !== 0 && (
                <span className={`stat-change ${viewsPercentageChange >= 0 ? 'positive' : 'negative'}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    {viewsPercentageChange >= 0 ? (
                      <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    ) : (
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    )}
                  </svg>
                  {Math.abs(viewsPercentageChange)}%
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Inquiries</span>
            <div className="stat-value-row">
              <span className="stat-value">{stats.totalInquiries}</span>
              {stats.newInquiries > 0 && (
                <span className="stat-badge warning">{stats.newInquiries} New</span>
              )}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Listing Status</span>
            <div className="status-pills">
              <span className="status-pill sale">{stats.forSale} Sale</span>
              <span className="status-pill rent">{stats.forRent} Rent</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions-grid">
          <button className="quick-action-card" onClick={handleAddProperty}>
            <div className="action-icon add">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="action-title">Add New Property</span>
            <span className="action-desc">List a new property for sale or rent</span>
          </button>

          <button className="quick-action-card" onClick={() => onNavigate && onNavigate('properties')}>
            <div className="action-icon manage">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="action-title">Manage Properties</span>
            <span className="action-desc">Edit, update or remove listings</span>
          </button>

          <button className="quick-action-card" onClick={() => onNavigate && onNavigate('inquiries')}>
            <div className="action-icon inquiries">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="action-title">View Inquiries</span>
            <span className="action-desc">Respond to buyer inquiries</span>
          </button>

          <button className="quick-action-card" onClick={() => onNavigate && onNavigate('profile')}>
            <div className="action-icon profile">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="action-title">Update Profile</span>
            <span className="action-desc">Manage your account settings</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="overview-content-grid">
        {/* Recent Properties */}
        <div className="recent-properties-section">
          <div className="section-header">
            <h2 className="section-title">Your Properties</h2>
            <button className="view-all-btn" onClick={() => onNavigate && onNavigate('properties')}>
              View All
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="properties-list">
            {loading && properties.length === 0 ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <h3>Loading Properties...</h3>
                <p>Please wait while we fetch your properties</p>
              </div>
            ) : properties.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <h3>No Properties Listed</h3>
                <p>Start by adding your first property</p>
                <button className="empty-action-btn" onClick={handleAddProperty}>
                  Add Property
                </button>
              </div>
            ) : (
              properties.slice(0, 3).map((property, index) => (
                <div 
                  className="property-list-item" 
                  key={property.id}
                  style={{ animationDelay: `${index * 0.1}s`, cursor: 'pointer' }}
                  onClick={() => window.open(`/agent-dashboard/details/${property.id}`, '_blank', 'noopener,noreferrer')}
                >
                  <div className="property-thumbnail">
                    <img 
                      src={(() => {
                        // Prioritize display_image, then first image, then cover_image
                        const imageUrl = property.display_image 
                          || property.images?.[0] 
                          || property.cover_image;
                        if (!imageUrl) return 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500';
                        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                          return imageUrl;
                        }
                        if (imageUrl.startsWith('/')) {
                          return `${API_BASE_URL.replace('/api', '')}${imageUrl}`;
                        }
                        return `${API_BASE_URL.replace('/api', '')}/uploads/${imageUrl}`;
                      })()} 
                      alt={property.title} 
                      onError={(e) => {
                        console.error('Image load failed for property:', property.id, 'URL:', e.target.src);
                        e.target.src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500';
                      }}
                    />
                    <span className={`property-badge ${property.status}`}>
                      {property.status === 'sale' ? 'For Sale' : 'For Rent'}
                    </span>
                  </div>
                  <div className="property-info">
                    <h4 className="property-title">{property.title}</h4>
                    <p className="property-location">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      {property.location}
                    </p>
                    <div className="property-stats">
                      <span className="stat-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        {property.views || 0}
                      </span>
                      <span className="stat-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        {property.inquiries || 0}
                      </span>
                    </div>
                  </div>
                  <div className="property-price">
                    <span className="price">{formatPrice(property.price)}</span>
                    {property.status === 'rent' && <span className="per-month">/month</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Inquiries */}
        <div className="recent-inquiries-section">
          <div className="section-header">
            <h2 className="section-title">
              Recent Inquiries
              {stats.newInquiries > 0 && (
                <span className="title-badge">{stats.newInquiries}</span>
              )}
            </h2>
            <button className="view-all-btn" onClick={() => onNavigate && onNavigate('inquiries')}>
              View All
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="inquiries-list">
            {inquiriesLoading && inquiries.length === 0 ? (
              <div className="empty-state small" style={{ padding: '30px 20px' }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  border: '3px solid #f3f3f3',
                  borderTop: '3px solid #3498db',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 10px'
                }}></div>
                <p>Loading inquiries...</p>
              </div>
            ) : recentInquiries.length === 0 ? (
              <div className="empty-state small">
                <p>No new inquiries</p>
              </div>
            ) : (
              recentInquiries.map((inquiry, index) => (
                <div 
                  className="inquiry-item" 
                  key={inquiry.id}
                  style={{ animationDelay: `${index * 0.1}s`, cursor: 'pointer' }}
                  onClick={() => {
                    // Navigate to inquiries page with inquiry ID as query parameter
                    navigate(`/agent-dashboard/inquiries?inquiryId=${inquiry.id}`);
                  }}
                >
                  <div className="inquiry-avatar">{inquiry.avatar}</div>
                  <div className="inquiry-content">
                    <div className="inquiry-header">
                      <span className="inquiry-name">{inquiry.buyerName}</span>
                      <span className="inquiry-time">{getTimeAgo(inquiry.createdAt)}</span>
                    </div>
                    <p className="inquiry-property">{inquiry.propertyTitle}</p>
                    <p className="inquiry-message">{inquiry.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Property Popup */}
      {showPopup && <AddPropertyPopup onClose={() => setShowPopup(false)} />}
      
      {/* Add Upcoming Project Popup */}
      {showUpcomingProjectPopup && <AddUpcomingProjectPopup onClose={() => setShowUpcomingProjectPopup(false)} />}
    </div>
  );
};

export default AgentOverview;