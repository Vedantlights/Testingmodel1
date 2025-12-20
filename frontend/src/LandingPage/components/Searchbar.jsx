import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Searchbar.css';

const SearchBar = () => {
  const navigate = useNavigate();
  
  const [searchData, setSearchData] = useState({
    location: '',
    propertyType: '',
    budget: '',
    bedrooms: '',
    area: ''
  });

  const propertyTypes = [
    'Apartment',
    'Studio Apartment',
    'Villa / Row House / Bungalow / Farm House',
    'Row House',
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
    'Row House',
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
  
  // Budget ranges for Rent (Residential)
  const rentResidentialBudget = [
    '5K-10K',
    '10K-20K',
    '20K-30K',
    '30K-50K',
    '50K-75K',
    '75K-1L',
    '1L-2L',
    '2L+'
  ];
  
  // Budget ranges for Sale (Residential)
  const saleResidentialBudget = [
    '25L-50L',
    '50L-75L',
    '75L-1Cr',
    '1Cr-2Cr',
    '2Cr-5Cr',
    '5Cr+'
  ];
  
  // Budget ranges for Land/Commercial (Sale)
  const commercialBudget = [
    '50L-1Cr',
    '1Cr-2Cr',
    '2Cr-5Cr',
    '5Cr-10Cr',
    '10Cr-25Cr',
    '25Cr+'
  ];
  
  // Budget ranges for Commercial Rent
  const commercialRentBudget = [
    '10K-25K',
    '25K-50K',
    '50K-1L',
    '1L-2L',
    '2L-5L',
    '5L+'
  ];
  
  // Determine if property type is bedroom-based or area-based
  const isBedroomBased = useMemo(() => {
    return bedroomBasedTypes.includes(searchData.propertyType);
  }, [searchData.propertyType]);
  
  const isAreaBased = useMemo(() => {
    return areaBasedTypes.includes(searchData.propertyType);
  }, [searchData.propertyType]);
  
  // Get appropriate budget ranges based on property type
  const getBudgetRanges = () => {
    if (!searchData.propertyType) {
      return saleResidentialBudget; // Default
    }
    
    // Map each property type to its appropriate budget range
    const propertyBudgetMap = {
      // Residential - Sale ranges (higher budgets)
      'Apartment': saleResidentialBudget,
      'Studio Apartment': saleResidentialBudget,
      'Villa / Row House / Bungalow / Farm House': saleResidentialBudget,
      'Row House': saleResidentialBudget,
      'Penthouse': saleResidentialBudget,
      
      // PG/Hostel - Rent ranges (lower budgets)
      'PG / Hostel': rentResidentialBudget,
      
      // Commercial/Industrial - Sale ranges (very high budgets)
      'Plot / Land / Industrial Property': commercialBudget,
      'Commercial Office': commercialBudget,
      'Commercial Shop': commercialBudget,
      
      // Commercial Rent ranges
      'Co-working Space': commercialRentBudget,
      'Warehouse / Godown': commercialRentBudget,
    };
    
    // Return the budget range for the selected property type, or default
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
    e.preventDefault();
    
    // Store search data and redirect to login
    sessionStorage.setItem('searchParams', JSON.stringify(searchData));
    navigate('/login');
  };

  const handleQuickSearch = (city) => {
    sessionStorage.setItem('searchParams', JSON.stringify({ ...searchData, location: city }));
    navigate('/login');
  };

  return (
    <>
      {/* Search Bar Container - WITH background image */}
      <div className="landing-search-bar-container" style={{ backgroundImage: 'url(/LandingHome.jpg)' }}>
        <div className="landing-search-bar-wrapper">
          <h2 className="search-title">Find Your Dream Property</h2>
          <p className="search-subtitle">Search from thousands of verified properties across India</p>
          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-inputs">
              {/* Location Input */}
              <div className="search-field">
                <label htmlFor="location" className="search-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  placeholder="City / Locality"
                  value={searchData.location}
                  onChange={handleInputChange}
                  className="search-input"
                />
              </div>

              {/* Property Type */}
              <div className="search-field">
                <label htmlFor="propertyType" className="search-label">
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
                  className="search-select"
                >
                  <option value="">All Types</option>
                  {propertyTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Budget Range */}
              <div className="search-field">
                <label htmlFor="budget" className="search-label">
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
                  className="search-select"
                >
                  <option value="">Any Budget</option>
                  {budgetRanges.map(range => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>

              {/* Bedrooms / Area - Dynamic based on property type */}
              <div className="search-field">
                {isBedroomBased ? (
                  <>
                    <label htmlFor="bedrooms" className="search-label">
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
                      className="search-select"
                    >
                      <option value="">Any</option>
                      {bedroomOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </>
                ) : isAreaBased ? (
                  <>
                    <label htmlFor="area" className="search-label">
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
                      className="search-select"
                    >
                      <option value="">Any Area</option>
                      {areaRanges.map(range => (
                        <option key={range} value={range}>{range}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    <label htmlFor="bedrooms" className="search-label">
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
                      className="search-select"
                      disabled
                    >
                      <option value="">Select Property Type</option>
                    </select>
                  </>
                )}
              </div>
            </div>

            {/* Search Button */}
            <button type="submit" className="search-button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <span>Search Properties</span>
            </button>
          </form>
        </div>
      </div>

      {/* Quick Search Cities - SEPARATE section WITHOUT background image */}
      <div className="quick-search-container">
        <div className="quick-search">
          <span className="quick-search-label">Popular Cities:</span>
          <div className="quick-search-buttons">
            {topCities.map(city => (
              <button
                key={city}
                type="button"
                onClick={() => handleQuickSearch(city)}
                className="quick-search-btn-image"
              >
                <div className="city-image-wrapper">
                  <img 
                    src={`/${city}.png`} 
                    alt={city}
                    className="city-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="city-overlay"></div>
                </div>
                <span className="city-name">{city}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default SearchBar;