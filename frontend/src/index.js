import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Suppress expected 401 errors from admin auth verification
// These are normal when checking authentication status
const originalError = console.error;
console.error = (...args) => {
  // Filter out expected 401 errors from admin verify endpoint
  const errorString = args.join(' ');
  const isExpected401 = 
    errorString.includes('/admin/auth/verify.php') && 
    (errorString.includes('401') || errorString.includes('Unauthorized'));
  
  // Also filter out MSG91 widget's internal verify.php calls
  const isMSG91Verify = 
    errorString.includes('otp-provider.js') && 
    errorString.includes('verify.php') && 
    errorString.includes('401');
  
  if (!isExpected401 && !isMSG91Verify) {
    originalError.apply(console, args);
  }
  // Silently ignore expected 401 errors
};

// Suppress expected 401 network errors in console
const originalWarn = console.warn;
console.warn = (...args) => {
  const warnString = args.join(' ');
  const isExpected401 = 
    warnString.includes('/admin/auth/verify.php') && 
    (warnString.includes('401') || warnString.includes('Unauthorized'));
  
  if (!isExpected401) {
    originalWarn.apply(console, args);
  }
};

// Handle unhandled promise rejections (suppress expected 401s)
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = event.reason?.message || event.reason?.toString() || '';
  const isExpected401 = 
    errorMessage.includes('/admin/auth/verify.php') && 
    (errorMessage.includes('401') || errorMessage.includes('Unauthorized'));
  
  if (isExpected401) {
    event.preventDefault(); // Suppress the error
    return;
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
