// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "../services/api.service";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Initialize from localStorage for persistence
  const [user, setUserState] = useState(() => {
    try {
      const storedUser = localStorage.getItem("userData");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("Error parsing stored user data:", error);
      return null;
    }
  });
  
  const [token, setTokenState] = useState(() => {
    return localStorage.getItem("authToken") || null;
  });
  
  const [loading, setLoading] = useState(true);

  // Sync user state with localStorage
  const setUser = useCallback((userData) => {
    setUserState(userData);
    if (userData) {
      localStorage.setItem("userData", JSON.stringify(userData));
    } else {
      localStorage.removeItem("userData");
    }
  }, []);

  // Sync token state with localStorage
  const setToken = useCallback((tokenValue) => {
    setTokenState(tokenValue);
    if (tokenValue) {
      localStorage.setItem("authToken", tokenValue);
    } else {
      localStorage.removeItem("authToken");
    }
  }, []);

  // Define logout function BEFORE useEffect that uses it
  const logout = useCallback(() => {
    console.log("🔒 Logging out - clearing all auth data");
    
    // Clear from API service
    authAPI.logout();
    
    // Clear state (which also clears localStorage via setUser/setToken)
    setToken(null);
    setUser(null);
    
    // Clear any additional session data
    localStorage.removeItem('currentSession');
    localStorage.removeItem('registeredUser');
    
    console.log("✅ Logout complete - all auth data cleared");
  }, [setToken, setUser]);

  // Auto verify token on app load/refresh
  useEffect(() => {
    const initializeAuth = async () => {
      // Check localStorage first (for persistence after browser close)
      const storedToken = localStorage.getItem("authToken");
      const storedUser = localStorage.getItem("userData");

      // If no token in localStorage, user is not logged in
      if (!storedToken) {
        setLoading(false);
        return;
      }

      // If we have a token, verify it with backend
      try {
        const response = await authAPI.verifyToken();
        
        if (response.success && response.data) {
          // Token is valid - restore session
          const userData = response.data.user || (storedUser ? JSON.parse(storedUser) : null);
          const tokenData = response.data.token || storedToken;
          
          setUser(userData);
          setToken(tokenData);
          console.log("✅ Session restored from persistent storage");
        } else {
          // Token is invalid - clear everything
          console.log("❌ Token verification failed - clearing session");
          // Clear directly instead of calling logout to avoid dependency issues
          setToken(null);
          setUser(null);
          authAPI.logout();
        }
      } catch (error) {
        // Only clear auth state if it's a 401 (invalid/expired token)
        // Network errors should not clear the session - allow user to continue with cached auth
        if (error.status === 401) {
          console.error("❌ Token verification failed - 401 Unauthorized, clearing session");
          setToken(null);
          setUser(null);
          authAPI.logout();
        } else {
          // Network error or other issue - keep the cached auth state from localStorage
          // The state should already be initialized from localStorage in useState, so just log a warning
          console.warn("⚠️ Token verification network error, keeping cached session:", error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount - setUser and setToken are stable callbacks

  const login = async (email, password, userType) => {
    try {
      console.log("AuthContext login called:", { email, userType });
      const response = await authAPI.login(email, password, userType);
      console.log("AuthContext login response:", response);

      if (response.success && response.data) {
        const token = response.data.token;
        const user = response.data.user;

        if (!token) {
          console.error("❌ No token received from login response");
          return { success: false, message: 'Login failed: No token received' };
        }

        if (!user) {
          console.error("❌ No user data received from login response");
          return { success: false, message: 'Login failed: No user data received' };
        }

        console.log("✅ Setting token and user in persistent storage");
        
        // Save to state (which syncs to localStorage via setUser/setToken)
        setToken(token);
        setUser(user);

        // Also ensure api.service has the token
        authAPI.setToken(token);
        authAPI.setUser(user);

        console.log("✅ Login successful - session persisted");
        return { success: true, user, role: user.user_type };
      }

      console.error("Login response not successful:", response);
      return { success: false, message: response.message || 'Login failed' };
    } catch (error) {
      console.error("Login error in AuthContext:", error);
      const errorMessage = error.data?.message || error.message || 'Network error. Please check your connection and ensure the backend server is running.';
      return { 
        success: false, 
        message: errorMessage
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Easy hook access
export const useAuth = () => useContext(AuthContext);

