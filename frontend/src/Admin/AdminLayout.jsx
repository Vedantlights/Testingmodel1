import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Link, useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { 
  Home, 
  Building2, 
  Users, 
  UserCheck, 
  Headphones, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api.config';
import './AdminLayout.css';

// Lazy load page components to avoid initialization issues
const AdminDashboard = lazy(() => import('./Pages/AdminDashboard'));
const AdminProperties = lazy(() => import('./Pages/AdminProperties'));
const AdminUsers = lazy(() => import('./Pages/AdminUsers'));
const AdminAgents = lazy(() => import('./Pages/AdminAgents'));
const AdminSupport = lazy(() => import('./Pages/AdminSupport'));
const AdminSettings = lazy(() => import('./Pages/AdminSettings'));
const AdminLogin = lazy(() => import('./Pages/AdminLogin'));

const AdminLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if current page is login (hide navbar on login page)
  const isLoginPage = location.pathname === '/admin/login';

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [adminData, setAdminData] = useState(null);
  const [menuItems, setMenuItems] = useState([]);

  // Define all possible menu items with permissions
  const allMenuItems = [
    { path: '/admin/dashboard', icon: Home, label: 'Dashboard', roles: ['super_admin', 'admin', 'moderator'] },
    { path: '/admin/properties', icon: Building2, label: 'Properties', roles: ['super_admin', 'admin', 'moderator'] },
    { path: '/admin/users', icon: Users, label: 'Users', roles: ['super_admin', 'admin'] },
    { path: '/admin/agents', icon: UserCheck, label: 'Agents', roles: ['super_admin', 'admin'] },
    { path: '/admin/support', icon: Headphones, label: 'Support', roles: ['super_admin', 'admin', 'moderator'] },
    { path: '/admin/settings', icon: Settings, label: 'Settings', roles: ['super_admin', 'admin', 'moderator'] },
  ];

  // Filter menu items based on admin role
  const getMenuItemsForRole = (role) => {
    if (!role) return [];
    return allMenuItems.filter(item => item.roles.includes(role));
  };

  // Check authentication for protected routes - VERIFY WITH BACKEND
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('adminToken');
      
      if (!token) {
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        if (!isLoginPage) {
          navigate('/admin/login', { replace: true });
        }
        return;
      }

      // Verify token with backend
      try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ADMIN_VERIFY}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        const data = await response.json();

        if (data.success && data.data && data.data.admin) {
          const admin = data.data.admin;
          setAdminData(admin);
          // Set menu items based on admin role
          setMenuItems(getMenuItemsForRole(admin.role));
          setIsAuthenticated(true);
          if (isLoginPage) {
            navigate('/admin/dashboard', { replace: true });
          }
        } else {
          // Token invalid - clear and redirect to login
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminData');
          localStorage.removeItem('adminLoggedIn');
          setIsAuthenticated(false);
          if (!isLoginPage) {
            navigate('/admin/login', { replace: true });
          }
        }
      } catch (error) {
        console.error('Auth verification error:', error);
        // On error, clear token and redirect to login
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        localStorage.removeItem('adminLoggedIn');
        setIsAuthenticated(false);
        if (!isLoginPage) {
          navigate('/admin/login', { replace: true });
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [isLoginPage, navigate]);

  const handleLogout = () => {
    // Clear admin token and data
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    navigate('/admin/login');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Loading component
  const LoadingFallback = () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <div>Loading...</div>
    </div>
  );

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return <LoadingFallback />;
  }

  // If on login page, just render login without the layout
  if (isLoginPage) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<AdminLogin />} />
        </Routes>
      </Suspense>
    );
  }

  // If not authenticated, show nothing (redirect will happen in useEffect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="admin-layout">

      {/* Navbar */}
      <nav className="admin-navbar">
        <div className="admin-navbar-container">

          {/* Logo */}
          <div
            className="admin-navbar-logo"
            onClick={() => navigate('/admin/dashboard')}
          >
            <span className="admin-logo-text">
              <img src="/logo.jpeg" style={{ height: "4rem" }} alt="Logo" />
            </span>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="admin-mobile-menu-btn" onClick={toggleMobileMenu}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>

          {/* Navigation Menu */}
          <div className={`admin-navbar-menu ${mobileMenuOpen ? 'admin-mobile-open' : ''}`}>
            {menuItems.length > 0 ? (
              menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`admin-nav-item ${isActive ? 'admin-active' : ''}`}
                    onClick={closeMobileMenu}
                  >
                    <Icon className="admin-nav-icon" />
                    <span>{item.label}</span>
                  </Link>
                );
              })
            ) : (
              // Fallback menu items while loading
              allMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`admin-nav-item ${isActive ? 'admin-active' : ''}`}
                    onClick={closeMobileMenu}
                  >
                    <Icon className="admin-nav-icon" />
                    <span>{item.label}</span>
                  </Link>
                );
              })
            )}
            
            {/* Admin Info */}
            {adminData && (
              <div style={{ 
                marginTop: 'auto', 
                padding: '12px', 
                borderTop: '1px solid rgba(255,255,255,0.1)',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.8)'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{adminData.full_name || adminData.username}</div>
                <div style={{ fontSize: '11px', textTransform: 'capitalize' }}>{adminData.role?.replace('_', ' ')}</div>
              </div>
            )}

            {/* Mobile Logout */}
            <button className="admin-logout-btn admin-mobile-logout" onClick={handleLogout}>
              <LogOut />
              <span>Logout</span>
            </button>
          </div>

          {/* Desktop Logout */}
          <button className="admin-logout-btn admin-desktop-logout" onClick={handleLogout}>
            <LogOut />
            <span>Logout</span>
          </button>

        </div>
      </nav>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div className="admin-mobile-overlay" onClick={closeMobileMenu}></div>
      )}

      {/* Main Content - Routes are defined here */}
      <div className="admin-main">
        <div className="admin-content">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/dashboard" element={<AdminDashboard />} />
              <Route path="/properties" element={<AdminProperties />} />
              <Route path="/users" element={<AdminUsers />} />
              <Route path="/agents" element={<AdminAgents />} />
              <Route path="/support" element={<AdminSupport />} />
              <Route path="/settings" element={<AdminSettings />} />
              <Route path="/login" element={<AdminLogin />} />
            </Routes>
          </Suspense>
        </div>
      </div>

    </div>
  );
};

export default AdminLayout;
