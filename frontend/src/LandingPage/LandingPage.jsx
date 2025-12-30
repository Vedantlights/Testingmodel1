import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import './LandingPage.css';

// Pages
import Home from './pages/Home';
import Seller from './pages/Seller';
import Buyer from './pages/Buyer';
import Agents from './pages/Agents';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import PostProperty from './components/Propertycard';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermConditions';
import AboutUs from './pages/AboutUs';

function LandingPage() {
  const location = useLocation();
  
  // Convert pathname to lowercase to avoid case issues
  const path = location.pathname.toLowerCase();

  // Pages where Navbar and Footer should be hidden
  const hideNavbarFooter =
    path === '/privacy-policy' ||
    path === '/terms-conditions'||
    path === '/login'||
    path === '/register';

  // Determine background image based on route
  const getBackgroundImage = () => {
    if (path === '/') return '/AboutUs.jpg';
    if (path === '/seller' || path === '/search') return '/LoginSellerr.jpg';
    if (path === '/buyer' || path === '/dashboard') return '/LoginBuy.jpg';
    if (path === '/agents') return '/landingpageagent.jpeg';
    if (path === '/contact') return null; // Contact page has its own background
    if (path === '/about') return null; // About page has its own background
    return null;
  };

  const backgroundImage = getBackgroundImage();

  return (
    <div className="landing-page">
      {/* Separate Navbar Div */}
      {!hideNavbarFooter && (
        <div className="navbar-wrapper">
          <Navbar />
        </div>
      )}
      
      {/* Main Content */}
      <main className="main-content">
        {/* Separate Background Image Div - Only for pages with searchbar */}
        {backgroundImage && !hideNavbarFooter && (
          <div 
            className="landing-background-image" 
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
        )}
        
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/seller" element={<Seller />} />
          <Route path="/buyer" element={<Buyer />} />
          <Route path="/search" element={<Seller />} />
          <Route path="/dashboard" element={<Buyer />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/post-property" element={<PostProperty />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-conditions" element={<TermsConditions />} />
          <Route path="/about" element={<AboutUs />} />
        </Routes>
      </main>

      {!hideNavbarFooter && <Footer />}
    </div>
  );
}

export default LandingPage;