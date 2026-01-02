import React from 'react';
import { useLocation } from 'react-router-dom';
import LandingNavbar from './LandingNavbar';
import Footer from './Footer';
import '../LandingPage.css';

const PublicLayout = ({ children }) => {
  const location = useLocation();
  const path = location.pathname.toLowerCase();

  // Pages where Navbar and Footer should be hidden
  const hideNavbarFooter = path === '/login' || path === '/register';

  // Determine background image based on route
  // Note: Buyer, Seller, and Agent pages have backgrounds in their hero sections only
  const getBackgroundImage = () => {
    if (path === '/') return '/AboutUs.jpg';
    // Removed background images for buyer, seller, and agent - they use hero section backgrounds only
    if (path === '/seller' || path === '/search') return null;
    if (path === '/buyer' || path === '/dashboard') return null;
    if (path === '/agents') return null;
    if (path === '/contact') return null;
    if (path === '/about') return null;
    return null;
  };

  const backgroundImage = getBackgroundImage();

  return (
    <div className="landing-page">
      {/* Separate Navbar Div */}
      {!hideNavbarFooter && (
        <div className="navbar-wrapper">
          <LandingNavbar />
        </div>
      )}
      
      {/* Main Content */}
      <main 
        className="main-content"
        style={backgroundImage && !hideNavbarFooter ? {
          '--landing-bg-image': `url(${backgroundImage})`
        } : {}}
      >
        {children}
      </main>

      {!hideNavbarFooter && <Footer />}
    </div>
  );
};

export default PublicLayout;

