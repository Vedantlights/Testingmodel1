import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api.config';
import '../style/AdminLogin.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('login'); // 'login', '2fa', or 'setup'
  const [email, setEmail] = useState('admin@indiapropertys.com');
  const [password, setPassword] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/auth/login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      // Check if 2FA is required (could be in success or error response)
      const requires2FA = (data.data && data.data.require2FA) || 
                          (data.data && data.data.is2FAEnabled) ||
                          (data.message && data.message.includes('Google Authenticator'));
      
      // Check if 2FA setup is required
      const requires2FASetup = data.data && data.data.require2FASetup;

      if (data.success) {
        // Check if 2FA setup is required first
        if (requires2FASetup) {
          // 2FA not set up - MANDATORY: show error and require setup
          setError('⚠️ Google Authenticator setup is REQUIRED for security. Please click "Setup Google Authenticator" below to continue.');
          setStep('setup');
          // Don't auto-trigger - let user click the button
        } else if (requires2FA) {
          // Backend requires 2FA code - move to 2FA step
          setStep('2fa');
        } else if (data.data && data.data.token) {
          // Login successful without 2FA (should not happen if 2FA is mandatory)
          localStorage.setItem('adminToken', data.data.token);
          localStorage.setItem('adminLoggedIn', 'true');
          if (data.data.admin) {
            localStorage.setItem('adminData', JSON.stringify(data.data.admin));
          }
          navigate('/admin/dashboard');
        } else {
          // Password verified, but need 2FA code (fallback)
          setStep('2fa');
        }
      } else if (requires2FA || requires2FASetup) {
        // Password is correct but 2FA code/setup is required
        if (requires2FASetup) {
          setError('Google Authenticator setup is required. Please click "Setup Google Authenticator" below.');
          setStep('setup');
        } else {
          setStep('2fa');
        }
      } else {
        // Actual error - show error message
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection error. Please try again.');
    }

    setLoading(false);
  };

  const handle2FALogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (authCode.length !== 6) {
      setError('Please enter 6-digit code from Google Authenticator app');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/auth/login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, authCode })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('adminToken', data.data.token);
        localStorage.setItem('adminLoggedIn', 'true');
        if (data.data.admin) {
          localStorage.setItem('adminData', JSON.stringify(data.data.admin));
        }
        navigate('/admin/dashboard');
      } else {
        setError(data.message || 'Invalid authenticator code');
      }
    } catch (err) {
      console.error('2FA verification error:', err);
      setError('Connection error. Please try again.');
    }

    setLoading(false);
  };

  const handleSetup2FA = async () => {
    setError('');
    setLoading(true);

    if (!email) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/auth/setup-2fa.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response from setup-2fa:', text);
        setError('Server error. Please check backend logs.');
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Setup 2FA response:', data);

      if (data.success) {
        setQrCode(data.data.qrCode);
        setSecretKey(data.data.secretKey);
        setStep('setup');
      } else {
        setError(data.message || 'Failed to setup 2FA. Please try again.');
      }
    } catch (err) {
      console.error('Setup 2FA error:', err);
      setError('Connection error. Please check your internet connection and try again.');
    }

    setLoading(false);
  };

  const handleConfirmSetup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!setupCode || setupCode.length !== 6) {
      setError('Please enter a valid 6-digit code from Google Authenticator app');
      setLoading(false);
      return;
    }

    if (!email) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    try {
      const requestBody = {
        email: email,
        code: setupCode
      };

      console.log('Sending 2FA verification:', { email, codeLength: setupCode.length });

      const response = await fetch(`${API_BASE_URL}/admin/auth/verify-2fa-setup.php`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        setError('Server returned invalid response. Please check backend logs.');
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Verify 2FA Setup response:', data);

      if (data.success) {
        alert('✅ Google Authenticator enabled successfully! Please login again with your password and 2FA code.');
        setStep('login');
        setPassword('');
        setAuthCode('');
        setSetupCode('');
        setQrCode('');
        setSecretKey('');
        setError('');
      } else {
        const errorMsg = data.message || 'Invalid code. Please try again.';
        setError(errorMsg);
        console.error('Verify 2FA Setup failed:', data);
        
        // If error says "Setup not initiated", guide user to setup first
        if (errorMsg.includes('Setup not initiated') || errorMsg.includes('Setup not initiated')) {
          setError('⚠️ ' + errorMsg + ' Please click "Setup Google Authenticator" button first.');
        }
      }
    } catch (err) {
      console.error('Verify setup error:', err);
      setError('Connection error. Please check your internet connection and try again.');
    }

    setLoading(false);
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-container">
        <div className="admin-login-card">
          <h1>Admin Login</h1>
          <p className="admin-login-subtitle">
            {step === 'login' 
              ? 'Enter your password, then verify with Google Authenticator app'
              : 'Enter 6-digit code from Google Authenticator app on your phone'
            }
          </p>

          {error && (
            <div className="admin-error-alert">
              {error}
            </div>
          )}

          {step === 'login' && (
            <form onSubmit={handlePasswordLogin} className="admin-login-form">
              <div className="admin-form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@indiapropertys.com"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>

              <button 
                type="submit" 
                className="admin-login-button"
                disabled={loading || !email || !password}
              >
                {loading ? 'Verifying...' : 'Continue to 2FA'}
              </button>

              <p className="admin-login-note" style={{ color: '#ef4444', fontWeight: '600' }}>
                ⚠️ Google Authenticator is REQUIRED for admin login
              </p>

              <p className="admin-setup-link" onClick={handleSetup2FA} style={{ 
                cursor: 'pointer', 
                color: '#3b82f6', 
                fontWeight: '600',
                textDecoration: 'underline',
                marginTop: '10px'
              }}>
                🔐 Setup Google Authenticator (Required)
              </p>
            </form>
          )}

          {step === 'setup' && (
            <form onSubmit={handleConfirmSetup} className="admin-login-form">
              <div className="admin-2fa-instructions">
                <p>📱 Download Google Authenticator app on your phone</p>
                <p>Scan the QR code below to add your account</p>
              </div>

              <div className="admin-qr-container">
                {qrCode && <img src={qrCode} alt="QR Code" />}
              </div>

              {secretKey && (
                <p className="admin-secret-key">
                  Manual entry key: <code>{secretKey}</code>
                </p>
              )}

              <div className="admin-form-group">
                <label htmlFor="setupCode">Enter 6-digit code from app:</label>
                <input
                  type="text"
                  id="setupCode"
                  name="setupCode"
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength="6"
                  required
                  disabled={loading}
                  className="admin-2fa-input"
                />
              </div>

              <button 
                type="submit" 
                className="admin-login-button"
                disabled={loading || setupCode.length !== 6}
              >
                {loading ? 'Verifying...' : 'Enable Google Authenticator'}
              </button>

              <p className="admin-back-link" onClick={() => {
                setStep('login');
                setSetupCode('');
                setQrCode('');
                setSecretKey('');
                setError('');
              }}>
                ← Back to Login
              </p>
            </form>
          )}

          {step === '2fa' && (
            <form onSubmit={handle2FALogin} className="admin-login-form">
              <div className="admin-2fa-instructions">
                <p>📱 Open Google Authenticator app on your phone</p>
                <p>Enter the 6-digit code shown in the app</p>
              </div>

              <div className="admin-form-group">
                <label htmlFor="authCode">Authenticator Code</label>
                <input
                  type="text"
                  id="authCode"
                  name="authCode"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength="6"
                  required
                  disabled={loading}
                  className="admin-2fa-input"
                  autoFocus
                />
              </div>

              <button 
                type="submit" 
                className="admin-login-button"
                disabled={loading || authCode.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>

              <p className="admin-back-link" onClick={() => {
                setStep('login');
                setAuthCode('');
                setError('');
              }}>
                ← Back to Password
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
