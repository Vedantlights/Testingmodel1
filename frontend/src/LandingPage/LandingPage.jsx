import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

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

  return (
    <div className="landing-page">
      {!hideNavbarFooter && <Navbar />}
      
      <main className="main-content">
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
        </Routes>
      </main>

      {!hideNavbarFooter && <Footer />}
    </div>
  );
}

export default LandingPage;