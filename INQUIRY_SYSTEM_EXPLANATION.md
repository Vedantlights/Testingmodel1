# Inquiry System - How It Works

## Overview
This document explains how the inquiry system works in the application, including the changes made to prevent duplicate inquiries.

---

## 🔍 **Current Inquiry Methods in the Codebase**

### **1. Traditional Inquiry Form Method** 
**Location:** `ViewDetailsPage.jsx`, `agent-pro-details.jsx`, `seller-pro-details.jsx`

**How it works:**
- Buyer fills out an inquiry form on property details page
- Form includes: name, email, mobile, message
- Calls API: `POST /api/buyer/inquiries/send.php`
- Creates inquiry in MySQL database
- **Used for:** Non-logged-in buyers or traditional inquiry submissions

**API Endpoint:** `backend/api/buyer/inquiries/send.php`

**Status:** ✅ **IMPROVED** - Now checks for existing inquiries before creating

---

### **2. Chat-Based Inquiry Creation**
**Location:** `ChatUs.jsx` (buyer side)

**How it works:**
- Buyer clicks "Chat" button on property details
- Navigates to chat page
- When buyer sends **first message**, system:
  1. Checks if Firebase chat room exists
  2. If NEW chat room → Calls `POST /api/chat/create-room.php`
  3. Backend checks for existing inquiry
  4. Creates inquiry only if it doesn't exist
  5. Creates Firebase chat room
  6. Sends message

**API Endpoint:** `backend/api/chat/create-room.php`

**Status:** ✅ **ALREADY HAD** proper duplicate checking logic

---

### **3. Seller/Agent Viewing Inquiries**
**Location:** `SellerInquiries.jsx`, `AgentInquiries.jsx`

**How it works:**
- Sellers/Agents view their inquiries list
- API: `GET /api/seller/inquiries/list.php`
- Shows all inquiries for their properties
- Can reply via chat (doesn't create new inquiries)
- Can update inquiry status

**API Endpoint:** `backend/api/seller/inquiries/list.php`

**Status:** ✅ **NO CHANGES** - Only reads data, doesn't create

---

## 📊 **Inquiry Flow Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                    INQUIRY CREATION METHODS                  │
└─────────────────────────────────────────────────────────────┘

METHOD 1: Traditional Form Submission
┌─────────────────┐
│ Buyer fills     │
│ inquiry form    │
│ on property page│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ POST /buyer/inquiries/send  │ ◄─── ✅ NOW CHECKS FOR EXISTING
│ - Checks for existing       │
│ - Creates if doesn't exist  │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────┐
│ Inquiry created │
│ in MySQL        │
└─────────────────┘


METHOD 2: Chat-Based (First Message)
┌─────────────────┐
│ Buyer clicks    │
│ "Chat" button   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Buyer sends     │
│ first message   │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────┐
│ Check: Is Firebase chat room │
│        already exists?        │
└────────┬─────────────────────┘
         │
         ├─ YES → Skip inquiry creation
         │
         └─ NO → Call backend API
                  │
                  ▼
         ┌─────────────────────────────┐
         │ POST /chat/create-room      │ ◄─── ✅ ALREADY HAD CHECK
         │ - Checks for existing       │
         │ - Creates if doesn't exist  │
         └────────┬────────────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Inquiry created │
         │ in MySQL        │
         └─────────────────┘
```

---

## ✅ **What Changed & Impact Analysis**

### **Change 1: `/api/buyer/inquiries/send.php`**
**Before:**
- Always created a new inquiry
- No duplicate checking
- Could create multiple inquiries for same buyer-property-seller

**After:**
- ✅ Checks for existing inquiry first
- ✅ Creates new inquiry ONLY if none exists
- ✅ Returns existing inquiry ID if found
- ✅ Supports both logged-in (by buyer_id) and non-logged-in (by email) users

**Impact on Existing Code:**
- ✅ **NO BREAKING CHANGES**
- ✅ All existing form submissions still work
- ✅ API response format unchanged
- ✅ Prevents duplicate inquiries from form submissions

**Files Using This API:**
- `ViewDetailsPage.jsx` - ✅ Works as before (but no duplicates)
- `agent-pro-details.jsx` - ✅ Works as before (but no duplicates)
- `seller-pro-details.jsx` - ✅ Works as before (but no duplicates)

---

### **Change 2: `ChatUs.jsx` (Buyer Message Flow)**
**Before:**
- Buyer sends message → Creates Firebase chat room
- No inquiry creation check
- Could miss inquiry creation if chat was only way

**After:**
- ✅ Checks if chat room exists before sending first message
- ✅ Calls backend API to create/check inquiry for NEW conversations
- ✅ Subsequent messages skip inquiry creation
- ✅ Ensures inquiry exists before chat starts

**Impact on Existing Code:**
- ✅ **NO BREAKING CHANGES**
- ✅ Chat functionality unchanged
- ✅ Messages still send normally
- ✅ Only adds inquiry creation check for first message

---

### **Change 3: `/api/chat/create-room.php`**
**Status:** ✅ **NO CHANGES NEEDED**
- Already had proper duplicate checking logic
- Already checks: `WHERE buyer_id = ? AND property_id = ? AND seller_id = ?`
- Already returns existing inquiry ID if found

---

## 🔄 **Complete Inquiry Lifecycle**

### **Scenario 1: Buyer Uses Traditional Form**
1. Buyer views property details
2. Fills inquiry form (name, email, mobile, message)
3. Submits → `POST /buyer/inquiries/send.php`
4. **NEW:** Backend checks if inquiry exists
   - If exists → Returns existing inquiry
   - If not → Creates new inquiry
5. Success message shown to buyer
6. Seller sees inquiry in their list

### **Scenario 2: Buyer Uses Chat (First Time)**
1. Buyer clicks "Chat" on property
2. Navigates to chat page
3. Buyer types and sends first message
4. **NEW:** System detects new chat room
5. **NEW:** Calls `POST /chat/create-room.php`
6. Backend checks if inquiry exists
   - If exists → Returns existing inquiry ID
   - If not → Creates new inquiry
7. Firebase chat room created
8. Message sent
9. Seller sees inquiry in their list

### **Scenario 3: Buyer Uses Chat (Follow-up)**
1. Buyer returns to same property chat
2. Buyer sends another message
3. System detects existing chat room
4. **NO API call** (inquiry already exists)
5. Message sent directly
6. Seller sees message in existing inquiry chat

### **Scenario 4: Seller/Agent Replies**
1. Seller views inquiries list
2. Opens existing inquiry
3. Sends reply message
4. **NO inquiry creation** (uses existing Firebase chat room)
5. Message sent to buyer
6. Inquiry status can be updated

---

## 🎯 **Key Rules Enforced**

1. ✅ **One inquiry = One buyer + One property + One seller/agent**
   - Enforced by database check: `buyer_id + property_id + seller_id`

2. ✅ **Inquiry created only on FIRST message/conversation**
   - Traditional form: Checked on submission
   - Chat: Checked when chat room doesn't exist

3. ✅ **Subsequent messages don't create new inquiries**
   - Follow-up messages reuse existing inquiry
   - Seller/agent replies don't create inquiries

4. ✅ **Each property has separate conversations**
   - Different property = different inquiry (as expected)
   - Same property = same inquiry (no duplicates)

5. ✅ **Inquiry count = Distinct buyer-property conversations**
   - Seller sees one inquiry per buyer per property
   - Multiple messages = same inquiry (count doesn't increase)

---

## 📋 **Database Schema**

```sql
inquiries table:
- id (primary key)
- property_id (foreign key → properties)
- buyer_id (foreign key → users, nullable)
- seller_id (foreign key → users)
- name, email, mobile, message
- status (new, contacted, viewed, interested, etc.)
- created_at, updated_at

Unique constraint check: buyer_id + property_id + seller_id
(Enforced in application logic, not DB constraint)
```

---

## 🔍 **Testing Scenarios**

### ✅ **Test 1: Traditional Form - First Time**
- Fill form, submit
- **Expected:** New inquiry created
- **Result:** ✅ Works

### ✅ **Test 2: Traditional Form - Duplicate**
- Fill form again for same property
- **Expected:** Returns existing inquiry (no duplicate)
- **Result:** ✅ Works

### ✅ **Test 3: Chat - First Message**
- Send first message in chat
- **Expected:** Inquiry created via API call
- **Result:** ✅ Works

### ✅ **Test 4: Chat - Follow-up Message**
- Send another message in same chat
- **Expected:** No new inquiry, message sent
- **Result:** ✅ Works

### ✅ **Test 5: Different Properties**
- Send inquiry/message for Property A
- Send inquiry/message for Property B
- **Expected:** Two separate inquiries
- **Result:** ✅ Works

### ✅ **Test 6: Seller Reply**
- Seller replies to inquiry
- **Expected:** No new inquiry created
- **Result:** ✅ Works

---

## ⚠️ **Important Notes**

1. **Backward Compatibility:** ✅ All existing code continues to work
2. **No Breaking Changes:** ✅ API response formats unchanged
3. **Data Integrity:** ✅ Prevents duplicate inquiries
4. **Performance:** ✅ Only adds one database query check
5. **Error Handling:** ✅ Gracefully handles errors (continues even if API fails)

---

## 📝 **Summary**

**What Was Fixed:**
- Traditional form submissions now check for duplicates
- Chat-based first messages now create inquiries properly
- Both methods now follow same rules: one inquiry per buyer-property-seller

**What Wasn't Changed:**
- Seller/Agent viewing inquiries (no changes needed)
- Inquiry status updates (no changes needed)
- API response formats (backward compatible)
- Existing inquiry retrieval (no changes needed)

**Result:**
- ✅ No duplicate inquiries
- ✅ Proper inquiry counting
- ✅ All existing functionality preserved
- ✅ Better data integrity

