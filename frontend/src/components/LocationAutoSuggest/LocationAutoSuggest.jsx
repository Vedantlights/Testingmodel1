import React, { useState, useEffect, useRef, useCallback } from 'react';
import './LocationAutoSuggest.css';

// Reuse existing Mapbox token env variable used by map components
const MAPBOX_TOKEN =
  process.env.REACT_APP_MAPBOX_ACCESS_TOKEN ||
  'pk.eyJ1Ijoic3VkaGFrYXBvdWwiLCJhIjoiY21penRmYWs1MDFpNDNkc2I4M2tid2x1MCJ9.YTMezksySLU7ZpcYkvXyqg';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

// Static fallback locations for India if Mapbox is unavailable
const STATIC_INDIA_LOCATIONS = [
  {
    id: 'state-maharashtra',
    placeName: 'Maharashtra',
    fullAddress: 'Maharashtra, India',
    city: 'Maharashtra',
    state: 'Maharashtra',
    coordinates: { lat: 19.7515, lng: 75.7139 },
  },
  // Maharashtra - major cities
  {
    id: 'city-mumbai',
    placeName: 'Mumbai',
    fullAddress: 'Mumbai, Maharashtra, India',
    city: 'Mumbai',
    state: 'Maharashtra',
    coordinates: { lat: 19.076, lng: 72.8777 },
  },
  {
    id: 'city-pune',
    placeName: 'Pune',
    fullAddress: 'Pune, Maharashtra, India',
    city: 'Pune',
    state: 'Maharashtra',
    coordinates: { lat: 18.5204, lng: 73.8567 },
  },
  {
    id: 'city-nagpur',
    placeName: 'Nagpur',
    fullAddress: 'Nagpur, Maharashtra, India',
    city: 'Nagpur',
    state: 'Maharashtra',
    coordinates: { lat: 21.1458, lng: 79.0882 },
  },
  {
    id: 'city-thane',
    placeName: 'Thane',
    fullAddress: 'Thane, Maharashtra, India',
    city: 'Thane',
    state: 'Maharashtra',
    coordinates: { lat: 19.2183, lng: 72.9781 },
  },
  {
    id: 'city-navi-mumbai',
    placeName: 'Navi Mumbai',
    fullAddress: 'Navi Mumbai, Maharashtra, India',
    city: 'Navi Mumbai',
    state: 'Maharashtra',
    coordinates: { lat: 19.033, lng: 73.0297 },
  },
  {
    id: 'city-kalyan',
    placeName: 'Kalyan',
    fullAddress: 'Kalyan, Maharashtra, India',
    city: 'Kalyan',
    state: 'Maharashtra',
    coordinates: { lat: 19.2437, lng: 73.1355 },
  },
  {
    id: 'city-nashik',
    placeName: 'Nashik',
    fullAddress: 'Nashik, Maharashtra, India',
    city: 'Nashik',
    state: 'Maharashtra',
    coordinates: { lat: 20.011, lng: 73.7903 },
  },
  {
    id: 'city-aurangabad',
    placeName: 'Aurangabad',
    fullAddress: 'Aurangabad, Maharashtra, India',
    city: 'Aurangabad',
    state: 'Maharashtra',
    coordinates: { lat: 19.8762, lng: 75.3433 },
  },
  {
    id: 'city-kolhapur',
    placeName: 'Kolhapur',
    fullAddress: 'Kolhapur, Maharashtra, India',
    city: 'Kolhapur',
    state: 'Maharashtra',
    coordinates: { lat: 16.7049, lng: 74.2433 },
  },
  // Maharashtra - popular hill stations / coastal towns
  {
    id: 'town-mahabaleshwar',
    placeName: 'Mahabaleshwar',
    fullAddress: 'Mahabaleshwar, Maharashtra, India',
    city: 'Mahabaleshwar',
    state: 'Maharashtra',
    coordinates: { lat: 17.925, lng: 73.6575 },
  },
  {
    id: 'town-lonavala',
    placeName: 'Lonavala',
    fullAddress: 'Lonavala, Maharashtra, India',
    city: 'Lonavala',
    state: 'Maharashtra',
    coordinates: { lat: 18.752, lng: 73.405 },
  },
  {
    id: 'town-khandala',
    placeName: 'Khandala',
    fullAddress: 'Khandala, Maharashtra, India',
    city: 'Khandala',
    state: 'Maharashtra',
    coordinates: { lat: 18.758, lng: 73.373 },
  },
  {
    id: 'town-ratnagiri',
    placeName: 'Ratnagiri',
    fullAddress: 'Ratnagiri, Maharashtra, India',
    city: 'Ratnagiri',
    state: 'Maharashtra',
    coordinates: { lat: 16.9902, lng: 73.312 },
  },
  {
    id: 'town-alibag',
    placeName: 'Alibag',
    fullAddress: 'Alibag, Maharashtra, India',
    city: 'Alibag',
    state: 'Maharashtra',
    coordinates: { lat: 18.6411, lng: 72.8722 },
  },
  {
    id: 'town-shirdi',
    placeName: 'Shirdi',
    fullAddress: 'Shirdi, Maharashtra, India',
    city: 'Shirdi',
    state: 'Maharashtra',
    coordinates: { lat: 19.7668, lng: 74.4774 },
  },
  {
    id: 'town-panvel',
    placeName: 'Panvel',
    fullAddress: 'Panvel, Maharashtra, India',
    city: 'Panvel',
    state: 'Maharashtra',
    coordinates: { lat: 18.9886, lng: 73.1175 },
  },
  {
    id: 'town-karjat',
    placeName: 'Karjat',
    fullAddress: 'Karjat, Maharashtra, India',
    city: 'Karjat',
    state: 'Maharashtra',
    coordinates: { lat: 18.9107, lng: 73.3236 },
  },
  // Major cities outside Maharashtra
  {
    id: 'city-delhi',
    placeName: 'Delhi',
    fullAddress: 'Delhi, India',
    city: 'Delhi',
    state: 'Delhi',
    coordinates: { lat: 28.7041, lng: 77.1025 },
  },
  {
    id: 'city-bengaluru',
    placeName: 'Bengaluru',
    fullAddress: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    state: 'Karnataka',
    coordinates: { lat: 12.9716, lng: 77.5946 },
  },
  {
    id: 'city-hyderabad',
    placeName: 'Hyderabad',
    fullAddress: 'Hyderabad, Telangana, India',
    city: 'Hyderabad',
    state: 'Telangana',
    coordinates: { lat: 17.385, lng: 78.4867 },
  },
  {
    id: 'city-ahmedabad',
    placeName: 'Ahmedabad',
    fullAddress: 'Ahmedabad, Gujarat, India',
    city: 'Ahmedabad',
    state: 'Gujarat',
    coordinates: { lat: 23.0225, lng: 72.5714 },
  },
  {
    id: 'city-chennai',
    placeName: 'Chennai',
    fullAddress: 'Chennai, Tamil Nadu, India',
    city: 'Chennai',
    state: 'Tamil Nadu',
    coordinates: { lat: 13.0827, lng: 80.2707 },
  },
  {
    id: 'city-kolkata',
    placeName: 'Kolkata',
    fullAddress: 'Kolkata, West Bengal, India',
    city: 'Kolkata',
    state: 'West Bengal',
    coordinates: { lat: 22.5726, lng: 88.3639 },
  },
  {
    id: 'city-jaipur',
    placeName: 'Jaipur',
    fullAddress: 'Jaipur, Rajasthan, India',
    city: 'Jaipur',
    state: 'Rajasthan',
    coordinates: { lat: 26.9124, lng: 75.7873 },
  },
  {
    id: 'city-surat',
    placeName: 'Surat',
    fullAddress: 'Surat, Gujarat, India',
    city: 'Surat',
    state: 'Gujarat',
    coordinates: { lat: 21.1702, lng: 72.8311 },
  },
];

// Parse Mapbox feature into our standard location object
function parseFeature(feature) {
  if (!feature) return null;

  const [lng, lat] = feature.center || [];
  const placeName = feature.text || '';
  const fullAddress = feature.place_name || placeName;

  let city = '';
  let state = '';

  const context = feature.context || [];
  context.forEach((item) => {
    if (!item || !item.id) return;
    if (!city && (item.id.startsWith('place') || item.id.startsWith('locality') || item.id.startsWith('district'))) {
      city = item.text || city;
    }
    if (!state && item.id.startsWith('region')) {
      state = item.text || state;
    }
  });

  // Fallback: sometimes city is part of the place name
  if (!city && fullAddress) {
    const parts = fullAddress.split(',').map((p) => p.trim());
    if (parts.length >= 2) {
      city = parts[1];
    }
  }

  return {
    id: feature.id,
    placeName,
    fullAddress,
    city,
    state,
    coordinates: {
      lat: typeof lat === 'number' ? lat : null,
      lng: typeof lng === 'number' ? lng : null,
    },
  };
}

function getStaticFallbackSuggestions(query) {
  if (!query) return [];
  const q = query.toLowerCase();

  return STATIC_INDIA_LOCATIONS.filter((loc) => {
    const fields = [
      loc.placeName,
      loc.fullAddress,
      loc.city,
      loc.state,
    ].filter(Boolean);

    return fields.some((field) => field.toLowerCase().includes(q));
  });
}

const LocationAutoSuggest = ({
  placeholder = 'Enter location...',
  value = '',
  onChange,
  onSearch,
  className = '',
  error,
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [errorState, setErrorState] = useState(null);

  const containerRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Keep internal input in sync when parent value changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(
    async (query) => {
      if (!MAPBOX_TOKEN || !query || query.trim().length < MIN_QUERY_LENGTH) {
        setSuggestions([]);
        setIsOpen(false);
        setErrorState(null);
        return;
      }

      // Cancel previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      try {
        // Search all of India - removed types restriction to get all location types including smaller cities
        // Increased limit to 30 and enabled autocomplete for better matching
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${MAPBOX_TOKEN}&country=in&limit=30&autocomplete=true`;

        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Failed to fetch locations');

        const data = await response.json();

        // Accept all Indian locations returned by Mapbox (already filtered by country=in)
        const indiaFeatures = (data.features || []).filter((feature) => {
          return feature != null;
        });

        let items = indiaFeatures.map(parseFeature).filter(Boolean);
        
        // Sort by relevance (Mapbox relevance score) - higher is better
        // This helps smaller cities that match the query appear
        items.sort((a, b) => {
          // If we have relevance scores, use them (Mapbox doesn't always provide this in the parsed data)
          // Otherwise keep original order which is already sorted by relevance
          return 0;
        });

        // Fallback to static list if Mapbox returns no results
        if (!items.length) {
          items = getStaticFallbackSuggestions(query);
        }

        setSuggestions(items);
        setIsOpen(items.length > 0);
        setHighlightedIndex(items.length > 0 ? 0 : -1);
        setErrorState(null);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Location suggestions error:', err);
          // On error, try static fallback suggestions
          const fallback = getStaticFallbackSuggestions(query);
          setSuggestions(fallback);
          setIsOpen(fallback.length > 0);
          setHighlightedIndex(fallback.length > 0 ? 0 : -1);
          if (!fallback.length) {
            setErrorState('Unable to load suggestions. Please check your internet connection.');
          } else {
            setErrorState(null);
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Debounce input changes
  useEffect(() => {
    if (!inputValue || inputValue.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsOpen(false);
      setErrorState(null);
      return;
    }

    const timer = setTimeout(() => {
      fetchSuggestions(inputValue.trim());
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [inputValue, fetchSuggestions]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedLocation(null);
    setIsOpen(true);

    // If user clears input, notify parent
    if (!newValue && onChange) {
      onChange(null);
    }
  };

  const handleSelect = (item) => {
    if (!item) return;

    setSelectedLocation(item);
    setInputValue(item.fullAddress || item.placeName || '');
    setIsOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);

    if (onChange) {
      onChange(item);
    }

    if (onSearch) {
      onSearch(item);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!suggestions.length) return;
      setIsOpen(true);
      setHighlightedIndex((prev) => {
        const next = prev + 1;
        return next >= suggestions.length ? 0 : next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!suggestions.length) return;
      setIsOpen(true);
      setHighlightedIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? suggestions.length - 1 : next;
      });
    } else if (e.key === 'Enter') {
      // Always prevent default to avoid form submission and scroll jumps
      e.preventDefault();
      e.stopPropagation();
      
      if (isOpen && suggestions.length > 0) {
        const index = highlightedIndex >= 0 ? highlightedIndex : 0;
        handleSelect(suggestions[index]);
      } else if (onSearch && selectedLocation) {
        onSearch(selectedLocation);
      }
      // If no suggestions and no selected location, don't submit form
      // User should select from dropdown or type more
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setSelectedLocation(null);
    setErrorState(null);
    if (onChange) {
      onChange(null);
    }
  };

  return (
    <div className={`location-autosuggest ${className}`} ref={containerRef}>
      <div className={`location-input-wrapper ${error ? 'location-input-error' : ''}`}>
        <input
          type="text"
          value={inputValue}
          placeholder={placeholder}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="location-input"
          autoComplete="off"
        />
        {isLoading && (
          <span className="location-spinner" aria-label="Loading" />
        )}
        {!isLoading && inputValue && (
          <button
            type="button"
            className="location-clear-btn"
            onClick={handleClear}
            aria-label="Clear location"
          >
            ×
          </button>
        )}
      </div>
      {error && <div className="location-error-text">{error}</div>}
      {errorState && !error && (
        <div className="location-error-text">{errorState}</div>
      )}

      {isOpen && suggestions.length > 0 && (
        <ul className="location-dropdown" role="listbox">
          {suggestions.map((item, index) => (
            <li
              key={item.id || `${item.placeName}-${index}`}
              className={`location-option ${index === highlightedIndex ? 'active' : ''}`}
              onMouseDown={(e) => {
                // prevent input blur before click handler
                e.preventDefault();
                handleSelect(item);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              role="option"
              aria-selected={index === highlightedIndex}
            >
              <div className="location-option-primary">{item.placeName}</div>
              <div className="location-option-secondary">{item.fullAddress}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationAutoSuggest;
