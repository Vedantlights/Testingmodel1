import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/AboutUs.css';

const AboutUs = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="about-us-page">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="about-hero-overlay"></div>
        <div className="about-hero-content">
          <h1 className="about-hero-title">About IndiaPropertys</h1>
          <p className="about-hero-subtitle">
            Your Trusted Partner in Real Estate - Connecting Dreams to Reality
          </p>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="about-section about-story">
        <div className="about-container">
          <div className="about-section-header">
            <h2 className="about-section-title">Our Story</h2>
            <div className="about-title-underline"></div>
          </div>
          <div className="about-story-content">
            <div className="about-story-text">
              <p className="about-paragraph">
                Founded with a vision to revolutionize the real estate industry in India, IndiaPropertys 
                emerged as a trusted platform dedicated to simplifying property transactions. We recognized 
                the challenges faced by buyers, sellers, and renters in navigating the complex real estate 
                market and set out to create a seamless, transparent, and user-friendly solution.
              </p>
              <p className="about-paragraph">
                Since our inception, we have been committed to providing verified property listings, 
                transparent pricing, and expert support to make real estate transactions simpler, safer, 
                and faster. Our platform serves as a bridge connecting property seekers with their dream 
                homes and commercial spaces across India.
              </p>
              <p className="about-paragraph">
                Today, IndiaPropertys stands as one of the leading real estate platforms, helping thousands 
                of users find their perfect property match. We continue to innovate and expand our services 
                to serve the evolving needs of the Indian real estate market.
              </p>
            </div>
            <div className="about-story-image">
              <div className="about-image-placeholder">
                <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="400" height="300" fill="#f3f4f6"/>
                  <path d="M200 100L250 150L200 200L150 150L200 100Z" fill="#764ba2" opacity="0.3"/>
                  <circle cx="200" cy="150" r="40" fill="#003B73" opacity="0.2"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="about-section about-mission-vision">
        <div className="about-container">
          <div className="mission-vision-grid">
            <div className="mission-vision-card">
              <div className="mission-vision-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h3 className="mission-vision-title">Our Mission</h3>
              <p className="mission-vision-text">
                To empower every Indian with seamless access to verified properties, transparent 
                transactions, and expert guidance, making real estate dreams achievable for everyone.
              </p>
            </div>
            <div className="mission-vision-card">
              <div className="mission-vision-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <h3 className="mission-vision-title">Our Vision</h3>
              <p className="mission-vision-text">
                To become India's most trusted and innovative real estate platform, transforming 
                how people buy, sell, and rent properties through technology, transparency, and 
                exceptional service.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="about-section about-values">
        <div className="about-container">
          <div className="about-section-header">
            <h2 className="about-section-title">Our Core Values</h2>
            <div className="about-title-underline"></div>
            <p className="about-section-subtitle">
              The principles that guide everything we do
            </p>
          </div>
          <div className="values-grid">
            <div className="value-card">
              <div className="value-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                  <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                  <path d="M12 21c0-1-1-3-3-3s-3 2-3 3 1 3 3 3 3-2 3-3"/>
                  <path d="M12 3c0 1-1 3-3 3S6 4 6 3s1-3 3-3 3 2 3 3"/>
                </svg>
              </div>
              <h3 className="value-title">Trust & Transparency</h3>
              <p className="value-description">
                We believe in honest, transparent dealings with verified listings and clear 
                communication at every step.
              </p>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3 className="value-title">Customer First</h3>
              <p className="value-description">
                Your satisfaction is our priority. We go above and beyond to ensure you have 
                the best experience possible.
              </p>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <h3 className="value-title">Innovation</h3>
              <p className="value-description">
                We continuously evolve our platform with cutting-edge technology to make 
                property search easier and more efficient.
              </p>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h3 className="value-title">Integrity</h3>
              <p className="value-description">
                We maintain the highest ethical standards in all our business practices and 
                relationships.
              </p>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <h3 className="value-title">Excellence</h3>
              <p className="value-description">
                We strive for excellence in every aspect of our service, from property 
                verification to customer support.
              </p>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3 className="value-title">Accessibility</h3>
              <p className="value-description">
                We make real estate accessible to everyone, regardless of background, with 
                user-friendly tools and expert guidance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="about-section about-why-choose">
        <div className="about-container">
          <div className="about-section-header">
            <h2 className="about-section-title">Why Choose IndiaPropertys?</h2>
            <div className="about-title-underline"></div>
          </div>
          <div className="why-choose-grid">
            <div className="why-choose-item">
              <div className="why-choose-number">01</div>
              <h3 className="why-choose-title">Verified Listings</h3>
              <p className="why-choose-text">
                Every property on our platform is verified for authenticity, ensuring you 
                get accurate information and genuine listings.
              </p>
            </div>
            <div className="why-choose-item">
              <div className="why-choose-number">02</div>
              <h3 className="why-choose-title">Transparent Pricing</h3>
              <p className="why-choose-text">
                No hidden costs or surprises. We provide clear, upfront pricing information 
                for all properties and services.
              </p>
            </div>
            <div className="why-choose-item">
              <div className="why-choose-number">03</div>
              <h3 className="why-choose-title">Expert Support</h3>
              <p className="why-choose-text">
                Our team of real estate experts is always ready to assist you with property 
                search, negotiations, and transaction support.
              </p>
            </div>
            <div className="why-choose-item">
              <div className="why-choose-number">04</div>
              <h3 className="why-choose-title">Wide Selection</h3>
              <p className="why-choose-text">
                Browse through thousands of properties across India - from apartments and 
                villas to commercial spaces and plots.
              </p>
            </div>
            <div className="why-choose-item">
              <div className="why-choose-number">05</div>
              <h3 className="why-choose-title">Advanced Search</h3>
              <p className="why-choose-text">
                Use our powerful search filters to find properties that match your exact 
                requirements - location, price, size, and more.
              </p>
            </div>
            <div className="why-choose-item">
              <div className="why-choose-number">06</div>
              <h3 className="why-choose-title">Secure Transactions</h3>
              <p className="why-choose-text">
                We prioritize your security and privacy, ensuring safe and secure property 
                transactions with proper documentation support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="about-section about-stats">
        <div className="about-container">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number" data-target="10000">0</div>
              <div className="stat-label">+ Properties Listed</div>
            </div>
            <div className="stat-card">
              <div className="stat-number" data-target="50">0</div>
              <div className="stat-label">+ Cities Covered</div>
            </div>
            <div className="stat-card">
              <div className="stat-number" data-target="100000">0</div>
              <div className="stat-label">+ Happy Customers</div>
            </div>
            <div className="stat-card">
              <div className="stat-number" data-target="5000">0</div>
              <div className="stat-label">+ Verified Agents</div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Services Section */}
      <section className="about-section about-services">
        <div className="about-container">
          <div className="about-section-header">
            <h2 className="about-section-title">Our Services</h2>
            <div className="about-title-underline"></div>
            <p className="about-section-subtitle">
              Comprehensive real estate solutions for all your needs
            </p>
          </div>
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <h3 className="service-title">Buy Properties</h3>
              <p className="service-description">
                Find your dream home from thousands of verified residential and commercial 
                properties across India.
              </p>
              <Link to="/buy" className="service-link">
                Explore Properties <span>→</span>
              </Link>
            </div>
            <div className="service-card">
              <div className="service-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <h3 className="service-title">Rent Properties</h3>
              <p className="service-description">
                Discover rental properties that suit your lifestyle and budget, from 
                apartments to independent houses.
              </p>
              <Link to="/rent" className="service-link">
                Find Rentals <span>→</span>
              </Link>
            </div>
            <div className="service-card">
              <div className="service-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <h3 className="service-title">New Projects</h3>
              <p className="service-description">
                Explore upcoming residential and commercial projects from reputed developers 
                with attractive pricing and amenities.
              </p>
              <Link to="/projects" className="service-link">
                View Projects <span>→</span>
              </Link>
            </div>
            <div className="service-card">
              <div className="service-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3 className="service-title">Post Property</h3>
              <p className="service-description">
                List your property for sale or rent and reach thousands of potential buyers 
                and tenants quickly and easily.
              </p>
              <Link to="/post-property" className="service-link">
                List Property <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="about-section about-cta">
        <div className="about-container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Find Your Dream Property?</h2>
            <p className="cta-subtitle">
              Join thousands of satisfied customers who found their perfect property through IndiaPropertys
            </p>
            <div className="cta-buttons">
              <Link to="/buy" className="cta-button cta-primary">
                Start Searching
              </Link>
              <Link to="/BuyerContactPage" className="cta-button cta-secondary">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;

