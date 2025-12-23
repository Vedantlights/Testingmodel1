import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api.config';
import AdminLayout from '../../LandingPage/components/admin/AdminLayout';

// Import admin pages
import AdminLogin from '../../LandingPage/pages/admin/AdminLogin';
import AdminDashboard from '../../LandingPage/pages/admin/AdminDashboard';
import AdminUsers from '../../LandingPage/pages/admin/AdminUsers';
import AdminProperties from '../../LandingPage/pages/admin/AdminProperties';
import AdminAgents from '../../LandingPage/pages/admin/AdminAgents';
import AdminSupport from '../../LandingPage/pages/admin/AdminSupport';
import AdminSettings from '../../LandingPage/pages/admin/AdminSettings';

// Protected Route Component for Admin
// Uses session-based auth (HTTP-only cookie), so we check via API
const AdminProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(null);
  const [isChecking, setIsChecking] = React.useState(true);

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/auth/verify.php`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        setIsAuthenticated(data.success && data.data && data.data.admin);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, []);

  if (isChecking) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

const AdminRoutes = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<AdminLogin />} />
      
      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/properties"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminProperties />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminUsers />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/agents"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminAgents />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/support"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminSupport />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminSettings />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
};

export default AdminRoutes;
