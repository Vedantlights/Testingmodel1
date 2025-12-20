// fileName: ViewDetailsPage.jsx
// BUYER DASHBOARD - Property Details Page
// This is the buyer-specific view details page with inquiry form functionality
// DO NOT use seller's seller-pro-details.jsx component for buyer routes

import React, { useState, useCallback, useEffect } from 'react'; 
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { FaPhone, FaEnvelope, FaAngleLeft, FaAngleRight, FaBed, FaShower, FaRulerCombined, FaTimes, FaCheckCircle, FaUser, FaCommentAlt, FaComments } from "react-icons/fa";
import '../styles/ViewDetailPage.css';
import { propertiesAPI, chatAPI } from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
// Note: createOrGetChatRoom is not imported here - chat rooms are created only when first message is sent
import MapView from '../../components/Map/MapView';

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
        <div className={`buyer-image-slider-modal-overlay ${isOpen ? 'open' : ''}`}>
            {currentImage && (
                <div className="buyer-image-slider-modal-content">
                    
                    {/* Close Button */}
                    <button className="buyer-slider-close-btn" onClick={onClose} aria-label="Close Slider">
                        <FaTimes />
                    </button>
                    
                    <div className="buyer-slider-controls">
                        {/* Previous Button */}
                        {showControls && (
                            <button className="buyer-slider-prev-btn" onClick={onPrev} aria-label="Previous Image">
                                <FaAngleLeft />
                            </button>
                        )}
                        
                        {/* Main Image */}
                        <img 
                            src={currentImage.url} 
                            alt={currentImage.alt} 
                            className="buyer-slider-main-image" 
                        />

                        {/* Next Button */}
                        {showControls && (
                            <button className="buyer-slider-next-btn" onClick={onNext} aria-label="Next Image">
                                <FaAngleRight />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
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
    
    // Use actual description or generate one
    const description = property.description || `Discover unparalleled living in this magnificent ${property.type || 'property'}. Featuring modern amenities, panoramic city views, and spacious interiors. Perfect blend of comfort and luxury.`;
    
    return {
        title: property.title,
        location: property.location,
        price: property.status === 'For Rent' ? `₹ ${property.price.toLocaleString('en-IN')}/Month` : `₹ ${property.price.toLocaleString('en-IN')}`,
        area: `${property.area?.toLocaleString('en-IN')} sq.ft.`,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        status: property.status,
        description: description,
        amenities: amenities,
        images: images
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
        <div className="buyer-map-card-container">
            <h3>Property Location</h3>
            <div className="buyer-map-embed-area" aria-label={`Map for ${property?.location || 'Property'}`}>
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
                    <p className="buyer-map-placeholder-text">
                        Location coordinates not available for <strong>{property?.location || 'this property'}</strong>
                        <br />
                        <small style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px', display: 'block' }}>
                            The seller has not set the property location on the map.
                        </small>
                    </p>
                )}
            </div>
        </div>
    );
}

// --- Main Page Component ---
// BUYER DASHBOARD - Property Details Page Component
// This component is specifically for buyers to view property details and send inquiries
// Routes: /details/:id, /buyer-dashboard/details/:id
const ViewDetailsPage = () => {
    // Get the property ID from the URL parameter
    const { id } = useParams();
    const propertyId = parseInt(id, 10);
    const navigate = useNavigate();
    const { user } = useAuth();

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
                        description: prop.description || '',
                        amenities: Array.isArray(prop.amenities) ? prop.amenities : (prop.amenities ? prop.amenities.split(',') : []),
                        images: Array.isArray(prop.images) && prop.images.length > 0 
                            ? prop.images.map((img, idx) => ({ id: idx + 1, url: img, alt: prop.title }))
                            : (prop.cover_image ? [{ id: 1, url: prop.cover_image, alt: prop.title }] : []),
                        latitude: prop.latitude,
                        longitude: prop.longitude,
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
    
    // Inquiry Form States
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobile: '',
        message: ''
    });
    const [isSubmitted, setIsSubmitted] = useState(false);
    
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
        } catch (error) {
            console.error('Error navigating to chat:', error);
            const errorMessage = error.message || 'Failed to start chat. Please try again.';
            alert(errorMessage);
        }
    }, [user, property, propertyId, navigate]);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle form submission
    const handleSubmitInquiry = async (e) => {
        e.preventDefault();
        
        try {
            const response = await propertiesAPI.sendInquiry({
                property_id: propertyId,
                name: formData.name,
                email: formData.email,
                mobile: formData.mobile,
                message: formData.message || ''
            });
            
            if (response.success) {
                // Show success message
                setIsSubmitted(true);
                
                // Reset form after 3 seconds
                setTimeout(() => {
                    setIsSubmitted(false);
                    setFormData({
                        name: '',
                        email: '',
                        mobile: '',
                        message: ''
                    });
                }, 3000);
            } else {
                alert('Failed to send inquiry: ' + (response.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Failed to send inquiry:', error);
            alert('Failed to send inquiry. Please try again.');
        }
    };

    // --- 3. DEFINE ALL useEffect HOOKS UNCONDITIONALLY ---
    
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
            <div className="buyer-details-wrapper">
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <p>Loading property details...</p>
                </div>
            </div>
        );
    }

    // Only redirect if there's an actual error (not just loading state)
    if (error) {
        return (
            <div className="buyer-details-wrapper">
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
            <div className="buyer-details-wrapper">
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
    
    // Calculate number of thumbnails and extra images
    const thumbnailImages = propertyData.images.slice(1, 4); // Get the next 3 images
    const remainingCount = propertyData.images.length - 4; // Count any extras

    // --- 6. RENDER THE JSX ---
    
    return (
        <div className="buyer-details-wrapper">
            <main className="buyer-view-details-page">
                <div className="buyer-details-container">

                    {/* Back Button */}
                    <button className="buyer-back-button" onClick={handleBack}>
                        <FaAngleLeft />
                    </button>

                    {/* Property Header - ENHANCED */}
                    <header className="buyer-property-header">
                        <div className="buyer-header-badges">
                            <button 
                                className={`buyer-status-badge ${propertyData.status === 'For Sale' ? 'buyer-for-sale' : 'buyer-for-rent'}`}
                            >
                                {propertyData.status}
                            </button>
                            <span className="buyer-premium-badge">
                                🏠 Premium Property
                            </span>
                        </div>
                        <h1>{propertyData.title}</h1>
                        <p className="buyer-property-location">
                            {propertyData.location}
                        </p>
                        <div className="buyer-property-meta-info">
                            <div className="buyer-meta-divider"></div>
                            <div className="buyer-meta-item">
                                <span className="buyer-meta-label">Listed Since</span>
                                <span className="buyer-meta-value">Dec 2024</span>
                            </div>
                            <div className="buyer-meta-divider"></div>
                        </div>
                    </header>

                    <div className="buyer-main-content-area">

                        {/* --- Left Column (Details) --- */}
                        <section className="buyer-property-details-section">

                            {/* Image Gallery */}
                            <div className="buyer-image-gallery">
                                {/* Main Image (Grid Column 1) */}
                                <div className="buyer-main-image" onClick={() => openSlider(0)}>
                                    <img src={propertyData.images[0].url} alt={propertyData.images[0].alt} />
                                </div>

                                {/* Thumbnails (Grid Column 2) */}
                                <div className="buyer-thumbnail-gallery">
                                    {thumbnailImages.map((image, index) => (
                                        <div 
                                            key={image.id} 
                                            // The index here starts at 0, but corresponds to the original array index (1, 2, 3)
                                            className="buyer-thumbnail" 
                                            onClick={() => openSlider(index + 1)} 
                                        >
                                            <img src={image.url} alt={image.alt} />
                                            {index === 2 && remainingCount > 0 && (
                                                <div className="buyer-view-more-overlay">
                                                    <span>+{remainingCount} Photos</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Key Features using .features-grid */}
                            <div className="buyer-features-grid">
                                {/* Price/Rent */}
                                <div className="buyer-feature-item">
                                    <div className="buyer-feature-icon">
                                        {/* Using an icon placeholder for the price block */}
                                        <span role="img" aria-label="price">💰</span>
                                    </div>
                                    <span className="buyer-feature-value">{propertyData.price}</span>
                                    <span className="buyer-feature-label">{propertyData.status === 'For Rent' ? 'Monthly Rent' : 'Total Price'}</span>
                                </div>

                                {/* Bedrooms */}
                                <div className="buyer-feature-item">
                                    <div className="buyer-feature-icon">
                                        <FaBed />
                                    </div>
                                    <span className="buyer-feature-value">{propertyData.bedrooms}</span>
                                    <span className="buyer-feature-label">Bedrooms</span>
                                </div>

                                {/* Bathrooms */}
                                <div className="buyer-feature-item">
                                    <div className="buyer-feature-icon">
                                        <FaShower />
                                    </div>
                                    <span className="buyer-feature-value">{propertyData.bathrooms}</span>
                                    <span className="buyer-feature-label">Bathrooms</span>
                                </div>

                                {/* Area */}
                                <div className="buyer-feature-item">
                                    <div className="buyer-feature-icon">
                                        <FaRulerCombined />
                                    </div>
                                    <span className="buyer-feature-value">{propertyData.area}</span>
                                    <span className="buyer-feature-label">Area</span>
                                </div>
                            </div>
                            {/* END of Key Features */}

                            <hr className="buyer-divider" />

                            {/* Description */}
                            <div className="buyer-description-section">
                                <h2>Description</h2>
                                <p>{propertyData.description}</p>
                            </div>
                            <hr className="buyer-divider" />

                            {/* Amenities */}
                            <div className="buyer-amenities-section">
                                <h2>Amenities</h2>
                                <div className="buyer-amenities-grid">
                                    {propertyData.amenities.map((amenity, index) => (
                                        <div key={index} className="buyer-amenity-item">
                                            <FaCheckCircle className="buyer-check-icon" />
                                            <span>{amenity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* --- Right Column (Inquiry Form) --- */}
                        <aside className="buyer-agent-sidebar">
                            
                            {/* Map Feature Card */}
                            <PropertyMapFeature property={property} /> 

                            {/* Contact Form Card */}
                            <div className="buyer-detail-contact-card">
                                <h3>Get in Touch</h3>
                                <p className="buyer-contact-card-subtitle">Send your inquiry about this property</p>
                                
                                {/* Chat with Owner Button - Only show if user is buyer AND not the property owner */}
                                {user && user.user_type === 'buyer' && property && property.seller_id && Number(user.id) !== Number(property.seller_id) && (
                                    <button 
                                        type="button"
                                        onClick={handleChatWithOwner}
                                        className="buyer-chat-owner-button"
                                        style={{
                                            width: '100%',
                                            padding: '12px 20px',
                                            marginBottom: '20px',
                                            backgroundColor: '#003B73',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: 'background-color 0.3s'
                                        }}
                                        onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
                                        onMouseOut={(e) => e.target.style.backgroundColor = '#003B73'}
                                    >
                                        <FaComments />
                                        Chat with Owner
                                    </button>
                                )}
                                
                                {!isSubmitted ? (
                                    <form className="buyer-detail-contact-form" onSubmit={handleSubmitInquiry}>
                                        {/* Name Field */}
                                        <div className="buyer-contact-field-group">
                                            <label htmlFor="name">Full Name *</label>
                                            <div className="buyer-contact-input-box">
                                                <FaUser className="buyer-contact-field-icon" />
                                                <input
                                                    type="text"
                                                    id="name"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    placeholder="Your full name"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Email Field */}
                                        <div className="buyer-contact-field-group">
                                            <label htmlFor="email">Email Address *</label>
                                            <div className="buyer-contact-input-box">
                                                <FaEnvelope className="buyer-contact-field-icon" />
                                                <input
                                                    type="email"
                                                    id="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleInputChange}
                                                    placeholder="your.email@example.com"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Mobile Field */}
                                        <div className="buyer-contact-field-group">
                                            <label htmlFor="mobile">Mobile Number *</label>
                                            <div className="buyer-contact-input-box">
                                                <FaPhone className="buyer-contact-field-icon" />
                                                <input
                                                    type="tel"
                                                    id="mobile"
                                                    name="mobile"
                                                    value={formData.mobile}
                                                    onChange={handleInputChange}
                                                    placeholder="+91 XXXXX XXXXX"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Message Field */}
                                        <div className="buyer-contact-field-group">
                                            <label htmlFor="message">Your Message</label>
                                            <div className="buyer-contact-input-box buyer-contact-textarea-box">
                                                <FaCommentAlt className="buyer-contact-field-icon buyer-contact-textarea-icon" />
                                                <textarea
                                                    id="message"
                                                    name="message"
                                                    value={formData.message}
                                                    onChange={handleInputChange}
                                                    placeholder="I'm interested in this property..."
                                                    rows="4"
                                                ></textarea>
                                            </div>
                                        </div>

                                        {/* Submit Button */}
                                        <button type="submit" className="buyer-contact-send-button">
                                            Send Inquiry
                                        </button>
                                    </form>
                                ) : (
                                    <div className="buyer-contact-success-message">
                                        <FaCheckCircle className="buyer-contact-success-icon" />
                                        <h4>Inquiry Sent Successfully!</h4>
                                        <p>Thank you for your interest. The owner will contact you soon.</p>
                                    </div>
                                )}
                            </div>
                        </aside>

                    </div>
                </div>
            </main>

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
