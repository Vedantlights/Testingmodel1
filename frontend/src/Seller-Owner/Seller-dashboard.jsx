import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Component imports
import SellerOverview from './Components/SellerOverview';
import SellerProperties from './Components/SellerProperties';
import SellerInquiries from './Components/SellerInquiries';
import SellerProfile from './Components/SellerProfile';
import Subscription from './Components/PlainTimerPage';
// Use buyer's ViewDetailsPage for all property details (same layout for buyers and sellers)
import ViewDetailsPage from '../UserDashboard/pages/ViewDetailsPage';

import { PropertyProvider, useProperty } from './Components/PropertyContext';
import { sellerDashboardAPI } from '../services/api.service';

import './Seller-dashboard.css';

// Inner component that uses the PropertyContext
const SellerDashboardContent = () => {
  const { user, logout: authLogout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(89);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [imageError, setImageError] = useState(false);
  const userMenuRef = useRef(null);
  const sellerMainRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Get inquiries from PropertyContext - this is already dynamic and updates when inquiries change
  const { inquiries } = useProperty();
  const [unreadChatMessages, setUnreadChatMessages] = useState(0);

  // Notification badge shows ONLY unread chat messages count
  // It reduces when messages are read
  const notifications = useMemo(() => {
    return unreadChatMessages;
  }, [unreadChatMessages]);

  // Add body class to hide browser scrollbar when seller dashboard is active
  useEffect(() => {
    document.body.classList.add('seller-dashboard-active');
    return () => {
      document.body.classList.remove('seller-dashboard-active');
    };
  }, []);

  // Update active tab based on route
  useEffect(() => {
    const isDetailsPage = location.pathname.includes('/seller-pro-details/') || location.pathname.includes('/details/');
    
    // If we're on details page, don't change activeTab (keep current tab active)
    if (isDetailsPage) {
      return;
    }
    
    // Otherwise, update activeTab based on pathname
    if (location.pathname.includes('/properties') || location.pathname === '/seller-dashboard/properties') {
      setActiveTab('properties');
    } else if (location.pathname.includes('/inquiries') || location.pathname === '/seller-dashboard/inquiries') {
      setActiveTab('inquiries');
    } else if (location.pathname.includes('/profile') || location.pathname === '/seller-dashboard/profile') {
      setActiveTab('profile');
    } else if (location.pathname.includes('/subscription') || location.pathname === '/seller-dashboard/subscription') {
      setActiveTab('subscription');
    } else if (location.pathname === '/seller-dashboard' || location.pathname === '/seller-dashboard/') {
      setActiveTab('overview');
    }
  }, [location.pathname]);

  // Handle scroll for header shadow effect - Optimized with throttling
  // Now listens to seller-main scroll instead of window scroll
  useEffect(() => {
    const mainElement = sellerMainRef.current;
    if (!mainElement) return;
    
    let ticking = false;
    let currentScrolled = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const newScrolled = mainElement.scrollTop > 10;
          // Only update state if the value actually changed
          if (newScrolled !== currentScrolled) {
            currentScrolled = newScrolled;
            setScrolled(newScrolled);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    
    mainElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  const openProfileFromHeader = () => {
    setShowUserMenu(false);
    handleTabChange('profile');
  };

  // Fetch subscription data on mount and update remaining days
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        const response = await sellerDashboardAPI.getStats();
        
        if (response.success && response.data?.subscription?.end_date) {
          const endDate = new Date(response.data.subscription.end_date);
          const now = new Date();
          const diffTime = endDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysRemaining(Math.max(0, diffDays));
        } else {
          // Fallback: calculate from trial start date if available
          const trialStartDate = localStorage.getItem('trialStartDate');
          if (trialStartDate) {
            const start = new Date(trialStartDate);
            const end = new Date(start);
            end.setMonth(end.getMonth() + 3);
            const now = new Date();
            const diffTime = end - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setDaysRemaining(Math.max(0, diffDays));
          }
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
        // Fallback: calculate from trial start date if available
        const trialStartDate = localStorage.getItem('trialStartDate');
        if (trialStartDate) {
          const start = new Date(trialStartDate);
          const end = new Date(start);
          end.setMonth(end.getMonth() + 3);
          const now = new Date();
          const diffTime = end - now;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysRemaining(Math.max(0, diffDays));
        }
      }
    };

    fetchSubscriptionData();
    
    // Update remaining days every minute to keep it accurate
    const interval = setInterval(() => {
      fetchSubscriptionData();
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    authLogout();
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentSession');
    navigate('/');
  };

  const handleTabChange = (tab) => {
    console.log('Tab changed to:', tab);
    setActiveTab(tab);
    setIsSidebarOpen(false);
    // Scroll seller-main to top instead of window
    if (sellerMainRef.current) {
      sellerMainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Navigate to the appropriate route
    if (tab === 'overview') {
      navigate('/seller-dashboard');
    } else if (tab === 'properties') {
      navigate('/seller-dashboard/properties');
    } else if (tab === 'inquiries') {
      navigate('/seller-dashboard/inquiries');
    } else if (tab === 'profile') {
      navigate('/seller-dashboard/profile');
    } else if (tab === 'subscription') {
      navigate('/seller-dashboard/subscription');
    }
  };

  const renderContent = () => {
    // CHECK 1: Are we on property details page?
    // Use buyer's ViewDetailsPage layout for all property details
    const isDetailsPage = location.pathname.includes('/seller-pro-details/') || location.pathname.includes('/details/');
    
    if (isDetailsPage) {
      // Use buyer's ViewDetailsPage component (same layout for all users)
      return <ViewDetailsPage />;
    }

    // CHECK 2: Handle tab-based content
    switch (activeTab) {
      case 'overview':
        console.log('📊 Rendering SellerOverview');
        return <SellerOverview onNavigate={handleTabChange} />;
      case 'properties':
        console.log('🏠 Rendering SellerProperties');
        return <SellerProperties />;
      case 'inquiries':
        console.log('💬 Rendering SellerInquiries');
        return <SellerInquiries onUnreadCountChange={setUnreadChatMessages} />;
      case 'profile':
        console.log('👤 Rendering SellerProfile');
        return <SellerProfile />;
      case 'subscription':
        console.log('💳 Rendering Subscription');
        return <Subscription />;
      default:
        console.log('📊 Rendering SellerOverview (default)');
        return <SellerOverview onNavigate={handleTabChange} />;
    }
  };

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
        <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
        <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
        <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )},
    { id: 'properties', label: 'My Properties', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )},
    { id: 'inquiries', label: 'Inquiries', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )},
    { id: 'profile', label: 'Profile', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )},
    { id: 'subscription', label: 'Subscription', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
        <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
        <path d="M6 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M14 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    )}
  ];

  return (
    <div className="seller-dashboard">
      
      {/* Header */}
      <header className={`seller-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="header-left">
          <button 
            className={`menu-toggle ${isSidebarOpen ? 'active' : ''}`}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div 
            className="logo" 
            onClick={() => handleTabChange('overview')}
            style={{ cursor: 'pointer' }}
            title="Go to Dashboard"
          >
            <div className="logo-icon-wrapper">
            <img src='/Media/logo.png' alt='logo'/>
            </div>
          </div>
        </div>
        
        <nav className="header-nav">
          {navItems.map((item) => {
            // Don't highlight tab when on details page
            const isDetailsPage = location.pathname.includes('/seller-pro-details/') || location.pathname.includes('/details/');
            const isActive = !isDetailsPage && activeTab === item.id;
            
            return (
              <button 
                key={item.id}
                className={`nav-btn ${isActive ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleTabChange(item.id);
                }}
                type="button"
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.id === 'inquiries' && notifications > 0 && (
                  <span className="nav-badge">{notifications}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="header-right">
          <button 
            className={`free-trial-badge ${daysRemaining <= 7 ? 'urgent' : ''}`}
            onClick={() => handleTabChange('subscription')}
          >
            <span className="trial-text">Free Trial</span>
            <br></br>
            <span className="trial-days">{daysRemaining}</span>
            <span className="trial-text">days left</span>
          </button>

          {/* User Header */}
          <div className="seller-user-header" ref={userMenuRef} onClick={toggleUserMenu}>
            <div className="seller-user-avatar">
              {user?.profile_image && !imageError ? (
                <img 
                  src={user.profile_image} 
                  alt={user?.full_name || user?.name || 'User'} 
                  onError={() => setImageError(true)}
                />
              ) : (
                <span>
                  {user?.full_name?.charAt(0)?.toUpperCase() || 
                   user?.name?.charAt(0)?.toUpperCase() || 
                   user?.email?.charAt(0)?.toUpperCase() || 
                   'U'}
                </span>
              )}
            </div>
            <div className="seller-user-info">
              <span className="seller-user-name">
                {user?.full_name || user?.name || user?.email?.split('@')[0] || 'User'}
              </span>
              <span className="seller-user-role">
                {user?.user_type === 'seller' ? 'Pro Seller' : 
                 user?.user_type === 'agent' ? 'Agent/Builder' : 
                 'Seller'}
              </span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2"/>
            </svg>
            
            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="seller-user-dropdown">
                <button onClick={openProfileFromHeader}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  My Profile
                </button>
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
      </header>

      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      <aside className={`mobile-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="mobile-sidebar-header">
          <div 
            className="logo"
            onClick={() => handleTabChange('overview')}
            style={{ cursor: 'pointer' }}
          >
            <div className="logo-icon-wrapper">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="white" stroke="white" strokeWidth="2"/>
                <path d="M9 22V12h6v10" stroke="#003B73" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="logo-text">IndiaPropertys</span>
          </div>
          <button 
            className="close-sidebar"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        
        <div 
          className="mobile-user-section"
          onClick={() => handleTabChange('profile')}
          style={{ cursor: 'pointer' }}
        >
          <div className="mobile-user-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="mobile-user-info">
            <span className="mobile-user-name">
              {user?.name || user?.first_name + ' ' + user?.last_name || user?.email || 'User'}
            </span>
            <span className="mobile-user-role">
              {user?.user_type === 'agent' ? 'Agent/Builder' : 'Pro Seller'}
            </span>
          </div>
        </div>
        
        <nav className="mobile-nav">
          {navItems.map((item) => (
            <button 
              key={item.id}
              className={`mobile-nav-btn ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleTabChange(item.id)}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              <span className="mobile-nav-label">{item.label}</span>
              {item.id === 'inquiries' && notifications > 0 && (
                <span className="mobile-nav-badge">{notifications}</span>
              )}
            </button>
          ))}
          
          <div className="mobile-nav-divider"></div>
          
          <button className="mobile-nav-btn logout" onClick={handleLogout}>
            <span className="mobile-nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="mobile-nav-label">Logout</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="seller-main" ref={sellerMainRef}>
        <div className="main-content-wrapper" key={location.pathname}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

// Main component that wraps everything with PropertyProvider
const SellerDashboard = () => {
  return (
    <PropertyProvider>
      <SellerDashboardContent />
    </PropertyProvider>
  );
};

export default SellerDashboard;