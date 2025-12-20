import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Buyer.css';

export default function BuyerTenantLandingPage() {
  const [hoveredCard, setHoveredCard] = useState(null);
  const navigate = useNavigate();
  

  const benefits = [
    { icon: '3e0', title: 'Verified Properties Only', desc: 'Browse through authenticated listings' },
    { icon: '50d', title: 'Advanced Search Filters', desc: 'Find exactly what you need' },
    { icon: '4b0', title: 'Zero Brokerage', desc: 'Connect directly with owners' },
    { icon: '705', title: 'Verified Owners', desc: 'Deal with authenticated sellers only' },
    { icon: '4f1', title: 'Instant Notifications', desc: 'Get alerts for new properties' },
    { icon: '5fae0f', title: 'Location Insights', desc: 'Detailed area information' }
  ];

  const steps = [
    { num: '1', title: 'Create FREE Account', desc: 'Sign up in seconds' },
    { num: '2', title: 'Browse Properties', desc: 'Use smart filters to find your home' },
    { num: '3', title: 'Connect Directly', desc: 'Chat with owners instantly' },
    { num: '4', title: 'Visit & Finalize', desc: 'Schedule visits and close the deal' }
  ];

  const propertyTypes = [
    { image: '/property-images/Apartment.jpg', title: 'Apartment', count: '15,000+' },
    { image: '/property-images/Villa.jpg', title: 'Villa', count: '3,200+' },
    { image: '/property-images/Rowhouse.jpg', title: 'Row House', count: '2,800+' },
    { image: '/property-images/Banglow.jpg', title: 'Bungalow', count: '1,900+' },
    { image: '/property-images/StudioApartment.jpg', title: 'Studio Apartment', count: '4,200+' },
    { image: '/property-images/PlotLand.jpg', title: 'Plot / Land', count: '4,300+' },
    { image: '/property-images/CommercialOffice.jpg', title: 'Commercial Office', count: '3,500+' },
    { image: '/property-images/Hostel.jpg', title: 'PG / Hostel', count: '3,400+' }
  ];

  const features = [
    { icon: '4f8', title: 'Virtual Tours', desc: 'Explore properties from home' },
    { icon: '4ac', title: 'Direct Chat', desc: 'Talk to owners directly' },
    { icon: '514', title: 'Smart Alerts', desc: 'Get notified of matching listings' },
    { icon: '4cd', title: 'Map View', desc: 'See properties on interactive map' },
    { icon: 'b50', title: 'Save Favorites', desc: 'Bookmark properties you like' }
  ];

  const stats = [
    { icon: '3e0', number: '35,000+', label: 'Active properties' },
    { icon: '705', number: '100%', label: 'Verified listings' },
    { icon: '465', number: '50,000+', label: 'Happy users' },
    { icon: '3af', number: '4.9/5', label: 'User satisfaction' }
  ];

  const reviews = [
    { text: 'Found my dream apartment in just 3 days. No broker hassle!', author: 'Priya Sharma', role: 'Tenant' },
    { text: 'Amazing platform! Directly connected with owner and saved lakhs in brokerage.', author: 'Rahul Verma', role: 'Buyer' },
    { text: 'Best property search experience. Filters are so helpful!', author: 'Anjali Mehta', role: 'Tenant' }
  ];

  const searchTips = [
    'Use location filters to narrow down your search',
    'Set price range to see properties within budget',
    'Save your favorite properties for later',
    'Enable notifications for instant updates',
    'Contact multiple owners to compare options'
  ];

  return (
    <div className="buyer-landing-page">
      {/* Hero Section */}
      <div className="buy-hero-sections" style={{ backgroundImage: 'url(/landingpagebuy.jpeg)' }}>
        <h1 className="buy-hero-title">Find Your Dream Home Without Any Brokerage</h1>
        <p className="buy-hero-subtitle">Browse 35,000+ verified properties. Connect directly with owners. Move in faster.</p>
        <div className="buy-cta-buttons">
          <button className="buy-btn buy-btn-primary" onClick={() => navigate('/login')}>Login</button>
          <button className="buy-btn buy-btn-secondary" onClick={() => navigate('/register')}>Register Free</button>
        </div>
      </div>

      {/* Property Types */}
      <section className="property-types">
        <h2>What Are You Looking For?</h2>
        <div className="types-grid">
          {propertyTypes.map((type, index) => (
            <div 
              key={index} 
              className="type-card"
              style={{ backgroundImage: `url(${type.image})` }}
            >
              <div className="type-card-overlay">
                <h3>{type.title}</h3>
                <p>{type.count} listings</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <h2>Why Choose Our Platform?</h2>
        <div className="benefits-grid">
          {benefits.map((benefit, index) => (
            <div key={index} className="benefit-card">
              <span className="benefit-icon">{benefit.icon}</span>
              <h3>{benefit.title}</h3>
              <p>{benefit.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="dashboard-preview">
        <h2>Your Personal Property Dashboard</h2>
        <div 
          className="preview-card"
          onMouseEnter={() => setHoveredCard('dashboard')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className="blur-content">
            <div className="blur-item">Saved Properties: 7e97e97e97e9</div>
            <div className="blur-item">New Matches: 7e97e97e9</div>
            <div className="blur-item">Messages: 7e97e9</div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="reviews-section">
        <h2>What Our Users Say</h2>
        <div className="reviews-grid">
          {reviews.map((review, index) => (
            <div key={index} className="review-card">
              <p className="review-text">4ac {review.text}</p>
              <p className="review-author">464 {review.author} <span>- {review.role}</span></p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <h2>Trusted by Thousands</h2>
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <span className="stat-icon">{stat.icon}</span>
              <h3>{stat.number}</h3>
              <p>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Search Tips */}
      <section className="search-tips-section">
        <h2>Pro Tips for Property Search</h2>
        <ul className="search-tips-list">
          {searchTips.map((tip, index) => (
            <li key={index}>449 {tip}</li>
          ))}
        </ul>
      </section>

      {/* Call to Action */}
      <section className="cta-section">
        <h2>Ready to Find Your New Home?</h2>
        <p>Sign up now and get access to the best property deals in your city.</p>
        <button className="cta-btn" onClick={() => navigate('/register')}>
          Start Your Search Now
        </button>
      </section>
    </div>
  );
}
