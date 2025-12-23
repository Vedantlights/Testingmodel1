import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api.config';
import '../style/AdminLogin.css';

// MSG91 Widget Configuration
// These should match backend config
const MSG91_WIDGET_ID = '356c73693735333838393730';
const MSG91_AUTH_TOKEN = '481618T5XOC0xYx9t6936b319P1';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('mobile'); // 'mobile', 'otp'
  const [mobile, setMobile] = useState('');
  const [validatedMobile, setValidatedMobile] = useState(null); // Store validated mobile from backend
  const [validationToken, setValidationToken] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mobileLocked, setMobileLocked] = useState(false);

  // Check if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/auth/verify.php`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && data.data.admin) {
            navigate('/admin/dashboard', { replace: true });
          }
        }
      } catch (err) {
        // Not authenticated, continue to login
      }
    };

    checkAuth();
  }, [navigate]);

  // Step 1: Validate mobile number with backend
  const handleValidateMobile = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!mobile || mobile.trim().length === 0) {
      setError('Please enter your mobile number');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/auth/validate-mobile.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ mobile: mobile.trim() }),
      });

      const data = await response.json();

      if (data.success && data.data && data.data.validationToken) {
        // Store validation token and validated mobile
        setValidationToken(data.data.validationToken);
        // Store the validated mobile from backend (use the mobile that was validated)
        setValidatedMobile(mobile.trim());
        setMobileLocked(true); // Lock mobile number
        setStep('otp');
        
        // Initialize MSG91 widget after backend approval
        setTimeout(() => {
          initializeMSG91Widget();
        }, 100);
      } else {
        setError(data.message || 'Failed to validate mobile number');
      }
    } catch (err) {
      console.error('Validation error:', err);
      setError('Connection error. Please check your internet connection and try again.');
    }

    setLoading(false);
  };

  // Step 2: Initialize MSG91 Widget (only after backend approval)
  const initializeMSG91Widget = () => {
    if (!window.initSendOTP) {
      setError('MSG91 widget is not loaded. Please refresh the page and try again.');
      return;
    }

    if (!validationToken) {
      setError('Validation token missing. Please restart the login process.');
      return;
    }

    // Use validated mobile (ensures we use the exact mobile that backend approved)
    const mobileToUse = validatedMobile || mobile;
    
    // Format mobile for MSG91 (remove + and spaces)
    const formattedMobile = mobileToUse.replace(/[^0-9]/g, '');
    // MSG91 expects format: 91XXXXXXXXXX (country code + number, no + sign)
    const msg91Mobile = formattedMobile.startsWith('91') ? formattedMobile : '91' + formattedMobile.slice(-10);

    try {
      const configuration = {
        widgetId: MSG91_WIDGET_ID,
        tokenAuth: MSG91_AUTH_TOKEN,
        identifier: msg91Mobile, // Mobile number for OTP
        success: async (widgetData) => {
          // Widget OTP verification successful
          console.log('MSG91 Widget Success:', widgetData);
          
          // Extract widget token
          let widgetToken = null;
          if (typeof widgetData === 'string') {
            widgetToken = widgetData;
          } else if (widgetData?.token) {
            widgetToken = widgetData.token;
          } else if (widgetData?.verificationToken) {
            widgetToken = widgetData.verificationToken;
          } else if (widgetData?.data?.token) {
            widgetToken = widgetData.data.token;
          } else {
            widgetToken = JSON.stringify(widgetData);
          }

          // Step 3: Verify OTP with backend
          await handleVerifyOTP(widgetToken);
        },
        failure: (error) => {
          console.error('MSG91 Widget Error:', error);
          const errorMessage = error?.message || error?.error || error?.toString() || 'OTP verification failed. Please try again.';
          setError(errorMessage);
        },
      };

      window.initSendOTP(configuration);
    } catch (error) {
      console.error('Error initializing MSG91 widget:', error);
      setError('Failed to open OTP widget. Please try again.');
    }
  };

  // Step 3: Verify OTP with backend and create session
  const handleVerifyOTP = async (widgetToken) => {
    setError('');
    setLoading(true);

    if (!validationToken || !widgetToken) {
      setError('Missing verification data. Please restart the login process.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/auth/verify-otp.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          validationToken: validationToken,
          mobile: validatedMobile || mobile.trim(), // Use validated mobile
          widgetToken: widgetToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Login successful - session created via HTTP-only cookie
        // Redirect to dashboard
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError(data.message || 'OTP verification failed. Please try again.');
        // Reset to mobile step on failure
        setStep('mobile');
        setValidationToken(null);
        setMobileLocked(false);
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      setError('Connection error. Please check your internet connection and try again.');
      setStep('mobile');
      setValidationToken(null);
      setMobileLocked(false);
    }

    setLoading(false);
  };

  // Handle mobile input change (only if not locked)
  const handleMobileChange = (e) => {
    if (!mobileLocked) {
      setMobile(e.target.value);
    }
  };

  // Reset form
  const handleReset = () => {
    setStep('mobile');
    setMobile('');
    setValidatedMobile(null);
    setValidationToken(null);
    setMobileLocked(false);
    setError('');
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-container">
        <div className="admin-login-card">
          <h1>Admin Login</h1>
          <p className="admin-login-subtitle">
            {step === 'mobile'
              ? 'Enter your mobile number to receive OTP'
              : 'Enter the OTP sent to your mobile number'}
          </p>

          {error && (
            <div className="admin-error-alert">
              {error}
            </div>
          )}

          {step === 'mobile' && (
            <form onSubmit={handleValidateMobile} className="admin-login-form">
              <div className="admin-form-group">
                <label htmlFor="mobile">Mobile Number</label>
                <input
                  type="tel"
                  id="mobile"
                  name="mobile"
                  value={mobile}
                  onChange={handleMobileChange}
                  placeholder="+917888076881"
                  required
                  autoComplete="tel"
                  disabled={loading || mobileLocked}
                  pattern="^\+91[6-9]\d{9}$"
                />
                <small className="admin-form-hint">
                  Enter mobile number with country code (e.g., +917888076881)
                </small>
              </div>

              <button
                type="submit"
                className="admin-login-button"
                disabled={loading || !mobile || mobileLocked}
              >
                {loading ? 'Validating...' : 'Send OTP'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <div className="admin-login-form">
              <div className="admin-form-group">
                <label>Mobile Number (Locked)</label>
                <input
                  type="tel"
                  value={mobile}
                  disabled
                  className="admin-mobile-locked"
                />
                <small className="admin-form-hint">
                  OTP widget will open automatically. Enter the OTP sent to this number.
                </small>
              </div>

              {loading && (
                <div className="admin-loading">
                  <p>Verifying OTP...</p>
                </div>
              )}

              <button
                type="button"
                className="admin-back-link"
                onClick={handleReset}
                disabled={loading}
              >
                ← Change Mobile Number
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
