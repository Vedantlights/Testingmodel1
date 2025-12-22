import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import './MapView.css';

// Set your Mapbox access token - using Create React App environment variable
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1Ijoic3VkaGFrYXJwb3VsIiwiYSI6ImNtaXp0ZmFrNTAxaTQzZHNiODNrYndsdTAifQ.YTMezksySLU7ZpcYkvXyqg';
mapboxgl.accessToken = MAPBOX_TOKEN;

const MapView = ({ 
  properties = [], 
  center = [78.9629, 20.5937], // Default: India center
  zoom = 5,
  onPropertyClick,
  onMapClick,
  showControls = true,
  interactive = true,
  currentPropertyId = null // ID of the property to highlight
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const markersMapRef = useRef(new Map()); // Map to store propertyId -> marker mapping
  const [mapLoaded, setMapLoaded] = useState(false);
  const lastOpenedPopupRef = useRef(null); // Track last opened popup to avoid duplicates

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Map already initialized
    
    if (!mapContainer.current) {
      console.error('Map container ref is null');
      return;
    }

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: center,
        zoom: zoom,
        interactive: interactive
      });
    } catch (error) {
      console.error('Error creating Mapbox map:', error);
      return;
    }

    // Add navigation controls
    if (showControls) {
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      map.current.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true
      }), 'top-right');
    }

    // Map load event
    map.current.on('load', () => {
      setMapLoaded(true);
      map.current.resize();
    });

    // Close popups when map moves (drag, pan, zoom)
    const closeAllPopups = () => {
      markersRef.current.forEach(marker => {
        if (marker.getPopup() && marker.getPopup().isOpen()) {
          marker.getPopup().remove();
        }
      });
      lastOpenedPopupRef.current = null;
    };

    // Close popups on map movement
    map.current.on('dragstart', closeAllPopups);
    map.current.on('movestart', closeAllPopups);
    map.current.on('zoomstart', closeAllPopups);

    // Map click event - but ignore clicks on markers
    if (onMapClick) {
      map.current.on('click', (e) => {
        // Check if click was on a marker element
        const target = e.originalEvent.target;
        if (target && (target.closest('.property-marker') || target.closest('.mapboxgl-marker'))) {
          return; // Don't trigger map click if clicking on a marker
        }
        // Close popups when clicking on map
        closeAllPopups();
        onMapClick({
          lng: e.lngLat.lng,
          lat: e.lngLat.lat
        });
      });
    }

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update center when prop changes
  useEffect(() => {
    if (map.current && mapLoaded) {
      map.current.flyTo({
        center: center,
        zoom: zoom,
        essential: true
      });
    }
  }, [center, zoom, mapLoaded]);

  // Center map on current property when it changes
  useEffect(() => {
    if (!map.current || !mapLoaded || !currentPropertyId) return;

    const currentProperty = properties.find(p => p.id === currentPropertyId);
    if (currentProperty && currentProperty.longitude && currentProperty.latitude) {
      map.current.flyTo({
        center: [currentProperty.longitude, currentProperty.latitude],
        zoom: 14,
        essential: true
      });
    }
  }, [currentPropertyId, properties, mapLoaded]);

  // Helper function to calculate distance between two coordinates (Haversine formula)
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    // Convert to degrees approximation (1 degree ≈ 111 km)
    return distanceKm / 111;
  }, []);

  // Redirect to listing page with property data
  const redirectToListing = useCallback((property) => {
    if (!property || !property.id) {
      console.error('Invalid property data for redirect:', property);
      return;
    }
    
    // Navigate to the property details page
    // Try multiple route formats to ensure compatibility
    const routes = [
      `/buyer-dashboard/details/${property.id}`,
      `/buyer-dashboard/view-details/${property.id}`,
      `/details/${property.id}`
    ];
    
    // Use the first route format (most common)
    const listingUrl = routes[0];
    
    try {
      window.location.href = listingUrl;
    } catch (error) {
      console.error('Error redirecting to property details:', error);
      // Fallback: try using window.location.assign
      window.location.assign(listingUrl);
    }
  }, []);

  // Popups should only open on marker click, not automatically

  // Helper function to apply small offset for overlapping markers
  const applyMarkerOffset = useCallback((property, allProperties) => {
    const lat = property.latitude;
    const lng = property.longitude;
    
    // Check if there are other properties at the same location
    const sameLocationProps = allProperties.filter(p => 
      p.latitude === lat && p.longitude === lng
    );
    
    // If only one property at this location, no offset needed
    if (sameLocationProps.length <= 1) {
      return { lat, lng };
    }
    
    // Find the index of this property among properties at the same location
    const positionInGroup = sameLocationProps.findIndex(p => p.id === property.id);
    
    // Apply a small offset (approximately 50-100 meters) in a circular pattern
    const offsetDistance = 0.0005; // ~50 meters in degrees
    const angle = (2 * Math.PI * positionInGroup) / sameLocationProps.length;
    const offsetLat = lat + (offsetDistance * Math.cos(angle));
    const offsetLng = lng + (offsetDistance * Math.sin(angle));
    
    return { lat: offsetLat, lng: offsetLng };
  }, []);

  // Add/update property markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    markersMapRef.current.clear();
    lastOpenedPopupRef.current = null;

    console.log('🗺️ MapView: Adding markers for', properties.length, 'properties');
    
    // Count properties with and without coordinates
    const propertiesWithCoords = properties.filter(p => p.longitude && p.latitude);
    const propertiesWithoutCoords = properties.filter(p => !p.longitude || !p.latitude);
    
    if (propertiesWithoutCoords.length > 0) {
      console.warn(`⚠️ MapView: ${propertiesWithoutCoords.length} out of ${properties.length} properties are missing coordinates and will not appear on the map.`);
      console.warn('⚠️ Properties without coordinates:', propertiesWithoutCoords.map(p => ({ id: p.id, title: p.title, location: p.location })));
    }
    
    if (propertiesWithCoords.length === 0) {
      console.error('❌ MapView: No properties have valid coordinates. Map will be empty.');
      console.error('💡 Solution: Ensure properties have latitude/longitude values. Use LocationPicker when adding/editing properties.');
    }
    
    // Add new markers for each property
    properties.forEach((property, index) => {
      if (!property.longitude || !property.latitude) {
        return; // Skip silently (already logged above)
      }
      
      // Apply offset if multiple properties at same location
      const { lat: markerLat, lng: markerLng } = applyMarkerOffset(property, properties);
      
      if (markerLat !== property.latitude || markerLng !== property.longitude) {
        console.log(`📍 MapView: Applied offset for property ${property.id} (${property.title}) - Original: ${property.latitude}, ${property.longitude} → Offset: ${markerLat}, ${markerLng}`);
      }
      
      console.log('📍 MapView: Creating marker for property:', property.id, property.title, 'lat:', markerLat, 'lng:', markerLng);

      const isCurrentProperty = currentPropertyId !== null && property.id === currentPropertyId;

      // Determine listing type from status or property data
      const listingType = property.listing_type || (property.status === 'For Rent' ? 'rent' : 'sale');
      
      // Get thumbnail/image
      const thumbnail = property.thumbnail || 
                       (property.images && property.images.length > 0 ? property.images[0].url : null) ||
                       (property.cover_image || '/placeholder-property.jpg');

      // Create custom marker element
      const el = document.createElement('div');
      el.className = `property-marker ${isCurrentProperty ? 'current-property' : ''}`;
      el.innerHTML = `
        <div class="marker-content ${listingType} ${isCurrentProperty ? 'highlighted' : ''}">
          <span class="marker-price">${formatPrice(property.price)}</span>
        </div>
      `;

      // Create popup - don't auto-open, only on click
      // Don't show "View Details" button for current property
      const showViewButton = !isCurrentProperty;
      
      // Create a unique ID for this button to avoid conflicts
      const buttonId = `view-details-btn-${property.id}`;
      const listingUrl = `/buyer-dashboard/details/${property.id}`;
      
      const popup = new mapboxgl.Popup({ offset: 25, closeButton: true, closeOnClick: false })
        .setHTML(`
          <div class="property-popup">
            <div class="popup-image-container">
              <img src="${thumbnail}" alt="${property.title || 'Property'}" class="popup-cover-image" onerror="this.src='/placeholder-property.jpg';" />
            </div>
            <div class="popup-content">
              <h3>${property.title || 'Property'}</h3>
              <p class="popup-price">₹${formatPrice(property.price)}${listingType === 'rent' ? '/month' : ''}</p>
              ${showViewButton ? `<div class="popup-actions">
                <button id="${buttonId}" class="btn-view" data-id="${property.id}" onclick="window.location.href='${listingUrl}'; return false;">View Details</button>
              </div>` : ''}
            </div>
          </div>
        `);

      // Create marker with offset coordinates if needed
      const marker = new mapboxgl.Marker(el)
        .setLngLat([markerLng, markerLat])
        .setPopup(popup)
        .addTo(map.current);

      // Handle marker click - open popup only on click
      const markerElement = marker.getElement();
      
      // Ensure marker element is clickable
      markerElement.style.cursor = 'pointer';
      markerElement.style.pointerEvents = 'auto';
      
      // Handle clicks on the marker element
      const handleMarkerClick = (e) => {
        e.stopPropagation(); // Prevent map click from firing
        
        // Close any other open popups
        markersRef.current.forEach(m => {
          if (m !== marker && m.getPopup().isOpen()) {
            m.getPopup().remove();
          }
        });
        
        // Toggle popup for this marker
        if (marker.getPopup().isOpen()) {
          marker.getPopup().remove();
          lastOpenedPopupRef.current = null;
        } else {
          marker.togglePopup();
          lastOpenedPopupRef.current = property.id;
        }
        
        // Call onPropertyClick if provided
        if (onPropertyClick) {
          onPropertyClick(property);
        }
      };
      
      // Add click listener to marker element
      markerElement.addEventListener('click', handleMarkerClick);
      
      // Also handle clicks on nested elements (marker-content) - ensure they bubble up
      const markerContent = markerElement.querySelector('.marker-content');
      if (markerContent) {
        markerContent.style.pointerEvents = 'auto';
        markerContent.style.cursor = 'pointer';
        // The click will bubble to markerElement, but we can also handle it directly
        markerContent.addEventListener('click', (e) => {
          e.stopPropagation();
          handleMarkerClick(e);
        });
      }

      // Handle popup button clicks - redirect to listing (only if button exists)
      if (showViewButton) {
        popup.on('open', () => {
          // Use setTimeout to ensure DOM is ready
          setTimeout(() => {
            const popupElement = popup.getElement();
            const viewBtn = popupElement?.querySelector(`[data-id="${property.id}"]`);
            
            if (viewBtn) {
              // Remove any existing listeners by cloning
              const newViewBtn = viewBtn.cloneNode(true);
              viewBtn.parentNode.replaceChild(newViewBtn, viewBtn);
              
              newViewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('View Details button clicked for property:', property.id);
                // Redirect to ViewDetailsPage for this listing
                redirectToListing(property);
              });
              
              // Ensure button is clickable
              newViewBtn.style.cursor = 'pointer';
              newViewBtn.style.pointerEvents = 'auto';
            }
          }, 100);
        });
      }
      
      // Also handle button clicks directly when popup is created (backup method)
      if (showViewButton) {
        // Use a more reliable method - attach listener after popup is added to DOM
        const attachButtonListener = () => {
          const popupElement = popup.getElement();
          if (popupElement) {
            const viewBtn = popupElement.querySelector(`[data-id="${property.id}"]`);
            if (viewBtn && !viewBtn.hasAttribute('data-listener-attached')) {
              viewBtn.setAttribute('data-listener-attached', 'true');
              viewBtn.style.cursor = 'pointer';
              viewBtn.style.pointerEvents = 'auto';
              viewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('View Details button clicked (backup method) for property:', property.id);
                redirectToListing(property);
              });
            }
          }
        };
        
        // Try multiple times to ensure button is in DOM
        popup.on('open', () => {
          attachButtonListener();
          setTimeout(attachButtonListener, 50);
          setTimeout(attachButtonListener, 150);
        });
      }

      // Track popup close
      popup.on('close', () => {
        if (lastOpenedPopupRef.current === property.id) {
          lastOpenedPopupRef.current = null;
        }
      });

      markersRef.current.push(marker);
      markersMapRef.current.set(property.id, marker);
      console.log('✅ MapView: Marker created successfully for property:', property.id, property.title);
    });
    
    console.log('🗺️ MapView: Total markers created:', markersRef.current.length);
  }, [properties, mapLoaded, onPropertyClick, currentPropertyId, redirectToListing, applyMarkerOffset]);

  // Format price helper
  const formatPrice = (price) => {
    if (!price) return 'Price on Request';
    if (price >= 10000000) return `${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `${(price / 100000).toFixed(2)} Lac`;
    if (price >= 1000) return `${(price / 1000).toFixed(1)}K`;
    return price.toString();
  };

  // Expose map instance for external use
  const getMap = useCallback(() => map.current, []);

  return (
    <div className="map-wrapper">
      <div ref={mapContainer} className="map-container" />
      {!mapLoaded && (
        <div className="map-loading">
          <div className="loading-spinner"></div>
          <p>Loading map...</p>
        </div>
      )}
    </div>
  );
};

export default MapView;
