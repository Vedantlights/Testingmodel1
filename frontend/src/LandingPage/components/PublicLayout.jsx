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
  const getBackgroundImage = () => {
    if (path === '/') return '/AboutUs.jpg';
    if (path === '/seller' || path === '/search') return '/LoginSellerr.jpg';
    if (path === '/buyer' || path === '/dashboard') return '/LoginBuy.jpg';
    if (path === '/agents') return '/landingpageagent.jpeg';
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

