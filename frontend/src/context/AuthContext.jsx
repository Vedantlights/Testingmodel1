// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api.service";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);      // logged in user data
  const [token, setToken] = useState(localStorage.getItem("authToken") || null);
  const [loading, setLoading] = useState(true);

  // Auto verify token on refresh
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    // Verify token using API service
    authAPI.verifyToken()
      .then((response) => {
        if (response.success && response.data) {
          setUser(response.data.user);
          setToken(response.data.token || token);
        } else {
          logout();
        }
      })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password, userType) => {
    try {
      console.log("AuthContext login called:", { email, userType });
      const response = await authAPI.login(email, password, userType);
      console.log("AuthContext login response:", response);

      if (response.success && response.data) {
        const token = response.data.token;
        const user = response.data.user;

        console.log("Setting token and user:", { token: token ? 'present' : 'missing', user });
        setToken(token);
        setUser(user);

        return { success: true, user, role: user.user_type };
      }

      console.error("Login response not successful:", response);
      return { success: false, message: response.message || 'Login failed' };
    } catch (error) {
      console.error("Login error in AuthContext:", error);
      // Use the actual error message from backend, or from error.data
      const errorMessage = error.data?.message || error.message || 'Network error. Please check your connection and ensure the backend server is running.';
      return { 
        success: false, 
        message: errorMessage
      };
    }
  };

  const logout = () => {
    authAPI.logout();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Easy hook access
export const useAuth = () => useContext(AuthContext);
