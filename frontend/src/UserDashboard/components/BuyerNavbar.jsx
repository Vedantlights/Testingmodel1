import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api.service';
import '../styles/BuyerNavbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Handle logout
  const handleLogout = () => {
    logout();
    // Navigate to landing page home after logout using React Router
    navigate('/', { replace: true });
  };
  
  // Listen for unread count changes from ChatUs component
  useEffect(() => {
    const handleUnreadCountChange = (event) => {
      setNotifications(event.detail || 0);
    };

    window.addEventListener('buyerUnreadCountChange', handleUnreadCountChange);
    
    return () => {
      window.removeEventListener('buyerUnreadCountChange', handleUnreadCountChange);
    };
  }, []);

  // Handle scroll effect - Optimized with requestAnimationFrame throttling
  // CRITICAL: Use useMemo to prevent unnecessary re-renders
  useEffect(() => {
    let ticking = false;
    let lastScrollY = 0;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          // Only update state if scroll position actually changed significantly
          // This prevents constant re-renders during smooth scrolling
          if (Math.abs(currentScrollY - lastScrollY) > 5) {
            setScrolled(currentScrollY > 10);
            lastScrollY = currentScrollY;
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Memoize scrolled state to prevent unnecessary className recalculations
  const navbarClassName = useMemo(() => {
    return `buyer-navbar ${scrolled ? 'buyer-navbar-scrolled' : ''}`;
  }, [scrolled]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    
    // Special case: /buyer-dashboard should match /BuyerHome
    if (path === '/BuyerHome') {
      return location.pathname === '/buyer-dashboard' || 
             location.pathname === '/BuyerHome' ||
             location.pathname.startsWith('/BuyerHome/');
    }
    
    // For other paths, check exact match or path followed by '/'
    return location.pathname === path || 
           location.pathname.startsWith(path + '/');
  };

  return (
    <nav className={navbarClassName}>
      {/* Happy New Year 2026 Animation */}
      <div className="new-year-banner">
        <div className="new-year-content">
          <span className="new-year-text">🎉 Happy New Year 2026! 🎉</span>
          <div className="sparkles">
            <span className="sparkle">✨</span>
            <span className="sparkle">✨</span>
            <span className="sparkle">✨</span>
          </div>
        </div>
      </div>
      <div className="buyer-navbar-container">
        <div className="buyer-navbar-content">
          {/* Logo */}
          <Link to="/buyer-dashboard" className="navbar-logo">
            <div className="logo-container">
              <img src="/logo.png" alt="India Propertys" className="logo-image" />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="buyer-nav-links-desktop">
            <Link to="/buyer-dashboard" className={`buyer-nav-link ${isActive('/buyer-dashboard') || isActive('/BuyerHome') ? 'active' : ''}`}>
              <span>Home</span>
            </Link>
            <Link to="/buy" className={`buyer-nav-link ${isActive('/buy') ? 'active' : ''}`}>
              <span>Buy</span>
            </Link>
            <Link to="/rent" className={`buyer-nav-link ${isActive('/rent') ? 'active' : ''}`}>
              <span>Rent</span>
            </Link>
            <Link to="/pghostel" className={`buyer-nav-link ${isActive('/pghostel') ? 'active' : ''}`}>
              <span>PG / Hostel</span>
            </Link>
            <Link to="/BuyerProfile" className={`buyer-nav-link ${isActive('/BuyerProfile') ? 'active' : ''}`}>
              <span>Profile</span>
            </Link>
            <Link to="/ChatUs" className={`buyer-nav-link ${isActive('/ChatUs') ? 'active' : ''}`}>
              <span>Chats</span>
            </Link>
            <Link to="/BuyerContactPage" className={`buyer-nav-link ${isActive('/BuyerContactPage') ? 'active' : ''}`}>
              <span>Contact</span>
            </Link>
            
            {/* Notifications */}
            <button 
              className="buyer-notification-btn" 
              title="Notifications"
              onClick={() => navigate('/ChatUs')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.73 21a2 2 0 01-3.46 0" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {notifications > 0 && <span className="buyer-notification-badge">{notifications}</span>}
            </button>
            
            {/* User Header */}
            <div className="buyer-user-header" onClick={() => setShowUserMenu(!showUserMenu)}>
              <div className="buyer-user-avatar">
                {user?.profile_image ? (
                  <img src={user.profile_image} alt={user.full_name || 'User'} />
                ) : (
                  <span>{user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}</span>
                )}
              </div>
              <div className="buyer-user-info">
                <span className="buyer-user-name">{user?.full_name || user?.email?.split('@')[0] || 'User'}</span>
                <span className="buyer-user-role">
                  {user?.user_type === 'buyer' ? 'Buyer' : 
                   user?.user_type === 'seller' ? 'Seller' : 
                   user?.user_type === 'agent' ? 'Agent' : 'User'}
                </span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2"/>
              </svg>
              
              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="buyer-user-dropdown">
                  <Link to="/BuyerProfile" onClick={() => setShowUserMenu(false)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    My Profile
                  </Link>
                  <button onClick={handleLogout}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" 
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`buyer-mobile-menu-button ${isMenuOpen ? 'open' : ''}`}
            aria-label="Toggle menu"
          >
            <span className="buyer-menu-icon-line"></span>
            <span className="buyer-menu-icon-line"></span>
            <span className="buyer-menu-icon-line"></span>
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`buyer-mobile-menu ${isMenuOpen ? 'open' : ''}`}>
          <div className="buyer-mobile-menu-content">
            {/* Mobile User Info */}
            <div className="buyer-mobile-user-info">
              <div className="buyer-mobile-user-avatar">
                {user?.profile_image ? (
                  <img src={user.profile_image} alt={user.full_name || 'User'} />
                ) : (
                  <span>{user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}</span>
                )}
              </div>
              <div className="buyer-mobile-user-details">
                <span className="buyer-mobile-user-name">{user?.full_name || user?.email?.split('@')[0] || 'User'}</span>
                <span className="buyer-mobile-user-email">{user?.email || ''}</span>
              </div>
            </div>
            
            <Link to="/buyer-dashboard" className={`buyer-mobile-nav-link ${isActive('/buyer-dashboard') || isActive('/BuyerHome') ? 'active' : ''}`}>
              <span>Home</span>
            </Link>
            <Link to="/buy" className={`buyer-mobile-nav-link ${isActive('/buy') ? 'active' : ''}`}>
              <span>Buy</span>
            </Link>
            <Link to="/rent" className={`buyer-mobile-nav-link ${isActive('/rent') ? 'active' : ''}`}>
              <span>Rent</span>
            </Link>
            <Link to="/pghostel" className={`buyer-mobile-nav-link ${isActive('/pghostel') ? 'active' : ''}`}>
              <span>PG / Hostel</span>
            </Link>
            <Link to="/BuyerProfile" className={`buyer-mobile-nav-link ${isActive('/BuyerProfile') ? 'active' : ''}`}>
              <span>Profile</span>
            </Link>
            <Link to="/chatus" className={`buyer-mobile-nav-link ${isActive('/chatus') ? 'active' : ''}`}>
              <span>Chats</span>
            </Link>
            <Link to="/BuyerContactPage" className={`buyer-mobile-nav-link ${isActive('/BuyerContactPage') ? 'active' : ''}`}>
              <span>Contact</span>
            </Link>
            <button onClick={handleLogout} className="buyer-mobile-logout-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;