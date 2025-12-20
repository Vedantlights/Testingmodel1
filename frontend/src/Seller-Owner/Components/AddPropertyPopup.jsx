// src/components/AddPropertyPopup.jsx
import React, { useState, useRef, useEffect } from "react";
import { useProperty } from "./PropertyContext";
import { sellerPropertiesAPI } from "../../services/api.service";
import {
  sanitizeInput,
  validateTextLength,
  validateArea,
  validateLatitude,
  validateLongitude,
  validatePrice,
  validateCarpetArea,
  validateDeposit,
  validateFloors,
  validateImageFile,
  validateImageDimensions
} from "../../utils/validation";
import LocationPicker from "../../components/Map/LocationPicker";
import LocationAutoSuggest from "../../components/LocationAutoSuggest";
import "../styles/AddPropertyPopup.css";

const STEPS = [
  { id: 1, title: "Basic Info", icon: "📝" },
  { id: 2, title: "Property Details", icon: "🏠" },
  { id: 3, title: "Amenities", icon: "✨" },
  { id: 4, title: "Photos", icon: "📷" },
  { id: 5, title: "Pricing", icon: "💰" }
];

const PROPERTY_TYPES = [
  { value: "Apartment", icon: "🏢", category: "residential", subCategory: "standard" },
  { value: "Villa / Banglow", icon: "🏡", category: "residential", subCategory: "independent" },
  { value: "Independent House", icon: "🏘️", category: "residential", subCategory: "independent" },
  { value: "Row House/ Farm House", icon: "🏘️", category: "residential", subCategory: "standard" },
  { value: "Penthouse", icon: "🌆", category: "residential", subCategory: "luxury" },
  { value: "Studio Apartment", icon: "🛏️", category: "residential", subCategory: "studio" },
  { value: "Plot / Land / Indusrtial Property", icon: "📐", category: "land", subCategory: "plot" },
  { value: "Commercial Office", icon: "🏢", category: "commercial", subCategory: "office" },
  { value: "Commercial Shop", icon: "🏪", category: "commercial", subCategory: "shop" },
  { value: "PG / Hostel", icon: "🛏️", category: "pg", subCategory: "accommodation" },
  { value: "Warehouse / Godown", icon: "🏪", category: "commercial", subCategory: "shop" }
];

// Property type field configurations - based on real-world requirements
const PROPERTY_TYPE_FIELDS = {
  // Standard Residential (Apartment, Flat, Row House, Penthouse)
  residential_standard: {
    showBedrooms: true,
    showBathrooms: true,
    showBalconies: true,
    showFloor: true,
    showTotalFloors: true,
    showFacing: true,
    showFurnishing: true,
    showAge: true,
    showCarpetArea: true,
    bedroomsRequired: true,
    bathroomsRequired: true
  },
  // Independent Residential (Villa, Independent House)
  residential_independent: {
    showBedrooms: true,
    showBathrooms: true,
    showBalconies: true,
    showFloor: false, // Often ground floor or single floor
    showTotalFloors: true, // May have multiple floors
    showFacing: true,
    showFurnishing: true,
    showAge: true,
    showCarpetArea: true,
    bedroomsRequired: true,
    bathroomsRequired: true
  },
  // Studio Apartment - special case
  residential_studio: {
    showBedrooms: false, // Studio = 0 bedrooms (combined living/sleeping)
    showBathrooms: true,
    showBalconies: true,
    showFloor: true,
    showTotalFloors: true,
    showFacing: true,
    showFurnishing: true,
    showAge: true,
    showCarpetArea: true,
    bedroomsRequired: false,
    bathroomsRequired: true
  },
  // Farm House - often single floor
  residential_farmhouse: {
    showBedrooms: true,
    showBathrooms: true,
    showBalconies: false, // Farm houses may not have balconies
    showFloor: false, // Usually ground floor
    showTotalFloors: true,
    showFacing: true,
    showFurnishing: true,
    showAge: true,
    showCarpetArea: true,
    bedroomsRequired: true,
    bathroomsRequired: true
  },
  // Commercial Office
  commercial_office: {
    showBedrooms: false,
    showBathrooms: true,
    showBalconies: false,
    showFloor: true,
    showTotalFloors: true,
    showFacing: true,
    showFurnishing: true,
    showAge: true,
    showCarpetArea: true,
    bedroomsRequired: false,
    bathroomsRequired: false // Optional for commercial
  },
  // Commercial Shop
  commercial_shop: {
    showBedrooms: false,
    showBathrooms: true, // May have restroom
    showBalconies: false,
    showFloor: true, // Ground floor preferred
    showTotalFloors: true,
    showFacing: true, // Important for shops
    showFurnishing: false, // Shops usually unfurnished
    showAge: true,
    showCarpetArea: true,
    bedroomsRequired: false,
    bathroomsRequired: false
  },
  // Plot/Land
  land_plot: {
    showBedrooms: false,
    showBathrooms: false,
    showBalconies: false,
    showFloor: false,
    showTotalFloors: false,
    showFacing: true, // Important for plot
    showFurnishing: false,
    showAge: false,
    showCarpetArea: false, // Only plot area
    bedroomsRequired: false,
    bathroomsRequired: false
  },
  // PG/Hostel
  pg_accommodation: {
    showBedrooms: true, // Number of beds/rooms
    showBathrooms: true,
    showBalconies: false,
    showFloor: true,
    showTotalFloors: true,
    showFacing: true,
    showFurnishing: true,
    showAge: true,
    showCarpetArea: true,
    bedroomsRequired: true,
    bathroomsRequired: true
  }
};

const AMENITIES = [
  { id: "parking", label: "Parking", icon: "🚗" },
  { id: "lift", label: "Lift", icon: "🛗" },
  { id: "security", label: "24x7 Security", icon: "👮" },
  { id: "power_backup", label: "Power Backup", icon: "⚡" },
  { id: "gym", label: "Gym", icon: "🏋️" },
  { id: "swimming_pool", label: "Swimming Pool", icon: "🏊" },
  { id: "garden", label: "Garden", icon: "🌳" },
  { id: "clubhouse", label: "Club House", icon: "🏛️" },
  { id: "playground", label: "Children's Play Area", icon: "🎢" },
  { id: "cctv", label: "CCTV", icon: "📹" },
  { id: "intercom", label: "Intercom", icon: "📞" },
  { id: "fire_safety", label: "Fire Safety", icon: "🔥" },
  { id: "water_supply", label: "24x7 Water", icon: "💧" },
  { id: "gas_pipeline", label: "Gas Pipeline", icon: "🔥" },
  { id: "wifi", label: "WiFi", icon: "📶" },
  { id: "ac", label: "Air Conditioning", icon: "❄️" },
  { id: "electricity", label: "Electricity", icon: "⚡" }
];

// Amenities configuration based on property type
const PROPERTY_TYPE_AMENITIES = {
  // Residential properties (Apartment, Flat, Row House, Penthouse, Villa, Independent House, Studio Apartment)
  residential: [
    "parking", "lift", "security", "power_backup", "gym", "swimming_pool", 
    "garden", "clubhouse", "playground", "cctv", "intercom", "fire_safety", 
    "water_supply", "gas_pipeline", "wifi", "ac"
  ],
  // Farm House - similar to residential but may not have lift
  residential_farmhouse: [
    "parking", "security", "power_backup", "gym", "swimming_pool", 
    "garden", "clubhouse", "playground", "cctv", "fire_safety", 
    "water_supply", "gas_pipeline", "wifi", "ac"
  ],
  // Commercial Office
  commercial_office: [
    "parking", "lift", "security", "power_backup", "cctv", 
    "fire_safety", "water_supply", "wifi", "ac", "intercom"
  ],
  // Commercial Shop
  commercial_shop: [
    "parking", "security", "power_backup", "cctv", 
    "fire_safety", "water_supply", "wifi", "ac"
  ],
  // Plot/Land - minimal amenities including electricity
  land_plot: [
    "security", "water_supply", "cctv", "electricity"
  ],
  // PG/Hostel
  pg_accommodation: [
    "parking", "security", "power_backup", "cctv", 
    "fire_safety", "water_supply", "wifi", "ac", "intercom"
  ]
};

const FURNISHING_OPTIONS = ["Unfurnished", "Semi-Furnished", "Fully-Furnished"];
const FACING_OPTIONS = ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"];
const AGE_OPTIONS = ["New Construction", "Less than 1 Year", "1-5 Years", "5-10 Years", "10+ Years"];

export default function AddPropertyPopup({ onClose, editIndex = null, initialData = null }) {
  const { addProperty, updateProperty, properties } = useProperty();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageFiles, setImageFiles] = useState([]); // Store actual File objects
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const fileRef = useRef();

  // Check property limit (3 properties max for free users)
  const PROPERTY_LIMIT = 3;
  const currentPropertyCount = properties?.length || 0;
  const hasReachedLimit = editIndex === null && currentPropertyCount >= PROPERTY_LIMIT;

  // Show limit warning if user has reached the limit
  useEffect(() => {
    if (hasReachedLimit) {
      setShowLimitWarning(true);
    }
  }, [hasReachedLimit]);

  const [formData, setFormData] = useState(initialData || {
    // Step 1: Basic Info
    title: "",
    status: "sale",
    propertyType: "",
    
    // Step 2: Property Details
    location: "",
    latitude: "",
    longitude: "",
    bedrooms: "",
    bathrooms: "",
    balconies: "",
    area: "",
    carpetArea: "",
    floor: "",
    totalFloors: "",
    facing: "",
    age: "",
    furnishing: "",
    
    // Step 3: Amenities
    amenities: [],
    description: "",
    
    // Step 4: Photos
    images: [],
    
    // Step 5: Pricing
    price: "",
    priceNegotiable: false,
    maintenanceCharges: "",
    depositAmount: ""
  });

  // Close on escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleChange = (field, value) => {
    // Sanitize text inputs
    let sanitizedValue = value;
    if (typeof value === 'string' && ['title', 'location', 'description'].includes(field)) {
      sanitizedValue = sanitizeInput(value);
    }
    
    setFormData(prev => {
      const newData = { ...prev, [field]: sanitizedValue };
      
      // Auto-set bedrooms to "0" for Studio Apartment
      if (field === 'propertyType' && value === 'Studio Apartment') {
        newData.bedrooms = '0';
      }
      // Clear bedrooms if switching away from Studio Apartment and it was set to 0
      if (field === 'propertyType' && value !== 'Studio Apartment' && prev.bedrooms === '0') {
        newData.bedrooms = '';
      }
      
      // Clear amenities that are not applicable to the new property type
      if (field === 'propertyType') {
        // Get available amenities for the new property type
        const propertyType = PROPERTY_TYPES.find(pt => pt.value === value);
        let availableAmenityIds = [];
        
        if (propertyType) {
          if (value === 'Row House/ Farm House') {
            availableAmenityIds = PROPERTY_TYPE_AMENITIES.residential_farmhouse;
          } else if (value === 'Plot / Land / Indusrtial Property') {
            availableAmenityIds = PROPERTY_TYPE_AMENITIES.land_plot;
          } else if (propertyType.category === 'residential') {
            availableAmenityIds = PROPERTY_TYPE_AMENITIES.residential;
          } else if (propertyType.category === 'commercial') {
            const configKey = `${propertyType.category}_${propertyType.subCategory}`;
            availableAmenityIds = PROPERTY_TYPE_AMENITIES[configKey] || PROPERTY_TYPE_AMENITIES.commercial_office;
          } else if (propertyType.category === 'pg') {
            availableAmenityIds = PROPERTY_TYPE_AMENITIES.pg_accommodation;
          } else if (propertyType.category === 'land') {
            availableAmenityIds = PROPERTY_TYPE_AMENITIES.land_plot;
          }
        }
        
        // Filter out amenities that are not available for the new property type
        if (availableAmenityIds.length > 0 && prev.amenities) {
          newData.amenities = prev.amenities.filter(amenityId => availableAmenityIds.includes(amenityId));
        }
      }
      
      return newData;
    });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const toggleAmenity = (amenityId) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(a => a !== amenityId)
        : [...prev.amenities, amenityId]
    }));
  };

  // Handle location selection from LocationPicker
  const handleLocationSelect = (locationData) => {
    setFormData(prev => ({
      ...prev,
      latitude: locationData.latitude.toString(),
      longitude: locationData.longitude.toString(),
      location: locationData.fullAddress || prev.location // Update location with full address if available
    }));
    setShowLocationPicker(false);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    const newErrors = {};
    const validFiles = [];
    
    // Validate each file
    for (const file of files) {
      // Basic file validation
      const fileValidation = validateImageFile(file);
      if (!fileValidation.valid) {
        newErrors.images = fileValidation.message;
        continue;
      }
      
      // Dimension validation
      try {
        const dimensionValidation = await validateImageDimensions(file, 200, 200);
        if (!dimensionValidation.valid) {
          newErrors.images = dimensionValidation.message;
          continue;
        }
        validFiles.push(file);
      } catch (error) {
        newErrors.images = 'Error validating image dimensions';
        continue;
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }
    
    // Check total image count
    const currentCount = formData.images?.length || 0;
    if (currentCount + validFiles.length > 10) {
      setErrors(prev => ({ 
        ...prev, 
        images: `Maximum 10 photos allowed. You have ${currentCount} and trying to add ${validFiles.length}` 
      }));
      return;
    }
    
    // Store file objects for later upload
    setImageFiles(prev => [...prev, ...validFiles].slice(0, 10));
    
    // Create blob URLs for preview (temporary)
    const newImages = validFiles.map(f => URL.createObjectURL(f));
    setFormData(prev => ({
      ...prev,
      images: [...(prev.images || []), ...newImages].slice(0, 10)
    }));
    
    if (errors.images) {
      setErrors(prev => ({ ...prev, images: null }));
    }
  };

  const removeImage = (idx) => {
    // Revoke blob URL to free memory
    if (formData.images && formData.images[idx] && formData.images[idx].startsWith('blob:')) {
      URL.revokeObjectURL(formData.images[idx]);
    }
    
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx)
    }));
    
    // Also remove from imageFiles array
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const validateStep = async (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        // Title validation
        const titleValidation = validateTextLength(formData.title, 1, 200, 'Property title');
        if (!titleValidation.valid) {
          newErrors.title = titleValidation.message;
        }
        
        // Property type validation
        if (!formData.propertyType) {
          newErrors.propertyType = "Select property type";
        }
        break;
        
      case 2:
        // Location validation
        if (!formData.location?.trim()) {
          newErrors.location = "Location is required";
        } else if (formData.location.trim().length < 5) {
          newErrors.location = "Location must be at least 5 characters";
        }
        
        // Area validation
        const areaValidation = validateArea(formData.area);
        if (!areaValidation.valid) {
          newErrors.area = areaValidation.message;
        }
        
        // Latitude validation
        if (formData.latitude) {
          const latValidation = validateLatitude(formData.latitude);
          if (!latValidation.valid) {
            newErrors.latitude = latValidation.message;
          }
        }
        
        // Longitude validation
        if (formData.longitude) {
          const lngValidation = validateLongitude(formData.longitude);
          if (!lngValidation.valid) {
            newErrors.longitude = lngValidation.message;
          }
        }
        
        // Carpet area validation
        if (formData.carpetArea && formData.area) {
          const carpetValidation = validateCarpetArea(formData.carpetArea, formData.area);
          if (!carpetValidation.valid) {
            newErrors.carpetArea = carpetValidation.message;
          }
        }
        
        // Floor validation
        if (formData.floor && formData.totalFloors) {
          const floorValidation = validateFloors(formData.floor, formData.totalFloors);
          if (!floorValidation.valid) {
            newErrors.floor = floorValidation.message;
          }
        }
        
        // Dynamic validation based on property type
        const fieldConfig = getPropertyTypeConfig();
        if (fieldConfig.bedroomsRequired && !formData.bedrooms) {
          newErrors.bedrooms = "Bedrooms is required";
        } else if (formData.bedrooms) {
          const bedroomsNum = parseInt(formData.bedrooms);
          if (isNaN(bedroomsNum) || bedroomsNum < 0 || bedroomsNum > 10) {
            newErrors.bedrooms = "Bedrooms must be between 0 and 10";
          }
        }
        
        if (fieldConfig.bathroomsRequired && !formData.bathrooms) {
          newErrors.bathrooms = "Bathrooms is required";
        } else if (formData.bathrooms) {
          const bathroomsNum = parseInt(formData.bathrooms);
          if (isNaN(bathroomsNum) || bathroomsNum < 1 || bathroomsNum > 10) {
            newErrors.bathrooms = "Bathrooms must be between 1 and 10";
          }
        }
        break;
        
      case 3:
        // Description validation
        const descValidation = validateTextLength(formData.description, 50, 1000, 'Description');
        if (!descValidation.valid) {
          newErrors.description = descValidation.message;
        }
        break;
        
      case 4:
        // Image validation
        if (!formData.images || formData.images.length === 0) {
          newErrors.images = "Add at least 1 photo";
        } else if (formData.images.length > 10) {
          newErrors.images = "Maximum 10 photos allowed";
        }
        break;
        
      case 5:
        // Price validation
        const priceValidation = validatePrice(formData.price, formData.status);
        if (!priceValidation.valid) {
          newErrors.price = priceValidation.message;
        }
        
        // Deposit validation for rent
        if (formData.status === 'rent' && formData.depositAmount && formData.price) {
          const depositValidation = validateDeposit(formData.depositAmount, formData.price);
          if (!depositValidation.valid) {
            newErrors.depositAmount = depositValidation.message;
          }
        }
        
        // Maintenance charges validation
        if (formData.maintenanceCharges) {
          const maintenanceNum = parseFloat(formData.maintenanceCharges);
          if (isNaN(maintenanceNum) || maintenanceNum < 0) {
            newErrors.maintenanceCharges = "Maintenance charges must be a positive number";
          }
        }
        break;
        
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Check if a step is completed (user has moved past it)
  const isStepCompleted = (stepId) => {
    return currentStep > stepId;
  };

  // Handle step circle click - allow going back to completed steps, prevent skipping forward
  const handleStepClick = async (stepId) => {
    // Allow clicking on current step (no change)
    if (stepId === currentStep) {
      return;
    }
    
    // Allow going back to completed steps (steps that have been completed)
    if (stepId < currentStep) {
      setCurrentStep(stepId);
      return;
    }
    
    // Prevent going forward to incomplete steps
    // User must use the "Next" button to move forward after completing current step
    // This ensures validation happens before moving forward
  };

  const handleSubmit = async () => {
    const isValid = await validateStep(currentStep);
    if (!isValid) return;
    
    setIsSubmitting(true);
    setUploadingImages(true);
    
    try {
      // Upload images first if there are image files
      let uploadedImageUrls = [];
      if (imageFiles.length > 0) {
        try {
          // Upload each image file
          const uploadPromises = imageFiles.map(async (file, index) => {
            try {
              const response = await sellerPropertiesAPI.uploadImage(file);
              if (response.success && response.data && response.data.url) {
                return { success: true, url: response.data.url, index };
              } else {
                console.error(`Image ${index + 1} upload failed:`, response.message || 'Unknown error');
                return { success: false, index, error: response.message || 'Upload failed' };
              }
            } catch (error) {
              console.error(`Image ${index + 1} upload error:`, error);
              return { success: false, index, error: error.message || 'Upload failed' };
            }
          });
          
          const results = await Promise.all(uploadPromises);
          const successful = results.filter(r => r.success);
          const failed = results.filter(r => !r.success);
          
          if (failed.length > 0) {
            console.error('Failed uploads:', failed);
            const errorMessage = failed.length === imageFiles.length 
              ? `Failed to upload all images. ${failed[0].error || 'Please check server permissions and try again.'}`
              : `Failed to upload ${failed.length} of ${imageFiles.length} images. Please try again.`;
            alert(errorMessage);
            setUploadingImages(false);
            setIsSubmitting(false);
            return;
          }
          
          uploadedImageUrls = successful.map(r => r.url);
          
          // Update formData with uploaded URLs
          if (uploadedImageUrls.length > 0) {
            formData.images = uploadedImageUrls;
          }
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          alert(`Failed to upload images: ${uploadError.message || 'Please check server permissions and try again.'}`);
          setUploadingImages(false);
          setIsSubmitting(false);
          return;
        }
      } else if (formData.images && formData.images.length > 0) {
        // If images are already URLs (from edit mode), filter out blob URLs
        uploadedImageUrls = formData.images.filter(img => 
          typeof img === 'string' && !img.startsWith('blob:')
        );
        formData.images = uploadedImageUrls;
      }
      
      setUploadingImages(false);
      
      // Now submit the property with uploaded image URLs
      if (editIndex !== null) {
        const propertyId = properties[editIndex]?.id;
        if (propertyId) {
          await updateProperty(propertyId, formData);
        }
      } else {
        await addProperty(formData);
      }
      
      // Close popup on success
      onClose();
    } catch (error) {
      setUploadingImages(false);
      // Show detailed error message
      const errorMessage = error.message || error.status === 401 
        ? 'Authentication required. Please log in to add properties.'
        : error.status === 403
        ? 'Access denied. Please check your permissions.'
        : 'Failed to save property. Please check your connection and try again.';
      alert(errorMessage);
      console.error('Property save error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="seller-popup-step-indicator">
      {STEPS.map((step, idx) => {
        const isCompleted = isStepCompleted(step.id);
        // Allow clicking on completed steps (to go back) or current step
        const isClickable = isCompleted || step.id === currentStep;
        
        return (
          <div 
            key={step.id}
            className={`seller-popup-step-item ${currentStep === step.id ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isClickable ? 'clickable' : ''}`}
          >
            <div 
              className="seller-popup-step-circle"
              onClick={() => isClickable && handleStepClick(step.id)}
              style={{ cursor: isClickable ? 'pointer' : 'default' }}
              title={!isClickable && step.id > currentStep ? 'Complete current step first' : isClickable && isCompleted ? 'Click to go back to this step' : ''}
            >
              {isCompleted ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <span>{step.icon}</span>
              )}
            </div>
            <span className="seller-popup-step-title">{step.title}</span>
            {idx < STEPS.length - 1 && <div className="step-line" />}
          </div>
        );
      })}
    </div>
  );

  const renderStep1 = () => (
    <div className="seller-popup-step-content">
      <h3 className="step-heading">Basic Information</h3>
      <p className="step-subheading">Let's start with the basic details of your property</p>

      <div className="seller-popup-form-group">
        <label>Property Title <span className="required">*</span></label>
        <input
          type="text"
          placeholder="e.g., Spacious 3BHK Apartment with Sea View"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          className={errors.title ? 'error' : ''}
        />
        {errors.title && <span className="seller-popup-error-text">{errors.title}</span>}
      </div>

      <div className="seller-popup-form-group">
        <label>I want to</label>
        <div className="toggle-buttons">
          <button
            type="button"
            className={`toggle-btn ${formData.status === 'sale' ? 'active' : ''}`}
            onClick={() => handleChange('status', 'sale')}
          >
            <span className="toggle-icon">🏷️</span>
            Sell
          </button>
          <button
            type="button"
            className={`toggle-btn ${formData.status === 'rent' ? 'active' : ''}`}
            onClick={() => handleChange('status', 'rent')}
          >
            <span className="toggle-icon">🔑</span>
            Rent / Lease
          </button>
        </div>
      </div>

      <div className="seller-popup-form-group">
        <label>Property Type <span className="required">*</span></label>
        <div className="seller-popup-property-type-grid">
          {PROPERTY_TYPES.map(type => (
            <button
              key={type.value}
              type="button"
              className={`property-type-btn ${formData.propertyType === type.value ? 'active' : ''}`}
              onClick={() => handleChange('propertyType', type.value)}
            >
              <span className="seller-popup-type-icon">{type.icon}</span>
              <span className="seller-popup-type-label">{type.value}</span>
            </button>
          ))}
        </div>
        {errors.propertyType && <span className="seller-popup-error-text">{errors.propertyType}</span>}
      </div>
    </div>
  );

  // Get property type configuration
  const getPropertyTypeConfig = () => {
    if (!formData.propertyType) return PROPERTY_TYPE_FIELDS.residential_standard; // default
    
    const propertyType = PROPERTY_TYPES.find(pt => pt.value === formData.propertyType);
    if (!propertyType) return PROPERTY_TYPE_FIELDS.residential_standard;
    
    // Build config key based on category and subCategory
    const configKey = `${propertyType.category}_${propertyType.subCategory}`;
    return PROPERTY_TYPE_FIELDS[configKey] || PROPERTY_TYPE_FIELDS.residential_standard;
  };

  const fieldConfig = getPropertyTypeConfig();

  const renderStep2 = () => (
    <div className="seller-popup-step-content">
      <h3 className="step-heading">Property Details</h3>
      <p className="step-subheading">Tell us more about your property specifications</p>

      <div className="seller-popup-form-group">
        <label>Location <span className="required">*</span></label>
        <LocationAutoSuggest
          placeholder="Enter locality, area or landmark"
          value={formData.location}
          onChange={(locationData) => {
            if (!locationData) {
              setFormData(prev => ({ ...prev, location: "", latitude: "", longitude: "" }));
              return;
            }
            setFormData(prev => ({
              ...prev,
              location: locationData.fullAddress || locationData.placeName || "",
              latitude: locationData.coordinates?.lat ?? "",
              longitude: locationData.coordinates?.lng ?? ""
            }));
          }}
          className={errors.location ? "seller-location-error" : ""}
          error={errors.location}
        />
      </div>

      {/* Location Picker Button */}
      <div className="seller-popup-form-group">
        <label>Property Location on Map (Optional)</label>
        {!formData.latitude || !formData.longitude ? (
          <>
            <button
              type="button"
              className="location-picker-btn"
              onClick={() => setShowLocationPicker(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px' }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span>Add Location on Map</span>
            </button>
            <span className="seller-popup-hint">Select exact location on map for better visibility</span>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="location-icon" style={{ fontSize: '18px' }}>📍</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.875rem', color: '#059669', fontWeight: '500' }}>
                  Location set on map
                </span>
              </div>
            </div>
            <small className="location-picker-coordinates" style={{ marginLeft: '26px', fontSize: '0.75rem', color: '#059669', fontFamily: 'monospace' }}>
              Coordinates: {parseFloat(formData.latitude).toFixed(6)}, {parseFloat(formData.longitude).toFixed(6)}
            </small>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="location-picker-change-btn"
                onClick={() => setShowLocationPicker(true)}
                title="Change location"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.875rem',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#374151',
                  fontWeight: '500'
                }}
              >
                Change Location
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, latitude: '', longitude: '' }));
                }}
                title="Remove location"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.875rem',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#991b1b',
                  fontWeight: '500'
                }}
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic fields based on property type */}
      {(fieldConfig.showBedrooms || fieldConfig.showBathrooms || fieldConfig.showBalconies) && (
        <div className="form-row three-cols">
          {fieldConfig.showBedrooms && (
            <div className="seller-popup-form-group">
              <label>
                {formData.propertyType === 'Studio Apartment' ? 'Studio' : 'Bedrooms'} 
                {fieldConfig.bedroomsRequired && <span className="required">*</span>}
              </label>
              {formData.propertyType === 'Studio Apartment' ? (
                <div className="number-selector">
                  <button
                    type="button"
                    className="num-btn active"
                    disabled
                    style={{ cursor: 'not-allowed', opacity: 0.7 }}
                  >
                    Studio
                  </button>
                </div>
              ) : (
                <div className="number-selector">
                  {['1', '2', '3', '4', '5', '5+'].map(num => (
                    <button
                      key={num}
                      type="button"
                      className={`num-btn ${formData.bedrooms === num ? 'active' : ''}`}
                      onClick={() => handleChange('bedrooms', num)}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              )}
              {errors.bedrooms && <span className="seller-popup-error-text">{errors.bedrooms}</span>}
            </div>
          )}

          {fieldConfig.showBathrooms && (
            <div className="seller-popup-form-group">
              <label>Bathrooms {fieldConfig.bathroomsRequired && <span className="required">*</span>}</label>
              <div className="number-selector">
                {['1', '2', '3', '4', '4+'].map(num => (
                  <button
                    key={num}
                    type="button"
                    className={`num-btn ${formData.bathrooms === num ? 'active' : ''}`}
                    onClick={() => handleChange('bathrooms', num)}
                  >
                    {num}
                  </button>
                ))}
              </div>
              {errors.bathrooms && <span className="seller-popup-error-text">{errors.bathrooms}</span>}
            </div>
          )}

          {fieldConfig.showBalconies && (
            <div className="seller-popup-form-group">
              <label>Balconies</label>
              <div className="number-selector">
                {['0', '1', '2', '3', '3+'].map(num => (
                  <button
                    key={num}
                    type="button"
                    className={`num-btn ${formData.balconies === num ? 'active' : ''}`}
                    onClick={() => handleChange('balconies', num)}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="form-row two-cols">
        <div className="seller-popup-form-group">
          <label>
            {formData.propertyType === 'Plot / Land / Indusrtial Property' ? 'Plot Area' : 'Built-up Area'} 
            <span className="required">*</span>
          </label>
          <div className="input-with-suffix">
            <input
              type="number"
              placeholder={formData.propertyType === 'Plot / Land / Indusrtial Property' ? 'Enter plot area' : 'Enter area'}
              value={formData.area}
              onChange={(e) => handleChange('area', e.target.value)}
              className={errors.area ? 'error' : ''}
            />
            <span className="suffix">sq.ft</span>
          </div>
          {errors.area && <span className="seller-popup-error-text">{errors.area}</span>}
        </div>

        {fieldConfig.showCarpetArea && (
          <div className="seller-popup-form-group">
            <label>Carpet Area</label>
            <div className="input-with-suffix">
              <input
                type="number"
                placeholder="Enter area"
                value={formData.carpetArea}
                onChange={(e) => handleChange('carpetArea', e.target.value)}
              />
              <span className="suffix">sq.ft</span>
            </div>
          </div>
        )}
      </div>

      {(fieldConfig.showFloor || fieldConfig.showTotalFloors) && (
        <div className="form-row two-cols">
          {fieldConfig.showFloor && (
            <div className="seller-popup-form-group">
              <label>Floor Number</label>
              <input
                type="text"
                placeholder="e.g., 5 or Ground"
                value={formData.floor}
                onChange={(e) => handleChange('floor', e.target.value)}
              />
            </div>
          )}

          {fieldConfig.showTotalFloors && (
            <div className="seller-popup-form-group">
              <label>Total Floors</label>
              <input
                type="number"
                placeholder="Total floors in building"
                value={formData.totalFloors}
                onChange={(e) => handleChange('totalFloors', e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      {(fieldConfig.showFacing || fieldConfig.showAge || fieldConfig.showFurnishing) && (
        <div className="form-row three-cols">
          {fieldConfig.showFacing && (
            <div className="seller-popup-form-group">
              <label>Facing</label>
              <select
                value={formData.facing}
                onChange={(e) => handleChange('facing', e.target.value)}
              >
                <option value="">Select</option>
                {FACING_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}

          {fieldConfig.showAge && (
            <div className="seller-popup-form-group">
              <label>Property Age</label>
              <select
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
              >
                <option value="">Select</option>
                {AGE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}

          {fieldConfig.showFurnishing && (
            <div className="seller-popup-form-group">
              <label>Furnishing</label>
              <select
                value={formData.furnishing}
                onChange={(e) => handleChange('furnishing', e.target.value)}
              >
                <option value="">Select</option>
                {FURNISHING_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Get available amenities based on property type
  const getAvailableAmenities = () => {
    if (!formData.propertyType) return AMENITIES;
    
    const propertyType = PROPERTY_TYPES.find(pt => pt.value === formData.propertyType);
    if (!propertyType) return AMENITIES;
    
    // Special case for Farm House
    if (formData.propertyType === 'Row House/ Farm House') {
      const amenityIds = PROPERTY_TYPE_AMENITIES.residential_farmhouse;
      return AMENITIES.filter(a => amenityIds.includes(a.id));
    }
    
    // Special case for Plot/Land
    if (formData.propertyType === 'Plot / Land / Indusrtial Property') {
      const amenityIds = PROPERTY_TYPE_AMENITIES.land_plot;
      return AMENITIES.filter(a => amenityIds.includes(a.id));
    }
    
    // For residential properties
    if (propertyType.category === 'residential') {
      const amenityIds = PROPERTY_TYPE_AMENITIES.residential;
      return AMENITIES.filter(a => amenityIds.includes(a.id));
    }
    
    // For commercial properties
    if (propertyType.category === 'commercial') {
      const configKey = `${propertyType.category}_${propertyType.subCategory}`;
      const amenityIds = PROPERTY_TYPE_AMENITIES[configKey] || PROPERTY_TYPE_AMENITIES.commercial_office;
      return AMENITIES.filter(a => amenityIds.includes(a.id));
    }
    
    // For PG/Hostel
    if (propertyType.category === 'pg') {
      const amenityIds = PROPERTY_TYPE_AMENITIES.pg_accommodation;
      return AMENITIES.filter(a => amenityIds.includes(a.id));
    }
    
    // For land
    if (propertyType.category === 'land') {
      const amenityIds = PROPERTY_TYPE_AMENITIES.land_plot;
      return AMENITIES.filter(a => amenityIds.includes(a.id));
    }
    
    // Default: return all amenities
    return AMENITIES;
  };

  const renderStep3 = () => {
    const availableAmenities = getAvailableAmenities();
    
    return (
      <div className="seller-popup-step-content">
        <h3 className="step-heading">Amenities & Description</h3>
        <p className="step-subheading">Select the amenities available and describe your property</p>

        <div className="seller-popup-form-group">
          <label>Select Amenities</label>
          <div className="seller-popup-amenities-grid">
            {availableAmenities.map(amenity => (
              <button
                key={amenity.id}
                type="button"
                className={`amenity-btn ${formData.amenities.includes(amenity.id) ? 'active' : ''}`}
                onClick={() => toggleAmenity(amenity.id)}
              >
                <span className="seller-popup-amenity-icon">{amenity.icon}</span>
                <span className="seller-popup-amenity-label">{amenity.label}</span>
                {formData.amenities.includes(amenity.id) && (
                  <span className="check-icon">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="seller-popup-form-group">
          <label>Property Description <span className="required">*</span></label>
          <textarea
            placeholder="Describe your property in detail. Mention unique features, nearby landmarks, connectivity, etc."
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={5}
            className={errors.description ? 'error' : ''}
          />
          <span className="char-count">{(formData.description || '').length}/1000</span>
          {errors.description && <span className="seller-popup-error-text">{errors.description}</span>}
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="seller-popup-step-content">
      <h3 className="step-heading">Upload Photos</h3>
      <p className="step-subheading">Add up to 10 high-quality photos of your property</p>

      <div 
        className={`upload-zone ${errors.images ? 'error' : ''}`}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
        <div className="upload-content">
          <div className="seller-popup-upload-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h4>Drag & drop your photos here</h4>
          <p>or click to browse from your device</p>
          <span className="seller-popup-upload-hint">Supports: JPG, PNG, WEBP (Max 5MB each)</span>
        </div>
      </div>
      {errors.images && <span className="seller-popup-error-text center">{errors.images}</span>}

      {formData.images?.length > 0 && (
        <div className="image-preview-section">
          <div className="preview-header">
            <span>Uploaded Photos ({formData.images.length}/10)</span>
            <button 
              type="button" 
              className="add-more-btn"
              onClick={() => fileRef.current?.click()}
            >
              + Add More
            </button>
          </div>
          <div className="image-preview-grid">
            {formData.images.map((src, idx) => (
              <div key={idx} className="preview-item">
                <img src={src} alt={`Preview ${idx + 1}`} />
                {idx === 0 && <span className="cover-badge">Cover</span>}
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removeImage(idx)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="seller-popup-step-content">
      <h3 className="step-heading">Pricing Details</h3>
      <p className="step-subheading">Set the right price for your property</p>

      <div className="seller-popup-form-group">
        <label>
          {formData.status === 'sale' ? 'Expected Price' : 'Monthly Rent'} 
          <span className="required">*</span>
        </label>
        <div className="price-input-wrapper">
          <span className="currency">₹</span>
          <input
            type="number"
            placeholder={formData.status === 'sale' ? 'Enter expected price' : 'Enter monthly rent'}
            value={formData.price}
            onChange={(e) => handleChange('price', e.target.value)}
            className={errors.price ? 'error' : ''}
          />
        </div>
        {formData.price && (
          <span className="price-words">
            {formatPriceInWords(formData.price)}
          </span>
        )}
        {errors.price && <span className="seller-popup-error-text">{errors.price}</span>}
      </div>

      <div className="seller-popup-form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.priceNegotiable}
            onChange={(e) => handleChange('priceNegotiable', e.target.checked)}
          />
          <span className="checkmark"></span>
          Price is negotiable
        </label>
      </div>

      {formData.status === 'rent' && (
        <div className="form-row two-cols">
          <div className="seller-popup-form-group">
            <label>Security Deposit</label>
            <div className="price-input-wrapper">
              <span className="currency">₹</span>
              <input
                type="number"
                placeholder="Enter deposit amount"
                value={formData.depositAmount}
                onChange={(e) => handleChange('depositAmount', e.target.value)}
              />
            </div>
          </div>

          <div className="seller-popup-form-group">
            <label>Maintenance (per month)</label>
            <div className="price-input-wrapper">
              <span className="currency">₹</span>
              <input
                type="number"
                placeholder="Enter maintenance"
                value={formData.maintenanceCharges}
                onChange={(e) => handleChange('maintenanceCharges', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {formData.status === 'sale' && (
        <div className="seller-popup-form-group">
          <label>Maintenance (per month)</label>
          <div className="price-input-wrapper">
            <span className="currency">₹</span>
            <input
              type="number"
              placeholder="Enter monthly maintenance"
              value={formData.maintenanceCharges}
              onChange={(e) => handleChange('maintenanceCharges', e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="seller-popup-listing-summary">
        <h4>Listing Summary</h4>
        <div className="seller-popup-summary-grid">
          <div className="seller-popup-summary-item">
            <span className="seller-popup-summary-label">Property</span>
            <span className="seller-popup-summary-value">{formData.title || '-'}</span>
          </div>
          <div className="seller-popup-summary-item">
            <span className="seller-popup-summary-label">Type</span>
            <span className="seller-popup-summary-value">{formData.propertyType || '-'}</span>
          </div>
          <div className="seller-popup-summary-item">
            <span className="seller-popup-summary-label">Location</span>
            <span className="seller-popup-summary-value">{formData.location || '-'}</span>
          </div>
          <div className="seller-popup-summary-item">
            <span className="seller-popup-summary-label">Configuration</span>
            <span className="seller-popup-summary-value">
              {formData.bedrooms ? `${formData.bedrooms} BHK` : '-'}
            </span>
          </div>
          <div className="seller-popup-summary-item">
            <span className="seller-popup-summary-label">Area</span>
            <span className="seller-popup-summary-value">
              {formData.area ? `${formData.area} sq.ft` : '-'}
            </span>
          </div>
          <div className="seller-popup-summary-item">
            <span className="seller-popup-summary-label">Photos</span>
            <span className="seller-popup-summary-value">
              {formData.images?.length || 0} uploaded
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const formatPriceInWords = (price) => {
    const num = parseFloat(price);
    if (isNaN(num)) return '';
    
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Crore`;
    } else if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} Lakh`;
    } else if (num >= 1000) {
      return `₹${(num / 1000).toFixed(2)} Thousand`;
    }
    return `₹${num}`;
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return renderStep1();
    }
  };

  return (
    <div className="seller-popup-overlay" onClick={(e) => e.target.classList.contains('seller-popup-overlay') && onClose()}>
      
      {/* Property Limit Warning Modal */}
      {showLimitWarning && (
        <div className="seller-popup-limit-warning-overlay">
          <div className="seller-popup-limit-warning-modal">
            <div className="seller-popup-limit-warning-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            
            <div className="seller-popup-limit-warning-content">
              <h3>Property Limit Reached</h3>
              <p>You've uploaded <strong>{currentPropertyCount}</strong> out of <strong>{PROPERTY_LIMIT}</strong> properties allowed in your free plan.</p>
              
              <div className="seller-popup-limit-progress">
                <div className="seller-popup-limit-progress-bar">
                  <div 
                    className="seller-popup-limit-progress-fill" 
                    style={{ width: `${(currentPropertyCount / PROPERTY_LIMIT) * 100}%` }}
                  ></div>
                </div>
                <span className="seller-popup-limit-progress-text">{currentPropertyCount}/{PROPERTY_LIMIT} Properties Used</span>
              </div>

              <div className="seller-popup-limit-warning-features">
                <p className="seller-popup-features-title">Upgrade to Pro to unlock:</p>
                <ul>
                  <li>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    More property listings
                  </li>
                  <li>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Priority placement in search
                  </li>
                  <li>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Advanced analytics & insights
                  </li>
                  <li>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Dedicated support
                  </li>
                </ul>
              </div>
            </div>

            <div className="seller-popup-limit-warning-actions">
              <button className="seller-popup-limit-btn-secondary" onClick={onClose}>
                Maybe Later
              </button>
              <button className="seller-popup-limit-btn-primary" onClick={() => {
                onClose();
                // Navigate to subscription page - you can pass a callback or use navigate
                window.location.href = '/subscription';
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor"/>
                </svg>
                Upgrade to Pro
              </button>
            </div>

            <button className="seller-popup-limit-warning-close" onClick={onClose} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Popup - Only show if limit not reached */}
      {!showLimitWarning && (
      <div className="seller-popup-container" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="seller-popup-header">
          <h2>{editIndex !== null ? 'Edit Property' : 'List Your Property'}</h2>
          <button className="seller-popup-close-btn" onClick={onClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Form Content */}
        <div className="seller-popup-body">
          {renderCurrentStep()}
        </div>

        {/* Footer */}
        <div className="seller-popup-footer">
          {currentStep > 1 && (
            <button type="button" className="seller-popup-back-btn" onClick={handleBack}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Back
            </button>
          )}
          
          <div className="seller-popup-footer-right">
            <button type="button" className="seller-popup-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            
            {currentStep < 5 ? (
              <button type="button" className="seller-popup-next-btn" onClick={handleNext}>
                Next
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            ) : (
              <button 
                type="button" 
                className="seller-popup-submit-btn" 
                onClick={handleSubmit}
                disabled={isSubmitting || uploadingImages}
              >
                {uploadingImages ? (
                  <>
                    <span className="seller-popup-spinner"></span>
                    Uploading Images...
                  </>
                ) : isSubmitting ? (
                  <>
                    <span className="seller-popup-spinner"></span>
                    Publishing...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    {editIndex !== null ? 'Update Property' : 'Publish Listing'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <div className="location-picker-modal-overlay" onClick={(e) => {
          if (e.target.classList.contains('location-picker-modal-overlay')) {
            setShowLocationPicker(false);
          }
        }}>
          <LocationPicker
            initialLocation={formData.latitude && formData.longitude ? {
              latitude: parseFloat(formData.latitude),
              longitude: parseFloat(formData.longitude),
              fullAddress: formData.location
            } : null}
            onLocationChange={handleLocationSelect}
            onClose={() => setShowLocationPicker(false)}
          />
        </div>
      )}
    </div>
  );
}