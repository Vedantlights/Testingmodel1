# Upcoming Project Form Structure

## Overview
This document outlines the complete structure of the "Add Upcoming Project" multi-step form with all fields and validation rules.

---

## 📋 Form Steps (10 Steps Total)

### **Step 1: Basic Project Information** 📝
**Required Fields:**
- ✅ **Project Name** (text) - Required
- ✅ **Builder / Developer Name** (text) - Auto-filled from logged-in user, disabled
- ✅ **Project Type** (select) - Required
  - Options: Apartment, Villa, Plot, Commercial
- ✅ **Project Status** (select) - Required
  - Options: Upcoming, Pre-Launch
- ⚪ **RERA Number** (text) - Optional but recommended
- ✅ **Project Description** (textarea, max 1000 chars) - Required

---

### **Step 2: Location Details** 📍
**Required Fields:**
- ✅ **Location** (LocationAutoSuggest) - Required
  - Uses Mapbox autocomplete for locality/area/landmark
  - Auto-fills: location, area, city, latitude, longitude

**Optional Fields:**
- ⚪ **Project Location on Map** (LocationPicker) - Optional
  - Mapbox interactive map for precise coordinates
  - Shows coordinates when set
  - "Change Location" and "Remove" buttons available
- ⚪ **State** (StateAutoSuggest) - Optional
- ⚪ **Additional Address** (text) - Optional
- ⚪ **Pincode** (text, max 6 digits) - Optional

---

### **Step 3: Configuration & Inventory Details** 🏗️
**Required Fields:**
- ✅ **Property Configurations** (multi-select buttons) - Required (at least one)
  - Options: 1 BHK, 2 BHK, 3 BHK, 4 BHK, 5+ BHK, Villa, Plot
- ✅ **Carpet Area Range** (text) - Required
  - Example: "650 - 1200 sq.ft"

**Optional Fields:**
- ⚪ **Number of Towers / Buildings** (number) - Optional
- ⚪ **Total Units** (number) - Optional
- ⚪ **Floors Count** (number) - Optional

---

### **Step 4: Pricing & Timeline** 💰
**Required Fields:**
- ✅ **Starting Price** (text) - Required
  - Example: "₹45 Lakhs onwards"
  - Supports: Lakhs, Crore, direct numeric values

**Optional Fields:**
- ⚪ **Price per Sq.ft** (text) - Optional
  - Example: "₹5000/sq.ft"
- ⚪ **Booking Amount** (text) - Optional
  - Example: "₹2 Lakhs"
- ⚪ **Expected Launch Date** (date picker) - Optional
- ⚪ **Expected Possession Date** (date picker) - Optional

---

### **Step 5: Amenities** ✨
**Optional Fields (Checkboxes):**
- ⚪ Lift 🛗
- ⚪ Parking 🚗
- ⚪ Power Backup ⚡
- ⚪ Garden / Open Space 🌳
- ⚪ Gym 🏋️
- ⚪ Swimming Pool 🏊
- ⚪ Children Play Area 🎢
- ⚪ Club House 🏛️
- ⚪ Security / CCTV 👮

**Note:** All amenities are optional, but recommended for better listing quality.

---

### **Step 6: Legal & Approval Information** ⚖️
**Optional Fields:**
- ⚪ **RERA Status** (select) - Optional
  - Options: Applied, Approved, (empty)
- ⚪ **Land Ownership Type** (select) - Optional
  - Options: Freehold, Leasehold, Power of Attorney, Co-operative Society, (empty)
- ⚪ **Bank Approved** (select) - Optional
  - Options: Yes, No, (empty)

---

### **Step 7: Media Uploads** 📷
**Required Fields:**
- ✅ **Project Images** (file upload, multiple) - Required (at least one)
  - Maximum: 20 images
  - Allowed: Concept images, 3D renders, photos
  - Formats: All image formats

**Optional Fields:**
- ⚪ **Project Cover Image** (file upload, single) - Optional
  - Will be used as the primary display image
- ⚪ **Floor Plans** (file upload, multiple) - Optional
  - Formats: PDF, Images
- ⚪ **Brochure** (file upload, single) - Optional
  - Format: PDF only
- ⚪ **Master Plan Image** (file upload, single) - Optional
  - Format: Images only

---

### **Step 8: Contact & Sales Information** 📞
**Required Fields:**
- ✅ **Sales Contact Name** (text) - Required
- ✅ **Mobile Number** (tel, 10 digits) - Required
- ✅ **Email ID** (email) - Required

**Optional Fields:**
- ⚪ **Site Visit Available** (select) - Optional (default: Yes)
  - Options: Yes, No
- ⚪ **Preferred Contact Time** (text) - Optional
  - Example: "10 AM - 7 PM"

---

### **Step 9: Marketing Highlights** 📢
**Optional Fields (Recommended):**
- ⚪ **Project Highlights** (textarea) - Optional
  - Example: "Near Metro Station, Sea View, Golf Course Nearby"
- ⚪ **USP (Unique Selling Points)** (textarea) - Optional
  - What makes the project unique

---

### **Step 10: Preview & Submit** 👁️
**Preview Section Shows:**
- Basic Information (Project Name, Builder, Type, Status, RERA)
- Location (Address, Area, State, Coordinates if set)
- Configuration (Configurations, Carpet Area Range)
- Pricing (Starting Price, Price per Sq.ft if provided)
- Contact (Contact Name, Mobile, Email)

**Action:**
- ✅ **Publish Project** button - Submits the form

---

## 📊 Form Data Structure (JavaScript Object)

```javascript
{
  // Step 1: Basic Project Information
  projectName: string (required),
  builderName: string (auto-filled from user),
  projectType: string (required - "Apartment" | "Villa" | "Plot" | "Commercial"),
  projectStatus: string (required - "Upcoming" | "Pre-Launch"),
  reraNumber: string (optional),
  description: string (required, max 1000 chars),

  // Step 2: Location Details
  location: string (required - from LocationAutoSuggest),
  area: string (auto-filled from LocationAutoSuggest),
  city: string (auto-filled from LocationAutoSuggest),
  latitude: string (optional - from map picker),
  longitude: string (optional - from map picker),
  state: string (optional),
  fullAddress: string (optional - additional address),
  pincode: string (optional, max 6 digits),

  // Step 3: Configuration & Inventory
  configurations: array (required - ["1 BHK", "2 BHK", etc.]),
  carpetAreaRange: string (required),
  numberOfTowers: string (optional),
  totalUnits: string (optional),
  floorsCount: string (optional),

  // Step 4: Pricing & Timeline
  startingPrice: string (required),
  pricePerSqft: string (optional),
  bookingAmount: string (optional),
  expectedLaunchDate: string (optional - date format),
  expectedPossessionDate: string (optional - date format),

  // Step 5: Amenities
  amenities: array (optional - ["lift", "parking", etc.]),

  // Step 6: Legal & Approval
  reraStatus: string (optional - "Applied" | "Approved"),
  landOwnershipType: string (optional),
  bankApproved: string (optional - "Yes" | "No"),

  // Step 7: Media
  coverImage: object (optional - { file, url }),
  projectImages: array (required - array of image URLs/File objects),
  floorPlans: array (optional),
  brochure: object (optional - { file, name }),
  masterPlan: object (optional - { file, url }),

  // Step 8: Contact & Sales
  salesContactName: string (required),
  mobileNumber: string (required, 10 digits),
  emailId: string (required, email format),
  siteVisitAvailable: string (optional - default: "Yes"),
  preferredContactTime: string (optional),

  // Step 9: Marketing
  projectHighlights: string (optional),
  usp: string (optional)
}
```

---

## 🔄 Backend Data Mapping

When submitted, the form data is transformed into:

```javascript
{
  title: projectName,
  property_type: projectType,
  status: "sale", // Always "sale" for upcoming projects
  location: location || area,
  latitude: latitude || null,
  longitude: longitude || null,
  state: state || null,
  additional_address: fullAddress || null,
  description: description,
  price: parseFloat(calculated from startingPrice),
  area: 0, // Default for upcoming projects
  project_type: "upcoming", // CRITICAL FLAG
  upcoming_project_data: {
    // All other fields stored as JSON
    builderName,
    projectStatus,
    reraNumber,
    configurations,
    carpetAreaRange,
    numberOfTowers,
    totalUnits,
    floorsCount,
    pricePerSqft,
    bookingAmount,
    expectedLaunchDate,
    expectedPossessionDate,
    reraStatus,
    landOwnershipType,
    bankApproved,
    salesContactName,
    mobileNumber,
    emailId,
    siteVisitAvailable,
    preferredContactTime,
    projectHighlights,
    usp,
    pincode,
    mapLink
  },
  images: [], // Will be populated after property creation
  amenities: amenities || []
}
```

---

## ✅ Validation Rules Summary

### Step 1 (Basic Info)
- ✅ Project Name: Required, non-empty
- ✅ Project Type: Required, must select one
- ✅ Project Status: Required, must select one
- ✅ Description: Required, non-empty

### Step 2 (Location)
- ✅ Location: Required (LocationAutoSuggest field)

### Step 3 (Configuration)
- ✅ Configurations: Required, at least one must be selected
- ✅ Carpet Area Range: Required, non-empty

### Step 4 (Pricing)
- ✅ Starting Price: Required, non-empty

### Step 7 (Media)
- ✅ Project Images: Required, at least one image must be uploaded

### Step 8 (Contact)
- ✅ Sales Contact Name: Required, non-empty
- ✅ Mobile Number: Required, exactly 10 digits
- ✅ Email ID: Required, valid email format

---

## 🎯 Key Features

1. **Multi-Step Form**: 10 steps with progress indicator
2. **Step Navigation**: Can go back to previous steps, cannot skip forward
3. **Validation**: Real-time validation on each step
4. **Mapbox Integration**: 
   - LocationAutoSuggest for address autocomplete
   - LocationPicker for map-based coordinate selection
5. **Image Upload**: 
   - Supports concept images and 3D renders (allowed for upcoming projects)
   - Maximum 20 project images
6. **Price Parsing**: Automatically converts "₹45 Lakhs" to numeric value (4500000)
7. **Immediate Publishing**: Projects are visible to buyers immediately (no admin approval)
8. **Data Storage**: 
   - Core fields stored in properties table
   - Additional fields stored in `upcoming_project_data` JSON column
   - `project_type = "upcoming"` flag for filtering

---

## 📝 Notes

- All required fields must be completed before proceeding to next step
- Form can be cancelled at any time
- Location coordinates are optional but recommended for better visibility
- Builder name is auto-filled from logged-in user's account
- Projects are immediately active upon submission (`is_active = 1`)
- Images go through moderation system before being displayed

