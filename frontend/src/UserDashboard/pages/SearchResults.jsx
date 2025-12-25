import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import CompactSearchBar from '../components/CompactSearchBar';
import MapView from '../../components/Map/MapView';
import { propertiesAPI } from '../../services/api.service';
import '../styles/SearchResults.css';
import '../styles/CompactSearchBar.css'; 


const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const resultsHeaderRef = useRef(null);
  const propertyCardRefs = useRef({});

  // Detect mobile/tablet screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const hasActiveFilters = Object.values(activeFilters).some(value => value !== '');

  // Handle property card hover/selection - highlight on map
  const handlePropertyCardHover = useCallback((property) => {
    setSelectedPropertyId(property.id);
  }, []);

  // Handle map marker click - highlight property card
  const handleMapMarkerClick = useCallback((property) => {
    setSelectedPropertyId(property.id);
    // Scroll to property card
    if (propertyCardRefs.current[property.id]) {
      propertyCardRefs.current[property.id].scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, []);

  // Helper to validate coordinates
  const isValidCoordinate = useCallback((lat, lng) => {
    if (lat === null || lng === null || lat === undefined || lng === undefined) return false;
    const numLat = typeof lat === 'string' ? parseFloat(lat) : lat;
    const numLng = typeof lng === 'string' ? parseFloat(lng) : lng;
    if (isNaN(numLat) || isNaN(numLng)) return false;
    return numLat >= -90 && numLat <= 90 && numLng >= -180 && numLng <= 180;
  }, []);

  // Calculate map center from properties
  const calculateMapCenter = useCallback(() => {
    if (filteredProperties.length === 0) {
      return [73.8567, 18.5204]; // Default: Pune
    }

    const propertiesWithCoords = filteredProperties.filter(p => 
      isValidCoordinate(p.latitude, p.longitude)
    );
    
    if (propertiesWithCoords.length === 0) {
      return [73.8567, 18.5204]; // Default: Pune
    }

    const avgLng = propertiesWithCoords.reduce((sum, p) => {
      const lng = typeof p.longitude === 'string' ? parseFloat(p.longitude) : p.longitude;
      return sum + lng;
    }, 0) / propertiesWithCoords.length;
    
    const avgLat = propertiesWithCoords.reduce((sum, p) => {
      const lat = typeof p.latitude === 'string' ? parseFloat(p.latitude) : p.latitude;
      return sum + lat;
    }, 0) / propertiesWithCoords.length;
    
    return [avgLng, avgLat];
  }, [filteredProperties, isValidCoordinate]);

  // Convert properties to MapView format with proper validation
  const mapProperties = useMemo(() => {
    return filteredProperties
      .filter(p => isValidCoordinate(p.latitude, p.longitude))
      .map(property => {
        const lat = typeof property.latitude === 'string' ? parseFloat(property.latitude) : property.latitude;
        const lng = typeof property.longitude === 'string' ? parseFloat(property.longitude) : property.longitude;
        
        // Get image - handle various formats
        let thumbnail = null;
        let images = [];
        
        if (property.image) {
          thumbnail = property.image;
          images = [property.image];
        } else if (property.images && Array.isArray(property.images) && property.images.length > 0) {
          if (typeof property.images[0] === 'string') {
            thumbnail = property.images[0];
            images = property.images;
          } else if (property.images[0].url) {
            thumbnail = property.images[0].url;
            images = property.images.map(img => typeof img === 'string' ? img : img.url);
          }
        } else if (property.cover_image) {
          thumbnail = property.cover_image;
          images = [property.cover_image];
        }

        return {
          id: property.id,
          title: property.title || 'Untitled Property',
          location: property.location || 'Location not specified',
          price: typeof property.price === 'string' ? parseFloat(property.price) : (property.price || 0),
          area: typeof property.area === 'string' ? parseFloat(property.area) : (property.area || 0),
          bedrooms: property.bedrooms || '0',
          bathrooms: property.bathrooms || '0',
          listing_type: property.status === 'For Rent' ? 'rent' : 'sale',
          property_type: property.type || property.propertyType || 'Unknown',
          latitude: lat,
          longitude: lng,
          thumbnail: thumbnail,
          images: images,
          cover_image: thumbnail,
          seller_id: property.seller_id
        };
      });
  }, [filteredProperties, isValidCoordinate]);


  return (
    <div className="buyer-search-results-page">
      {/* Compact Search Bar */}
      <CompactSearchBar />

      {/* Main Split Layout */}
      <div className="search-results-split-layout">
        {/* Left Side - Scrollable Listings */}
        <div className="search-results-listings">
          {/* Results Header */}
          <div className="search-results-header" ref={resultsHeaderRef}>
            <div className="search-results-header-top">
              <h2 className="search-results-title">
                {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} found
              </h2>
              {/* Mobile Map Toggle */}
              {isMobile && (
                <button 
                  onClick={() => setShowMap(!showMap)} 
                  className="mobile-map-toggle"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  {showMap ? 'Hide Map' : 'Show Map'}
                </button>
              )}
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="search-results-filters">
                <span className="filters-label">Active Filters:</span>
                <div className="filter-tags">
                  {activeFilters.city && (
                    <div className="filter-tag">
                      <span>City: {activeFilters.city}</span>
                      <button onClick={() => removeFilter('city')} className="remove-filter">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}
                  {activeFilters.location && (
                    <div className="filter-tag">
                      <span>Location: {activeFilters.location}</span>
                      <button onClick={() => removeFilter('location')} className="remove-filter">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}
                  {activeFilters.type && (
                    <div className="filter-tag">
                      <span>Type: {activeFilters.type}</span>
                      <button onClick={() => removeFilter('type')} className="remove-filter">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}
                  {activeFilters.budget && (
                    <div className="filter-tag">
                      <span>Budget: {activeFilters.budget}</span>
                      <button onClick={() => removeFilter('budget')} className="remove-filter">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}
                  {activeFilters.bedrooms && (
                    <div className="filter-tag">
                      <span>Bedrooms: {activeFilters.bedrooms}</span>
                      <button onClick={() => removeFilter('bedrooms')} className="remove-filter">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}
                  {activeFilters.area && (
                    <div className="filter-tag">
                      <span>Area: {activeFilters.area}</span>
                      <button onClick={() => removeFilter('area')} className="remove-filter">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}
                  {activeFilters.status && (
                    <div className="filter-tag">
                      <span>Status: {activeFilters.status}</span>
                      <button onClick={() => removeFilter('status')} className="remove-filter">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}
                  <button onClick={clearAllFilters} className="clear-all-btn">
                    Clear All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results Content */}
          <div className="search-results-content">
            {loading ? (
              <div className="search-loading-results">
                <div className="search-loading-spinner"></div>
                <p>Searching properties...</p>
              </div>
            ) : filteredProperties.length > 0 ? (
              <div className="search-results-grid">
                {filteredProperties.map(property => (
                  <div 
                    key={property.id} 
                    ref={el => propertyCardRefs.current[property.id] = el}
                    className={`property-card-wrapper ${selectedPropertyId === property.id ? 'selected' : ''}`}
                    onMouseEnter={() => handlePropertyCardHover(property)}
                  >
                    <PropertyCard property={property} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="search-no-results">
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
                <div className="search-no-results-actions">
                  <button onClick={clearAllFilters} className="search-try-again-btn">
                    Clear Filters & Try Again
                  </button>
                  <button onClick={() => navigate('/buyer-dashboard')} className="search-go-home-btn">
                    Go to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Fixed Map (Desktop only) */}
        {!isMobile && (
          <div className="search-results-map">
            <MapView
              properties={mapProperties}
              center={calculateMapCenter()}
              zoom={mapProperties.length > 0 ? 12 : 5}
              showControls={true}
              interactive={true}
              currentPropertyId={selectedPropertyId}
              onPropertyClick={handleMapMarkerClick}
            />
          </div>
        )}
      </div>
      
      {/* Mobile: Show map as overlay when toggled */}
      {isMobile && showMap && (
        <div className="mobile-map-overlay" onClick={() => setShowMap(false)}>
          <div className="mobile-map-container" onClick={(e) => e.stopPropagation()}>
            <button 
              className="mobile-map-close"
              onClick={() => setShowMap(false)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <MapView
              properties={mapProperties}
              center={calculateMapCenter()}
              zoom={mapProperties.length > 0 ? 12 : 5}
              showControls={true}
              interactive={true}
              currentPropertyId={selectedPropertyId}
              onPropertyClick={handleMapMarkerClick}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResults;