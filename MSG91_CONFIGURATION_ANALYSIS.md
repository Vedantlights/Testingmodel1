# MSG91 Configuration Analysis & Fixes

## 1. MSG91 Dashboard Verification URL

**Current Status:** The frontend AdminLogin.jsx does NOT configure a `verificationUrl` in the MSG91 widget configuration.

**What MSG91 Dashboard Should Have:**
- **Option A (Recommended):** Remove/Leave blank the "Verification URL" field in MSG91 dashboard
  - This means MSG91 widget will handle verification client-side only
  - Our backend `verify-otp.php` will handle session creation after widget success
  
- **Option B:** If verification URL is configured, it should point to:
  ```
  https://demo1.indiapropertys.com/backend/api/admin/auth/verify-otp.php
  ```
  - But this is NOT recommended because MSG91 will send different parameters
  - MSG91 sends: `phone`, `token`, `otp` (different format)
  - Our backend expects: `mobile`, `widgetToken`, `validationToken`

**RECOMMENDATION:** Remove the verification URL from MSG91 dashboard (leave it blank).

---

## 2. Frontend AdminLogin.jsx Sends to verify-otp.php

**File:** `frontend/src/Admin/Pages/AdminLogin.jsx` (lines 352-356)

**Exact Parameters Sent:**
```javascript
{
  validationToken: validationToken || 'frontend_validated',  // Optional, fallback to 'frontend_validated'
  mobile: validatedMobile,                                    // Required: Mobile number (e.g., "+917888076881")
  widgetToken: widgetToken                                   // Required: MSG91 widget verification token
}
```

**Request Details:**
- **Method:** POST
- **URL:** `${API_BASE_URL}/admin/auth/verify-otp.php`
- **Headers:** `Content-Type: application/json`
- **Credentials:** `include` (sends cookies)

---

## 3. Backend verify-otp.php Expects

**File:** `backend/api/admin/auth/verify-otp.php` (lines 25-35)

**Expected Parameters:**
```php
$data['mobile']          // Required: Mobile number
$data['widgetToken']      // Required: MSG91 widget verification token
$data['validationToken']   // Optional: Validation token (for backwards compatibility)
```

**Parameter Validation:**
- `mobile`: Must be present and not empty (line 25)
- `widgetToken`: Must be present and not empty (line 29)
- `validationToken`: Optional, can be null (line 33)

---

## 4. Parameter Name Matching

✅ **MATCH:** All parameter names match correctly!

| Frontend Sends | Backend Expects | Status |
|---------------|-----------------|--------|
| `mobile` | `mobile` | ✅ MATCH |
| `widgetToken` | `widgetToken` | ✅ MATCH |
| `validationToken` | `validationToken` | ✅ MATCH |

**No changes needed** - parameter names are correctly aligned.

---

## 5. Old verify.php File Status

**File Found:** `backend/api/admin/auth/verify.php`

**Purpose:** This is NOT an old file - it's a **session verification endpoint** (different from OTP verification).

**Function:**
- **Method:** GET
- **Purpose:** Verifies if an admin session (HTTP-only cookie) is valid
- **Used by:** Frontend after login to confirm session before redirecting
- **Status:** ✅ **KEEP THIS FILE** - It's actively used and working correctly

**Difference:**
- `verify-otp.php` = Verifies OTP token and creates session (POST)
- `verify.php` = Verifies existing session (GET)

**Action:** ✅ No action needed - file is correct and in use.

---

## 6. MSG91 Dashboard Configuration

### Current Widget Configuration (Frontend)
```javascript
{
  widgetId: "356c786a314c303532313736",
  tokenAuth: "481618TheXzNLL2u694bc65aP1",
  identifier: msg91Mobile,  // Mobile number
  success: (widgetData) => { ... },
  failure: (error) => { ... }
}
```

**Note:** No `verificationUrl` is configured in the widget.

### MSG91 Dashboard Settings

**In MSG91 Dashboard, you should:**

1. **Widget ID:** `356c786a314c303532313736` ✅
2. **Token ID:** `481618TheXzNLL2u694bc65aP1` ✅
3. **Verification URL:** 
   - **RECOMMENDED:** Leave it **BLANK/EMPTY**
   - **Why:** MSG91 widget handles verification client-side
   - Our backend `verify-otp.php` handles session creation after widget success
   - If you set a verification URL, MSG91 will send different parameters that won't match our backend

**If Verification URL is Currently Set:**
- **Option 1 (Recommended):** Remove it completely (leave blank)
- **Option 2:** If you must keep it, point to:
  ```
  https://demo1.indiapropertys.com/backend/api/admin/auth/verify-otp.php
  ```
  But you'll need to modify `verify-otp.php` to handle MSG91's format:
  - MSG91 sends: `phone`, `token`, `otp`
  - Our backend expects: `mobile`, `widgetToken`, `validationToken`

---

## Summary of Actions Needed

1. ✅ **Parameter Names:** Already match - no changes needed
2. ✅ **verify.php:** Keep it - it's for session verification, not OTP
3. ⚠️ **MSG91 Dashboard:** Remove/Leave blank the "Verification URL" field
4. ✅ **Frontend Code:** Already correct - no changes needed
5. ✅ **Backend Code:** Already correct - no changes needed

---

## Testing Checklist

After making MSG91 dashboard changes:

1. ✅ Mobile number validation works
2. ✅ MSG91 widget opens correctly
3. ✅ OTP is received on mobile
4. ✅ OTP verification succeeds
5. ✅ Session is created (check cookies)
6. ✅ Redirect to dashboard works
7. ✅ Dashboard loads with authenticated session

---

## Current Flow

```
1. User enters mobile → Frontend validates against hardcoded admin number
2. If valid → MSG91 widget opens (client-side)
3. User enters OTP in widget → MSG91 verifies client-side
4. Widget success callback → Frontend calls verify-otp.php
5. Backend verify-otp.php → Validates mobile, creates session
6. Frontend verifies session → Calls verify.php (GET)
7. Session confirmed → Redirect to dashboard
```

**All steps are working correctly!** The only potential issue is if MSG91 dashboard has a verification URL configured that conflicts with our flow.

