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
import CityProjects from './UserDashboard/pages/Cityprojects';
import ChatUs from './UserDashboard/pages/ChatUs';
import './UserDashboard/styles/global.css';

// =====================
// SELLER DASHBOARD
// =====================
import SellerDashboard from './Seller-Owner/Seller-dashboard';
import ProtectedRoute from './context/ProtectedRoute';

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

  useEffect(() => {
    window.scrollTo(0, 0);
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

          {/* Main Landing Page */}
          <Route path="/*" element={<LandingPage />} />

          {/* Admin */}
          <Route path="/admin/*" element={<Admin />} />

          {/* ==================== */}
          {/* BUYER DASHBOARD ROUTES */}
          {/* ==================== */}
          <Route path="/buyer-dashboard" element={<BuyerDashboardLayout><BuyerHome /></BuyerDashboardLayout>} />

          <Route path="/buy" element={<BuyerDashboardLayout><CityFilteredBuy /></BuyerDashboardLayout>} />
          <Route path="/rent" element={<BuyerDashboardLayout><CityFilteredRent /></BuyerDashboardLayout>} />
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
          <Route path="/buyer-dashboard/projects" element={<BuyerDashboardLayout><CityProjects /></BuyerDashboardLayout>} />
          <Route path="/buyer-dashboard/profile" element={<BuyerDashboardLayout><BuyerProfile /></BuyerDashboardLayout>} />
          <Route path="/buyer-dashboard/chat" element={<BuyerDashboardLayout><ChatUs /></BuyerDashboardLayout>} />
          <Route path="/buyer-dashboard/BuyerContactPage" element={<BuyerDashboardLayout><BuyerContactPage /></BuyerDashboardLayout>} />
          <Route path="/buyer-dashboard/search" element={<BuyerDashboardLayout><SearchResults /></BuyerDashboardLayout>} />
          <Route path="/buyer-dashboard/details/:id" element={<BuyerDashboardLayout><ViewDetailsPage /></BuyerDashboardLayout>} />

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