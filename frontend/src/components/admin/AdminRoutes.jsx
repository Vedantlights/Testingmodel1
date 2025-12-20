import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
const AdminProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  
  if (!token) {
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
