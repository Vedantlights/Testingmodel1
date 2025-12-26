import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/PropertyCard.css';

// ============================================================================
// FAVORITES UTILITY FUNCTIONS
// ============================================================================

export const FavoritesManager = {
  // Get all favorite property IDs from localStorage
  getFavorites: () => {
    try {
      const favorites = localStorage.getItem('propertyFavorites');
      return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
      console.error('Error reading favorites:', error);
      return [];
    }
  },

  // Save favorites to localStorage
  saveFavorites: (favorites) => {
    try {
      localStorage.setItem('propertyFavorites', JSON.stringify(favorites));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  },

  // Toggle favorite status for a property
  toggleFavorite: (propertyId) => {
    const favorites = FavoritesManager.getFavorites();
    const index = favorites.indexOf(propertyId);
    
    if (index > -1) {
      favorites.splice(index, 1);
    } else {
      favorites.push(propertyId);
    }
    
    FavoritesManager.saveFavorites(favorites);
    return favorites;
  },

  // Check if a property is favorited
  isFavorite: (propertyId) => {
    const favorites = FavoritesManager.getFavorites();
    return favorites.includes(propertyId);
  },

  // Get all favorited properties (requires properties array to be passed)
  getFavoriteProperties: (properties) => {
    const favoriteIds = FavoritesManager.getFavorites();
    return (properties || []).filter(property => favoriteIds.includes(property.id));
  }
};

// ============================================================================
// PROPERTY CARD COMPONENT - WITH FAVORITES
// ============================================================================

const PropertyCard = ({ property, onFavoriteToggle }) => {
    const navigate = useNavigate();
    // State to manage the favourite status
    const [isFavorited, setIsFavorited] = useState(false);
    const [showToast, setShowToast] = useState(false);

    // Check favorite status on mount and when property changes
    useEffect(() => {
        const checkFavoriteStatus = async () => {
            try {
                // Check local storage first for quick display
                const localFavorite = FavoritesManager.isFavorite(property.id);
                setIsFavorited(localFavorite);
                
                // Then verify with API if user is authenticated
                const token = localStorage.getItem('authToken');
                if (token) {
                    const { favoritesAPI } = await import('../../services/api.service');
                    const response = await favoritesAPI.list();
                    if (response.success && response.data) {
                        // API returns properties array (not favorites array)
                        const properties = response.data.properties || response.data.favorites || [];
                        const favoriteIds = properties.map(p => p.id || p.property_id);
                        setIsFavorited(favoriteIds.includes(property.id));
                    }
                }
            } catch (error) {
                console.error('Error checking favorite status:', error);
                // Fallback to local storage
                setIsFavorited(FavoritesManager.isFavorite(property.id));
            }
        };
        
        checkFavoriteStatus();
    }, [property.id]);

    // Handle favorite button click
    const handleFavoriteClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
            // Import favoritesAPI dynamically to avoid circular dependencies
            const { favoritesAPI } = await import('../../services/api.service');
            const response = await favoritesAPI.toggle(property.id);
            
            if (response.success) {
                setIsFavorited(response.data.is_favorite !== undefined ? response.data.is_favorite : !isFavorited);
                // Also update local storage for offline support
                FavoritesManager.toggleFavorite(property.id);
                
                // Notify parent component if callback provided
                if (onFavoriteToggle) {
                    onFavoriteToggle();
                }
            } else {
                console.error('Failed to toggle favorite:', response.message);
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            // Fallback to local storage if API fails
            FavoritesManager.toggleFavorite(property.id);
            setIsFavorited(!isFavorited);
        }
    };

    // Helper function to copy to clipboard with fallback
    const copyToClipboard = async (text) => {
        try {
            // Try modern Clipboard API first (requires HTTPS or localhost)
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2000);
                return;
            }
            
            // Fallback to execCommand for older browsers or non-HTTPS
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

    const { id, image, title, price, location, bedrooms, bathrooms, area, status } = property;
    const isForRent = status === 'For Rent';
    const priceDisplay = isForRent ? `₹${price?.toLocaleString('en-IN')}` : `₹${price?.toLocaleString('en-IN')}`;
    const priceLabel = isForRent ? 'Price/Month' : 'Price';

    // Default placeholder image
    const placeholderImage = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500';
    
    // Ensure we have a valid image URL
    const imageUrl = image && image.trim() !== '' ? image : placeholderImage;

    // Handle image load errors
    const handleImageError = (e) => {
        console.warn('Image failed to load:', imageUrl, 'for property:', title);
        e.target.src = placeholderImage;
        e.target.onerror = null; // Prevent infinite loop
    };

    // Handle card click to navigate to details page
    const handleCardClick = (e) => {
        // Don't navigate if clicking on buttons or links
        if (e.target.closest('button') || e.target.closest('a')) {
            return;
        }
        navigate(`/details/${id}`);
    };

    return (
        <div className="buyer-property-card" onClick={handleCardClick}>
            <div className="buyer-property-image-container">
                <img 
                    src={imageUrl} 
                    alt={title || 'Property image'} 
                    className="buyer-property-image"
                    onError={handleImageError}
                    loading="lazy"
                />
                <span className={`buyer-property-status ${isForRent ? 'buyer-for-rent' : 'buyer-for-sale'}`}>{status}</span>
                
                {/* ★ FAVORITE BUTTON */}
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

                {/* ★ SHARE BUTTON */}
                <button 
                    className="buyer-share-btn"
                    onClick={handleShareClick}
                    aria-label="Share property"
                    title="Share property"
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

                {/* Toast notification */}
                {showToast && (
                    <div className="buyer-share-toast">
                        Link copied!
                    </div>
                )}

            </div>

            <div className="buyer-property-content">
                <h3 className="buyer-property-title">{title}</h3>
                
                <div className="buyer-property-location">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span>{location}</span>
                </div>

                <div className="buyer-property-details">
                    {(bedrooms && bedrooms !== '0' && bedrooms !== 0) && (
                    <div className="buyer-detail-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 17l6-6 4 4 8-8"></path>
                            <path d="M17 2h5v5"></path>
                        </svg>
                        <span>{bedrooms} {bedrooms === '1' || bedrooms === 1 ? 'Bed' : 'Beds'}</span>
                    </div>
                    )}

                    {(bathrooms && bathrooms !== '0' && bathrooms !== 0) && (
                    <div className="buyer-detail-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1 0l-1 1a1.5 1.5 0 0 0 0 1L7 9"></path>
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                            <circle cx="11" cy="11" r="2"></circle>
                        </svg>
                        <span>{bathrooms} {bathrooms === '1' || bathrooms === 1 ? 'Bath' : 'Baths'}</span>
                    </div>
                    )}
                    
                    <div className="buyer-detail-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="9" y1="3" x2="9" y2="21"></line>
                        </svg>
                        <span>{area} sq.ft</span>
                    </div>
                </div>

                <div className="buyer-property-footer">
                    <div className="buyer-property-price">
                        <span className="buyer-price-label">{priceLabel}</span>
                        <span className="buyer-price-value">{priceDisplay}</span>
                    </div>
                    
                    <button 
                        className="buyer-view-details-btn"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/details/${id}`);
                        }}
                    >
                        View Details
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PropertyCard;