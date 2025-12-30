import React, { useState, useEffect } from 'react';
import { FaArrowRight, FaPhone, FaTimes, FaUser, FaEnvelope, FaCheckCircle, FaCommentAlt, FaMapMarkerAlt } from 'react-icons/fa';
import { propertiesAPI } from '../../services/api.service';
import '../styles/UpcomingProjectCard.css';

// Helper function to extract city from location string
const extractCity = (location) => {
  if (!location) return 'Unknown';
  // Common city names to check
  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Surat'];
  const locationUpper = location.toUpperCase();
  for (const city of cities) {
    if (locationUpper.includes(city.toUpperCase())) {
      return city;
    }
  }
  // If no match, try to extract from location (take first part before comma)
  const parts = location.split(',');
  return parts.length > 1 ? parts[parts.length - 1].trim() : location.split(' ')[0];
};

// Helper function to format price in Crores
const formatPriceRange = (price) => {
  if (!price) return '0';
  const priceInCr = price / 10000000; // Convert to crores
  return priceInCr.toFixed(1);
};

// Helper function to format BHK types from configurations
const formatBhkType = (configurations) => {
  if (!configurations || !Array.isArray(configurations) || configurations.length === 0) {
    return 'N/A';
  }
  // Filter and format BHK configurations
  const bhkConfigs = configurations
    .filter(config => config && (config.includes('BHK') || config.includes('bhk')))
    .map(config => {
      // Extract number from "1 BHK", "2 BHK", etc.
      const match = config.match(/(\d+)\s*BHK/i);
      return match ? `${match[1]} BHK` : config;
    })
    .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.match(/\d+/)?.[0] || '0');
      return numA - numB;
    });
  
  if (bhkConfigs.length === 0) {
    // If no BHK found, check for Villa or Plot
    if (configurations.some(c => c.toLowerCase().includes('villa'))) return 'Villa';
    if (configurations.some(c => c.toLowerCase().includes('plot'))) return 'Plot';
    return configurations.join(', ');
  }
  
  return bhkConfigs.join(', ');
};

// Dummy data removed - now using API data

/**
 * Contact Modal Component
 */
const ContactModal = ({ projectTitle, onClose }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Contact Request Submitted:', { name, email, phone, message, projectTitle });
        setIsSubmitted(true);
    };

    if (isSubmitted) {
        return (
            <div className="buyer-modal-backdrop" onClick={onClose}>
                <div className="buyer-modal-content submitted" onClick={e => e.stopPropagation()}>
                    <button className="buyer-modal-close" onClick={onClose}><FaTimes /></button>
                    <FaCheckCircle className="buyer-success-icon" />
                    <h2>Request Submitted Successfully!</h2>
                    <p>Thank you, <strong>{name}</strong>! The owner of <strong>{projectTitle}</strong> will contact you at <strong>{phone}</strong> shortly.</p>
                    <button className="buyer-btn-primary" onClick={onClose}>Close</button>
                </div>
            </div>
        );
    }

    return (
        <div className="buyer-modal-backdrop" onClick={onClose}>
            <div className="buyer-modal-content" onClick={e => e.stopPropagation()}>
                <button className="buyer-modal-close" onClick={onClose}><FaTimes /></button>
                <h3>Get Exclusive Details for {projectTitle}</h3>
                <p>Fill out the form below and the project owner will contact you directly.</p>

                <form className="buyer-contact-form" onSubmit={handleSubmit}>
                    <div className="buyer-form-group">
                        <FaUser className="buyer-input-icon" />
                        <input 
                            type="text" 
                            placeholder="Your Full Name" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="buyer-form-group">
                        <FaEnvelope className="buyer-input-icon" />
                        <input 
                            type="email" 
                            placeholder="Email Address" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="buyer-form-group">
                        <FaPhone className="buyer-input-icon" />
                        <input 
                            type="tel" 
                            placeholder="Phone Number" 
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                        />
                    </div>

                    <div className="buyer-form-group buyer-textarea-group">
                        <FaCommentAlt className="buyer-input-icon" />
                        <textarea
                            placeholder="Your message or query (e.g., 'What is the tentative possession date?')"
                            rows="4"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>
                    
                    <button type="submit" className="buyer-btn-primary">
                        Submit & Get a Call Back
                    </button>
                    <small className="buyer-privacy-note">
                        By clicking submit, you agree to our Terms of Service and Privacy Policy.
                    </small>
                </form>
            </div>
        </div>
    );
};

/**
 * Individual Project Card Component
 */
const ProjectCard = ({ project, onContactClick }) => {
    const { image, title, location, city, bhkType, priceRange, builder, builderLink } = project;
    
    // Default placeholder image
    const placeholderImage = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500';
    
    // Ensure we have a valid image URL
    const imageUrl = image && image.trim() !== '' ? image : placeholderImage;
    
    // Handle image load errors
    const handleImageError = (e) => {
        console.warn('Image failed to load:', imageUrl, 'for project:', title);
        e.target.src = placeholderImage;
        e.target.onerror = null; // Prevent infinite loop
    };

    return (
        <div className="buyer-project-card">
            <div className="buyer-project-image-container">
                <img 
                    src={imageUrl} 
                    alt={title} 
                    className="buyer-project-image"
                    onError={handleImageError}
                />
                
                <div className="buyer-overlay-info buyer-top-right">
                    <span className="buyer-bhk-type">{bhkType}</span>
                    <span className="buyer-price-range">₹ {priceRange} Cr</span>
                </div>

                <div className="buyer-overlay-info buyer-bottom-left">
                    <h3 className="buyer-project-title">{title}</h3>
                    <p className="buyer-project-location">
                        <FaMapMarkerAlt className="buyer-location-icon" />
                        {location}
                    </p>
                </div>

                <div className="buyer-city-badge">{city}</div>
            </div>
            
            <div className="buyer-project-card-footer">
                <div className="buyer-builder-info">
                    <p className="buyer-interested-text">A project by</p>
                    <a href={builderLink} className="buyer-builder-link">
                        {builder} <FaArrowRight />
                    </a>
                </div>
                
                <button 
                    className="buyer-view-number-btn buyer-btn-primary" 
                    onClick={onContactClick}
                >
                    Contact <FaPhone className="buyer-phone-icon" /> 
                </button>
            </div>
        </div>
    );
};

/**
 * Main Upcoming Projects Component with Horizontal Scroll
 */
const UpcomingProjectCard = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch upcoming projects from API
    useEffect(() => {
        const fetchUpcomingProjects = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await propertiesAPI.list({ limit: 50 });
                
                if (response.success && response.data && response.data.properties) {
                    // Filter for upcoming projects only
                    const upcomingProperties = response.data.properties.filter(
                        prop => prop.project_type === 'upcoming'
                    );
                    
                    // Map API response to ProjectCard format
                    const mappedProjects = upcomingProperties.map(prop => {
                        // Get image
                        let imageUrl = null;
                        if (prop.cover_image && prop.cover_image.trim() !== '') {
                            imageUrl = prop.cover_image;
                        } else if (Array.isArray(prop.images) && prop.images.length > 0) {
                            const validImage = prop.images.find(img => img && img.trim() !== '');
                            imageUrl = validImage || null;
                        }
                        if (!imageUrl || imageUrl.trim() === '') {
                            imageUrl = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500';
                        }
                        
                        // Parse upcoming_project_data JSON
                        let upcomingData = {};
                        try {
                            if (typeof prop.upcoming_project_data === 'string') {
                                upcomingData = JSON.parse(prop.upcoming_project_data);
                            } else if (typeof prop.upcoming_project_data === 'object') {
                                upcomingData = prop.upcoming_project_data;
                            }
                        } catch (e) {
                            console.warn('Failed to parse upcoming_project_data:', e);
                        }
                        
                        // Extract city from location
                        const city = extractCity(prop.location);
                        
                        // Format BHK type from configurations
                        const bhkType = formatBhkType(upcomingData.configurations);
                        
                        // Format price range in Crores
                        const priceRange = formatPriceRange(prop.price);
                        
                        // Get builder name
                        const builder = upcomingData.builderName || prop.seller_name || 'Builder';
                        
                        // Create builder link (placeholder - can be enhanced later)
                        const builderLink = `#builder-${prop.id}`;
                        
                        return {
                            id: prop.id,
                            image: imageUrl,
                            title: prop.title,
                            location: prop.location,
                            city: city,
                            bhkType: bhkType,
                            priceRange: priceRange,
                            builder: builder,
                            builderLink: builderLink
                        };
                    });
                    
                    setProjects(mappedProjects);
                    console.log('✅ Loaded', mappedProjects.length, 'upcoming projects from API');
                } else {
                    setProjects([]);
                }
            } catch (err) {
                console.error('Error fetching upcoming projects:', err);
                setError('Failed to load upcoming projects');
                setProjects([]);
            } finally {
                setLoading(false);
            }
        };

        fetchUpcomingProjects();
    }, []);

    const handleContactClick = (project) => {
        setSelectedProject(project);
        setIsModalOpen(true);
    };

    // Don't render section if there are no upcoming projects
    if (loading) {
        return (
            <div className="buyer-upcoming-projects-section">
                <div className="buyer-section-header">
                    <h2 className="buyer-section-title">Upcoming Projects</h2>
                    <p className="buyer-section-subtitle">Visit these projects and get benefits before the official launch!</p>
                </div>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p>Loading upcoming projects...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="buyer-upcoming-projects-section">
                <div className="buyer-section-header">
                    <h2 className="buyer-section-title">Upcoming Projects</h2>
                    <p className="buyer-section-subtitle">Visit these projects and get benefits before the official launch!</p>
                </div>
                <div style={{ textAlign: 'center', padding: '2rem', color: '#c33' }}>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (projects.length === 0) {
        return null; // Don't show section if no upcoming projects
    }

    return (
        <div className="buyer-upcoming-projects-section">
            <div className="buyer-section-header">
                <h2 className="buyer-section-title">Upcoming Projects</h2>
                <p className="buyer-section-subtitle">Visit these projects and get benefits before the official launch!</p>
            </div>

            <div className="buyer-horizontal-scroll-container">
                <div className="buyer-projects-wrapper">
                    {projects.map((project) => (
                        <ProjectCard 
                            key={project.id} 
                            project={project}
                            onContactClick={() => handleContactClick(project)}
                        />
                    ))}
                </div>
            </div>

            {isModalOpen && selectedProject && (
                <ContactModal 
                    projectTitle={selectedProject.title} 
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedProject(null);
                    }} 
                />
            )}
        </div>
    );
};

export default UpcomingProjectCard;