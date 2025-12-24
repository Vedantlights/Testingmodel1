import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import { propertiesAPI } from '../../services/api.service';
import '../styles/SearchResults.css';
import '../styles/BuyerSearchBar.css';
import BuyerSearchBar from'../components/BuyerSearchBar'; 


const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const resultsHeaderRef = useRef(null);

  // Scroll to results section when search completes
  useEffect(() => {
    if (!loading && resultsHeaderRef.current) {
      // Small delay to ensure DOM is updated and results are rendered
      const timer = setTimeout(() => {
        resultsHeaderRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [loading, filteredProperties.length]);
  const [activeFilters, setActiveFilters] = useState({
    city: '',
    location: '',
    type: '',
    budget: '',
    bedrooms: '',
    area: '',
    status: ''
  });

  // Fetch properties from backend with filters
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        // Get search parameters from URL
        const city = searchParams.get('city') || '';
        const location = searchParams.get('location') || '';
        const type = searchParams.get('type') || searchParams.get('property_type') || '';
        const budget = searchParams.get('budget') || '';
        const bedrooms = searchParams.get('bedrooms') || '';
        const area = searchParams.get('area') || '';
        const status = searchParams.get('status') || '';
        
        // Build API parameters
        const apiParams = {
          limit: 100
        };
        
        // Pass city if available (backend uses city OR location, preferring location)
        if (city) apiParams.city = city;
        if (location) apiParams.location = location;
        if (type) apiParams.property_type = type;
        if (budget) apiParams.budget = budget;
        if (bedrooms) apiParams.bedrooms = bedrooms;
        if (area) apiParams.area = area;
        if (status) {
          // Convert "For Sale" / "For Rent" to "sale" / "rent"
          apiParams.status = status.toLowerCase().replace('for ', '');
        }
        
        console.log('🔍 Search parameters from URL:', { city, location, type, budget, bedrooms, area, status });
        console.log('📡 API params being sent:', apiParams);
        
        const response = await propertiesAPI.list(apiParams);
        
        console.log('✅ API response received:', response);
        console.log('📊 Response success:', response.success);
        console.log('📦 Response data:', response.data);
        
        if (response.success && response.data) {
          // Handle different response structures
          let properties = [];
          
          if (Array.isArray(response.data.properties)) {
            properties = response.data.properties;
          } else if (Array.isArray(response.data.property)) {
            properties = response.data.property;
          } else if (Array.isArray(response.data)) {
            properties = response.data;
          } else if (response.data.properties && typeof response.data.properties === 'object') {
            // If properties is an object, try to convert to array
            properties = Object.values(response.data.properties);
          }
          
          console.log(`📋 Found ${properties.length} properties`);
          
          if (Array.isArray(properties) && properties.length > 0) {
            // Convert backend properties to frontend format
            const backendProperties = properties.map(prop => {
              // Get the best image (cover_image or first image from array)
              let imageUrl = prop.cover_image || 
                            (Array.isArray(prop.images) && prop.images.length > 0 ? prop.images[0] : null) ||
                            'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500';
              
              return {
                id: prop.id,
                image: imageUrl,
                title: prop.title || 'Untitled Property',
                price: parseFloat(prop.price) || 0,
                location: prop.location || 'Location not specified',
                bedrooms: prop.bedrooms || '0',
                bathrooms: prop.bathrooms || '0',
                area: parseFloat(prop.area) || 0,
                type: prop.property_type || prop.type || 'Unknown',
                status: prop.status === 'sale' ? 'For Sale' : (prop.status === 'rent' ? 'For Rent' : prop.status || 'For Sale'),
                propertyType: prop.property_type || prop.type || 'Unknown',
                description: prop.description || '',
                amenities: Array.isArray(prop.amenities) ? prop.amenities : (prop.amenities ? [prop.amenities] : []),
                images: Array.isArray(prop.images) ? prop.images : (prop.images ? [prop.images] : []),
                latitude: prop.latitude,
                longitude: prop.longitude,
                createdAt: prop.created_at,
                seller_name: prop.seller_name,
                seller_phone: prop.seller_phone
              };
            });
            
            console.log(`✅ Setting ${backendProperties.length} properties to state`);
            setFilteredProperties(backendProperties);
          } else {
            console.log('⚠️ No properties found in response array');
            setFilteredProperties([]);
          }
        } else {
          console.warn('⚠️ API response not successful:', response);
          setFilteredProperties([]);
        }
      } catch (error) {
        console.error('❌ Error fetching properties:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          errors: error.errors
        });
        
        // On error, try to fetch all properties as fallback
        try {
          console.log('🔄 Attempting fallback: fetching all properties');
          const fallbackResponse = await propertiesAPI.list({ limit: 100 });
          if (fallbackResponse.success && fallbackResponse.data) {
            const fallbackProperties = fallbackResponse.data.properties || fallbackResponse.data.property || [];
            if (Array.isArray(fallbackProperties) && fallbackProperties.length > 0) {
              const convertedProperties = fallbackProperties.map(prop => ({
                id: prop.id,
                image: prop.cover_image || (Array.isArray(prop.images) && prop.images[0]) || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500',
                title: prop.title || 'Untitled Property',
                price: parseFloat(prop.price) || 0,
                location: prop.location || 'Location not specified',
                bedrooms: prop.bedrooms || '0',
                bathrooms: prop.bathrooms || '0',
                area: parseFloat(prop.area) || 0,
                type: prop.property_type || prop.type || 'Unknown',
                status: prop.status === 'sale' ? 'For Sale' : (prop.status === 'rent' ? 'For Rent' : prop.status || 'For Sale'),
                propertyType: prop.property_type || prop.type || 'Unknown',
                description: prop.description || '',
                amenities: Array.isArray(prop.amenities) ? prop.amenities : [],
                images: Array.isArray(prop.images) ? prop.images : [],
                latitude: prop.latitude,
                longitude: prop.longitude,
                createdAt: prop.created_at,
                seller_name: prop.seller_name,
                seller_phone: prop.seller_phone
              }));
              console.log(`✅ Fallback: Setting ${convertedProperties.length} properties`);
              setFilteredProperties(convertedProperties);
            } else {
              setFilteredProperties([]);
            }
          } else {
            setFilteredProperties([]);
          }
        } catch (fallbackError) {
          console.error('❌ Fallback fetch also failed:', fallbackError);
          setFilteredProperties([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [searchParams]);

  const isInBudgetRange = (price, budgetRange, status) => {
    const ranges = {
      '0-25L': { min: 0, max: 2500000 },
      '25L-50L': { min: 2500000, max: 5000000 },
      '50L-75L': { min: 5000000, max: 7500000 },
      '75L-1Cr': { min: 7500000, max: 10000000 },
      '1Cr-2Cr': { min: 10000000, max: 20000000 },
      '2Cr+': { min: 20000000, max: Infinity }
    };

    const range = ranges[budgetRange];
    if (!range) return true;

    const comparePrice = status === 'For Rent' ? price * 12 : price;
    
    return comparePrice >= range.min && comparePrice <= range.max;
  };

  const filterProperties = useCallback((location, type, budget, bedrooms, area, status, properties) => {
    let results = [...(properties || [])];

    // Filter by status (For Sale / For Rent)
    if (status) {
      results = results.filter(property => 
        property.status === status
      );
    }

    // Filter by location (case-insensitive, partial match)
    if (location) {
      results = results.filter(property => 
        property.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    // Filter by property type (handles compound types like "Villa / Row House / Bungalow / Farm House")
    if (type) {
      // Split compound types by " / " to get individual types
      const typesToMatch = type.split(' / ').map(t => t.trim().toLowerCase());
      
      results = results.filter(property => {
        const propertyType = property.type.toLowerCase().trim();
        // Check if property type matches ANY of the types in the selection
        return typesToMatch.some(t => 
          propertyType === t || propertyType.includes(t) || t.includes(propertyType)
        );
      });
    }

    // Filter by budget range
    if (budget) {
      results = results.filter(property => {
        const price = property.price;
        return isInBudgetRange(price, budget, property.status);
      });
    }

    // Filter by bedrooms (handle BHK format like "1 BHK", "2 BHK")
    if (bedrooms) {
      const bedroomStr = bedrooms.toString();
      const bedroomCount = bedroomStr.includes('+') ? 5 : parseInt(bedroomStr.replace(/\D/g, ''));
      results = results.filter(property => {
        const propBedrooms = typeof property.bedrooms === 'string' 
          ? parseInt(property.bedrooms.replace(/\D/g, '')) 
          : property.bedrooms;
        if (bedroomStr.includes('+')) {
          return propBedrooms >= bedroomCount;
        }
        return propBedrooms === bedroomCount;
      });
    }

    // Filter by area (if provided)
    if (area) {
      // Parse area range like "0-500 sq ft"
      const areaMatch = area.match(/(\d+)-(\d+)/);
      if (areaMatch) {
        const minArea = parseInt(areaMatch[1]);
        const maxArea = parseInt(areaMatch[2]);
        results = results.filter(property => {
          const propArea = typeof property.area === 'string' 
            ? parseFloat(property.area) 
            : property.area;
          return propArea >= minArea && propArea <= maxArea;
        });
      } else if (area.includes('+')) {
        // Handle "10000+ sq ft"
        const minArea = parseInt(area.replace(/\D/g, ''));
        results = results.filter(property => {
          const propArea = typeof property.area === 'string' 
            ? parseFloat(property.area) 
            : property.area;
          return propArea >= minArea;
        });
      }
    }

    return results;
  }, []);

  // Update active filters when search params change
  useEffect(() => {
    const city = searchParams.get('city') || '';
    const location = searchParams.get('location') || '';
    const type = searchParams.get('type') || searchParams.get('property_type') || '';
    const budget = searchParams.get('budget') || '';
    const bedrooms = searchParams.get('bedrooms') || '';
    const area = searchParams.get('area') || '';
    const status = searchParams.get('status') || '';

    setActiveFilters({ city, location, type, budget, bedrooms, area, status });
    
    // Filtering is now done by backend, but keep client-side as fallback
    // The main fetchProperties effect handles the filtering
  }, [searchParams]);

  
  const clearAllFilters = () => {
    navigate('/searchresults');
    setActiveFilters({ city: '', location: '', type: '', budget: '', bedrooms: '', area: '', status: '' });
  };

  const removeFilter = (filterName) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(filterName);
    // Also remove property_type if removing type filter
    if (filterName === 'type') {
      newParams.delete('property_type');
    }
    navigate(`/searchresults?${newParams.toString()}`);
  };
  
  const handleGoBack = () => {
    navigate(-1);
  };

  const hasActiveFilters = Object.values(activeFilters).some(value => value !== '');

  return (
    <div className="buyer-search-results-page">
      {/* ========== SEARCH BAR WITH BACK BUTTON - START ========== */}
      <div className="buyer-search-results-banner" 
            style={{ backgroundImage: 'url(/Home.jpg)' }}>
        <div className="buyer-search-bar-wrapper">
          {/* Back Button */}
          <button onClick={handleGoBack} className="buyer-search-back-button">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5"></path>
              <path d="M12 19l-7-7 7-7"></path>
            </svg>
          </button>

          <BuyerSearchBar />
        </div>
      </div>
      {/* ========== SEARCH BAR WITH BACK BUTTON - END ========== */}

      {/* Results Header */}
      <div className="buyer-results-header" ref={resultsHeaderRef}>
        <div className="buyer-results-header-content">
          <h1 className="buyer-results-title">Search Results</h1>
          <p className="buyer-results-count">
            {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} found
          </p>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="buyer-active-filters">
            <span className="buyer-filters-label">Active Filters:</span>
            <div className="buyer-filter-tags">
              {activeFilters.city && (
                <div className="buyer-filter-tag">
                  <span>City: {activeFilters.city}</span>
                  <button onClick={() => removeFilter('city')} className="buyer-remove-filter">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              )}
              {activeFilters.location && (
                <div className="buyer-filter-tag">
                  <span>Location: {activeFilters.location}</span>
                  <button onClick={() => removeFilter('location')} className="buyer-remove-filter">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              )}
              {activeFilters.type && (
                <div className="buyer-filter-tag">
                  <span>Type: {activeFilters.type}</span>
                  <button onClick={() => removeFilter('type')} className="buyer-remove-filter">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              )}
              {activeFilters.budget && (
                <div className="buyer-filter-tag">
                  <span>Budget: {activeFilters.budget}</span>
                  <button onClick={() => removeFilter('budget')} className="buyer-remove-filter">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              )}
              {activeFilters.bedrooms && (
                <div className="buyer-filter-tag">
                  <span>Bedrooms: {activeFilters.bedrooms}</span>
                  <button onClick={() => removeFilter('bedrooms')} className="buyer-remove-filter">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              )}
              {activeFilters.area && (
                <div className="buyer-filter-tag">
                  <span>Area: {activeFilters.area}</span>
                  <button onClick={() => removeFilter('area')} className="buyer-remove-filter">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              )}
              {activeFilters.status && (
                <div className="buyer-filter-tag">
                  <span>Status: {activeFilters.status}</span>
                  <button onClick={() => removeFilter('status')} className="buyer-remove-filter">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              )}
              <button onClick={clearAllFilters} className="buyer-clear-all-btn">
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Content */}
      <div className="buyer-results-content">
        {loading ? (
          <div className="buyer-loading-results">
            <div className="buyer-loading-spinner"></div>
            <p>Searching properties...</p>
          </div>
        ) : filteredProperties.length > 0 ? (
          <div className="buyer-results-grid">
            {filteredProperties.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="buyer-no-results">
            <svg 
              width="100" 
              height="100" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#cbd5e0" 
              strokeWidth="1.5"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <h3>No Properties Found</h3>
            <p>We couldn't find any properties matching your search criteria.</p>
            <div className="buyer-no-results-actions">
              <button onClick={clearAllFilters} className="buyer-try-again-btn">
                Clear Filters & Try Again
              </button>
              <button onClick={() => navigate('/buyer-dashboard')} className="buyer-go-home-btn">
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;