import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, User, Building2, Home } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "../styles/Login.css";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [userType, setUserType] = useState("buyer");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  // Validate if the user can login with selected role
  const validateRoleAccess = (registeredUserType, attemptedLoginType) => {
    // Define role access rules
    const roleAccessMap = {
      buyer: ["buyer", "seller"], // Buyer/Tenant can login as buyer or seller
      seller: ["buyer", "seller"], // Seller/Owner can login as buyer or seller
      agent: ["agent"], // Agent/Builder can ONLY login as agent
    };

    const allowedRoles = roleAccessMap[registeredUserType] || [];
    return allowedRoles.includes(attemptedLoginType);
  };

  const getRoleAccessMessage = (registeredType, attemptedType) => {
    const typeLabels = {
      buyer: "Buyer/Tenant",
      seller: "Seller/Owner",
      agent: "Agent/Builder",
    };

    if (registeredType === "agent" && attemptedType !== "agent") {
      return `You are registered as an Agent/Builder. You can only access the Agent/Builder dashboard.`;
    }

    if (registeredType !== "agent" && attemptedType === "agent") {
      return `You are registered as ${typeLabels[registeredType]}. You cannot access the Agent/Builder dashboard. Only registered Agents/Builders can access this section.`;
    }

    return "Access denied for this role.";
  };

  const handleSubmit = async () => {
    setLoginError("");
    
    // Basic validation
    if (!formData.email || !formData.password) {
      setLoginError("Please enter both email and password");
      return;
    }

    setIsLoading(true);

    try {
      console.log("Login attempt:", { email: formData.email, userType });
      const result = await login(formData.email, formData.password, userType);
      console.log("Login result:", result);

      if (result.success) {
        console.log("Login successful, navigating to dashboard...");
        // Store current login session
        localStorage.setItem(
          "currentSession",
          JSON.stringify({
            email: formData.email,
            loginType: userType,
            loginTime: new Date().toISOString(),
          })
        );

        // Role-based navigation
        if (userType === "buyer") {
          navigate("/buyer-dashboard");
        } else if (userType === "seller") {
          navigate("/seller-dashboard");
        } else if (userType === "agent") {
          navigate("/agent-dashboard");
        }
      } else {
        const errorMsg = result.message || "Login failed. Please check your credentials.";
        console.error("Login failed:", errorMsg);
        setLoginError(errorMsg);
      }
    } catch (error) {
      console.error("Login error caught:", error);
      const errorMsg = error.message || error.data?.message || "An error occurred. Please try again.";
      setLoginError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error when user makes changes
    if (loginError) setLoginError("");
  };

  const handleUserTypeChange = (type) => {
    setUserType(type);
    // Clear error when changing user type
    if (loginError) setLoginError("");
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Welcome Back</h1>
          <p>Sign in to continue to your account</p>
        </div>

        <div className="user-type-toggle">
          <button
            onClick={() => handleUserTypeChange("buyer")}
            className={userType === "buyer" ? "active" : ""}
          >
            <User size={20} /> Buyer/Tenant
          </button>

          <button
            onClick={() => handleUserTypeChange("seller")}
            className={userType === "seller" ? "active" : ""}
          >
            <Home size={20} /> Seller/Owner
          </button>

          <button
            onClick={() => handleUserTypeChange("agent")}
            className={userType === "agent" ? "active" : ""}
          >
            <Building2 size={20} /> Agent/Builder
          </button>
        </div>

        {/* Role Access Hint */}
        <div className="role-access-hint">
          {userType === "agent" && (
            <p className="hint-text hint-warning">
              <span className="hint-icon">⚠</span>
              Only registered Agents/Builders can access this dashboard
            </p>
          )}
          {(userType === "buyer" || userType === "seller") && (
            <p className="hint-text">
              <span className="hint-icon">ℹ</span>
              Buyers and Sellers can switch between these two dashboards
            </p>
          )}
        </div>

        {/* Error Message */}
        {loginError && (
          <div className="error-message">
            <span className="error-icon">✕</span>
            {loginError}
          </div>
        )}

        <div className="login-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="options-row">
            <label>
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              Remember me
            </label>
            <button onClick={() => alert("Forgot password clicked")}>
              Forgot Password?
            </button>
          </div>

          <button 
            className="login-btn" 
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? "Signing In..." : `Sign In as ${userType === "buyer" ? "Buyer/Tenant" : userType === "seller" ? "Seller/Owner" : "Agent/Builder"}`}
          </button>

          <div className="signup-link">
            Don't have an account?{" "}
            <button onClick={() => navigate("/register")}>Register now</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;