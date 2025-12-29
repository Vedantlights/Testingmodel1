# Authentication Persistence Workflow - Complete Documentation

## Overview
This document describes the complete authentication persistence workflow in the application, including how tokens are stored, retrieved, and verified across browser sessions.

---

## 🔐 Storage Mechanism

### Token Storage Location
- **Storage Type**: `localStorage` (persists across browser tab closures)
- **Token Key**: `authToken`
- **User Data Key**: `userData`

### Why localStorage?
- `localStorage` persists data even after browser tab/window closure
- Unlike `sessionStorage`, data remains until explicitly cleared
- Data is domain-specific and persists across browser sessions

---

## 📋 Complete Authentication Flow

### 1. **Initial Application Load (App.js → AuthProvider)**

```
User opens website
    ↓
App.js renders
    ↓
AuthProvider component mounts
    ↓
State Initialization (useState hooks):
    - user: Read from localStorage.getItem("userData")
    - token: Read from localStorage.getItem("authToken")
    - loading: true (initial state)
    ↓
useEffect runs (runs once on mount)
```

### 2. **State Initialization (AuthContext.jsx lines 9-21)**

```javascript
// User state initialization
const [user, setUserState] = useState(() => {
  try {
    const storedUser = localStorage.getItem("userData");
    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    console.error("Error parsing stored user data:", error);
    return null;
  }
});

// Token state initialization
const [token, setTokenState] = useState(() => {
  return localStorage.getItem("authToken") || null;
});
```

**What happens:**
- On component mount, React calls the initializer function
- Reads `userData` and `authToken` from `localStorage`
- If data exists, parses and sets initial state
- If no data, state is `null`

### 3. **Authentication Initialization (useEffect - lines 64-116)**

```javascript
useEffect(() => {
  const initializeAuth = async () => {
    // Step 1: Check localStorage
    const storedToken = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("userData");
    
    // Step 2: If no token, user is not logged in
    if (!storedToken) {
      setLoading(false);
      return;
    }
    
    // Step 3: Verify token with backend
    try {
      const response = await authAPI.verifyToken();
      // ... handle response
    } catch (error) {
      // ... handle error
    }
  };
  
  initializeAuth();
}, []); // Empty dependency array = runs once on mount
```

**Flow:**
1. Read token from `localStorage`
2. If no token → set loading to false, exit
3. If token exists → call `authAPI.verifyToken()`
4. Handle verification response/error
5. Set loading to false

### 4. **Token Verification (api.service.js - verifyToken)**

```javascript
verifyToken: async () => {
  const token = getToken(); // Reads from localStorage
  if (!token) {
    return { success: false, message: 'No token' };
  }
  
  try {
    const response = await apiRequest(API_ENDPOINTS.VERIFY_TOKEN, {
      method: 'GET'
    });
    // Token sent in Authorization header automatically
    // ... handle response
  } catch (error) {
    if (error.status === 401) {
      removeToken(); // Clears localStorage
      removeUser();  // Clears localStorage
    }
    throw error;
  }
}
```

**What happens:**
- Reads token from `localStorage` via `getToken()`
- Makes GET request to `/auth/verify.php`
- Token automatically included in `Authorization: Bearer <token>` header (via `apiRequest`)
- Backend validates token
- On 401: Clears token from `localStorage`
- Returns response or throws error

### 5. **Login Flow (User logs in)**

```
User enters credentials
    ↓
Login.jsx calls login(email, password, userType)
    ↓
AuthContext.login() executes:
    1. Calls authAPI.login(email, password, userType)
    2. Backend validates credentials
    3. Backend returns { token, user }
    ↓
authAPI.login() response:
    - setToken(response.data.token) → saves to localStorage
    - setUser(response.data.user) → saves to localStorage
    ↓
AuthContext.login() continues:
    - setToken(token) → updates state + localStorage
    - setUser(user) → updates state + localStorage
    - authAPI.setToken(token) → ensures api.service has token
    - authAPI.setUser(user) → ensures api.service has user
    ↓
Returns { success: true, user, role }
    ↓
Login.jsx navigates to dashboard
```

**Storage happens at multiple points:**
- `authAPI.login()` saves to localStorage (line 150-151)
- `AuthContext.login()` saves to localStorage via `setToken`/`setUser` (line 141-142)
- `authAPI.setToken()`/`setUser()` ensure consistency (line 145-146)

### 6. **Token Persistence After Browser Close**

```
User closes browser tab
    ↓
localStorage persists (NOT cleared)
    ↓
User opens website in new tab
    ↓
AuthProvider mounts again
    ↓
useState initializers run:
    - Reads userData from localStorage
    - Reads authToken from localStorage
    - Sets initial state
    ↓
useEffect runs:
    - Checks localStorage for token
    - If token exists, verifies with backend
    - If verification succeeds, restores session
    - If verification fails (401), clears auth state
    - If network error, keeps cached state
    ↓
setLoading(false)
    ↓
ProtectedRoute checks:
    - If loading: Show spinner
    - If !user: Redirect to /login
    - If user: Allow access
```

---

## 🔍 Verification Response Handling

### Success Case (Token Valid)
```javascript
if (response.success && response.data) {
  const userData = response.data.user || (storedUser ? JSON.parse(storedUser) : null);
  const tokenData = response.data.token || storedToken;
  
  setUser(userData);      // Updates state + localStorage
  setToken(tokenData);    // Updates state + localStorage
  console.log("✅ Session restored from persistent storage");
}
```

### Failure Case (Token Invalid - 401)
```javascript
else {
  console.log("❌ Token verification failed - clearing session");
  setToken(null);         // Clears state + localStorage
  setUser(null);          // Clears state + localStorage
  authAPI.logout();       // Clears from api.service
}
```

### Network Error Case
```javascript
catch (error) {
  if (error.status === 401) {
    // Clear auth state
    setToken(null);
    setUser(null);
    authAPI.logout();
  } else {
    // Network error - keep cached state
    // State is already initialized from localStorage, so it persists
    console.warn("⚠️ Token verification network error, keeping cached session");
  }
}
```

---

## 🚪 Logout Flow

```javascript
logout() {
  // 1. Clear from API service
  authAPI.logout();  // Removes from localStorage
  
  // 2. Clear state (also clears localStorage via setUser/setToken)
  setToken(null);    // Removes from localStorage
  setUser(null);     // Removes from localStorage
  
  // 3. Clear additional session data
  localStorage.removeItem('currentSession');
  localStorage.removeItem('registeredUser');
}
```

---

## 🛡️ Protected Route Flow

```javascript
ProtectedRoute component:
  1. Gets { user, loading } from useAuth()
  2. If loading === true → Show loading spinner
  3. If loading === false && !user → Navigate to /login
  4. If loading === false && user → Render children (allow access)
```

**Key Point:** `loading` state prevents premature redirects during token verification.

---

## ⚠️ Potential Issues & Current State

### Current Implementation Analysis

**What's Working:**
- ✅ Tokens stored in `localStorage` (persists across tab closures)
- ✅ State initialized from `localStorage` on mount
- ✅ Token verification on app load
- ✅ Error handling for 401 vs network errors

**Potential Issues:**

1. **State Synchronization**: State is initialized from `localStorage`, but if verification fails with a network error, we rely on the initial state. However, if `verifyToken` throws an error before we can handle it, the state might not be properly set.

2. **Error Handling in verifyToken**: The `api.service.js` `verifyToken` function clears localStorage on 401, but this happens BEFORE the error is caught in AuthContext. This means localStorage might be cleared before we can handle it.

3. **Race Condition**: If `verifyToken` fails with a network error, the state should already be set from the `useState` initializer, but there might be timing issues.

---

## 🔧 Debugging Steps

To verify the authentication persistence is working:

1. **Check localStorage on login:**
   ```javascript
   console.log('authToken:', localStorage.getItem('authToken'));
   console.log('userData:', localStorage.getItem('userData'));
   ```

2. **Check localStorage after closing tab:**
   - Close browser tab completely
   - Open DevTools → Application → Local Storage
   - Verify `authToken` and `userData` still exist

3. **Check console logs:**
   - Look for "✅ Session restored from persistent storage"
   - Look for "❌ Token verification failed"
   - Look for "⚠️ Token verification network error"

4. **Check network requests:**
   - Open DevTools → Network tab
   - Filter for "verify.php"
   - Check if request is made on app load
   - Check response status (200 = success, 401 = invalid token)

---

## 📝 Code Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION START                         │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  AuthProvider Mounts                                         │
│  - useState initializers read from localStorage             │
│  - user = localStorage.getItem("userData")                  │
│  - token = localStorage.getItem("authToken")                │
│  - loading = true                                           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  useEffect runs (once on mount)                              │
│  - Check localStorage for token                              │
│  - If no token → setLoading(false), exit                    │
│  - If token exists → call authAPI.verifyToken()            │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  authAPI.verifyToken()                                       │
│  - getToken() reads from localStorage                        │
│  - GET /auth/verify.php with Authorization header           │
│  - Backend validates token                                   │
└─────────────────────────────────────────────────────────────┘
                        ↓
            ┌───────────┴───────────┐
            │                       │
      SUCCESS (200)            FAILURE (401)
            │                       │
            ↓                       ↓
┌───────────────────┐    ┌───────────────────┐
│ Restore Session   │    │ Clear Auth State  │
│ - setUser(data)   │    │ - setToken(null)  │
│ - setToken(data)  │    │ - setUser(null)   │
│ - setLoading(false)│   │ - setLoading(false)│
└───────────────────┘    └───────────────────┘
            │                       │
            └───────────┬───────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  ProtectedRoute Checks                                       │
│  - If loading: Show spinner                                  │
│  - If !user: Redirect to /login                             │
│  - If user: Render protected content                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Expected Behavior

1. **After Login:**
   - Token saved to `localStorage`
   - User data saved to `localStorage`
   - State updated in AuthContext
   - User navigated to dashboard

2. **After Closing Tab:**
   - `localStorage` persists (data still there)
   - On new tab load:
     - State initialized from `localStorage`
     - Token verified with backend
     - If valid: Session restored
     - If invalid: Auth cleared

3. **After Logout:**
   - `localStorage` cleared
   - State cleared
   - User redirected to login

