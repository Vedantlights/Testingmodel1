import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

// Global styles
import './App.css';

// =====================
// AUTH CONTEXT
// =====================
import { AuthProvider } from './context/AuthContext';

// =====================
// LANDING PAGE COMPONENTS
// =====================
import LandingPage from './LandingPage/LandingPage';

// =====================
// USER (BUYER) DASHBOARD
// =====================
import BuyerNavbar from './UserDashboard/components/BuyerNavbar';
import BuyerFooter from './UserDashboard/components/Footer';
import BuyerHome from './UserDashboard/pages/BuyerHome';
import BuyerProfile from './UserDashboard/pages/BuyerProfile';
import BuyerContactPage from './UserDashboard/pages/BuyerContactPage';
import ViewDetailsPage from './UserDashboard/pages/ViewDetailsPage';
import SearchResults from './UserDashboard/pages/SearchResults';
import CityFilteredBuy from './UserDashboard/pages/Cityfilteredbuy';
import CityFilteredRent from './UserDashboard/pages/Cityfilteredrent';
import CityFilteredPGHostel from './UserDashboard/pages/Cityfilteredpghostel';
import CityProjects from './UserDashboard/pages/Cityprojects';
import ChatUs from './UserDashboard/pages/ChatUs';
import './UserDashboard/styles/global.css';

// =====================
// SELLER DASHBOARD
// =====================
import SellerDashboard from './Seller-Owner/Seller-dashboard';
import ProtectedRoute from './context/ProtectedRoute';
import PublicRoute from './components/PublicRoute';

// =====================
// AGENT DASHBOARD
// =====================
import AgentDashboard from './Agent-dashboard/Agent-dashboard';

// =====================
// ADMIN DASHBOARD
// =====================
import Admin from './Admin/AdminLayout';

// =====================
// SCROLL TO TOP (GLOBAL)
// =====================
function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathnameRef = React.useRef(pathname);

  useEffect(() => {
    // CRITICAL: Only scroll to top on FULL page navigation (not dashboard tab switches)
    // Do NOT reset scroll for:
    // 1. Seller Dashboard routes (handles own scroll)
    // 2. Agent Dashboard routes (handles own scroll)
    // 3. Buyer Dashboard routes (sticky navbar + footer - preserve scroll position)
    
    const isSellerDashboard = pathname.startsWith('/seller-dashboard');
    const isAgentDashboard = pathname.startsWith('/agent-dashboard') || pathname.startsWith('/Agent-dashboard');
    const isBuyerDashboard = pathname.startsWith('/buy') || 
                             pathname.startsWith('/rent') || 
                             pathname.startsWith('/pghostel') || 
                             pathname.startsWith('/projects') ||
                             pathname.startsWith('/BuyerHome') ||
                             pathname.startsWith('/BuyerProfile') ||
                             pathname.startsWith('/BuyerContactPage') ||
                             pathname.startsWith('/ChatUs') ||
                             pathname.startsWith('/chatus') ||
                             pathname.startsWith('/details/') ||
                             pathname.startsWith('/searchresults') ||
                             pathname.startsWith('/about') ||
                             pathname.startsWith('/buyer-dashboard');
    
    // Only scroll to top if:
    // 1. Not a dashboard route (Seller/Agent/Buyer)
    // 2. AND it's a full page change (pathname actually changed)
    const isFullPageChange = prevPathnameRef.current !== pathname;
    
    if (!isSellerDashboard && !isAgentDashboard && !isBuyerDashboard && isFullPageChange) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    
    prevPathnameRef.current = pathname;
  }, [pathname]);

  return null;
}

// =====================
// LAYOUT COMPONENTS
// =====================
const NoNavLayout = ({ children }) => <main>{children}</main>;

const BuyerDashboardLayout = ({ children }) => {
  const location = useLocation();
  // Check if current path is ChatUs (with or without query params, case-insensitive)
  const isChatUsPage = location.pathname.toLowerCase() === '/chatus' || 
                       location.pathname.toLowerCase().startsWith('/chatus?') ||
                       location.pathname === '/ChatUs' ||
                       location.pathname.startsWith('/ChatUs?') ||
                       location.pathname === '/buyer-dashboard/chat' ||
                       location.pathname.startsWith('/buyer-dashboard/chat?');

  return (
    <div className="buyer-dashboard-app">
      <BuyerNavbar />
      <main className="buyer-main-content">{children}</main>
      {!isChatUsPage && <BuyerFooter />}
    </div>
  );
};

// =====================
// MAIN APP COMPONENT
// =====================
function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop /> {/* <-- ADDED HERE (Works for all pages) */}
        <div className="App">
          <Routes>

          {/* ==================== */}
          {/* PUBLIC LANDING PAGES */}
          {/* ==================== */}
          {/* All landing page routes - Login/Register only accessible here */}
          <Route path="/*" element={<PublicRoute><LandingPage /></PublicRoute>} />

          {/* ==================== */}
          {/* BUYER DASHBOARD ROUTES */}
          {/* ==================== */}
          {/* Strict isolation - Only dashboard routes */}
          <Route path="/buyer-dashboard" element={<BuyerDashboardLayout><BuyerHome /></BuyerDashboardLayout>} />
          <Route path="/buy" element={<BuyerDashboardLayout><CityFilteredBuy /></BuyerDashboardLayout>} />
          <Route path="/rent" element={<BuyerDashboardLayout><CityFilteredRent /></BuyerDashboardLayout>} />
          <Route path="/pghostel" element={<BuyerDashboardLayout><CityFilteredPGHostel /></BuyerDashboardLayout>} />
          <Route path="/projects" element={<BuyerDashboardLayout><CityProjects /></BuyerDashboardLayout>} />
          <Route path="/BuyerProfile" element={<BuyerDashboardLayout><BuyerProfile /></BuyerDashboardLayout>} />
          <Route path="/ChatUs" element={<BuyerDashboardLayout><ChatUs /></BuyerDashboardLayout>} />
          <Route path="/chatus" element={<BuyerDashboardLayout><ChatUs /></BuyerDashboardLayout>} />
          <Route path="/BuyerContactPage" element={<BuyerDashboardLayout><BuyerContactPage /></BuyerDashboardLayout>} />
          <Route path="/details/:id" element={<BuyerDashboardLayout><ViewDetailsPage /></BuyerDashboardLayout>} />
          <Route path="/searchresults" element={<BuyerDashboardLayout><SearchResults /></BuyerDashboardLayout>} />

          {/* Alternative routes with buyer-dashboard prefix */}
          <Route path="/BuyerHome" element={<BuyerDashboardLayout><BuyerHome /></BuyerDashboardLayout>} />
          <Route path="/buyer-dashboard/buy" element={<BuyerDashboardLayout><CityFilteredBuy /></BuyerDashboardLayout>} />
          <Route path="/buyer-dashboard/rent" element={<BuyerDashboardLayout><CityFilteredRent /></BuyerDashboardLayout>} />
          <Route path="/buyer-dashboard/pghostel" element={<BuyerDashboardLayout><CityFilteredPGHostel /></BuyerDashboardLayout>} />
          <Route path="/buyer-dashboard/projects" element={<BuyerDashboardLayout><CityProjects /></BuyerDashboardLayout>} />
          <Route path="/buyer-dashboard/profile" element={<BuyerDashboardLayout><BuyerProfile /></BuyerDashboardLayout>} />
          <Route path="/buyer-dashboard/chat" element={<BuyerDashboardLayout><ChatUs /></BuyerDashboardLayout>} />
          <Route path="/buyer-dashboard/BuyerContactPage" element={<BuyerDashboardLayout><BuyerContactPage /></BuyerDashboardLayout>} />
          <Route path="/buyer-dashboard/search" element={<BuyerDashboardLayout><SearchResults /></BuyerDashboardLayout>} />
          <Route path="/buyer-dashboard/details/:id" element={<BuyerDashboardLayout><ViewDetailsPage /></BuyerDashboardLayout>} />

          {/* ==================== */}
          {/* ADMIN & OTHER DASHBOARDS */}
          {/* ==================== */}
          <Route path="/admin/*" element={<Admin />} />

          {/* SELLER DASHBOARD - Protected Route */}
          <Route 
            path="/seller-dashboard/*" 
            element={
              <ProtectedRoute allowedRoles={['seller', 'agent']}>
                <SellerDashboard />
              </ProtectedRoute>
            } 
          />

          {/* AGENT DASHBOARD */}
          <Route path="/agent-dashboard/*" element={<AgentDashboard />} />
          <Route path="/Agent-dashboard/*" element={<AgentDashboard />} />

          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;