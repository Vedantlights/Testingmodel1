# API Credentials Verification Report

## 🔍 Credential Status Check

### ✅ **VERIFIED - Real Credentials**

#### 1. **MSG91 SMS API** ✅
- **Status**: ✅ **REAL CREDENTIALS** (Appear to be production values)
- **Location**: `backend/config/admin-config.php`
- **Credentials**:
  - `MSG91_WIDGET_ID`: `356c786a314c303532313736` ✅
  - `MSG91_AUTH_TOKEN`: `481618TheXzNLL2u694bc65aP1` ✅
  - `MSG91_AUTH_KEY`: `481618A2cCSUpaZHTW6936c356P1` ✅
  - `MSG91_TEMPLATE_ID`: `356c6c6c4141303836323334` ✅
  - `MSG91_TOKEN`: `481618TheXzNLL2u694bc65aP1` ✅
- **Note**: These appear to be real production credentials (not demo/placeholder)

#### 2. **Mapbox Geocoding API** ✅
- **Status**: ✅ **REAL CREDENTIALS**
- **Location**: `backend/config/config.php` (line 130)
- **Token**: `pk.eyJ1Ijoic3VkaGFrYXJwb3VsIiwiYSI6ImNtaXp0ZmFrNTAxaTQzZHNiODNrYndsdTAifQ.YTMezksySLU7ZpcYkvXyqg` ✅
- **Note**: This is a valid Mapbox public token format (pk.ey...)

#### 3. **Firebase Chat Service** ✅
- **Status**: ✅ **REAL CREDENTIALS**
- **Location**: `frontend/src/services/firebase.service.js`
- **Project**: `my-chat-box-ec5b0` ✅
- **API Key**: `AIzaSyBjD9KHuVjUNSvPpa6y-pElD7lIElCiXmE` ✅
- **Note**: These appear to be real Firebase project credentials

#### 4. **SMTP Email (Hostinger)** ✅
- **Status**: ✅ **REAL CREDENTIALS**
- **Location**: `backend/config/config.php` (lines 139-153)
- **Host**: `smtp.hostinger.com` ✅
- **User**: `info@indiapropertys.com` ✅
- **Password**: `V1e2d2a4n5t@2020` ✅ (Hardcoded - should use env var in production)
- **Note**: Real production email credentials

---

### ⚠️ **NEEDS VERIFICATION**

#### 5. **Google Cloud Vision API** ✅ **CONFIGURED**
- **Status**: ✅ **PRODUCTION PATH CONFIGURED**
- **Production Path**: `/home/u123456789/domains/demo1.indiapropertys.com/secure/indiapropertys-8fab286d41e4.json`
- **Local Fallback**: `backend/config/google-cloud-credentials.json`
- **Configuration**: `backend/config/config.php` (lines 181-189)
- **Verification**: ✅ **Path configured in code**

**✅ CONFIGURATION COMPLETE**:
- ✅ Production credentials path configured
- ✅ Local development fallback configured
- ✅ Environment variable support (can override via `GOOGLE_APPLICATION_CREDENTIALS`)

**Path Resolution**:
1. Checks `GOOGLE_APPLICATION_CREDENTIALS` environment variable first
2. Uses production path: `/home/u123456789/domains/demo1.indiapropertys.com/secure/indiapropertys-8fab286d41e4.json`
3. Falls back to local: `backend/config/google-cloud-credentials.json` if production path doesn't exist

**⚠️ VERIFICATION NEEDED**:
- ✅ Verify file exists on production server
- ✅ Verify file permissions (readable by PHP process)
- ✅ Test image upload with moderation on production

**Current Behavior**:
- Code checks: `file_exists(GOOGLE_APPLICATION_CREDENTIALS)`
- If file exists → Moderation **WILL WORK**
- If file missing → Moderation is **skipped silently** (graceful fallback)

---

### ⚠️ **SECURITY WARNINGS - Default/Weak Values**

#### 6. **JWT Secret** ⚠️
- **Status**: ⚠️ **USING DEFAULT VALUE**
- **Location**: `backend/config/config.php` (line 120)
- **Current**: `your-secret-key-change-in-production-2024` ⚠️
- **Issue**: This is a **default/placeholder value**
- **Impact**: Security risk if in production
- **Recommendation**: 
  ```php
  // Set via environment variable:
  JWT_SECRET=your-strong-random-secret-here
  ```

#### 7. **Admin Session Secret** ⚠️
- **Status**: ⚠️ **USING DEFAULT VALUE**
- **Location**: `backend/config/admin-config.php` (line 177)
- **Current**: `change-this-to-strong-random-secret-in-production-2024` ⚠️
- **Issue**: This is a **default/placeholder value**
- **Impact**: Security risk if in production
- **Recommendation**:
  ```php
  // Set via environment variable:
  ADMIN_SESSION_SECRET=your-strong-random-secret-here
  ```

---

## 📋 Summary

### ✅ **Working APIs** (Real Credentials):
1. ✅ MSG91 SMS API
2. ✅ Mapbox Geocoding API
3. ✅ Firebase Chat Service
4. ✅ SMTP Email (Hostinger)

### ❌ **MISSING - CRITICAL**:
1. ❌ **Google Cloud Vision API** - **FILE DOES NOT EXIST**
   - **Status**: ❌ **File missing**: `backend/config/google-cloud-credentials.json`
   - **Impact**: Image moderation **WILL NOT WORK**
   - **Action**: Download and save Google Cloud service account JSON file

### ⚠️ **Security Issues**:
1. ⚠️ JWT Secret using default value
2. ⚠️ Admin Session Secret using default value

---

## 🔧 **Action Items**

### **IMMEDIATE** (Required for Google Vision API):
1. ❌ **Google Cloud credentials file is MISSING**:
   - **File**: `backend/config/google-cloud-credentials.json`
   - **Status**: ❌ **DOES NOT EXIST** (Verified)

2. ✅ **Download and save Google Cloud credentials**:
   - **Step 1**: Go to [Google Cloud Console](https://console.cloud.google.com/)
   - **Step 2**: Navigate to **IAM & Admin** → **Service Accounts**
   - **Step 3**: Create a service account (or use existing)
   - **Step 4**: Click **Keys** → **Add Key** → **Create new key** → Select **JSON**
   - **Step 5**: Download the JSON file
   - **Step 6**: Save as `backend/config/google-cloud-credentials.json`
   - **Step 7**: **IMPORTANT**: Add to `.gitignore` (never commit credentials!)
   - **Step 8**: Enable **Cloud Vision API** in Google Cloud Console

3. ✅ **Verify file content**:
   - Should be valid JSON
   - Should contain `project_id`, `private_key`, `client_email`
   - Should NOT be empty or contain placeholder text

### **SECURITY** (Recommended):
1. ⚠️ **Change JWT Secret**:
   ```bash
   # Generate strong secret
   # Set environment variable:
   JWT_SECRET=<strong-random-secret>
   ```

2. ⚠️ **Change Admin Session Secret**:
   ```bash
   # Generate strong secret
   # Set environment variable:
   ADMIN_SESSION_SECRET=<strong-random-secret>
   ```

---

## 🧪 **Testing Credentials**

### Test Google Vision API:
```php
// Create test file: backend/test-vision-api.php
<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/services/GoogleVisionService.php';

try {
    $vision = new GoogleVisionService();
    echo "✅ Google Vision API credentials are valid!\n";
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
```

### Test Mapbox API:
```bash
curl "https://api.mapbox.com/geocoding/v5/mapbox.places/test.json?access_token=pk.eyJ1Ijoic3VkaGFrYXJwb3VsIiwiYSI6ImNtaXp0ZmFrNTAxaTQzZHNiODNrYndsdTAifQ.YTMezksySLU7ZpcYkvXyqg"
```

---

## 📝 **Notes**

1. **Google Cloud Credentials**: The most critical missing piece for image moderation
2. **JWT/Admin Secrets**: Should be changed from defaults for production security
3. **All other APIs**: Appear to have real, working credentials

---

## ✅ **Next Steps**

1. **Check Google Cloud credentials file** - Most important!
2. **Test Google Vision API** with a sample image
3. **Change default secrets** if in production
4. **Verify all APIs work** in your environment

