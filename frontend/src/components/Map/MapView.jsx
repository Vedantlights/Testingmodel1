import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapView.css';

// Set your Mapbox access token - using Create React App environment variable
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1Ijoic3VkaGFrYXJwb3VsIiwiYSI6ImNtaXp0ZmFrNTAxaTQzZHNiODNrYndsdTAifQ.YTMezksySLU7ZpcYkvXyqg';
mapboxgl.accessToken = MAPBOX_TOKEN;

const MapView = ({ 
  properties = [], 
  center = [73.8567, 18.5204], // Pune, Maharashtra
  zoom = 5,
  onPropertyClick,
  onMapClick,
  showControls = true,
  interactive = true,
  currentPropertyId = null // ID of the property to highlight
}) => {
  const navigate = useNavigate();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const markersMapRef = useRef(new Map()); // Map to store propertyId -> marker mapping
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null); // Track selected property for popup
  const lastOpenedPopupRef = useRef(null); // Track last opened popup to avoid duplicates

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Map already initialized
    
    if (!mapContainer.current) {
      console.error('Map container ref is null');
      return;
    }

    let resizeObserver = null;
    let handleResize = null;
    let checkDimensionsInterval = null;

    // Check if container has dimensions
    const container = mapContainer.current;
    const hasDimensions = container.offsetWidth > 0 && container.offsetHeight > 0;
    
    const initializeMap = () => {
      if (map.current) return; // Already initialized
      
      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: center,
          zoom: zoom,
          interactive: interactive
        });

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
          // Ensure map resizes after load
          setTimeout(() => {
            if (map.current) {
              map.current.resize();
            }
          }, 100);
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
            if (target && (target.closest('.price-tag-marker') || target.closest('.mapboxgl-marker'))) {
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

        // Handle resize events
        handleResize = () => {
          if (map.current && mapLoaded) {
            map.current.resize();
          }
        };
        window.addEventListener('resize', handleResize);

        // Also resize when container becomes visible
        resizeObserver = new ResizeObserver(() => {
          if (map.current && mapLoaded) {
            map.current.resize();
          }
        });
        
        if (mapContainer.current) {
          resizeObserver.observe(mapContainer.current);
        }
      } catch (error) {
        console.error('Error creating Mapbox map:', error);
      }
    };

    if (!hasDimensions) {
      // Wait for container to have dimensions
      checkDimensionsInterval = setInterval(() => {
        if (container.offsetWidth > 0 && container.offsetHeight > 0) {
          clearInterval(checkDimensionsInterval);
          initializeMap();
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (checkDimensionsInterval) {
          clearInterval(checkDimensionsInterval);
        }
        if (!map.current) {
          console.warn('Map container did not get dimensions, initializing anyway');
          initializeMap();
        }
      }, 5000);
    } else {
      initializeMap();
    }

    // Cleanup on unmount
    return () => {
      if (checkDimensionsInterval) {
        clearInterval(checkDimensionsInterval);
      }
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Only run once on mount

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

  // Navigate to property details page - open in new tab
  const navigateToProperty = useCallback((propertyId) => {
    if (!propertyId) {
      console.error('Invalid property ID for navigation:', propertyId);
      return;
    }
    
    try {
      // Open in new tab
      window.open(`/buyer-dashboard/details/${propertyId}`, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error navigating to property details:', error);
      // Fallback: use window location
      window.open(`/buyer-dashboard/details/${propertyId}`, '_blank', 'noopener,noreferrer');
    }
  }, []);

  // Format price helper - returns compact format (e.g., "45L", "6.5Cr")
  const formatPrice = useCallback((price) => {
    if (!price) return 'Price on Request';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return 'Price on Request';
    
    if (numPrice >= 10000000) {
      const cr = numPrice / 10000000;
      return cr % 1 === 0 ? `${cr}Cr` : `${cr.toFixed(1)}Cr`;
    }
    if (numPrice >= 100000) {
      const lac = numPrice / 100000;
      return lac % 1 === 0 ? `${lac}L` : `${lac.toFixed(1)}L`;
    }
    if (numPrice >= 1000) {
      const k = numPrice / 1000;
      return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
    }
    return numPrice.toString();
  }, []);

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
      
      // Get thumbnail/image
      const thumbnail = property.thumbnail || 
                       (property.images && property.images.length > 0 ? (typeof property.images[0] === 'string' ? property.images[0] : property.images[0].url) : null) ||
                       (property.cover_image || '/placeholder-property.jpg');

      // Create custom price tag marker element - small pill-shaped
      const el = document.createElement('div');
      el.className = `price-tag-marker ${isCurrentProperty ? 'selected' : ''}`;
      el.innerHTML = `
        <div class="price-tag">
          ₹${formatPrice(property.price)}
        </div>
      `;

      // Get all images for carousel
      const allImages = property.images && Array.isArray(property.images) && property.images.length > 0
        ? property.images.map(img => typeof img === 'string' ? img : img.url)
        : (property.cover_image ? [property.cover_image] : [thumbnail]);
      
      const currentImageIndex = 0;
      const totalImages = allImages.length;
      
      // Format description (truncate if too long)
      const description = property.description || property.location || 'Property description';
      const truncatedDescription = description.length > 60 ? description.substring(0, 60) + '...' : description;
      
      // Get rating (if available, otherwise use placeholder)
      const rating = property.rating || 4.96;
      const reviewCount = property.review_count || property.reviews || 67;
      
      // Format dates (if available)
      const checkInDate = property.check_in_date || '4 Jan';
      const checkOutDate = property.check_out_date || '9 Jan';
      const nights = property.nights || 5;
      
      // Create popup card - Vertical Layout (Image Top, Content Bottom)
      const popup = new mapboxgl.Popup({ 
        offset: 25, 
        closeButton: false, // We'll add custom close button
        closeOnClick: false,
        anchor: 'bottom',
        className: 'map-card-container'
      })
        .setHTML(`
          <div class="property-popup-card">
            <div class="popup-card-image-container">
              <img src="${allImages[currentImageIndex]}" alt="${property.title || 'Property'}" class="popup-card-image" onerror="this.src='/placeholder-property.jpg';" />
              <div class="popup-card-image-overlay">
                <button class="popup-card-heart-btn" data-property-id="${property.id}" title="Save">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                </button>
                <button class="popup-card-close-btn" title="Close">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              ${totalImages > 1 ? `
                <div class="popup-card-pagination">
                  ${Array.from({ length: totalImages }, (_, i) => `
                    <span class="pagination-dot ${i === currentImageIndex ? 'active' : ''}" data-image-index="${i}"></span>
                  `).join('')}
                </div>
              ` : ''}
            </div>
            <div class="popup-card-content">
              <div class="popup-card-header">
                <h3 class="popup-card-title">${property.title || 'Property'}</h3>
                <div class="popup-card-rating">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                  <span>${rating}</span>
                  <span class="review-count">(${reviewCount})</span>
                </div>
              </div>
              <p class="popup-card-description">${truncatedDescription}</p>
              <div class="popup-card-price-section">
                <span class="popup-card-price">₹${formatPrice(property.price)}</span>
                <span class="popup-card-duration">for ${nights} night${nights !== 1 ? 's' : ''}</span>
              </div>
              <p class="popup-card-dates">${checkInDate}–${checkOutDate}</p>
            </div>
          </div>
        `);

      // Create marker with offset coordinates if needed
      const marker = new mapboxgl.Marker(el)
        .setLngLat([markerLng, markerLat])
        .setPopup(popup)
        .addTo(map.current);

      // Handle marker click - open popup on click
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
        
        // Set selected property for popup
        setSelectedProperty(property);
        
        // Toggle popup for this marker
        if (marker.getPopup().isOpen()) {
          marker.getPopup().remove();
          lastOpenedPopupRef.current = null;
          setSelectedProperty(null);
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
      
      // Also handle clicks on nested elements (price-tag) - ensure they bubble up
      const priceTag = markerElement.querySelector('.price-tag');
      if (priceTag) {
        priceTag.style.pointerEvents = 'auto';
        priceTag.style.cursor = 'pointer';
        priceTag.addEventListener('click', (e) => {
          e.stopPropagation();
          handleMarkerClick(e);
        });
      }

      // Handle popup button clicks (heart, close, pagination)
      popup.on('open', () => {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
          const popupElement = popup.getElement();
          if (!popupElement) return;
          
          // Handle close button
          const closeBtn = popupElement.querySelector('.popup-card-close-btn');
          if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              marker.getPopup().remove();
              lastOpenedPopupRef.current = null;
              setSelectedProperty(null);
            });
          }
          
          // Handle heart button (favorite)
          const heartBtn = popupElement.querySelector('.popup-card-heart-btn');
          if (heartBtn) {
            heartBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Heart button clicked for property:', property.id);
              // TODO: Implement favorite functionality
              // For now, just toggle a visual state
              const svg = heartBtn.querySelector('svg');
              if (svg) {
                const isFilled = svg.getAttribute('fill') === 'red';
                svg.setAttribute('fill', isFilled ? 'none' : 'red');
                svg.setAttribute('stroke', isFilled ? 'white' : 'red');
              }
            });
          }
          
          // Handle pagination dots
          const paginationDots = popupElement.querySelectorAll('.pagination-dot');
          paginationDots.forEach((dot, index) => {
            dot.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              const imageIndex = parseInt(dot.getAttribute('data-image-index') || index);
              const imageContainer = popupElement.querySelector('.popup-card-image-container');
              const image = imageContainer?.querySelector('.popup-card-image');
              
              if (image && allImages[imageIndex]) {
                image.src = allImages[imageIndex];
                
                // Update active dot
                paginationDots.forEach((d, i) => {
                  if (i === imageIndex) {
                    d.classList.add('active');
                  } else {
                    d.classList.remove('active');
                  }
                });
              }
            });
          });
        }, 100);
      });
      
      // Backup method - attach listeners when popup is added to DOM
      const attachButtonListeners = () => {
        const popupElement = popup.getElement();
        if (!popupElement) return;
        
        // Close button
        const closeBtn = popupElement.querySelector('.popup-card-close-btn');
        if (closeBtn && !closeBtn.hasAttribute('data-listener-attached')) {
          closeBtn.setAttribute('data-listener-attached', 'true');
          closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            marker.getPopup().remove();
            lastOpenedPopupRef.current = null;
            setSelectedProperty(null);
          });
        }
        
        // Heart button
        const heartBtn = popupElement.querySelector('.popup-card-heart-btn');
        if (heartBtn && !heartBtn.hasAttribute('data-listener-attached')) {
          heartBtn.setAttribute('data-listener-attached', 'true');
          heartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Heart button clicked for property:', property.id);
            const svg = heartBtn.querySelector('svg');
            if (svg) {
              const isFilled = svg.getAttribute('fill') === 'red';
              svg.setAttribute('fill', isFilled ? 'none' : 'red');
              svg.setAttribute('stroke', isFilled ? 'white' : 'red');
            }
          });
        }
      };
      
      // Try multiple times to ensure buttons are in DOM
      popup.on('open', () => {
        attachButtonListeners();
        setTimeout(attachButtonListeners, 50);
        setTimeout(attachButtonListeners, 150);
      });

      // Track popup close
      popup.on('close', () => {
        if (lastOpenedPopupRef.current === property.id) {
          lastOpenedPopupRef.current = null;
          setSelectedProperty(null);
        }
      });

      markersRef.current.push(marker);
      markersMapRef.current.set(property.id, marker);
      console.log('✅ MapView: Marker created successfully for property:', property.id, property.title);
    });
    
    console.log('🗺️ MapView: Total markers created:', markersRef.current.length);
  }, [properties, mapLoaded, onPropertyClick, currentPropertyId, navigateToProperty, applyMarkerOffset, formatPrice]);

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
