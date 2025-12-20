import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Agents.css';

export default function AgentBuilderLandingPage() {
  const [hoveredCard, setHoveredCard] = useState(null);
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  const benefits = [
    { icon: '✔', title: 'Daily Qualified Leads', desc: 'Get genuine buyer and tenant enquiries' },
    { icon: '✔', title: 'Project Listing Tools', desc: 'Showcase your projects professionally' },
    { icon: '✔', title: 'Lead Management Dashboard', desc: 'Track and manage all enquiries' },
    { icon: '✔', title: 'Verified Buyer/Tenant Profiles', desc: 'Connect with serious clients only' },
    { icon: '✔', title: 'Promotional Boosts', desc: 'Increase visibility for your listings' },
    { icon: '✔', title: 'Multi-Property Handling', desc: 'Manage unlimited properties easily' }
  ];

  const whyChoose = [
    { icon: '📈', text: 'Sell inventory 3x faster' },
    { icon: '🎯', text: 'Filtered, serious enquiries only' },
    { icon: '📞', text: 'Direct contact with buyers' },
    { icon: '💼', text: 'Manage all listings in one place' },
    { icon: '✍️', text: 'Custom builder profiles & branding' }
  ];

  const steps = [
    { num: '1', title: 'Create Business Account', desc: 'Sign up as agent or builder' },
    { num: '2', title: 'Add Listings / Projects', desc: 'Upload your properties and projects' },
    { num: '3', title: 'Receive Direct Enquiries', desc: 'Get notifications for every lead' },
    { num: '4', title: 'Convert Leads → Close Deals', desc: 'Turn enquiries into sales' }
  ];

  const projects = [
    { title: 'Luxury 2 & 3 BHK Towers', type: 'Premium Apartments' },
    { title: 'Affordable Housing Project', type: 'Budget Homes' },
    { title: 'Premium Villas by XYZ Builder', type: 'Luxury Villas' }
  ];

  const stats = [
    { icon: '🧑‍💼', number: '3,500+', label: 'Active Agents' },
    { icon: '🏗', number: '250+', label: 'Builders Onboarded' },
    { icon: '🏘', number: '12,000+', label: 'Projects Managed' },
    { icon: '📊', number: '96%', label: 'Lead Satisfaction Score' }
  ];

  const tools = [
    'Lead Management CRM',
    'Project Showcase Page',
    'Multi-listing Uploader',
    'Priority Listing Banner',
    'Performance Analytics',
    'Team Member Access'
  ];

  const reviews = [
    { text: 'Huge boost in quality leads. Closed 7 deals this month.', author: 'A. Sharma', role: 'Agent' },
    { text: 'Our new township project got 120+ enquiries in 2 weeks!', author: 'Sunrise Builders', role: 'Builder' }
  ];

  return (
    <div className="agent-landing-page">
      {/* Hero Section */}
      <div className="agent-hero-sections" style={{ backgroundImage: 'url(/AgentBuilder.jpg)' }}>
        <h1 className="agent-hero-title">Find Your Dream Home Without Any Brokerage</h1>
        <p className="agent-hero-subtitle">Browse 35,000+ verified properties. Connect directly with owners. Move in faster.</p>
        <div className="agent-cta-buttons">
          <button className="agent-btn agent-btn-primary" onClick={() => navigate('/login')}>Login</button>
          <button className="agent-btn agent-btn-secondary" onClick={() => navigate('/register')}>Register Free</button>
        </div>
      </div>

      {/* Benefits Section */}
      <section className="benefits-section">
        <h2>For Agents & Builders</h2>
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
        <h2>Your Agent Dashboard Awaits</h2>
        <div 
          className="preview-card"
          onMouseEnter={() => setHoveredCard('dashboard')}
          onMouseLeave={() => setHoveredCard(null)}
          onClick={handleLogin}
        >
          <div className="blur-content">
            <div className="blur-item">Lead Messages: ████████</div>
            <div className="blur-item">Project View Count: ████</div>
            <div className="blur-item">Enquiry Notifications: ████</div>
          </div>
          {hoveredCard === 'dashboard' && (
            <div className="hover-message">🔒 Login to unlock your agent dashboard</div>
          )}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="why-choose">
        <h2>Why Agents & Builders Choose Us?</h2>
        <div className="why-grid">
          {whyChoose.map((item, index) => (
            <div key={index} className="why-card">
              <span className="why-icon">{item.icon}</span>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps-container">
          {steps.map((step, index) => (
            <div key={index} className="step-card">
              <div className="step-number">{step.num}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
        <p className="section-cta" onClick={handleRegister} style={{ cursor: 'pointer' }}>
          Start Now — Free to Join
        </p>
      </section>

      {/* Project Teasers */}
      <section className="project-teasers">
        <h2>Showcase Your Projects</h2>
        <div className="projects-grid">
          {projects.map((project, index) => (
            <div 
              key={index} 
              className="project-card"
              onMouseEnter={() => setHoveredCard(`project-${index}`)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={handleLogin}
            >
              <div className="blur-content">
                <h3>{project.title}</h3>
                <p>{project.type}</p>
                <div className="blur-details">████████████</div>
              </div>
              {hoveredCard === `project-${index}` && (
                <div className="hover-message-small">🔒 Login to list your projects</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Trust Stats */}
      <section className="agent-trust-stats">
        <h2>Trusted by Real Estate Professionals</h2>
        <div className="agent-stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="agent-stat-card">
              <span className="agent-stat-icon">{stat.icon}</span>
              <h3>{stat.number}</h3>
              <p>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tools Highlights */}
      <section className="tools-section">
        <h2>Powerful Tools for Your Business</h2>
        <div className="tools-grid">
          {tools.map((tool, index) => (
            <div key={index} className="tool-card">
              <span className="tool-check">✓</span>
              <span>{tool}</span>
            </div>
          ))}
        </div>
        <p className="section-cta" onClick={handleRegister} style={{ cursor: 'pointer' }}>
          Unlock all tools → Create your free business account
        </p>
      </section>

      {/* Reviews */}
      <section className="reviews-section">
        <h2>What Professionals Say</h2>
        <div className="reviews-container">
          {reviews.map((review, index) => (
            <div key={index} className="review-card">
              <p className="review-text">"{review.text}"</p>
              <p className="review-author">— {review.author}, {review.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <h2>🚀 Join the Fastest Growing Network of Agents & Builders</h2>
        <p>Start managing projects, properties, and leads — all in one dashboard.</p>
        <div className="agent-cta-buttons">
          <button className="agent-btn agent-btn-large agent-btn-light" onClick={handleLogin}>Login</button>
          <button className="agent-btn agent-btn-large agent-btn-outline" onClick={handleRegister}>Register</button>
        </div>
      </section>
    </div>
  );
}