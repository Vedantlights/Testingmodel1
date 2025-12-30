import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BuyerSearchBar from "../components/BuyerSearchBar";
import UpcomingProjectCard from "../components/UpcomingProjectCard";
import PropertyCard from "../components/PropertyCard";
import { propertiesAPI } from "../../services/api.service";
import "../styles/BuyerHome.css";

const Home = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch properties from API
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await propertiesAPI.list({ limit: 50 });
        
        if (response.success && response.data && response.data.properties) {
          // Convert backend properties to frontend format
          const backendProperties = response.data.properties.map(prop => {
            // Get the best image (cover_image or first image from array)
            // Filter out empty/null/undefined values
            let imageUrl = null;
            
            if (prop.cover_image && prop.cover_image.trim() !== '') {
              imageUrl = prop.cover_image;
            } else if (Array.isArray(prop.images) && prop.images.length > 0) {
              // Find first valid image URL
              const validImage = prop.images.find(img => img && img.trim() !== '');
              imageUrl = validImage || null;
            }
            
            // Fallback to placeholder if no valid image found
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
              status: prop.status === 'sale' ? 'For Sale' : (prop.status === 'rent' ? 'For Rent' : prop.status),
              // Additional fields
              propertyType: prop.property_type,
              projectType: prop.project_type || null, // Include project_type for filtering
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
          
          // Filter out upcoming projects - they should only appear in Upcoming Projects section
          const regularProperties = backendProperties.filter(prop => 
            !prop.projectType || prop.projectType !== 'upcoming'
          );
          
          setProperties(regularProperties);
          console.log('✅ Loaded', regularProperties.length, 'regular properties from backend (upcoming projects excluded)');
        } else {
          setProperties([]);
          setError('No properties available');
        }
      } catch (err) {
        setProperties([]);
        setError('Failed to load properties. Please try again later.');
        console.error("Error fetching properties:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  // Top cities data with background images
  const topCities = [
    { 
      name: "Mumbai", 
      image: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&q=80"
    },
    { 
      name: "Delhi", 
      image: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&q=80"
    },
    { 
      name: "Bangalore", 
      image: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&q=80"
    },
    { 
      name: "Hyderabad", 
      image: "https://images.unsplash.com/photo-1603262110267-d58cf800a49e?w=800&q=80"
    },
    { 
      name: "Chennai", 
      image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&q=80"
    },
    { 
      name: "Pune", 
      image: "https://images.unsplash.com/photo-1610519953839-c3ef2a8b8e5e?w=800&q=80"
    },
    { 
      name: "Kolkata", 
      image: "https://images.unsplash.com/photo-1558431382-27e303142255?w=800&q=80"
    },
    { 
      name: "Ahmedabad", 
      image: "https://images.unsplash.com/photo-1621422829620-dca23e14e3b5?w=800&q=80"
    },
  ];

  const handleProjectsClick = (city) => {
    navigate(`/searchresults?location=${encodeURIComponent(city)}`);
  };

  return (
    <div className="buyer-page-wrapper">
      {/* Search Bar */}
      <BuyerSearchBar />

      {/* Mixed Properties Section */}
      <div className="buyer-home-properties-section">
        <div className="buyer-section-header">
          <h1>Explore Properties</h1>
          <p>Buy or Rent — All in One Place</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading properties...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#c33' }}>
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        ) : properties.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>No properties available at the moment.</p>
          </div>
        ) : (
          <div className="buyer-horizontal-scroll-container">
            <div className="buyer-property-cards-wrapper">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Upcoming Projects Section */}
      <UpcomingProjectCard />

      {/* SECTION: Browse Residential Projects in Top Cities */}
      <div className="buyer-city-projects-section">
        <div className="buyer-section-header">
          <h2>Browse Residential Projects in Top Cities</h2>
          <p>Explore premium residential projects across India</p>
        </div>

        <div className="buyer-city-projects-grid">
          {topCities.map((city) => (
            <div
              key={city.name}
              className="buyer-city-project-card"
              onClick={() => handleProjectsClick(city.name)}
              style={{ backgroundImage: `url(${city.image})` }}
            >
              <div className="buyer-city-project-overlay"></div>
              <div className="buyer-city-project-content">
                <h3 className="buyer-city-project-name">{city.name}</h3>
                <p className="buyer-city-project-subtitle">Explore Projects</p>
                <div className="buyer-city-project-arrow">
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
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Home;