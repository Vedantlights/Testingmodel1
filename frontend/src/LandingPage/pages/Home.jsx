import React, { useState, useEffect } from 'react';
import SearchBar from '../components/Searchbar';
import Explore from '../components/Explore';
import PropertyCard from '../components/Propertycard';
import NewYear2026 from '../../components/NewYear2026';
import { propertiesAPI } from '../../services/api.service';

const Home = () => {
  window.scrollTo(0,0);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const response = await propertiesAPI.list({ limit: 6 });
        
        if (response.success && response.data && response.data.properties) {
          const backendProperties = response.data.properties.map(prop => {
            let imageUrl = prop.cover_image || 
                          (Array.isArray(prop.images) && prop.images.length > 0 ? prop.images[0] : null) ||
                          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500';
            
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
              status: prop.status === 'sale' ? 'For Sale' : (prop.status === 'rent' ? 'For Rent' : prop.status)
            };
          });
          
          setProperties(backendProperties);
        } else {
          setProperties([]);
        }
      } catch (error) {
        console.error('Error fetching properties:', error);
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  return (
    <div>
      <NewYear2026 variant="fullscreen" />
      <SearchBar />
      <Explore />

      <div className="featured-properties-section">
        <div className="featured-properties-container">
          <div className="featured-properties-header">
            <h2 className="featured-properties-title">Featured Properties</h2>
            <p className="featured-properties-subtitle">
              Discover our handpicked selection of premium properties
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p>Loading properties...</p>
            </div>
          ) : properties.length > 0 ? (
            <div className="property-cards-horizontal-container">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p>No properties available at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;