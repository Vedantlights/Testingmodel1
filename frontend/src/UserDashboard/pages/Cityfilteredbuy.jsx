import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import LocationAutoSuggest from '../../components/LocationAutoSuggest';
import { propertiesAPI } from '../../services/api.service';
import '../styles/Filteredproperties.css';
import '../styles/BuyerSearchBar.css';
import './BuyerHome'

const CityFilteredBuy = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cityParam = searchParams.get('city');
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [isMobile, setIsMobile] = useState(false);

  // SearchBar state
  const [searchData, setSearchData] = useState({
    location: '',
    propertyType: '',
    budget: '',
    bedrooms: '',
    area: ''
  });

  const [selectedLocation, setSelectedLocation] = useState(null);

  const propertyTypes = [
    'Apartment',
    'Studio Apartment',
    'Villa / Row House / Bungalow / Farm House',
    'Penthouse',
    'Plot / Land / Industrial Property',
    'Commercial Office',
    'Commercial Shop',
    'Co-working Space',
    'Warehouse / Godown',
    'PG / Hostel'
  ];

  // Property types that use bedrooms
  const bedroomBasedTypes = [
    'Apartment',
    'Studio Apartment',
    'Villa / Row House / Bungalow / Farm House',
    'Penthouse',
    'PG / Hostel'
  ];
  
  // Property types that use area
  const areaBasedTypes = [
    'Plot / Land / Industrial Property',
    'Commercial Office',
    'Commercial Shop',
    'Co-working Space',
    'Warehouse / Godown'
  ];
  
  const bedroomOptions = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK'];
  
  // Area ranges in sq ft
  const areaRanges = [
    '0-500 sq ft',
    '500-1000 sq ft',
    '1000-2000 sq ft',
    '2000-5000 sq ft',
    '5000-10000 sq ft',
    '10000+ sq ft'
  ];
  
  // Budget ranges for Sale (Residential) - BUY PAGE
  const saleResidentialBudget = [
    '0-25L',
    '25L-50L',
    '50L-75L',
    '75L-1Cr',
    '1Cr-2Cr',
    '2Cr-5Cr',
    '5Cr+'
  ];
  
  // Budget ranges for Land/Commercial (Sale) - BUY PAGE
  const commercialBudget = [
    '0-50L',
    '50L-1Cr',
    '1Cr-2Cr',
    '2Cr-5Cr',
    '5Cr-10Cr',
    '10Cr-25Cr',
    '25Cr+'
  ];
  
  // Determine if property type is bedroom-based or area-based
  const isBedroomBased = useMemo(() => {
    return bedroomBasedTypes.includes(searchData.propertyType);
  }, [searchData.propertyType]);
  
  const isAreaBased = useMemo(() => {
    return areaBasedTypes.includes(searchData.propertyType);
  }, [searchData.propertyType]);
  
  // Get appropriate budget ranges based on property type (FOR BUY/SALE)
  const getBudgetRanges = () => {
    if (!searchData.propertyType) {
      return saleResidentialBudget; // Default
    }
    
    // Map each property type to its appropriate budget range for BUY
    const propertyBudgetMap = {
      // Residential - Sale ranges (higher budgets)
      'Apartment': saleResidentialBudget,
      'Studio Apartment': saleResidentialBudget,
      'Villa / Row House / Bungalow / Farm House': saleResidentialBudget,
      'Penthouse': saleResidentialBudget,
      'PG / Hostel': saleResidentialBudget, // Even PG can be bought
      
      // Commercial/Industrial - Sale ranges (very high budgets)
      'Plot / Land / Industrial Property': commercialBudget,
      'Commercial Office': commercialBudget,
      'Commercial Shop': commercialBudget,
      'Co-working Space': commercialBudget,
      'Warehouse / Godown': commercialBudget,
    };
    
    return propertyBudgetMap[searchData.propertyType] || saleResidentialBudget;
  };
  
  const budgetRanges = useMemo(() => getBudgetRanges(), [searchData.propertyType]);

  const topCities = [
    'Mumbai',
    'Delhi',
    'Bangalore',
    'Hyderabad',
    'Ahmedabad',
    'Chennai',
    'Kolkata',
    'Pune',
    'Jaipur',
    'Surat'
  ];

 // Top cities data for projects
  const projectCities = [
    { name: "Mumbai", icon: "🏙️" },
    { name: "Delhi", icon: "🏛️" },
    { name: "Bangalore", icon: "🌆" },
    { name: "Hyderabad", icon: "🏢" },
    { name: "Chennai", icon: "🌴" },
    { name: "Pune", icon: "🎓" },
    { name: "Kolkata", icon: "🎭" },
    { name: "Ahmedabad", icon: "🕌" },
  ];

  const handleProjectsClick = (city) => {
    navigate(`/projects?city=${city}`);
  };

  // SearchBar handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // When property type changes, reset bedrooms/area and budget
    if (name === 'propertyType') {
      setSearchData(prev => ({
        ...prev,
        [name]: value,
        bedrooms: '',
        area: '',
        budget: ''
      }));
    } else {
      setSearchData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSearch = (e) => {
    if (e) {
      e.preventDefault();
    }
    
    // Build query string
    const queryParams = new URLSearchParams();
    const loc = selectedLocation;

    if (loc && loc.city) {
      queryParams.append('city', loc.city);
    }
    if (loc && loc.placeName) {
      queryParams.append('location', loc.placeName);
    } else if (searchData.location) {
      queryParams.append('location', searchData.location);
    }

    if (loc && loc.coordinates && loc.coordinates.lat && loc.coordinates.lng) {
      queryParams.append('lat', String(loc.coordinates.lat));
      queryParams.append('lng', String(loc.coordinates.lng));
      queryParams.append('radius', '10');
    }

    if (searchData.propertyType) {
      queryParams.append('type', searchData.propertyType);
    }
    if (searchData.budget) {
      queryParams.append('budget', searchData.budget);
    }
    
    // Add bedrooms or area based on property type
    if (isBedroomBased && searchData.bedrooms) {
      queryParams.append('bedrooms', searchData.bedrooms);
    } else if (isAreaBased && searchData.area) {
      queryParams.append('area', searchData.area);
    }
    
    // FIXED: Add status parameter to show only "For Sale" properties
    queryParams.append('status', 'For Sale');
    
    // Navigate to search results page
    navigate(`/searchresults?${queryParams.toString()}`);
  };

  const handleQuickSearch = (city) => {
    navigate(`/searchresults?location=${city}&status=For Sale`);
  };


  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const apiParams = {
          status: 'sale',
          limit: 100
        };
        
        if (cityParam) {
          apiParams.location = cityParam;
        }
        
        const response = await propertiesAPI.list(apiParams);
        
        if (response.success && response.data && response.data.properties) {
          // Convert backend properties to frontend format and filter only 'sale' properties
          // Exclude upcoming projects - they should only appear in Upcoming Projects section
          const backendProperties = response.data.properties
            .filter(prop => {
              // Only include sale properties and exclude upcoming projects
              const isSale = prop.status === 'sale' || prop.status === 'For Sale';
              const isNotUpcoming = !prop.project_type || prop.project_type !== 'upcoming';
              return isSale && isNotUpcoming;
            })
            .map(prop => {
              let imageUrl = null;
              if (prop.cover_image && prop.cover_image.trim() !== '') {
                imageUrl = prop.cover_image;
              } else if (Array.isArray(prop.images) && prop.images.length > 0) {
                const validImage = prop.images.find(img => img && img.trim() !== '');
                imageUrl = validImage || null;
              }
              if (!imageUrl || imageUrl.trim() === '') {
                imageUrl = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500';
              }
              
              return {
                id: prop.id,
                image: imageUrl,
                title: prop.title,
                price: parseFloat(prop.price),
                location: prop.location,
                bedrooms: prop.bedrooms || '0',
                bathrooms: prop.bathrooms || '0',
                area: parseFloat(prop.area),
                type: prop.property_type,
                status: 'For Sale', // Always set to 'For Sale' for this page
                propertyType: prop.property_type,
                projectType: prop.project_type || null, // Include project_type for reference
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
          
          setFilteredProperties(backendProperties);
        } else {
          setFilteredProperties([]);
        }
      } catch (error) {
        console.error('Error fetching properties:', error);
        setFilteredProperties([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [cityParam]);

  // Toggle between grid and list view
  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  };

  return (
    <div className="buyer-filtered-properties-page">
      {/* ========== SEARCH BAR WITH BACK BUTTON - START ========== */}
      <div className="buyer-buy-search-bar-banner" 
            style={{ backgroundImage: 'url(/buy.jpg)' }}>
        <div className="buyer-search-bar-wrapper">
          <h2 className="buyer-search-title">Discover Properties Ready to Buy</h2>
          <p className="buyer-search-subtitle">Search from thousands of verified properties across India</p>
          
          <form className="buyer-search-form" onSubmit={handleSearch}>
            <div className="buyer-search-inputs">
              {/* Location Input */}
              <div className="buyer-search-field">
                <label htmlFor="location" className="buyer-search-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Location
                </label>
                <LocationAutoSuggest
                  placeholder="City / Locality"
                  value={searchData.location}
                  onChange={(locationData) => {
                    if (!locationData) {
                      setSelectedLocation(null);
                      setSearchData(prev => ({ ...prev, location: '' }));
                      return;
                    }
                    setSelectedLocation(locationData);
                    setSearchData(prev => ({
                      ...prev,
                      location: locationData.fullAddress || locationData.placeName || ''
                    }));
                  }}
                  onSearch={(locationData) => {
                    if (locationData) {
                      setSelectedLocation(locationData);
                      setSearchData(prev => ({
                        ...prev,
                        location: locationData.fullAddress || locationData.placeName || ''
                      }));
                    }
                    handleSearch();
                  }}
                  className="buyer-search-input"
                />
              </div>

              {/* Property Type */}
              <div className="buyer-search-field">
                <label htmlFor="propertyType" className="buyer-search-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                  </svg>
                  Property Type
                </label>
                <select
                  id="propertyType"
                  name="propertyType"
                  value={searchData.propertyType}
                  onChange={handleInputChange}
                  className="buyer-search-select"
                >
                  <option value="">All Types</option>
                  {propertyTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Budget Range */}
              <div className="buyer-search-field">
                <label htmlFor="budget" className="buyer-search-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Budget
                </label>
                <select
                  id="budget"
                  name="budget"
                  value={searchData.budget}
                  onChange={handleInputChange}
                  className="buyer-search-select"
                >
                  <option value="">Any Budget</option>
                  {budgetRanges.map(range => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>

              {/* Bedrooms / Area - Dynamic based on property type */}
              <div className="buyer-search-field">
                {isBedroomBased ? (
                  <>
                    <label htmlFor="bedrooms" className="buyer-search-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                      </svg>
                      Bedrooms
                    </label>
                    <select
                      id="bedrooms"
                      name="bedrooms"
                      value={searchData.bedrooms}
                      onChange={handleInputChange}
                      className="buyer-search-select"
                    >
                      <option value="">Any</option>
                      {bedroomOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </>
                ) : isAreaBased ? (
                  <>
                    <label htmlFor="area" className="buyer-search-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                      </svg>
                      Area
                    </label>
                    <select
                      id="area"
                      name="area"
                      value={searchData.area}
                      onChange={handleInputChange}
                      className="buyer-search-select"
                    >
                      <option value="">Any Area</option>
                      {areaRanges.map(range => (
                        <option key={range} value={range}>{range}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    <label htmlFor="bedrooms" className="buyer-search-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                      </svg>
                      Bedroom / Area
                    </label>
                    <select
                      id="bedrooms"
                      name="bedrooms"
                      value={searchData.bedrooms}
                      onChange={handleInputChange}
                      className="buyer-search-select"
                      disabled
                    >
                      <option value="">Select Property Type</option>
                    </select>
                  </>
                )}
              </div>
            </div>

            {/* Search Button */}
            <button type="submit" className="buyer-search-button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <span>Search Properties</span>
            </button>
          </form>

          {/* Quick Search Cities */}
          <div className="buyer-quick-search">
            <span className="buyer-quick-search-label">Popular Cities:</span>
            <div className="buyer-quick-search-buttons">
              {topCities.map(city => (
                <button
                  key={city}
                  type="button"
                  onClick={() => handleQuickSearch(city)}
                  className="buyer-quick-search-btn"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* ========== SEARCH BAR WITH BACK BUTTON - END ========== */}

      <div className="buyer-filtered-header">
        <h1>
          {cityParam ? `Properties for Sale in ${cityParam}` : 'All Properties for Sale'}
        </h1>
        <p className="buyer-filtered-count">
          {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} found
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading properties...</p>
        </div>
      ) : filteredProperties.length > 0 ? (
        <div className={`buyer-filtered-properties-grid ${viewMode === 'list' ? 'buyer-list-view' : ''}`}>
          {filteredProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <div className="buyer-no-properties">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <h2>No Properties Found</h2>
          <p>
            {cityParam
              ? `We couldn't find any properties for sale in ${cityParam} at the moment.`
              : 'No properties available for sale.'}
          </p>
        </div>
        
      )}
    </div>
  );
};

export default CityFilteredBuy;