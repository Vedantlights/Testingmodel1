import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import LocationAutoSuggest from '../../components/LocationAutoSuggest';
import '../styles/CompactSearchBar.css';

const CompactSearchBar = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [searchData, setSearchData] = useState({
    location: searchParams.get('location') || '',
    propertyType: searchParams.get('type') || searchParams.get('property_type') || '',
    budget: searchParams.get('budget') || '',
    bedrooms: searchParams.get('bedrooms') || '',
    area: searchParams.get('area') || ''
  });

  const [selectedLocation, setSelectedLocation] = useState(null);
  
  // Property status toggle for home page (sell/buy)
  const [propertyStatus, setPropertyStatus] = useState(() => {
    // Initialize from URL params if available, otherwise default to 'all'
    const statusParam = searchParams.get('status');
    if (statusParam === 'For Sale') return 'sell';
    if (statusParam === 'For Rent') return 'rent';
    return 'all'; // 'all', 'sell', or 'rent'
  });

  // Determine search type based on current route
  const getSearchType = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/buy')) return 'buy';
    if (path.includes('/rent')) return 'rent';
    if (path.includes('/pghostel')) return 'pg';
    // Check if we're on search results page that came from home
    if (path.includes('/searchresults')) {
      // Check if there's a referrer or if we can determine it's from home
      // For now, we'll check if status is not set (meaning it could be from home)
      const statusParam = searchParams.get('status');
      if (!statusParam) return 'home';
    }
    return 'home'; // Default to home
  };

  const searchType = useMemo(() => getSearchType(), [location.pathname, searchParams]);

  // Sync propertyStatus with URL params when they change
  useEffect(() => {
    if (searchType === 'home') {
      const statusParam = searchParams.get('status');
      if (statusParam === 'For Sale') {
        setPropertyStatus('sell');
      } else if (statusParam === 'For Rent') {
        setPropertyStatus('rent');
      } else {
        setPropertyStatus('all');
      }
    }
  }, [searchParams, searchType]);

  // Budget range definitions
  const rentResidentialBudget = [
    '0K-5K',
    '5K-10K',
    '10K-20K',
    '20K-30K',
    '30K-50K',
    '50K-75K',
    '75K-1L',
    '1L-2L',
    '2L+'
  ];

  const rentResidentialBudgetRentPage = [
    '5K-10K',
    '10K-20K',
    '20K-30K',
    '30K-50K',
    '50K-75K',
    '75K-1L',
    '1L-2L',
    '2L+'
  ];

  const saleResidentialBudget = [
    '0-25L',
    '25L-50L',
    '50L-75L',
    '75L-1Cr',
    '1Cr-2Cr',
    '2Cr-5Cr',
    '5Cr+'
  ];

  const commercialBudget = [
    '0-50L',
    '50L-1Cr',
    '1Cr-2Cr',
    '2Cr-5Cr',
    '5Cr-10Cr',
    '10Cr-25Cr',
    '25Cr+'
  ];

  const commercialRentBudget = [
    '0-10K',
    '10K-25K',
    '25K-50K',
    '50K-1L',
    '1L-2L',
    '2L-5L',
    '5L+'
  ];

  const commercialRentBudgetRentPage = [
    '10K-25K',
    '25K-50K',
    '50K-1L',
    '1L-2L',
    '2L-5L',
    '5L+'
  ];

  // Property type configurations based on search type
  const getPropertyTypes = () => {
    const allPropertyTypes = [
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

    // PG/Hostel page only allows Apartment and PG / Hostel
    if (searchType === 'pg') {
      return allPropertyTypes; // Show all but only enable specific ones
    }

    return allPropertyTypes;
  };

  const propertyTypes = useMemo(() => getPropertyTypes(), [searchType]);

  // Check if a property type is enabled (for PG/Hostel page)
  const isPropertyTypeEnabled = (type) => {
    if (searchType === 'pg') {
      return ['Apartment', 'PG / Hostel'].includes(type);
    }
    return true;
  };

  const bedroomBasedTypes = [
    'Apartment',
    'Studio Apartment',
    'Villa / Row House / Bungalow / Farm House',
    'Penthouse',
    'PG / Hostel'
  ];

  const areaBasedTypes = [
    'Plot / Land / Industrial Property',
    'Commercial Office',
    'Commercial Shop',
    'Co-working Space',
    'Warehouse / Godown'
  ];

  // Bedroom options - PG/Hostel page includes "1RK"
  const getBedroomOptions = () => {
    if (searchType === 'pg') {
      return ['1RK', '1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK'];
    }
    return ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK'];
  };

  const bedroomOptions = useMemo(() => getBedroomOptions(), [searchType]);

  const areaRanges = [
    '0-500 sq ft',
    '500-1000 sq ft',
    '1000-2000 sq ft',
    '2000-5000 sq ft',
    '5000-10000 sq ft',
    '10000+ sq ft'
  ];

  const isBedroomBased = useMemo(() => bedroomBasedTypes.includes(searchData.propertyType), [searchData.propertyType]);
  const isAreaBased = useMemo(() => areaBasedTypes.includes(searchData.propertyType), [searchData.propertyType]);

  // Get budget ranges based on search type and property type
  const getBudgetRanges = () => {
    // For Buy page - must match BuyerSearchBar.jsx exactly
    if (searchType === 'buy') {
      if (!searchData.propertyType) {
        return saleResidentialBudget;
      }

      const propertyBudgetMap = {
        'Apartment': saleResidentialBudget,
        'Studio Apartment': saleResidentialBudget,
        'Villa / Row House / Bungalow / Farm House': saleResidentialBudget,
        'Penthouse': saleResidentialBudget,
        'PG / Hostel': rentResidentialBudget, // Matches BuyerSearchBar.jsx line 114
        'Plot / Land / Industrial Property': commercialBudget,
        'Commercial Office': commercialBudget,
        'Commercial Shop': commercialBudget,
        'Co-working Space': commercialRentBudget, // Matches BuyerSearchBar.jsx line 118
        'Warehouse / Godown': commercialRentBudget, // Matches BuyerSearchBar.jsx line 119
      };

      return propertyBudgetMap[searchData.propertyType] || saleResidentialBudget;
    }

    // For Rent page
    if (searchType === 'rent') {
      if (!searchData.propertyType) {
        return rentResidentialBudgetRentPage;
      }

      const propertyBudgetMap = {
        'Apartment': rentResidentialBudgetRentPage,
        'Studio Apartment': rentResidentialBudgetRentPage,
        'Villa / Row House / Bungalow / Farm House': rentResidentialBudgetRentPage,
        'Penthouse': rentResidentialBudgetRentPage,
        'PG / Hostel': rentResidentialBudgetRentPage,
        'Plot / Land / Industrial Property': commercialRentBudgetRentPage,
        'Commercial Office': commercialRentBudgetRentPage,
        'Commercial Shop': commercialRentBudgetRentPage,
        'Co-working Space': commercialRentBudgetRentPage,
        'Warehouse / Godown': commercialRentBudgetRentPage,
      };

      return propertyBudgetMap[searchData.propertyType] || rentResidentialBudgetRentPage;
    }

    // For PG/Hostel page
    if (searchType === 'pg') {
      if (!searchData.propertyType) {
        return rentResidentialBudget;
      }

      const propertyBudgetMap = {
        'Apartment': rentResidentialBudget,
        'PG / Hostel': rentResidentialBudget,
      };

      return propertyBudgetMap[searchData.propertyType] || rentResidentialBudget;
    }

    // For Home page (default)
    if (!searchData.propertyType) {
      return saleResidentialBudget;
    }

    const propertyBudgetMap = {
      'Apartment': saleResidentialBudget,
      'Studio Apartment': saleResidentialBudget,
      'Villa / Row House / Bungalow / Farm House': saleResidentialBudget,
      'Penthouse': saleResidentialBudget,
      'PG / Hostel': rentResidentialBudget,
      'Plot / Land / Industrial Property': commercialBudget,
      'Commercial Office': commercialBudget,
      'Commercial Shop': commercialBudget,
      'Co-working Space': commercialRentBudget,
      'Warehouse / Godown': commercialRentBudget
    };

    return propertyBudgetMap[searchData.propertyType] || saleResidentialBudget;
  };

  const budgetRanges = useMemo(() => getBudgetRanges(), [searchData.propertyType, searchType]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Prevent selecting disabled property types (for PG/Hostel page)
    if (name === 'propertyType' && value && !isPropertyTypeEnabled(value)) {
      return; // Don't update state if disabled type is selected
    }

    if (name === 'propertyType') {
      setSearchData(prev => ({
        ...prev,
        propertyType: value,
        bedrooms: '',
        area: '',
        budget: ''
      }));
    } else if (name === 'location') {
      setSearchData(prev => ({
        ...prev,
        location: value
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
      e.stopPropagation();
    }

    // Prevent search if disabled property type is selected (for PG/Hostel page)
    if (searchData.propertyType && !isPropertyTypeEnabled(searchData.propertyType)) {
      return;
    }

    const queryParams = new URLSearchParams();
    const loc = selectedLocation;

    // Add city if available
    if (loc && loc.city) {
      queryParams.append('city', loc.city);
    }
    
    // Add location
    if (loc && loc.placeName) {
      queryParams.append('location', loc.placeName);
    } else if (searchData.location && searchData.location.trim() !== '') {
      queryParams.append('location', searchData.location.trim());
    }

    // Add coordinates if available
    if (loc && loc.coordinates && loc.coordinates.lat && loc.coordinates.lng) {
      queryParams.append('lat', String(loc.coordinates.lat));
      queryParams.append('lng', String(loc.coordinates.lng));
      queryParams.append('radius', '10');
    }

    // Add property type (with special handling for PG/Hostel page and Home page)
    if (searchData.propertyType && searchData.propertyType.trim() !== '') {
      if (searchType === 'pg' && isPropertyTypeEnabled(searchData.propertyType)) {
        queryParams.append('type', searchData.propertyType);
      } else if (searchType === 'pg') {
        // If no type selected or disabled type, filter for Apartment OR PG / Hostel
        queryParams.append('type', 'Apartment / PG / Hostel');
      } else if (searchType === 'home') {
        // Home page uses 'property_type' parameter (matching BuyerSearchBar.jsx)
        queryParams.append('property_type', searchData.propertyType);
      } else {
        // Buy, Rent pages use 'type' parameter
        queryParams.append('type', searchData.propertyType);
      }
    } else if (searchType === 'pg') {
      // For PG/Hostel page, if no type selected, default to Apartment / PG / Hostel
      queryParams.append('type', 'Apartment / PG / Hostel');
    }
    
    // Add budget
    if (searchData.budget && searchData.budget.trim() !== '') {
      queryParams.append('budget', searchData.budget);
    }

    // Add bedrooms or area based on property type
    if (isBedroomBased && searchData.bedrooms && searchData.bedrooms.trim() !== '') {
      queryParams.append('bedrooms', searchData.bedrooms);
    } else if (isAreaBased && searchData.area && searchData.area.trim() !== '') {
      queryParams.append('area', searchData.area);
    }

    // Add status parameter based on search type
    if (searchType === 'buy') {
      queryParams.append('status', 'For Sale');
    } else if (searchType === 'rent' || searchType === 'pg') {
      queryParams.append('status', 'For Rent');
    } else if (searchType === 'home') {
      // Home page: add status filter only if user selected sell or rent
      if (propertyStatus === 'sell') {
        queryParams.append('status', 'For Sale');
      } else if (propertyStatus === 'rent') {
        queryParams.append('status', 'For Rent');
      }
      // If propertyStatus is 'all', don't add status filter (shows all)
    }

    const queryString = queryParams.toString();
    const searchUrl = queryString ? `/searchresults?${queryString}` : '/searchresults';
    
    navigate(searchUrl);
  };

  return (
    <div className="compact-search-bar">
      <form 
        className="compact-search-form" 
        onSubmit={handleSearch}
        noValidate
      >
        {/* Property Status Toggle - Only show on home page */}
        {searchType === 'home' && (
          <div className="compact-search-status-toggle">
            <label className="compact-search-label">Listing Type</label>
            <div className="status-toggle-container">
              <button
                type="button"
                className={`status-toggle-btn ${propertyStatus === 'all' ? 'active' : ''}`}
                onClick={() => setPropertyStatus('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`status-toggle-btn ${propertyStatus === 'sell' ? 'active' : ''}`}
                onClick={() => setPropertyStatus('sell')}
              >
                Buy
              </button>
              <button
                type="button"
                className={`status-toggle-btn ${propertyStatus === 'rent' ? 'active' : ''}`}
                onClick={() => setPropertyStatus('rent')}
              >
                Rent
              </button>
            </div>
          </div>
        )}
        
        <div className="compact-search-filters">
          {/* Location Input */}
          <div className="compact-search-field">
            <label htmlFor="location" className="compact-search-label">
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
              className="compact-search-input"
            />
          </div>

          {/* Property Type */}
          <div className="compact-search-field">
            <label htmlFor="propertyType" className="compact-search-label">
              Property Type
            </label>
            <select
              id="propertyType"
              name="propertyType"
              value={searchData.propertyType}
              onChange={handleInputChange}
              className="compact-search-select"
              title={searchData.propertyType && !isPropertyTypeEnabled(searchData.propertyType) ? 'Available only for Rent properties' : ''}
            >
              <option value="">All Types</option>
              {propertyTypes.map(type => {
                const isEnabled = isPropertyTypeEnabled(type);
                return (
                  <option 
                    key={type} 
                    value={type}
                    disabled={!isEnabled}
                    className={!isEnabled ? 'buyer-disabled-option' : ''}
                  >
                    {type}
                  </option>
                );
              })}
            </select>
            {searchType === 'pg' && (
              <small style={{ 
                fontSize: '0.75rem', 
                color: '#94a3b8', 
                marginTop: '0.25rem',
                display: 'block'
              }}>
                Only Apartment and PG / Hostel are available. Other types are available on the Rent page.
              </small>
            )}
          </div>

          {/* Budget Range */}
          <div className="compact-search-field">
            <label htmlFor="budget" className="compact-search-label">
              Budget
            </label>
            <select
              id="budget"
              name="budget"
              value={searchData.budget}
              onChange={handleInputChange}
              className="compact-search-select"
            >
              <option value="">Any Budget</option>
              {budgetRanges.map(range => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>
          </div>

          {/* Bedrooms / Area - Dynamic based on property type */}
          <div className="compact-search-field">
            {isBedroomBased ? (
              <>
                <label htmlFor="bedrooms" className="compact-search-label">
                  {searchType === 'pg' ? 'Bedroom / Room Type' : 'Bedrooms'}
                </label>
                <select
                  id="bedrooms"
                  name="bedrooms"
                  value={searchData.bedrooms}
                  onChange={handleInputChange}
                  className="compact-search-select"
                >
                  <option value="">Any</option>
                  {bedroomOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </>
            ) : isAreaBased ? (
              <>
                <label htmlFor="area" className="compact-search-label">
                  Area
                </label>
                <select
                  id="area"
                  name="area"
                  value={searchData.area}
                  onChange={handleInputChange}
                  className="compact-search-select"
                >
                  <option value="">Any Area</option>
                  {areaRanges.map(range => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label htmlFor="bedrooms" className="compact-search-label">
                  {searchType === 'pg' ? 'Bedroom / Room Type' : 'Bedroom / Area'}
                </label>
                <select
                  id="bedrooms"
                  name="bedrooms"
                  value={searchData.bedrooms}
                  onChange={handleInputChange}
                  className="compact-search-select"
                  disabled={!searchData.propertyType || !isBedroomBased}
                >
                  <option value="">Select Property Type</option>
                  {searchData.propertyType && isBedroomBased && bedroomOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </>
            )}
          </div>

          {/* Search Button */}
          <button 
            type="submit" 
            className="compact-search-button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompactSearchBar;

