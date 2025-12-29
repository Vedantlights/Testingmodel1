// src/components/PublicRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PublicRoute = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();

  // Show spinner while loading
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #003B73',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Loading...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If authenticated, redirect based on user_type
  if (isAuthenticated && user) {
    const userType = user.user_type || user.role;
    
    switch (userType) {
      case 'buyer':
        return <Navigate to="/buyer-dashboard" replace />;
      case 'seller':
        return <Navigate to="/seller-dashboard" replace />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  // Not authenticated, render children (public page)
  return children;
};

export default PublicRoute;

