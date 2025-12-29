// fileName: ViewDetailsPage.jsx
// BUYER DASHBOARD - Property Details Page
// This is the buyer-specific view details page with inquiry form functionality
// DO NOT use seller's seller-pro-details.jsx component for buyer routes

import React, { useState, useCallback, useEffect } from 'react'; 
import { useParams, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { FaPhone, FaEnvelope, FaAngleLeft, FaAngleRight, FaBed, FaShower, FaRulerCombined, FaTimes, FaCheckCircle, FaUser, FaCommentAlt, FaComments } from "react-icons/fa";
import '../styles/ViewDetailPage.css';
import '../styles/PropertyCard.css';
import { propertiesAPI, chatAPI, buyerInteractionsAPI } from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
import { FavoritesManager } from '../components/PropertyCard';
// Note: createOrGetChatRoom is not imported here - chat rooms are created only when first message is sent
import MapView from '../../components/Map/MapView';

// Amenities with icons matching AddPropertyPopup
const AMENITIES_WITH_ICONS = [
    { id: "parking", label: "Parking", icon: "🚗" },
    { id: "lift", label: "Lift", icon: "🛗" },
    { id: "security", label: "24x7 Security", icon: "👮" },
    { id: "24/7 Security", label: "24/7 Security", icon: "👮" },
    { id: "power_backup", label: "Power Backup", icon: "⚡" },
    { id: "gym", label: "Gym", icon: "🏋️" },
    { id: "Gymnasium", label: "Gymnasium", icon: "🏋️" },
    { id: "swimming_pool", label: "Swimming Pool", icon: "🏊" },
    { id: "garden", label: "Garden", icon: "🌳" },
    { id: "clubhouse", label: "Club House", icon: "🏛️" },
    { id: "Clubhouse", label: "Clubhouse", icon: "🏛️" },
    { id: "playground", label: "Children's Play Area", icon: "🎢" },
    { id: "Children's Play Area", label: "Children's Play Area", icon: "🎢" },
    { id: "cctv", label: "CCTV", icon: "📹" },
    { id: "intercom", label: "Intercom", icon: "📞" },
    { id: "fire_safety", label: "Fire Safety", icon: "🔥" },
    { id: "water_supply", label: "24x7 Water", icon: "💧" },
    { id: "gas_pipeline", label: "Gas Pipeline", icon: "🔥" },
    { id: "wifi", label: "WiFi", icon: "📶" },
    { id: "ac", label: "Air Conditioning", icon: "❄️" },
    { id: "Covered Parking", label: "Covered Parking", icon: "🚗" }
];

// Helper function to get icon for amenity
const getAmenityIcon = (amenityName) => {
    if (!amenityName) return "✓";
    
    const amenity = AMENITIES_WITH_ICONS.find(
        a => a.label.toLowerCase() === amenityName.toLowerCase() || 
             a.id.toLowerCase() === amenityName.toLowerCase().replace(/\s+/g, '_')
    );
    
    return amenity ? amenity.icon : "✓";
};

// Reuse Mapbox access token for geocoding when properties don't have coordinates
const MAPBOX_TOKEN =
    process.env.REACT_APP_MAPBOX_ACCESS_TOKEN ||
    'pk.eyJ1Ijoic3VkaGFrYXJwb3VsIiwiYSI6ImNtaXp0ZmFrNTAxaTQzZHNiODNrYndsdTAifQ.YTMezksySLU7ZpcYkvXyqg';



// --- Image Slider Modal Component ---
const ImageSliderModal = ({ images, currentIndex, onClose, onNext, onPrev }) => {

    // Determine if the modal should be open based on currentIndex (or external state)
    const isOpen = currentIndex !== null;
    
    // Safety check for image data
    if (!images || images.length === 0) return null;
    
    // Get the current image
    const currentImage = isOpen ? images[currentIndex] : null;
    
    // Check if controls should be visible
    const showControls = images.length > 1;
    return (
        <div className={`image-slider-modal-overlay ${isOpen ? 'open' : ''}`}>
            {currentImage && (
                <div className="image-slider-modal-content">
                    
                    {/* Close Button */}
                    <button className="slider-close-btn" onClick={onClose} aria-label="Close Slider">
                        <FaTimes />
                    </button>
                    
                    <div className="slider-controls">
                        {/* Previous Button */}
                        {showControls && (
                            <button className="slider-prev-btn" onClick={onPrev} aria-label="Previous Image">
                                <FaAngleLeft />
                            </button>
                        )}
                        
                        {/* Main Image */}
                        <img 
                            src={currentImage.url} 
                            alt={currentImage.alt} 
                            className="slider-main-image" 
                        />

                        {/* Next Button */}
                        {showControls && (
                            <button className="slider-next-btn" onClick={onNext} aria-label="Next Image">
                                <FaAngleRight />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Helper function to determine which features should be shown based on property type ---
const shouldShowFeature = (propertyType, feature) => {
    if (!propertyType) return true; // Default to showing all if type is unknown
    
    const typeLower = propertyType.toLowerCase();
    
    // Property types that should NOT show bedrooms and bathrooms
    const noBedroomBathroomTypes = [
        'plot / land',
        'plot / land / indusrtial property',
        'plot / land / industrial property',
        'commercial shop',
        'warehouse / godown',
        'warehouse',
        'godown',
        'land',
        'plot'
    ];
    
    // Property types that might show bathrooms but not bedrooms
    const noBedroomTypes = [
        'commercial office',
        'commercial'
    ];
    
    if (feature === 'bedrooms') {
        // Don't show bedrooms for land/plot, commercial shop, warehouse, or commercial office
        return !noBedroomBathroomTypes.some(t => typeLower.includes(t)) &&
               !noBedroomTypes.some(t => typeLower.includes(t));
    }
    
    if (feature === 'bathrooms') {
        // Don't show bathrooms for land/plot, commercial shop, warehouse
        return !noBedroomBathroomTypes.some(t => typeLower.includes(t));
    }
    
    return true; // Show other features by default
};

// --- Helper function to format date as "MMM YYYY" ---
const formatListedDate = (dateString) => {
    if (!dateString) return 'Recently';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Recently';
        
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${month} ${year}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Recently';
    }
};

// --- Helper function to normalize and sanitize property description ---
const normalizeDescription = (description) => {
    if (!description || typeof description !== 'string') {
        return '';
    }
    
    // Step 1: Replace all types of line breaks with a consistent newline character
    let normalized = description.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Step 2: Remove excessive consecutive line breaks (more than 2 consecutive newlines)
    // Replace 3+ consecutive newlines with just 2 newlines (one blank line)
    normalized = normalized.replace(/\n{3,}/g, '\n\n');
    
    // Step 3: Normalize multiple spaces to single spaces (but preserve intentional spacing)
    // Replace 2+ spaces with single space, but keep single spaces
    normalized = normalized.replace(/[ \t]{2,}/g, ' ');
    
    // Step 4: Trim whitespace from the start and end of each line
    normalized = normalized.split('\n').map(line => line.trim()).join('\n');
    
    // Step 5: Remove leading and trailing newlines/whitespace from the entire string
    normalized = normalized.trim();
    
    // Step 6: Remove any remaining excessive blank lines at the start/end
    normalized = normalized.replace(/^\n+|\n+$/g, '');
    
    // Step 7: Ensure consistent spacing around punctuation (optional enhancement)
    // This helps with readability but doesn't change the content structure
    
    return normalized;
};

// --- Helper function to map property data to ViewDetailsPage structure ---
const getPropertyDetails = (property) => {
    window.scrollTo(0,0);
    if (!property) return null;
    
    // Use actual property data from API
    const images = property.images && property.images.length > 0 
        ? property.images 
        : [{ id: 1, url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500', alt: property.title }];
    
    // Use actual amenities from property or default
    const amenities = property.amenities && property.amenities.length > 0
        ? property.amenities
        : ["Swimming Pool", "Gymnasium", "24/7 Security", "Covered Parking", "Clubhouse", "Children's Play Area"];
    
    // Use actual description or generate one, then normalize it
    const rawDescription = property.description || `Discover unparalleled living in this magnificent ${property.type || 'property'}. Featuring modern amenities, panoramic city views, and spacious interiors. Perfect blend of comfort and luxury.`;
    const description = normalizeDescription(rawDescription);
    
    return {
        title: property.title,
        location: property.location,
        price: property.status === 'For Rent' ? `₹ ${property.price.toLocaleString('en-IN')}/Month` : `₹ ${property.price.toLocaleString('en-IN')}`,
        area: `${property.area?.toLocaleString('en-IN')} sq.ft.`,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        status: property.status,
        type: property.type, // Include type for feature filtering
        description: description,
        amenities: amenities,
        images: images,
        listedSince: formatListedDate(property.created_at),
        priceNegotiable: property.price_negotiable || property.priceNegotiable || false,
        maintenanceCharges: property.maintenance_charges || property.maintenanceCharges || null,
        depositAmount: property.deposit_amount || property.depositAmount || null,
        // Additional property details from seller popup
        balconies: property.balconies || null,
        floor: property.floor || null,
        totalFloors: property.total_floors || property.totalFloors || null,
        facing: property.facing || null,
        age: property.age || null,
        furnishing: property.furnishing || null,
        carpetArea: property.carpet_area || property.carpetArea ? `${(property.carpet_area || property.carpetArea).toLocaleString('en-IN')} sq.ft` : null,
        state: property.state || null,
        additionalAddress: property.additional_address || property.additionalAddress || null,
        propertyType: property.property_type || property.propertyType || property.type || null
    };
}

// ============================================================================
// MAPBOX MAP FEATURE COMPONENT
// ============================================================================

const PropertyMapFeature = ({ property }) => {
    const [nearbyProperties, setNearbyProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resolvedCoords, setResolvedCoords] = useState(null); // { lat, lng } from DB or geocoding

    // Helper function to parse price
    const parsePrice = (price) => {
        if (!price) return null;
        if (typeof price === 'number') return price;
        if (typeof price === 'string') {
            // Remove currency symbols, commas, and spaces
            const cleaned = price.replace(/[₹,\s]/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? null : parsed;
        }
        return null;
    };

    // Helper function to parse and validate coordinates
    const parseCoordinate = (coord) => {
        if (coord === null || coord === undefined || coord === '') return null;
        const parsed = typeof coord === 'string' ? parseFloat(coord) : coord;
        return isNaN(parsed) ? null : parsed;
    };

    // Helper function to validate coordinates are within valid range
    const isValidCoordinate = (lat, lng) => {
        if (lat === null || lng === null) return false;
        // Valid latitude: -90 to 90, Valid longitude: -180 to 180
        return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    };

    // Calculate distance between two coordinates (Haversine formula)
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of the Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };

    // Resolve coordinates for this property:
    // 1. Prefer latitude/longitude from backend if present
    // 2. Otherwise, geocode the textual location using Mapbox so that
    //    even old listings without pinned location still appear on the map
    useEffect(() => {
        if (!property) {
            setResolvedCoords(null);
            return;
        }

        // First try coordinates coming directly from the property
        const latFromProp = parseCoordinate(property?.latitude);
        const lngFromProp = parseCoordinate(property?.longitude);

        if (isValidCoordinate(latFromProp, lngFromProp)) {
            setResolvedCoords({ lat: latFromProp, lng: lngFromProp });
            return;
        }

        // Fallback: try to geocode textual location (for legacy properties)
        const locationText = property?.location;
        if (!locationText || !MAPBOX_TOKEN) {
            setResolvedCoords(null);
            return;
        }

        let isCancelled = false;

        const geocodeLocation = async () => {
            try {
                const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
                    locationText
                )}.json?access_token=${MAPBOX_TOKEN}&country=in&limit=1`;

                const response = await fetch(url);
                if (!response.ok) {
                    return;
                }

                const data = await response.json();
                const feature = data.features && data.features[0];
                if (!feature || !Array.isArray(feature.center) || feature.center.length < 2) {
                    return;
                }

                const [lng, lat] = feature.center;
                if (isCancelled) return;

                if (isValidCoordinate(lat, lng)) {
                    setResolvedCoords({ lat, lng });
                } else {
                    setResolvedCoords(null);
                }
            } catch (error) {
                if (!isCancelled) {
                    console.error('Error geocoding property location:', error);
                    setResolvedCoords(null);
                }
            }
        };

        geocodeLocation();

        return () => {
            isCancelled = true;
        };
    }, [property]);

    // Fetch nearby properties
    useEffect(() => {
        const fetchNearbyProperties = async () => {
            if (!property || !resolvedCoords) {
                setLoading(false);
                return;
            }

            const latitude = resolvedCoords.lat;
            const longitude = resolvedCoords.lng;

            try {
                setLoading(true);
                // Fetch a large set of active properties (so that all posted
                // listings with valid coordinates can appear on the map)
                // Note: Backend already filters by is_active=1, so we don't need status parameter
                // Status parameter only accepts 'sale' or 'rent', not 'active'
                const response = await propertiesAPI.list({ 
                    limit: 100 // Backend MAX_PAGE_SIZE is 100
                });

                if (response.success && response.data && response.data.properties) {
                    console.log('📊 Total properties fetched:', response.data.properties.length);
                    
                    // Filter properties that have valid coordinates and are nearby (within 10km)
                    const nearby = response.data.properties
                        .filter(prop => {
                            // Skip current property
                            if (prop.id === property.id) {
                                console.log('⏭️ Skipping current property:', prop.id);
                                return false;
                            }
                            
                            // Check if property has valid coordinates
                            const propLat = parseCoordinate(prop.latitude);
                            const propLng = parseCoordinate(prop.longitude);
                            if (!isValidCoordinate(propLat, propLng)) {
                                console.log('❌ Property missing coordinates:', prop.id, prop.title, 'lat:', prop.latitude, 'lng:', prop.longitude);
                                return false;
                            }

                            console.log('✅ Property with valid coordinates:', prop.id, prop.title);
                            // No distance limit: show all properties with valid
                            // coordinates anywhere on the map
                            return true;
                        })
                        .map(prop => {
                            const propLat = parseCoordinate(prop.latitude);
                            const propLng = parseCoordinate(prop.longitude);
                            
                            // Handle status format (could be 'sale'/'rent' or 'For Sale'/'For Rent')
                            let listingType = 'sale';
                            if (prop.status) {
                                const statusLower = prop.status.toLowerCase();
                                if (statusLower.includes('rent')) {
                                    listingType = 'rent';
                                } else if (statusLower.includes('sale')) {
                                    listingType = 'sale';
                                }
                            }
                            
                            // Handle images - could be array of strings or array of objects
                            let thumbnail = null;
                            let images = [];
                            if (prop.images && Array.isArray(prop.images) && prop.images.length > 0) {
                                if (typeof prop.images[0] === 'string') {
                                    thumbnail = prop.images[0];
                                    images = prop.images.map(url => ({ url, alt: prop.title }));
                                } else if (prop.images[0].url) {
                                    thumbnail = prop.images[0].url;
                                    images = prop.images;
                                }
                            } else if (prop.cover_image) {
                                thumbnail = prop.cover_image;
                                images = [{ url: prop.cover_image, alt: prop.title }];
                            }
                            
                            return {
                                id: prop.id,
                                title: prop.title,
                                location: prop.location,
                                price: parsePrice(prop.price),
                                area: prop.area,
                                bedrooms: prop.bedrooms,
                                bathrooms: prop.bathrooms,
                                listing_type: listingType,
                                property_type: prop.property_type,
                                latitude: propLat,
                                longitude: propLng,
                                thumbnail: thumbnail,
                                images: images,
                                cover_image: thumbnail,
                                seller_id: prop.user_id || prop.seller_id
                            };
                        });

                    console.log('🗺️ Nearby properties to display on map:', nearby.length);
                    console.log('📍 Nearby properties details:', nearby.map(p => ({ id: p.id, title: p.title, lat: p.latitude, lng: p.longitude })));
                    setNearbyProperties(nearby);
                } else {
                    console.log('⚠️ No properties in response:', response);
                }
            } catch (error) {
                console.error('Error fetching nearby properties:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNearbyProperties();
    }, [property, resolvedCoords]);

    // Use resolved coordinates (from DB or geocoding) for map rendering
    const latitude = resolvedCoords?.lat ?? null;
    const longitude = resolvedCoords?.lng ?? null;
    const hasValidCoordinates = isValidCoordinate(latitude, longitude);

    // Convert current property data to MapView format
    const currentPropertyData = property && hasValidCoordinates ? {
        id: property.id,
        title: property.title,
        location: property.location,
        price: parsePrice(property.price),
        area: property.area,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        listing_type: property.status === 'For Rent' ? 'rent' : 'sale',
        property_type: property.type,
        latitude: latitude,
        longitude: longitude,
        thumbnail: property.images && property.images.length > 0 
            ? property.images[0].url 
            : null,
        images: property.images,
        cover_image: property.images && property.images.length > 0 
            ? property.images[0].url 
            : null,
        seller_id: property.seller_id
    } : null;

    // Combine current property with nearby properties
    const mapProperties = currentPropertyData 
        ? [currentPropertyData, ...nearbyProperties]
        : nearbyProperties;

    console.log('🗺️ Final mapProperties to display:', mapProperties.length);
    console.log('📍 Map properties details:', mapProperties.map(p => ({ 
        id: p.id, 
        title: p.title, 
        lat: p.latitude, 
        lng: p.longitude,
        isCurrent: p.id === property?.id 
    })));

    // Calculate center from seller's uploaded coordinates or use default
    const mapCenter = hasValidCoordinates
        ? [longitude, latitude] // Note: Mapbox uses [lng, lat] format
        : [78.9629, 20.5937]; // Default: India center

    const mapZoom = hasValidCoordinates ? 14 : 5;

    return (
        <div className="map-card-container">
            <h3>Property Location</h3>
            <div className="map-embed-area" aria-label={`Map for ${property?.location || 'Property'}`}>
                {property && hasValidCoordinates ? (
                    <MapView
                        properties={mapProperties}
                        center={mapCenter}
                        zoom={mapZoom}
                        showControls={true}
                        interactive={true}
                        currentPropertyId={property.id}
                        onPropertyClick={(prop) => {
                            // Handle property click if needed
                            console.log('Property clicked:', prop);
                        }}
                    />
                ) : (
                    <p className="map-placeholder-text">
                        Map Feature Placeholder: Location for <strong>{property?.location || 'this property'}</strong>
                    </p>
                )}
            </div>
        </div>
    );
}

// --- Main Page Component ---
// BUYER DASHBOARD - Property Details Page Component
// This component is specifically for buyers to view property details and send inquiries
// Routes: /details/:id, /buyer-dashboard/details/:id, /seller-dashboard/details/:id
const ViewDetailsPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const location = useLocation();
    
    // Get the property ID from URL parameter (for buyer routes) or extract from pathname (for seller dashboard catch-all route)
    const { id: routeId } = useParams();
    
    // Extract ID from pathname if route params don't work (seller dashboard uses catch-all route)
    let propertyId;
    if (routeId) {
        // Standard route parameter (buyer dashboard)
        propertyId = parseInt(routeId, 10);
    } else {
        // Extract from pathname (seller dashboard catch-all route)
        // Path format: /seller-dashboard/details/123
        const pathMatch = location.pathname.match(/\/details\/(\d+)/);
        if (pathMatch) {
            propertyId = parseInt(pathMatch[1], 10);
        } else {
            propertyId = null;
        }
    }

    // State for property data from API
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch property details from API
    useEffect(() => {
        const fetchProperty = async () => {
            try {
                setLoading(true);
                const response = await propertiesAPI.getDetails(propertyId);
                
                if (response.success && response.data && response.data.property) {
                    const prop = response.data.property;
                    
                    // Resolve receiverId and receiverRole STRICTLY based on property owner's user_type
                    // NO fallback, NO manual selection - ONLY from property data
                    let receiverId, receiverRole;
                    const ownerUserType = prop.user_type || prop.seller?.user_type;
                    
                    if (ownerUserType === 'agent') {
                        // Property owner is an agent
                        receiverId = prop.user_id || prop.seller?.id;
                        receiverRole = 'agent';
                    } else {
                        // Property owner is a seller
                        receiverId = prop.user_id || prop.seller?.id;
                        receiverRole = 'seller';
                    }
                    
                    if (!receiverId) {
                        console.error('Cannot determine receiver from property data:', prop);
                    }
                    
                    // Convert backend format to frontend format
                    const formattedProperty = {
                        id: prop.id,
                        title: prop.title,
                        location: prop.location,
                        price: parseFloat(prop.price),
                        area: parseFloat(prop.area),
                        bedrooms: prop.bedrooms,
                        bathrooms: prop.bathrooms,
                        status: prop.status === 'sale' ? 'For Sale' : 'For Rent',
                        type: prop.property_type,
                        property_type: prop.property_type,
                        description: prop.description || '',
                        amenities: Array.isArray(prop.amenities) ? prop.amenities : (prop.amenities ? prop.amenities.split(',') : []),
                        images: Array.isArray(prop.images) && prop.images.length > 0 
                            ? prop.images.map((img, idx) => ({ id: idx + 1, url: img, alt: prop.title }))
                            : (prop.cover_image ? [{ id: 1, url: prop.cover_image, alt: prop.title }] : []),
                        latitude: prop.latitude,
                        longitude: prop.longitude,
                        created_at: prop.created_at || prop.createdAt || null,
                        price_negotiable: prop.price_negotiable || prop.priceNegotiable || false,
                        maintenance_charges: prop.maintenance_charges || prop.maintenanceCharges || null,
                        deposit_amount: prop.deposit_amount || prop.depositAmount || null,
                        // Additional property details
                        balconies: prop.balconies || null,
                        floor: prop.floor || null,
                        total_floors: prop.total_floors || null,
                        totalFloors: prop.total_floors || null,
                        facing: prop.facing || null,
                        age: prop.age || null,
                        furnishing: prop.furnishing || null,
                        carpet_area: prop.carpet_area || null,
                        carpetArea: prop.carpet_area || null,
                        state: prop.state || null,
                        additional_address: prop.additional_address || null,
                        additionalAddress: prop.additional_address || null,
                        seller_id: receiverId, // Keep for backward compatibility
                        agent_id: ownerUserType === 'agent' ? receiverId : null,
                        user_type: ownerUserType, // Property owner's user_type
                        receiverId: receiverId,
                        receiverRole: receiverRole,
                        seller_name: prop.seller?.full_name || prop.seller?.name || 'Property Owner',
                        seller_email: prop.seller?.email || '',
                        seller_phone: prop.seller?.phone || ''
                    };
                    setProperty(formattedProperty);
                } else {
                    console.error('Property not found or invalid response:', response);
                    setError('Property not found');
                }
            } catch (err) {
                console.error('Error fetching property:', err);
                setError(err.message || 'Failed to load property details');
            } finally {
                setLoading(false);
            }
        };

        if (propertyId) {
            fetchProperty();
        } else {
            setError('Invalid property ID');
            setLoading(false);
        }
    }, [propertyId]);

    // Get property details (will be null until loaded)
    const propertyData = property ? getPropertyDetails(property) : null;

    // Safely calculate image count for hook dependencies
    const imageCount = propertyData?.images?.length || 0; 

    // --- 1. DEFINE ALL STATE HOOKS UNCONDITIONALLY ---
    const [currentImageIndex, setCurrentImageIndex] = useState(null);
    
    // Favorite State
    const [isFavorited, setIsFavorited] = useState(false);
    
    // Share State
    const [showToast, setShowToast] = useState(false);
    
    // Owner Details State
    const [showOwnerDetails, setShowOwnerDetails] = useState(false);
    
    // Interaction Limits State
    const [ownerDetailsLimit, setOwnerDetailsLimit] = useState({
        remaining: 5,
        max: 5,
        used: 0,
        canPerform: true,
        resetTime: null,
        resetTimeSeconds: null
    });
    const [chatLimit, setChatLimit] = useState({
        remaining: 5,
        max: 5,
        used: 0,
        canPerform: true,
        resetTime: null,
        resetTimeSeconds: null
    });
    const [loadingLimits, setLoadingLimits] = useState(false);
    
    // --- 2. DEFINE ALL CALLBACK HOOKS UNCONDITIONALLY ---
    
    const openSlider = useCallback((index) => {
        if (imageCount > 0) { // Safety check
            setCurrentImageIndex(index);
        }
    }, [imageCount]);

    const closeSlider = useCallback(() => {
        setCurrentImageIndex(null);
    }, []);

    const nextImage = useCallback(() => {
        if (imageCount === 0) return; // Safety check
        setCurrentImageIndex((prevIndex) => 
            (prevIndex + 1) % imageCount
        );
    }, [imageCount]); // Dependency is now the safe 'imageCount'

    const prevImage = useCallback(() => {
        if (imageCount === 0) return; // Safety check
        setCurrentImageIndex((prevIndex) => 
            (prevIndex - 1 + imageCount) % imageCount
        );
    }, [imageCount]); // Dependency is now the safe 'imageCount'

    // Handler for the Back Button
    const handleBack = useCallback(() => {
        // Navigates back one step in the browser history
        window.history.back(); 
    }, []);

    // Fetch interaction limits
    const fetchInteractionLimits = useCallback(async () => {
        if (!user || user.user_type !== 'buyer' || !propertyId) return;
        
        try {
            setLoadingLimits(true);
            const [ownerDetailsResponse, chatResponse] = await Promise.all([
                buyerInteractionsAPI.checkLimit(propertyId, 'view_owner'),
                buyerInteractionsAPI.checkLimit(propertyId, 'chat_owner')
            ]);
            
            if (ownerDetailsResponse.success) {
                setOwnerDetailsLimit({
                    remaining: ownerDetailsResponse.data.remaining_attempts,
                    max: ownerDetailsResponse.data.max_attempts,
                    used: ownerDetailsResponse.data.used_attempts,
                    canPerform: ownerDetailsResponse.data.can_perform_action,
                    resetTime: ownerDetailsResponse.data.reset_time,
                    resetTimeSeconds: ownerDetailsResponse.data.reset_time_seconds
                });
            }
            
            if (chatResponse.success) {
                setChatLimit({
                    remaining: chatResponse.data.remaining_attempts,
                    max: chatResponse.data.max_attempts,
                    used: chatResponse.data.used_attempts,
                    canPerform: chatResponse.data.can_perform_action,
                    resetTime: chatResponse.data.reset_time,
                    resetTimeSeconds: chatResponse.data.reset_time_seconds
                });
            }
        } catch (error) {
            console.error('Error fetching interaction limits:', error);
            // Don't block user if limit check fails - allow action but log error
        } finally {
            setLoadingLimits(false);
        }
    }, [user, propertyId]);

    // Fetch interaction limits when property and user are available
    useEffect(() => {
        if (property && user && user.user_type === 'buyer') {
            fetchInteractionLimits();
        }
    }, [property, user, fetchInteractionLimits]);

    // Update timer display every minute
    useEffect(() => {
        if (!user || user.user_type !== 'buyer') return;
        
        const interval = setInterval(() => {
            // Re-fetch limits to update timers
            if (propertyId) {
                fetchInteractionLimits();
            }
        }, 60000); // Update every minute
        
        return () => clearInterval(interval);
    }, [user, propertyId, fetchInteractionLimits]);

    // Format time remaining helper
    const formatTimeRemaining = (resetTimeSeconds) => {
        if (!resetTimeSeconds) return null;
        const now = Math.floor(Date.now() / 1000);
        const remaining = resetTimeSeconds - now;
        
        if (remaining <= 0) return null;
        
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    // Handler for Show Owner Details button
    const handleShowOwnerDetails = useCallback(async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!user) {
            alert('Please login to view owner details');
            navigate('/login');
            return;
        }

        if (user.user_type !== 'buyer') {
            alert('Only buyers can view owner details');
            return;
        }

        // If currently showing, just hide without recording interaction
        if (showOwnerDetails) {
            setShowOwnerDetails(false);
            return;
        }

        // If hiding (current state), we need to show - check limits first
        // Check if limit is reached
        if (!ownerDetailsLimit.canPerform) {
            const resetMsg = ownerDetailsLimit.resetTimeSeconds 
                ? formatTimeRemaining(ownerDetailsLimit.resetTimeSeconds)
                : '24 hours';
            alert(`You have reached the maximum limit of ${ownerDetailsLimit.max} attempts to view owner details. Please try again after ${resetMsg}.`);
            return;
        }

        try {
            // Record the interaction (only when showing, not when hiding)
            const response = await buyerInteractionsAPI.recordInteraction(propertyId, 'view_owner');
            
            if (response.success) {
                // Update limit state
                setOwnerDetailsLimit({
                    remaining: response.data.remaining_attempts,
                    max: response.data.max_attempts,
                    used: response.data.used_attempts,
                    canPerform: response.data.remaining_attempts > 0,
                    resetTime: response.data.reset_time,
                    resetTimeSeconds: response.data.reset_time_seconds
                });
                
                // Show owner details display
                setShowOwnerDetails(true);
            } else {
                console.error('Failed to record interaction:', response);
                alert(response.message || 'Failed to record interaction');
            }
        } catch (error) {
            console.error('Error recording interaction:', error);
            
            // Check if it's a rate limit error
            if (error.status === 429 && error.data) {
                setOwnerDetailsLimit({
                    remaining: error.data.remaining_attempts || 0,
                    max: error.data.max_attempts || 5,
                    used: error.data.used_attempts || 5,
                    canPerform: false,
                    resetTime: error.data.reset_time,
                    resetTimeSeconds: error.data.reset_time_seconds
                });
                const resetMsg = error.data.reset_time_seconds 
                    ? formatTimeRemaining(error.data.reset_time_seconds)
                    : '24 hours';
                alert(error.data.message || `You have reached the maximum limit. Please try again after ${resetMsg}.`);
            } else {
                // Show more detailed error message
                const errorMsg = error.message || error.data?.message || 'Failed to view owner details. Please try again.';
                console.error('Full error details:', error);
                alert(errorMsg);
            }
        }
    }, [user, propertyId, ownerDetailsLimit, showOwnerDetails, navigate]);

    // Handler for Chat with Owner button
    const handleChatWithOwner = useCallback(async () => {
        if (!user) {
            alert('Please login to chat with the owner');
            navigate('/login');
            return;
        }

        if (user.user_type !== 'buyer') {
            alert('Only buyers can chat with property owners');
            return;
        }

        // Check if limit is reached
        if (!chatLimit.canPerform) {
            const resetMsg = chatLimit.resetTimeSeconds 
                ? formatTimeRemaining(chatLimit.resetTimeSeconds)
                : '24 hours';
            alert(`You have reached the maximum limit of ${chatLimit.max} attempts to chat with the owner. Please try again after ${resetMsg}.`);
            return;
        }

        // Resolve receiverId and receiverRole STRICTLY based on property owner's user_type
        // NO fallback, NO manual selection - ONLY from property data
        let receiverId, receiverRole;
        const ownerUserType = property.user_type || property.seller?.user_type;
        
        if (ownerUserType === 'agent') {
            // Property owner is an agent
            receiverId = property.user_id || property.receiverId || property.seller_id;
            receiverRole = 'agent';
        } else {
            // Property owner is a seller
            receiverId = property.user_id || property.receiverId || property.seller_id;
            receiverRole = 'seller';
        }

        if (!property || !receiverId) {
            alert('Property owner information not available');
            return;
        }

        // Check if user is trying to chat with themselves (convert to numbers for comparison)
        if (Number(user.id) === Number(receiverId)) {
            alert('You cannot chat with yourself. This is your property.');
            return;
        }

        try {
            // Record the interaction BEFORE navigating
            const response = await buyerInteractionsAPI.recordInteraction(propertyId, 'chat_owner');
            
            if (response.success) {
                // Update limit state
                setChatLimit({
                    remaining: response.data.remaining_attempts,
                    max: response.data.max_attempts,
                    used: response.data.used_attempts,
                    canPerform: response.data.remaining_attempts > 0,
                    resetTime: response.data.reset_time,
                    resetTimeSeconds: response.data.reset_time_seconds
                });
                
                // Do NOT create chat room here - it will be created when first message is sent
                // Generate chat room ID deterministically for navigation purposes only
                const { generateChatRoomId } = await import('../../services/firebase.service');
                const firebaseChatRoomId = generateChatRoomId(
                    user.id,
                    receiverId,
                    propertyId
                );

                // Get owner name from property
                const ownerName = property?.seller_name || property?.seller?.name || property?.seller?.full_name || 'Property Owner';
                
                // Navigate to chat page with chat room ID and owner name for immediate display
                // The owner name is passed via URL so ChatUs can display it immediately
                // Chat room will be created when first message is sent
                const encodedOwnerName = encodeURIComponent(ownerName);
                navigate(`/ChatUs?chatId=${firebaseChatRoomId}&ownerName=${encodedOwnerName}&propertyId=${propertyId}`);
            } else {
                alert(response.message || 'Failed to start chat');
            }
        } catch (error) {
            console.error('Error starting chat:', error);
            
            // Check if it's a rate limit error
            if (error.status === 429 && error.data) {
                setChatLimit({
                    remaining: error.data.remaining_attempts || 0,
                    max: error.data.max_attempts || 5,
                    used: error.data.used_attempts || 5,
                    canPerform: false,
                    resetTime: error.data.reset_time,
                    resetTimeSeconds: error.data.reset_time_seconds
                });
                const resetMsg = error.data.reset_time_seconds 
                    ? formatTimeRemaining(error.data.reset_time_seconds)
                    : '24 hours';
                alert(error.data.message || `You have reached the maximum limit. Please try again after ${resetMsg}.`);
            } else {
                const errorMessage = error.message || 'Failed to start chat. Please try again.';
                alert(errorMessage);
            }
        }
    }, [user, property, propertyId, navigate, chatLimit]);

    // Handle favorite button click
    const handleFavoriteClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!user) {
            alert('Please login to add properties to favorites');
            navigate('/login');
            return;
        }
        
        try {
            // Import favoritesAPI dynamically to avoid circular dependencies
            const { favoritesAPI } = await import('../../services/api.service');
            const response = await favoritesAPI.toggle(propertyId);
            
            if (response.success) {
                setIsFavorited(response.data.is_favorite !== undefined ? response.data.is_favorite : !isFavorited);
                // Also update local storage for offline support
                FavoritesManager.toggleFavorite(propertyId);
            } else {
                console.error('Failed to toggle favorite:', response.message);
                alert(response.message || 'Failed to update favorite');
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            // Fallback to local storage if API fails
            FavoritesManager.toggleFavorite(propertyId);
            setIsFavorited(!isFavorited);
        }
    };

    // Copy to clipboard helper function
    const copyToClipboard = async (text) => {
        try {
            // Try modern clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2000);
                return;
            }
            
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 2000);
                } else {
                    throw new Error('execCommand failed');
                }
            } finally {
                document.body.removeChild(textArea);
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            // Last resort: show the link in a prompt
            const userConfirmed = window.confirm(`Share this property link:\n\n${text}\n\nClick OK to copy, then paste it manually.`);
            if (userConfirmed) {
                // Try one more time with clipboard API
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(text);
                        setShowToast(true);
                        setTimeout(() => setShowToast(false), 2000);
                    }
                } catch (finalError) {
                    console.error('Final clipboard attempt failed:', finalError);
                }
            }
        }
    };

    // Handle share button click
    const handleShareClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!property || !property.id) {
            console.error('Cannot share: property ID is missing');
            return;
        }

        const shareUrl = `${window.location.origin}/details/${property.id}`;
        const shareData = {
            title: property.title || 'Property Listing',
            text: `Check out this property: ${property.title || 'Amazing Property'}`,
            url: shareUrl
        };

        // Check if Web Share API is supported (works great on mobile)
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                console.log('Share successful');
            } catch (error) {
                // User cancelled or error occurred
                if (error.name !== 'AbortError') {
                    console.error('Error sharing:', error);
                    // Fallback to clipboard
                    await copyToClipboard(shareUrl);
                }
            }
        } else {
            // Fallback: Copy to clipboard for desktop
            await copyToClipboard(shareUrl);
        }
    };
    

    // --- 3. DEFINE ALL useEffect HOOKS UNCONDITIONALLY ---
    
    // Check favorite status on mount and when property changes
    useEffect(() => {
        const checkFavoriteStatus = async () => {
            if (!propertyId) return;
            
            try {
                // Check local storage first for quick display
                const localFavorite = FavoritesManager.isFavorite(propertyId);
                setIsFavorited(localFavorite);
                
                // Then verify with API if user is authenticated
                const token = localStorage.getItem('authToken');
                if (token && user) {
                    const { favoritesAPI } = await import('../../services/api.service');
                    const response = await favoritesAPI.list();
                    if (response.success && response.data) {
                        // API returns properties array (not favorites array)
                        const properties = response.data.properties || response.data.favorites || [];
                        const favoriteIds = properties.map(p => p.id || p.property_id);
                        setIsFavorited(favoriteIds.includes(propertyId));
                    }
                }
            } catch (error) {
                console.error('Error checking favorite status:', error);
                // Fallback to local storage
                setIsFavorited(FavoritesManager.isFavorite(propertyId));
            }
        };
        
        checkFavoriteStatus();
    }, [propertyId, user]);
    
    // Keyboard navigation for slider
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (currentImageIndex === null) return;
            
            if (e.key === 'Escape') {
                closeSlider();
            } else if (e.key === 'ArrowLeft') {
                prevImage();
            } else if (e.key === 'ArrowRight') {
                nextImage();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [currentImageIndex, closeSlider, nextImage, prevImage]);

    // --- 4. CONDITIONAL RENDERING / REDIRECT BASED ON DATA ---

    if (loading) {
        return (
            <div className="details-wrapper">
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <p>Loading property details...</p>
                </div>
            </div>
        );
    }

    // Only redirect if there's an actual error (not just loading state)
    if (error) {
        return (
            <div className="details-wrapper">
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: '#c33', marginBottom: '1rem' }}>Error: {error}</p>
                    <button onClick={() => window.history.back()} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (!property || !propertyData) {
        // Show error message instead of redirecting
        return (
            <div className="details-wrapper">
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: '#c33', marginBottom: '1rem' }}>Property not found</p>
                    <button onClick={() => window.history.back()} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // --- 5. CALCULATIONS & NORMAL JS LOGIC ---
    
    // Calculate number of thumbnails and extra images (Airbnb style: 1 main + 4 thumbnails)
    const thumbnailImages = propertyData.images.slice(1, 5); // Get the next 4 images
    const remainingCount = propertyData.images.length - 5; // Count any extras beyond the 5 visible

    // --- 6. RENDER THE JSX ---
    
    return (
        <div className="details-wrapper">
            <main className="view-details-page">
                {/* Property Title and Location Container - Above Photos */}
                <div className="title-location-container">
                    <div className="details-container">
                        {/* Favorite and Share Buttons - Right Side */}
                        <div className="details-container-actions">
                            <button 
                                className={`buyer-favourite-btn ${isFavorited ? 'active' : ''}`}
                                onClick={handleFavoriteClick}
                                aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                                title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                            >
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    width="20" 
                                    height="20" 
                                    viewBox="0 0 24 24" 
                                    fill={isFavorited ? 'white' : 'none'}
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                >
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                            </button>
                            <button 
                                className="buyer-share-btn"
                                onClick={handleShareClick}
                                aria-label="Share"
                                title="Share"
                            >
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
                                    <circle cx="18" cy="5" r="3"></circle>
                                    <circle cx="6" cy="12" r="3"></circle>
                                    <circle cx="18" cy="19" r="3"></circle>
                                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                                </svg>
                            </button>
                        </div>
                        
                        <header className="property-header">
                            <div className="header-top-row">
                                {/* Status Text on Left */}
                                <div className="header-status-left">
                                    <span className={`property-status-text ${propertyData.status === 'For Sale' ? 'property-for-sale' : propertyData.status === 'For Rent' ? 'property-for-rent' : ''}`}>
                                        {propertyData.status}
                                    </span>
                                    <span className="listed-since-text">Listed since {propertyData.listedSince || 'Recently'}</span>
                                </div>
                                
                                {/* Title and Location Centered */}
                                <div className="header-center">
                                    <h1>{propertyData.title}</h1>
                                    <div className="property-location-row">
                                        <p className="property-location">{propertyData.location}</p>
                                    </div>
                                </div>
                            </div>
                        </header>
                    </div>
                </div>

                {/* Image Gallery Container - Separate Container */}
                <div className="image-gallery-container">
                    <div className="image-gallery">
                        {/* Main Image (Large Left) */}
                        <div className="main-image" onClick={() => openSlider(0)}>
                            <img src={propertyData.images[0]?.url || ''} alt={propertyData.images[0]?.alt || propertyData.title} />
                        </div>

                        {/* Thumbnails Grid (Right Side) */}
                        <div className="thumbnail-gallery">
                            {thumbnailImages.map((image, index) => (
                                <div 
                                    key={image.id} 
                                    className="thumbnail" 
                                    onClick={() => openSlider(index + 1)} 
                                >
                                    <img src={image.url} alt={image.alt} />
                                    {index === 3 && remainingCount >= 0 && (
                                        <div className="view-more-overlay">
                                            <span>Show all {propertyData.images.length} photos</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="details-container">
                    <div className="main-content-area">
                        {/* Price Display - Top of Main Content */}
                        <div className="property-price-section">
                            <h2 className="price-section-heading">Price</h2>
                            <div className="property-price-display">
                                <span className="price-amount">{propertyData.price}</span>
                                {propertyData.status === 'For Rent' && (
                                    <span className="price-period">per month</span>
                                )}
                            </div>
                        </div>

                        {/* Property Highlights and Contact Card Side by Side */}
                        <div className="highlights-contact-wrapper">
                            {/* Property Highlights */}
                            <div className="property-highlights">
                                {(() => {
                                    const showBedrooms = shouldShowFeature(propertyData.type, 'bedrooms');
                                    const showBathrooms = shouldShowFeature(propertyData.type, 'bathrooms');
                                    
                                    return (
                                        <>
                                            {showBedrooms && propertyData.bedrooms && (
                                                <div className="highlight-item">
                                                    <FaBed className="highlight-icon" />
                                                    <div className="highlight-content">
                                                        <span className="highlight-value">{propertyData.bedrooms}</span>
                                                        <span className="highlight-label">bedroom{propertyData.bedrooms !== 1 ? 's' : ''}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {showBathrooms && propertyData.bathrooms && (
                                                <div className="highlight-item">
                                                    <FaShower className="highlight-icon" />
                                                    <div className="highlight-content">
                                                        <span className="highlight-value">{propertyData.bathrooms}</span>
                                                        <span className="highlight-label">bathroom{propertyData.bathrooms !== 1 ? 's' : ''}</span>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="highlight-item">
                                                <FaRulerCombined className="highlight-icon" />
                                                <div className="highlight-content">
                                                    <span className="highlight-value">{propertyData.area}</span>
                                                    <span className="highlight-label">area</span>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Contact Card */}
                            <aside className="agent-sidebar">
                                <div className="detail-contact-card">
                                    {/* Owner Details Button */}
                                    {property && property.seller_id && (
                                        <>
                                            <div style={{marginBottom: '1rem'}}>
                                                <button 
                                                    type="button"
                                                    onClick={handleShowOwnerDetails}
                                                    className="contact-send-button"
                                                    disabled={(!showOwnerDetails && !ownerDetailsLimit.canPerform) || loadingLimits}
                                                    style={{
                                                        marginTop: '0',
                                                        marginBottom: '0.5rem',
                                                        opacity: ((!showOwnerDetails && !ownerDetailsLimit.canPerform) || loadingLimits) ? 0.6 : 1,
                                                        cursor: ((!showOwnerDetails && !ownerDetailsLimit.canPerform) || loadingLimits) ? 'not-allowed' : 'pointer'
                                                    }}
                                                >
                                                    <FaUser style={{marginRight: '8px'}} />
                                                    {showOwnerDetails ? 'Hide Owner Details' : 'Show Owner Details'}
                                                </button>
                                                
                                                {/* Usage Limit Display */}
                                                {user && user.user_type === 'buyer' && (
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        color: ownerDetailsLimit.canPerform ? '#666' : '#ef4444',
                                                        marginTop: '0.25rem',
                                                        padding: '0.25rem 0.5rem',
                                                        backgroundColor: ownerDetailsLimit.canPerform ? '#f3f4f6' : '#fee2e2',
                                                        borderRadius: '4px'
                                                    }}>
                                                        {ownerDetailsLimit.remaining} / {ownerDetailsLimit.max} attempts left
                                                        {ownerDetailsLimit.resetTimeSeconds && (
                                                            <span style={{display: 'block', marginTop: '0.125rem'}}>
                                                                Resets in 24 hours
                                                            </span>
                                                        )}
                                                        {!ownerDetailsLimit.canPerform && (
                                                            <span style={{display: 'block', marginTop: '0.125rem', fontWeight: 'bold'}}>
                                                                Limit reached
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {showOwnerDetails && (
                                                <div className="owner-details-section">
                                                    {property.seller_name ? (
                                                        <div className="owner-detail-item">
                                                            <span className="owner-detail-label">Name:</span>
                                                            <span className="owner-detail-value">{property.seller_name}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="owner-detail-item">
                                                            <span className="owner-detail-label">Name:</span>
                                                            <span className="owner-detail-value">Not available</span>
                                                        </div>
                                                    )}
                                                    {property.seller_phone ? (
                                                        <div className="owner-detail-item">
                                                            <span className="owner-detail-label">Phone:</span>
                                                            <a href={`tel:${property.seller_phone}`} className="owner-detail-value owner-detail-link">
                                                                {property.seller_phone}
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <div className="owner-detail-item">
                                                            <span className="owner-detail-label">Phone:</span>
                                                            <span className="owner-detail-value">Not available</span>
                                                        </div>
                                                    )}
                                                    {property.seller_email ? (
                                                        <div className="owner-detail-item">
                                                            <span className="owner-detail-label">Email:</span>
                                                            <a href={`mailto:${property.seller_email}`} className="owner-detail-value owner-detail-link">
                                                                {property.seller_email}
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <div className="owner-detail-item">
                                                            <span className="owner-detail-label">Email:</span>
                                                            <span className="owner-detail-value">Not available</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                    
                                    {/* Chat with Owner Button - Only show if user is buyer AND not the property owner */}
                                    {user && user.user_type === 'buyer' && property && property.seller_id && Number(user.id) !== Number(property.seller_id) && (
                                        <div style={{marginTop: showOwnerDetails ? '1rem' : '0'}}>
                                            <button 
                                                type="button"
                                                onClick={handleChatWithOwner}
                                                className="contact-send-button"
                                                disabled={!chatLimit.canPerform || loadingLimits}
                                                style={{
                                                    opacity: (!chatLimit.canPerform || loadingLimits) ? 0.6 : 1,
                                                    cursor: (!chatLimit.canPerform || loadingLimits) ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                <FaComments style={{marginRight: '8px'}} />
                                                Chat with Owner
                                            </button>
                                            
                                            {/* Usage Limit Display */}
                                            <div style={{
                                                fontSize: '12px',
                                                color: chatLimit.canPerform ? '#666' : '#ef4444',
                                                marginTop: '0.5rem',
                                                padding: '0.5rem',
                                                backgroundColor: chatLimit.canPerform ? '#f3f4f6' : '#fee2e2',
                                                borderRadius: '4px'
                                            }}>
                                                <div style={{fontWeight: '500', marginBottom: '0.25rem'}}>
                                                    {chatLimit.remaining} / {chatLimit.max} attempts left
                                                </div>
                                                {chatLimit.resetTimeSeconds && (
                                                    <div style={{fontSize: '11px', color: '#666'}}>
                                                        Resets in 24 hours
                                                    </div>
                                                )}
                                                {!chatLimit.canPerform && (
                                                    <div style={{fontSize: '11px', color: '#ef4444', marginTop: '0.25rem', fontWeight: '500'}}>
                                                        Limit reached. Please try again after the reset time.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </aside>
                        </div>

                        {/* Property Details Section - Full Width */}
                        <div className="property-details-full-section">
                            <h2>Property Details</h2>
                            <div className="property-details-grid">
                                {propertyData.propertyType && (
                                    <div className="property-detail-item">
                                        <span className="property-detail-label">Property Type</span>
                                        <span className="property-detail-value">{propertyData.propertyType}</span>
                                    </div>
                                )}
                                {propertyData.bedrooms && shouldShowFeature(propertyData.type, 'bedrooms') && (
                                    <div className="property-detail-item">
                                        <span className="property-detail-label">Bedrooms</span>
                                        <span className="property-detail-value">{propertyData.bedrooms}</span>
                                    </div>
                                )}
                                {propertyData.bathrooms && shouldShowFeature(propertyData.type, 'bathrooms') && (
                                    <div className="property-detail-item">
                                        <span className="property-detail-label">Bathrooms</span>
                                        <span className="property-detail-value">{propertyData.bathrooms}</span>
                                    </div>
                                )}
                                {propertyData.balconies && (
                                    <div className="property-detail-item">
                                        <span className="property-detail-label">Balconies</span>
                                        <span className="property-detail-value">{propertyData.balconies}</span>
                                    </div>
                                )}
                                {propertyData.area && (
                                    <div className="property-detail-item">
                                        <span className="property-detail-label">Built-up Area</span>
                                        <span className="property-detail-value">{propertyData.area}</span>
                                    </div>
                                )}
                                {propertyData.carpetArea && (
                                    <div className="property-detail-item">
                                        <span className="property-detail-label">Carpet Area</span>
                                        <span className="property-detail-value">{propertyData.carpetArea}</span>
                                    </div>
                                )}
                                {propertyData.floor && (
                                    <div className="property-detail-item">
                                        <span className="property-detail-label">Floor</span>
                                        <span className="property-detail-value">{propertyData.floor}</span>
                                    </div>
                                )}
                                {propertyData.totalFloors && (
                                    <div className="property-detail-item">
                                        <span className="property-detail-label">Total Floors</span>
                                        <span className="property-detail-value">{propertyData.totalFloors}</span>
                                    </div>
                                )}
                                {propertyData.facing && (
                                    <div className="property-detail-item">
                                        <span className="property-detail-label">Facing</span>
                                        <span className="property-detail-value">{propertyData.facing}</span>
                                    </div>
                                )}
                                {propertyData.age && (
                                    <div className="property-detail-item">
                                        <span className="property-detail-label">Age</span>
                                        <span className="property-detail-value">{propertyData.age}</span>
                                    </div>
                                )}
                                {propertyData.furnishing && (
                                    <div className="property-detail-item">
                                        <span className="property-detail-label">Furnishing</span>
                                        <span className="property-detail-value">{propertyData.furnishing}</span>
                                    </div>
                                )}
                                {propertyData.state && (
                                    <div className="property-detail-item">
                                        <span className="property-detail-label">State</span>
                                        <span className="property-detail-value">{propertyData.state}</span>
                                    </div>
                                )}
                                {propertyData.additionalAddress && (
                                    <div className="property-detail-item property-detail-item-full">
                                        <span className="property-detail-label">Additional Address</span>
                                        <span className="property-detail-value">{propertyData.additionalAddress}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Amenities Section */}
                            <div className="amenities-section">
                                <h2>What this place offers</h2>
                                <div className="amenities-grid">
                                    {propertyData.amenities.map((amenity, index) => (
                                        <div key={index} className="amenity-item">
                                            <span className="amenity-icon">{getAmenityIcon(amenity)}</span>
                                            <span>{amenity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        
                        {/* Pricing Details - Full Width */}
                        <div className="pricing-details-section">
                            <h2>Pricing Details</h2>
                            <div className="pricing-details-grid">
                                <div className="pricing-detail-item">
                                    <span className="pricing-label">Price Negotiable</span>
                                    <span className={`pricing-value ${propertyData.priceNegotiable ? 'negotiable-yes' : 'negotiable-no'}`}>
                                        {propertyData.priceNegotiable ? 'Yes' : 'No'}
                                    </span>
                                </div>
                                {propertyData.maintenanceCharges && (
                                    <div className="pricing-detail-item">
                                        <span className="pricing-label">Maintenance Charge</span>
                                        <span className="pricing-value">
                                            ₹ {propertyData.maintenanceCharges.toLocaleString('en-IN')}/Month
                                        </span>
                                    </div>
                                )}
                                {propertyData.depositAmount && (
                                    <div className="pricing-detail-item">
                                        <span className="pricing-label">Deposit Amount</span>
                                        <span className="pricing-value">
                                            ₹ {propertyData.depositAmount.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Description - Full Width */}
                        <div className="description-section">
                            <h2>About this place</h2>
                            <p>{propertyData.description}</p>
                        </div>
                    </div>

                    {/* Location Map - Outside property-details-section */}
                    <PropertyMapFeature property={property} />
                </div>
            </main>

            {/* Toast notification for share */}
            {showToast && (
                <div style={{
                    position: 'fixed',
                    bottom: '30px',
                    right: '30px',
                    background: '#1e3a8a',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    zIndex: 10000,
                    fontSize: '14px',
                    fontWeight: '500'
                }}>
                    Link copied!
                </div>
            )}

            {/* Mount the Slider Modal outside the main structure */}
            {currentImageIndex !== null && (
                <ImageSliderModal
                    images={propertyData.images}
                    currentIndex={currentImageIndex}
                    onClose={closeSlider}
                    onNext={nextImage}
                    onPrev={prevImage}
                />
            )}
        </div>
    );
};

export default ViewDetailsPage;
