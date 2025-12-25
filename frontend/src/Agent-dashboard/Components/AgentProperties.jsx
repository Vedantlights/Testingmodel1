// src/pages/AgentProperties.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProperty } from "./PropertyContext";
import AddPropertyPopup from "./AddPropertyPopup";
import "../styles/AgentProperties.css";

const MAX_PROPERTIES = 10;

const AgentProperties = () => {
  const navigate = useNavigate();
  const { properties, deleteProperty, loading, error, refreshData } = useProperty();
  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Filter and sort properties
  const filteredProperties = properties
    .filter(p => {
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           p.location.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'price-high':
          return parseFloat(b.price) - parseFloat(a.price);
        case 'price-low':
          return parseFloat(a.price) - parseFloat(b.price);
        default:
          return 0;
      }
    });

  const openNew = () => {
    if (properties.length >= MAX_PROPERTIES) {
      alert(`You can add maximum ${MAX_PROPERTIES} properties.`);
      return;
    }
    setEditIndex(null);
    setShowForm(true);
  };

  const openEdit = (idx) => {
    setEditIndex(idx);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Make sure you have deleted your property. Are you sure you want to delete this property?")) return;
    try {
      setDeletingId(id);
      await deleteProperty(id);
      // Data will be automatically refreshed by PropertyContext
    } catch (error) {
      console.error('Error deleting property:', error);
      alert(error.message || 'Failed to delete property. Please try again.');
    } finally {
      setDeletingId(null);
    }
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

  const getPropertyIndex = (propertyId) => {
    return properties.findIndex(p => p.id === propertyId);
  };

  const handleViewDetails = (propertyId) => {
    console.log('Navigating to property:', propertyId);
    // Use buyer's ViewDetailsPage route (same layout for all users)
    navigate(`/details/${propertyId}`);
  };

  // Get property features based on property type
  const getPropertyFeatures = (property) => {
    const features = [];
    const propertyType = property.propertyType || '';
    
    // Residential properties (Apartment, Flat, Villa, Independent House, Row House, Penthouse)
    if (['Apartment', 'Flat', 'Villa', 'Independent House', 'Row House', 'Penthouse', 'Farm House'].includes(propertyType)) {
      if (property.bedrooms) features.push({ label: `${property.bedrooms} Beds`, icon: 'bed' });
      if (property.bathrooms) features.push({ label: `${property.bathrooms} Baths`, icon: 'bath' });
      if (property.area) features.push({ label: `${property.area} sqft`, icon: 'area' });
      if (property.floor && property.totalFloors) features.push({ label: `Floor ${property.floor}/${property.totalFloors}`, icon: 'floor' });
      if (property.furnishing) features.push({ label: property.furnishing, icon: 'furnishing' });
      if (property.balconies) features.push({ label: `${property.balconies} Balconies`, icon: 'balcony' });
    }
    // Studio Apartment
    else if (propertyType === 'Studio Apartment') {
      if (property.bathrooms) features.push({ label: `${property.bathrooms} Baths`, icon: 'bath' });
      if (property.area) features.push({ label: `${property.area} sqft`, icon: 'area' });
      if (property.floor && property.totalFloors) features.push({ label: `Floor ${property.floor}/${property.totalFloors}`, icon: 'floor' });
      if (property.furnishing) features.push({ label: property.furnishing, icon: 'furnishing' });
      if (property.balconies) features.push({ label: `${property.balconies} Balconies`, icon: 'balcony' });
    }
    // Commercial Office
    else if (propertyType === 'Commercial Office') {
      if (property.area) features.push({ label: `${property.area} sqft`, icon: 'area' });
      if (property.floor && property.totalFloors) features.push({ label: `Floor ${property.floor}/${property.totalFloors}`, icon: 'floor' });
      if (property.furnishing) features.push({ label: property.furnishing, icon: 'furnishing' });
      if (property.bathrooms) features.push({ label: `${property.bathrooms} Baths`, icon: 'bath' });
    }
    // Commercial Shop
    else if (propertyType === 'Commercial Shop') {
      if (property.area) features.push({ label: `${property.area} sqft`, icon: 'area' });
      if (property.floor && property.totalFloors) features.push({ label: `Floor ${property.floor}/${property.totalFloors}`, icon: 'floor' });
      if (property.facing) features.push({ label: property.facing, icon: 'facing' });
    }
    // Plot / Land
    else if (propertyType === 'Plot / Land') {
      if (property.area) features.push({ label: `${property.area} sqft`, icon: 'area' });
      if (property.facing) features.push({ label: property.facing, icon: 'facing' });
    }
    // PG / Hostel
    else if (propertyType === 'PG / Hostel') {
      if (property.bedrooms) features.push({ label: `${property.bedrooms} Beds`, icon: 'bed' });
      if (property.bathrooms) features.push({ label: `${property.bathrooms} Baths`, icon: 'bath' });
      if (property.area) features.push({ label: `${property.area} sqft`, icon: 'area' });
      if (property.floor && property.totalFloors) features.push({ label: `Floor ${property.floor}/${property.totalFloors}`, icon: 'floor' });
    }
    // Default fallback
    else {
      if (property.bedrooms) features.push({ label: `${property.bedrooms} Beds`, icon: 'bed' });
      if (property.bathrooms) features.push({ label: `${property.bathrooms} Baths`, icon: 'bath' });
      if (property.area) features.push({ label: `${property.area} sqft`, icon: 'area' });
    }
    
    return features;
  };

  return (
    <div className="agent-properties">
      {/* Header */}
      <div className="properties-header">
        <div className="header-content">
          <div>
            <h1>My Properties</h1>
            <p className="subtitle">
              {loading ? 'Loading...' : `${properties.length} of ${MAX_PROPERTIES} properties listed`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {error && (
              <button 
                className="refresh-btn" 
                onClick={refreshData}
                title="Refresh data"
                style={{ 
                  padding: '8px 12px', 
                  background: '#f0f0f0', 
                  border: '1px solid #ddd', 
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                🔄 Refresh
              </button>
            )}
            <button className="add-btn" onClick={openNew}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Add Property
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
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

      {/* Loading State */}
      {loading && properties.length === 0 && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <h3>Loading Properties...</h3>
          <p>Please wait while we fetch your properties</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search properties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="toolbar-actions">
          <div className="filter-group">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="sale">For Sale</option>
              <option value="rent">For Rent</option>
            </select>

            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-high">Price: High to Low</option>
              <option value="price-low">Price: Low to High</option>
            </select>
          </div>

          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Properties Grid/List */}
      {filteredProperties.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
          <h3>No Properties Found</h3>
          <p>
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'Start by adding your first property listing'}
          </p>
          {!searchTerm && filterStatus === 'all' && (
            <button className="empty-action-btn" onClick={openNew}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Add Your First Property
            </button>
          )}
        </div>
      ) : (
        <div className={`properties-container ${viewMode}`}>
          {filteredProperties.map((property, index) => (
            <div 
              key={property.id} 
              className={`property-card ${viewMode}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="property-image">
                <img src={property.images?.[0]} alt={property.title} />
                <div className="image-overlay">
                  <button className="overlay-btn" onClick={() => openEdit(getPropertyIndex(property.id))}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                  <button 
                    className="overlay-btn delete" 
                    onClick={() => handleDelete(property.id)}
                    disabled={deletingId === property.id}
                    title={deletingId === property.id ? 'Deleting...' : 'Delete property'}
                  >
                    {deletingId === property.id ? (
                      <div style={{ 
                        width: '16px', 
                        height: '16px', 
                        border: '2px solid #fff',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.6s linear infinite',
                        display: 'inline-block'
                      }}></div>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    )}
                  </button>
                </div>
                <span className={`property-badge ${property.status}`}>
                  {property.status === 'sale' ? 'For Sale' : 'For Rent'}
                </span>
                {property.featured && (
                  <span className="featured-badge">Featured</span>
                )}
              </div>

              <div className="property-content">
                <h3 className="property-title">{property.title}</h3>
                <p className="property-location">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  {property.location}
                </p>

                <div className="property-feature">
                  {getPropertyFeatures(property).map((feat, idx) => (
                    <span key={idx} className="property-feature-item">
                      {feat.icon === 'bed' && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M3 22V8l9-6 9 6v14H3z" stroke="currentColor" strokeWidth="2"/>
                          <path d="M9 22v-6h6v6" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      )}
                      {feat.icon === 'bath' && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M4 12h16v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5z" stroke="currentColor" strokeWidth="2"/>
                          <path d="M6 12V5a2 2 0 012-2h2v9" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      )}
                      {feat.icon === 'area' && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                          <path d="M3 9h18M9 21V9" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      )}
                      {feat.icon === 'floor' && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2"/>
                          <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      )}
                      {feat.icon === 'furnishing' && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                          <path d="M3 9h18M9 21V9" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      )}
                      {feat.icon === 'balcony' && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2"/>
                          <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      )}
                      {feat.icon === 'facing' && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      )}
                      {feat.label}
                    </span>
                  ))}
                </div>

                <div className="property-stats">
                  <div className="stat-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    <span>{property.views || 0} views</span>
                  </div>
                  <div className="stat-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    <span>{property.inquiries || 0} inquiries</span>
                  </div>
                </div>

                <div className="property-footer">
                  <div className="price-section">
                    <span className="price">{formatPrice(property.price)}</span>
                    {property.status === 'rent' && <span className="per-month">/month</span>}
                  </div>
                  <div className="action-buttons">
                    <button 
                      className="view-details-btn" 
                      onClick={() => handleViewDetails(property.id)}
                      title="View Details"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      View
                    </button>
                    <button className="edit-btn" onClick={() => openEdit(getPropertyIndex(property.id))}>
                      Edit
                    </button>
                    <button 
                      className="delete-btn" 
                      onClick={() => handleDelete(property.id)}
                      disabled={deletingId === property.id}
                    >
                      {deletingId === property.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add Property Card */}
          {properties.length < MAX_PROPERTIES && viewMode === 'grid' && (
            <div className="property-card add-card" onClick={openNew}>
              <div className="add-card-content">
                <div className="add-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3>Add New Property</h3>
                <p>List a new property for sale or rent</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <AddPropertyPopup
          onClose={() => setShowForm(false)}
          editIndex={editIndex}
          initialData={editIndex !== null ? properties[editIndex] : null}
        />
      )}
    </div>
  );
};

export default AgentProperties;