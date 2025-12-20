import React, { useState } from 'react';
import { FaArrowRight, FaPhone, FaTimes, FaUser, FaEnvelope, FaCheckCircle, FaCommentAlt, FaMapMarkerAlt } from 'react-icons/fa';
import '../styles/UpcomingProjectCard.css';

// --- EXPANDED MOCK DATA with Multiple Cities ---
const projects = [
    // PUNE Properties
    {
        id: 1,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQrwhJLMPEoFagfU0bV3Ql_O05PJzFvbtV3cA&s',
        title: 'Pristine Heights',
        location: 'Baner, Pune',
        city: 'Pune',
        bhkType: '2, 3 BHK',
        priceRange: '1.2 - 2.1',
        builder: 'Pristine Properties',
        builderLink: '#builder-profile-1',
    },
    {
        id: 2,
        image: 'https://i.pinimg.com/736x/07/74/49/07744957e8be77e47b38d38865f6e804.jpg',
        title: 'Kalpataru Vista',
        location: 'Wakad, Pune',
        city: 'Pune',
        bhkType: '3, 4 BHK',
        priceRange: '2.5 - 3.8',
        builder: 'Kalpataru Ltd',
        builderLink: '#builder-profile-2',
    },
    // BANGALORE Properties
    {
        id: 3,
        image: 'https://i.pinimg.com/736x/84/1d/10/841d10e6e8e8199738f6583995f57356.jpg',
        title: 'Assetz Zen and Sato',
        location: 'Yelahanka, Bangalore',
        city: 'Bangalore',
        bhkType: '3, 4 BHK',
        priceRange: '2.7 - 3.7',
        builder: 'Assetz Lifestyle Builders',
        builderLink: '#builder-profile-3',
    },
    {
        id: 4,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQrwhJLMPEoFagfU0bV3Ql_O05PJzFvbtV3cA&s',
        title: 'Prestige Elysian',
        location: 'Bannerghatta Road, Bangalore',
        city: 'Bangalore',
        bhkType: '2, 3 BHK',
        priceRange: '1.5 - 2.5',
        builder: 'Prestige Group',
        builderLink: '#builder-profile-4',
    },
    // MUMBAI Properties
    {
        id: 5,
        image: 'https://i.pinimg.com/736x/07/74/49/07744957e8be77e47b38d38865f6e804.jpg',
        title: 'Lodha Serenity',
        location: 'Thane West, Mumbai',
        city: 'Mumbai',
        bhkType: '2, 3 BHK',
        priceRange: '1.8 - 3.2',
        builder: 'Lodha Group',
        builderLink: '#builder-profile-5',
    },
    {
        id: 6,
        image: 'https://i.pinimg.com/736x/84/1d/10/841d10e6e8e8199738f6583995f57356.jpg',
        title: 'Oberoi Exquisite',
        location: 'Goregaon East, Mumbai',
        city: 'Mumbai',
        bhkType: '3, 4 BHK',
        priceRange: '4.5 - 6.8',
        builder: 'Oberoi Realty',
        builderLink: '#builder-profile-6',
    },
    // DELHI Properties
    {
        id: 7,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQrwhJLMPEoFagfU0bV3Ql_O05PJzFvbtV3cA&s',
        title: 'DLF Gardencity',
        location: 'Sector 92, Delhi',
        city: 'Delhi',
        bhkType: '3, 4, 5 BHK',
        priceRange: '3.2 - 5.5',
        builder: 'DLF Limited',
        builderLink: '#builder-profile-7',
    },
    {
        id: 8,
        image: 'https://i.pinimg.com/736x/07/74/49/07744957e8be77e47b38d38865f6e804.jpg',
        title: 'Godrej Meridien',
        location: 'Sector 106, Delhi',
        city: 'Delhi',
        bhkType: '2, 3 BHK',
        priceRange: '2.1 - 3.5',
        builder: 'Godrej Properties',
        builderLink: '#builder-profile-8',
    },
    // HYDERABAD Properties
    {
        id: 9,
        image: 'https://i.pinimg.com/736x/84/1d/10/841d10e6e8e8199738f6583995f57356.jpg',
        title: 'My Home Avatar',
        location: 'Gachibowli, Hyderabad',
        city: 'Hyderabad',
        bhkType: '3, 4 BHK',
        priceRange: '1.8 - 2.9',
        builder: 'My Home Group',
        builderLink: '#builder-profile-9',
    },
    {
        id: 10,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQrwhJLMPEoFagfU0bV3Ql_O05PJzFvbtV3cA&s',
        title: 'Brigade Orchards',
        location: 'Devanahalli, Hyderabad',
        city: 'Hyderabad',
        bhkType: '2, 3 BHK',
        priceRange: '1.2 - 2.2',
        builder: 'Brigade Group',
        builderLink: '#builder-profile-10',
    },
    // CHENNAI Properties
    {
        id: 11,
        image: 'https://i.pinimg.com/736x/07/74/49/07744957e8be77e47b38d38865f6e804.jpg',
        title: 'Casagrand Vivante',
        location: 'Pallavaram, Chennai',
        city: 'Chennai',
        bhkType: '2, 3 BHK',
        priceRange: '0.95 - 1.8',
        builder: 'Casagrand Builder',
        builderLink: '#builder-profile-11',
    },
    {
        id: 12,
        image: 'https://i.pinimg.com/736x/84/1d/10/841d10e6e8e8199738f6583995f57356.jpg',
        title: 'Shriram Grand City',
        location: 'West Tambaram, Chennai',
        city: 'Chennai',
        bhkType: '1, 2, 3 BHK',
        priceRange: '0.65 - 1.5',
        builder: 'Shriram Properties',
        builderLink: '#builder-profile-12',
    },
];

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

    return (
        <div className="buyer-project-card">
            <div className="buyer-project-image-container">
                <img src={image} alt={title} className="buyer-project-image" />
                
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

    const handleContactClick = (project) => {
        setSelectedProject(project);
        setIsModalOpen(true);
    };

    return (
        <div className="buyer-upcoming-projects-section">
            <div className="buyer-section-header">
                <h2 className="buyer-section-title">✨ Upcoming Projects ✨</h2>
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