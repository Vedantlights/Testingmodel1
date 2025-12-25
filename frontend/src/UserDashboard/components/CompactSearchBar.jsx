import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LocationAutoSuggest from '../../components/LocationAutoSuggest';
import '../styles/CompactSearchBar.css';

const CompactSearchBar = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [searchData, setSearchData] = useState({
    location: searchParams.get('location') || '',
    propertyType: searchParams.get('type') || searchParams.get('property_type') || '',
    budget: searchParams.get('budget') || '',
    bedrooms: searchParams.get('bedrooms') || '',
    area: searchParams.get('area') || ''
  });

  const [selectedLocation, setSelectedLocation] = useState(null);

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

  const bedroomBasedTypes = [
    'Apartment',
    'Studio Apartment',
    'Villa / Row House / Bungalow / Farm House',
    'Row House',
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

  const bedroomOptions = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK'];

  const areaRanges = [
    '0-500 sq ft',
    '500-1000 sq ft',
    '1000-2000 sq ft',
    '2000-5000 sq ft',
    '5000-10000 sq ft',
    '10000+ sq ft'
  ];

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

  const isBedroomBased = useMemo(() => bedroomBasedTypes.includes(searchData.propertyType), [searchData.propertyType]);
  const isAreaBased = useMemo(() => areaBasedTypes.includes(searchData.propertyType), [searchData.propertyType]);

  const getBudgetRanges = () => {
    if (!searchData.propertyType) {
      return saleResidentialBudget;
    }

    const propertyBudgetMap = {
      'Apartment': saleResidentialBudget,
      'Studio Apartment': saleResidentialBudget,
      'Villa / Row House / Bungalow / Farm House': saleResidentialBudget,
      'Row House': saleResidentialBudget,
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

  const budgetRanges = useMemo(getBudgetRanges, [searchData.propertyType]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

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

    // Add property type
    if (searchData.propertyType && searchData.propertyType.trim() !== '') {
      queryParams.append('property_type', searchData.propertyType);
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
            >
              <option value="">All Types</option>
              {propertyTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
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
                  Bedrooms
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
                  Bedroom / Area
                </label>
                <select
                  id="bedrooms"
                  name="bedrooms"
                  value={searchData.bedrooms}
                  onChange={handleInputChange}
                  className="compact-search-select"
                  disabled
                >
                  <option value="">Select Property Type</option>
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

