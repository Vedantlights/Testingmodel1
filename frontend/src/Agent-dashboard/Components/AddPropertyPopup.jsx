// src/components/AddPropertyPopup.jsx
import React, { useState, useRef, useEffect } from "react";
import { useProperty } from "./PropertyContext";
import { sellerPropertiesAPI } from "../../services/api.service";
import { API_BASE_URL, API_ENDPOINTS } from "../../config/api.config";
import { validateImageFile } from "../../utils/validation";
import LocationPicker from "../../components/Map/LocationPicker";
import LocationAutoSuggest from "../../components/LocationAutoSuggest";
import StateAutoSuggest from "../../components/StateAutoSuggest";
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
  { value: "Flat", icon: "🏠", category: "residential", subCategory: "standard" },
  { value: "Villa", icon: "🏡", category: "residential", subCategory: "independent" },
  { value: "Independent House", icon: "🏘️", category: "residential", subCategory: "independent" },
  { value: "Row House", icon: "🏘️", category: "residential", subCategory: "standard" },
  { value: "Penthouse", icon: "🌆", category: "residential", subCategory: "luxury" },
  { value: "Studio Apartment", icon: "🛏️", category: "residential", subCategory: "studio" },
  { value: "Farm House", icon: "🌳", category: "residential", subCategory: "independent" },
  { value: "Plot / Land", icon: "📐", category: "land", subCategory: "plot" },
  { value: "Commercial Office", icon: "🏢", category: "commercial", subCategory: "office" },
  { value: "Commercial Shop", icon: "🏪", category: "commercial", subCategory: "shop" },
  { value: "PG / Hostel", icon: "🛏️", category: "pg", subCategory: "accommodation" }
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
  { id: "ac", label: "Air Conditioning", icon: "❄️" }
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
  // Plot/Land - minimal amenities
  land_plot: [
    "security", "water_supply", "cctv"
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
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showEditNoticeModal, setShowEditNoticeModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [imageFiles, setImageFiles] = useState([]); // Store actual File objects
  const [imageValidationStatus, setImageValidationStatus] = useState([]); // Track validation status for each image
  const [showEditNoticeModal, setShowEditNoticeModal] = useState(false);
  const [isCheckingImages, setIsCheckingImages] = useState(false);
  // separate refs for images, video, brochure
  const imagesRef = useRef();
  const videoRef = useRef();
  const brochureRef = useRef();
  const popupBodyRef = useRef(null);

  // Check if property is older than 24 hours (only allow title and price editing)
  const isPropertyOlderThan24Hours = () => {
    if (editIndex === null || !initialData?.createdAt) {
      return false;
    }
    const createdAt = new Date(initialData.createdAt);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreation >= 24;
  };

  const isRestrictedEdit = isPropertyOlderThan24Hours();

  const [formData, setFormData] = useState(initialData || {
    // Step 1: Basic Info
    title: "",
    status: "sale",
    propertyType: "",
    
    // Step 2: Property Details
    location: "",
    latitude: "",
    longitude: "",
    state: "",
    additionalAddress: "",
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
    
    // Step 4: Media
    images: [],
    video: null,       // NEW
    brochure: null,    // NEW (object: { name, size, url })
    
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

  // Cleanup blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Revoke all blob URLs when component unmounts
      if (formData.images) {
        formData.images.forEach(img => {
          if (typeof img === 'string' && img.startsWith('blob:')) {
            URL.revokeObjectURL(img);
          }
        });
      }
    };
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
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
          if (value === 'Farm House') {
            availableAmenityIds = PROPERTY_TYPE_AMENITIES.residential_farmhouse;
          } else if (value === 'Plot / Land') {
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

  // Get property type configuration
  const getPropertyTypeConfig = () => {
    if (!formData.propertyType) return PROPERTY_TYPE_FIELDS.residential_standard; // default
    
    const propertyType = PROPERTY_TYPES.find(pt => pt.value === formData.propertyType);
    if (!propertyType) return PROPERTY_TYPE_FIELDS.residential_standard;
    
    // Special case for Farm House
    if (formData.propertyType === 'Farm House') {
      return PROPERTY_TYPE_FIELDS.residential_farmhouse;
    }
    
    // Build config key based on category and subCategory
    const configKey = `${propertyType.category}_${propertyType.subCategory}`;
    return PROPERTY_TYPE_FIELDS[configKey] || PROPERTY_TYPE_FIELDS.residential_standard;
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
    if (isRestrictedEdit) return; // Prevent location changes after 24 hours
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
    
    // Check total image count
    const currentCount = formData.images?.length || 0;
    if (currentCount + files.length > 10) {
      setErrors(prev => ({ 
        ...prev, 
        images: `Maximum 10 photos allowed. You have ${currentCount} and trying to add ${files.length}` 
      }));
      return;
    }
    
    // Basic file validation first
    const validFiles = [];
    for (const file of files) {
      const fileValidation = validateImageFile(file);
      if (!fileValidation.valid) {
        setErrors(prev => ({ 
          ...prev, 
          images: fileValidation.message 
        }));
        continue;
      }
      validFiles.push(file);
    }
    
    if (validFiles.length === 0) {
      return;
    }
    
    // Create image objects with pending status
    const newImageObjects = validFiles.map(file => ({
      file: file,
      preview: URL.createObjectURL(file),
      status: 'pending', // pending, checking, approved, rejected
      errorMessage: '',
      imageId: null,
      imageUrl: null
    }));
    
    // Add to state immediately
    setImageFiles(prev => [...prev, ...validFiles].slice(0, 10));
    setImageValidationStatus(prev => [...prev, ...newImageObjects].slice(0, 10));
    
    // Create blob URLs for preview
    const newImages = validFiles.map(f => URL.createObjectURL(f));
    setFormData(prev => ({
      ...prev,
      images: [...(prev.images || []), ...newImages].slice(0, 10)
    }));
    
    // Clear any previous errors
    if (errors.images) {
      setErrors(prev => ({ ...prev, images: null }));
    }
    
    // Immediately validate each image through moderation API (in parallel for speed)
    setIsCheckingImages(true);
    const startIndex = imageValidationStatus.length;
    
    // Validate all images in parallel for faster processing
    const validationPromises = newImageObjects.map((imgObj, i) => 
      validateImageThroughModeration(imgObj, startIndex + i)
    );
    
    // Wait for all validations to complete
    await Promise.all(validationPromises);
    
    setIsCheckingImages(false);
  };
  
  // Validate single image through moderation API
  const validateImageThroughModeration = async (imageObj, index) => {
    // Update status to checking
    setImageValidationStatus(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { 
          ...updated[index], 
          status: 'checking'
        };
      }
      return updated;
    });
    
    try {
      // Get property ID - use 0 for new properties (validation-only mode)
      const propertyId = editIndex !== null ? properties[editIndex]?.id : 0;
      const validateOnly = propertyId <= 0; // Validation-only mode for new properties
      
      const formData = new FormData();
      formData.append('image', imageObj.file);
      formData.append('property_id', propertyId);
      if (validateOnly) {
        formData.append('validate_only', 'true');
      }
      
      const token = localStorage.getItem('authToken');
      console.log(`[Image ${index + 1}] Starting validation...`);
      
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MODERATE_AND_UPLOAD}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      console.log(`[Image ${index + 1}] Response status:`, response.status);
      
      // Check if response is OK
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Image ${index + 1}] HTTP Error ${response.status}:`, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText || `HTTP ${response.status} Error` };
        }
        
        setImageValidationStatus(prev => {
          const updated = [...prev];
          if (updated[index]) {
            updated[index] = { 
              ...updated[index], 
              status: 'rejected',
              errorMessage: errorData.message || 'Validation failed',
              fullErrorMessage: errorData.message || `HTTP ${response.status} Error`
            };
          }
          return updated;
        });
        return;
      }
      
      const result = await response.json();
      console.log(`[Image ${index + 1}] API Response:`, result);
      
      // Update status based on result
      setImageValidationStatus(prev => {
        const updated = [...prev];
        if (updated[index]) {
          if (result.status === 'success') {
            console.log(`[Image ${index + 1}] ✅ Approved`);
            updated[index] = { 
              ...updated[index], 
              status: 'approved',
              imageId: result.data?.image_id,
              imageUrl: result.data?.image_url
            };
          } else if (result.status === 'pending_review') {
            console.log(`[Image ${index + 1}] ⏳ Pending Review`);
            updated[index] = { 
              ...updated[index], 
              status: 'pending',
              errorMessage: result.message || 'Pending review'
            };
          } else {
            // Extract specific error reason from message
            let errorReason = result.message || 'Image was rejected';
            console.log(`[Image ${index + 1}] ❌ Rejected:`, errorReason);
            
            // Make error message more concise for display
            if (errorReason.includes('animal appearance')) {
              const match = errorReason.match(/\(([^)]+)\)/);
              errorReason = match ? `${match[1]} detected` : 'Animal detected';
            } else if (errorReason.includes('human appearance')) {
              errorReason = 'Human detected';
            } else if (errorReason.includes('blurry')) {
              errorReason = 'Image is too blurry';
            } else if (errorReason.includes('low quality')) {
              errorReason = 'Image quality too low';
            }
            
            updated[index] = { 
              ...updated[index], 
              status: 'rejected',
              errorMessage: errorReason, // Show EXACT error from API
              fullErrorMessage: result.message || 'Image was rejected'
            };
          }
        }
        return updated;
      });
      
      // Check if all images are approved and auto-proceed
      setTimeout(() => {
        checkAndAutoProceed();
      }, 500);
      
    } catch (error) {
      console.error(`[Image ${index + 1}] ❌ Validation error:`, error);
      console.error(`[Image ${index + 1}] Error details:`, {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      setImageValidationStatus(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { 
            ...updated[index], 
            status: 'rejected',
            errorMessage: error.message || 'Validation failed. Please check console for details.',
            fullErrorMessage: error.message || 'Failed to validate image. Please try again.'
          };
        }
        return updated;
      });
    }
  };
  
  // Check if all images are approved and auto-proceed to next step
  const checkAndAutoProceed = () => {
    if (currentStep === 4 && imageValidationStatus.length > 0) {
      const allApproved = imageValidationStatus.every(img => img.status === 'approved');
      const noneChecking = !imageValidationStatus.some(img => img.status === 'checking');
      const noneRejected = !imageValidationStatus.some(img => img.status === 'rejected');
      
      if (allApproved && noneChecking && noneRejected && imageValidationStatus.length > 0) {
        // Auto-proceed after 1 second
        setTimeout(() => {
          handleNext();
        }, 1000);
      }
    }
  };

  const removeImage = (idx) => {
    // Revoke blob URL to free memory
    if (formData.images && formData.images[idx] && formData.images[idx].startsWith('blob:')) {
      URL.revokeObjectURL(formData.images[idx]);
    }
    
    // Also revoke preview URL from validation status
    if (imageValidationStatus[idx]?.preview && imageValidationStatus[idx].preview.startsWith('blob:')) {
      URL.revokeObjectURL(imageValidationStatus[idx].preview);
    }
    
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx)
    }));
    
    // Also remove from imageFiles array
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
    
    // Remove from validation status
    setImageValidationStatus(prev => prev.filter((_, i) => i !== idx));
  };

  // ---------- NEW: Video Handlers ----------
  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // validate type
    const allowed = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v", "video/ogg"];
    if (!allowed.includes(file.type)) {
      setErrors(prev => ({ ...prev, video: "Unsupported video format" }));
      return;
    }

    // validate size (<= 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, video: "Video must be <= 50MB" }));
      return;
    }

    const url = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, video: { file, url, name: file.name, size: file.size } }));
    setErrors(prev => ({ ...prev, video: null }));
  };

  const removeVideo = () => {
    // revoke object URL to free memory
    if (formData.video?.url) URL.revokeObjectURL(formData.video.url);
    setFormData(prev => ({ ...prev, video: null }));
  };

  // ---------- NEW: Brochure (PDF) Handlers ----------
  const handleBrochureUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // validate type
    if (file.type !== "application/pdf") {
      setErrors(prev => ({ ...prev, brochure: "Only PDF files are allowed" }));
      return;
    }

    // validate size (<= 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, brochure: "PDF must be <= 10MB" }));
      return;
    }

    const url = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, brochure: { file, url, name: file.name, size: file.size } }));
    setErrors(prev => ({ ...prev, brochure: null }));
  };

  const removeBrochure = () => {
    if (formData.brochure?.url) URL.revokeObjectURL(formData.brochure.url);
    setFormData(prev => ({ ...prev, brochure: null }));
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.title?.trim()) newErrors.title = "Property title is required";
        if (!formData.propertyType) newErrors.propertyType = "Select property type";
        break;
      case 2:
        if (!formData.location?.trim()) newErrors.location = "Location is required";
        if (!formData.area) {
          newErrors.area = formData.propertyType === 'Plot / Land' 
            ? "Plot area is required" 
            : "Built-up area is required";
        }
        
        // Dynamic validation based on property type
        const fieldConfig = getPropertyTypeConfig();
        if (fieldConfig.bedroomsRequired && !formData.bedrooms) {
          newErrors.bedrooms = "Bedrooms is required";
        }
        if (fieldConfig.bathroomsRequired && !formData.bathrooms) {
          newErrors.bathrooms = "Bathrooms is required";
        }
        break;
      case 3:
        // Description validation
        if (!formData.description || !formData.description.trim()) {
          newErrors.description = "Description is required";
        } else {
          // Check minimum character count (100 characters)
          const charCount = formData.description.trim().length;
          if (charCount < 100) {
            newErrors.description = `Description must contain at least 100 characters. Currently: ${charCount} characters.`;
          }
          
          // Check for mobile numbers (Indian format: 10 digits, may have +91, spaces, dashes)
          const mobilePattern = /(\+91[\s-]?)?[6-9]\d{9}/g;
          if (mobilePattern.test(formData.description)) {
            newErrors.description = "Description cannot contain mobile numbers. Please remove any phone numbers.";
          }
          
          // Check for email addresses
          const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
          if (emailPattern.test(formData.description)) {
            newErrors.description = "Description cannot contain email addresses. Please remove any email addresses.";
          }
          
          // Check maximum character length
          if (formData.description.length > 1000) {
            newErrors.description = "Description cannot exceed 1000 characters.";
          }
        }
        break;
      case 4:
        // require at least 1 image (existing behaviour)
        if (!formData.images || formData.images.length === 0) {
          newErrors.images = "Add at least 1 photo";
        } else {
          // Check if any images are still being validated
          if (isCheckingImages) {
            newErrors.images = "Please wait for all images to be validated";
          }
          // Check if any images were rejected
          const rejectedCount = imageValidationStatus.filter(img => img.status === 'rejected').length;
          if (rejectedCount > 0) {
            newErrors.images = `Please remove ${rejectedCount} rejected image(s) before proceeding`;
          }
          // Check if at least one image is approved
          const approvedCount = imageValidationStatus.filter(img => img.status === 'approved').length;
          if (approvedCount === 0 && imageValidationStatus.length > 0 && !isCheckingImages) {
            newErrors.images = "At least one image must be approved";
          }
        }
        // optional: if you want to require brochure/video, uncomment below
        // if (!formData.video) newErrors.video = "Please upload a video";
        // if (!formData.brochure) newErrors.brochure = "Please upload brochure";
        break;
      case 5:
        if (!formData.price) newErrors.price = "Price is required";
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
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
  const handleStepClick = (stepId) => {
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

  // Scroll to top when step changes
  useEffect(() => {
    if (popupBodyRef.current) {
      popupBodyRef.current.scrollTop = 0;
    }
  }, [currentStep]);

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setIsSubmitting(true);
    setUploadingImages(true);
    
    try {
      let uploadedImageUrls = [];
      let propertyId = null;
      
      // For new properties: Create property first to get ID, then upload images with moderation
      // For edit: Use existing property ID
      if (editIndex !== null) {
        propertyId = properties[editIndex]?.id;
      }
      
      // Use validated images from imageValidationStatus
      // For editing: Get approved image URLs (images already validated and uploaded on selection)
      if (editIndex !== null) {
        // Get approved image URLs from validation status
        const approvedImageUrls = imageValidationStatus
          .filter(img => img.status === 'approved' && img.imageUrl)
          .map(img => img.imageUrl);
        
        // Also include existing URLs (not blob URLs)
        const existingUrls = (formData.images || []).filter(img => 
          typeof img === 'string' && !img.startsWith('blob:')
        );
        
        // Combine approved new images with existing URLs
        uploadedImageUrls = [...existingUrls, ...approvedImageUrls];
        formData.images = uploadedImageUrls;
      }
      
      setUploadingImages(false);
      
      // For new properties: Create property first, then upload images
      if (editIndex === null) {
        // Create property with empty images array first to get property ID
        const propertyDataWithoutImages = { ...formData, images: [] };
        let createdProperty;
        try {
          createdProperty = await addProperty(propertyDataWithoutImages);
        } catch (error) {
          // If property creation fails, we can't upload images
          console.error('Property creation failed:', error);
          throw new Error('Failed to create property. Please try again.');
        }
        
        if (createdProperty && createdProperty.id) {
          propertyId = createdProperty.id;
        } else {
          // Property was created but ID not returned - try to get from refresh
          throw new Error('Failed to get property ID after creation. Please refresh and try again.');
        }
        
        // Images are already validated on selection (in validate_only mode)
        // Now upload them again with property ID to save to database
        const approvedImages = imageValidationStatus.filter(img => img.status === 'approved');
        
        if (approvedImages.length > 0) {
          setUploadingImages(true);
          try {
            // Upload each approved image with property ID
            const uploadPromises = approvedImages.map(async (imgObj, index) => {
              try {
                const response = await sellerPropertiesAPI.uploadImage(imgObj.file, propertyId);
                
                if (response.success && response.data && response.data.url) {
                  return { 
                    success: true, 
                    url: response.data.url || response.data.image_url, 
                    index
                  };
                } else {
                  return { success: false, index, error: response.message || 'Upload failed' };
                }
              } catch (error) {
                console.error(`Image ${index + 1} upload error:`, error);
                return { 
                  success: false, 
                  index, 
                  error: error.message || 'Upload failed'
                };
              }
            });
            
            const results = await Promise.all(uploadPromises);
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);
            
            if (failed.length > 0) {
              const errorMessages = failed.map(f => f.error).filter(Boolean);
              const uniqueErrors = [...new Set(errorMessages)];
              const errorMessage = failed.length === approvedImages.length 
                ? `Failed to upload all images. ${uniqueErrors[0] || 'Please check server permissions and try again.'}`
                : `Failed to upload ${failed.length} of ${approvedImages.length} images. ${uniqueErrors.join('; ')}`;
              
              // If some images failed but property was created, still update with successful images
              if (successful.length > 0) {
                uploadedImageUrls = successful.map(r => r.url);
                await sellerPropertiesAPI.update(propertyId, { images: uploadedImageUrls });
                alert(`Property created but ${failed.length} image(s) failed to upload. ${errorMessage}`);
              } else {
                alert(`Property created but no images were uploaded. ${errorMessage}`);
              }
              setUploadingImages(false);
              setIsSubmitting(false);
              onClose();
              return;
            }
            
            uploadedImageUrls = successful.map(r => r.url);
            
            // Update property with uploaded image URLs
            if (uploadedImageUrls.length > 0) {
              try {
                await sellerPropertiesAPI.update(propertyId, { images: uploadedImageUrls });
              } catch (updateError) {
                console.error('Failed to update property with images:', updateError);
                alert(`Property created successfully, but failed to link ${uploadedImageUrls.length} image(s). You can edit the property to add images.`);
                setUploadingImages(false);
                setIsSubmitting(false);
                onClose();
                return;
              }
            }
            
            setUploadingImages(false);
            setShowEditNoticeModal(true);
          } catch (uploadError) {
            console.error('Image upload error:', uploadError);
            alert(`Property created but failed to upload images: ${uploadError.message || 'Please try uploading images again later.'}`);
            setUploadingImages(false);
            setIsSubmitting(false);
            onClose();
            return;
          }
        } else {
          // No approved images
          setUploadingImages(false);
          setIsSubmitting(false);
          setShowEditNoticeModal(true);
          return;
        }
      } else {
        // Editing existing property
        const propertyId = properties[editIndex]?.id;
        if (propertyId) {
          await updateProperty(propertyId, formData);
          alert('Property updated successfully!');
        }
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
    <div className="step-indicator">
      {STEPS.map((step, idx) => {
        const isCompleted = isStepCompleted(step.id);
        // Allow clicking on completed steps (to go back) or current step
        const isClickable = isCompleted || step.id === currentStep;
        
        return (
          <div 
            key={step.id}
            className={`step-item ${currentStep === step.id ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isClickable ? 'clickable' : ''}`}
          >
            <div 
              className="step-circle"
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
            <span className="step-title">{step.title}</span>
            {idx < STEPS.length - 1 && <div className="step-line" />}
          </div>
        );
      })}
    </div>
  );

  const renderStep1 = () => (
    <div className="step-content">
      <h3 className="step-heading">Basic Information</h3>
      <p className="step-subheading">Let's start with the basic details of your property</p>

      <div className="form-group">
        <label>Property Title <span className="required">*</span></label>
        <input
          type="text"
          placeholder="e.g., Spacious 3BHK Apartment with Sea View"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          className={errors.title ? 'error' : ''}
        />
        {errors.title && <span className="error-text">{errors.title}</span>}
      </div>

      <div className="form-group">
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

      <div className="form-group">
        <label>Property Type <span className="required">*</span></label>
        <div className="property-type-grid">
          {PROPERTY_TYPES.map(type => (
            <button
              key={type.value}
              type="button"
              className={`property-type-btn ${formData.propertyType === type.value ? 'active' : ''}`}
              onClick={() => handleChange('propertyType', type.value)}
            >
              <span className="type-icon">{type.icon}</span>
              <span className="type-label">{type.value}</span>
            </button>
          ))}
        </div>
        {errors.propertyType && <span className="error-text">{errors.propertyType}</span>}
      </div>
    </div>
  );

  const renderStep2 = () => {
    const fieldConfig = getPropertyTypeConfig();
    
    return (
      <div className="step-content">
        <h3 className="step-heading">Property Details</h3>
        <p className="step-subheading">Tell us more about your property specifications</p>

        <div className="form-group">
          <label>Location <span className="required">*</span></label>
          <LocationAutoSuggest
            placeholder="Enter locality, area or landmark"
            value={formData.location}
            onChange={(locationData) => {
              if (isRestrictedEdit) return;
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
            className={`location-autosuggest-popup ${errors.location ? 'agent-location-error' : ''}`}
            error={errors.location}
            disabled={isRestrictedEdit}
          />
        </div>

        {/* Location Picker Button */}
        <div className="form-group">
          <label>Property Location on Map (Optional)</label>
          {!formData.latitude || !formData.longitude ? (
            <>
              <button
                type="button"
                className="location-picker-btn"
                onClick={() => !isRestrictedEdit && setShowLocationPicker(true)}
                disabled={isRestrictedEdit}
                style={{ opacity: isRestrictedEdit ? 0.5 : 1, cursor: isRestrictedEdit ? 'not-allowed' : 'pointer' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px' }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span>Add Location on Map</span>
              </button>
              <span className="hint-text">Select exact location on map for better visibility</span>
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
                  onClick={() => !isRestrictedEdit && setShowLocationPicker(true)}
                  disabled={isRestrictedEdit}
                  title={isRestrictedEdit ? "Location cannot be changed after 24 hours" : "Change location"}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.875rem',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: isRestrictedEdit ? 'not-allowed' : 'pointer',
                    color: isRestrictedEdit ? '#9ca3af' : '#374151',
                    fontWeight: '500',
                    opacity: isRestrictedEdit ? 0.5 : 1
                  }}
                >
                  Change Location
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isRestrictedEdit) {
                      setFormData(prev => ({ ...prev, latitude: '', longitude: '' }));
                    }
                  }}
                  disabled={isRestrictedEdit}
                  title={isRestrictedEdit ? "Location cannot be removed after 24 hours" : "Remove location"}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.875rem',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    cursor: isRestrictedEdit ? 'not-allowed' : 'pointer',
                    color: isRestrictedEdit ? '#d1d5db' : '#991b1b',
                    fontWeight: '500',
                    opacity: isRestrictedEdit ? 0.5 : 1
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        {/* State and Additional Address Fields */}
        <div className="form-row two-cols">
          <div className="form-group">
            <label>State (Optional)</label>
            <StateAutoSuggest
              placeholder="Enter state"
              value={formData.state || ''}
              onChange={(stateName) => {
                if (!isRestrictedEdit) {
                  handleChange('state', stateName);
                }
              }}
              className={errors.state ? 'agent-state-error' : ''}
              error={errors.state}
              disabled={isRestrictedEdit}
            />
          </div>

          <div className="form-group">
            <label>Additional Address (Optional)</label>
            <input
              type="text"
              placeholder="Enter additional address details"
              value={formData.additionalAddress || ''}
              onChange={(e) => !isRestrictedEdit && handleChange('additionalAddress', e.target.value)}
              disabled={isRestrictedEdit}
            />
          </div>
        </div>

        {/* Dynamic fields based on property type */}
        {(fieldConfig.showBedrooms || fieldConfig.showBathrooms || fieldConfig.showBalconies) && (
          <div className="form-row three-cols">
            {fieldConfig.showBedrooms && (
              <div className="form-group">
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
                {errors.bedrooms && <span className="error-text">{errors.bedrooms}</span>}
              </div>
            )}

            {fieldConfig.showBathrooms && (
              <div className="form-group">
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
                {errors.bathrooms && <span className="error-text">{errors.bathrooms}</span>}
              </div>
            )}

            {fieldConfig.showBalconies && (
              <div className="form-group">
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
          <div className="form-group">
            <label>
              {formData.propertyType === 'Plot / Land' ? 'Plot Area' : 'Built-up Area'} 
              <span className="required">*</span>
            </label>
            <div className="input-with-suffix">
              <input
                type="number"
                placeholder={formData.propertyType === 'Plot / Land' ? 'Enter plot area' : 'Enter area'}
                value={formData.area}
                onChange={(e) => handleChange('area', e.target.value)}
                className={errors.area ? 'error' : ''}
              />
              <span className="suffix">sq.ft</span>
            </div>
            {errors.area && <span className="error-text">{errors.area}</span>}
          </div>

          {fieldConfig.showCarpetArea && (
            <div className="form-group">
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
              <div className="form-group">
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
              <div className="form-group">
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
              <div className="form-group">
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
              <div className="form-group">
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
              <div className="form-group">
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
  };

  // Get available amenities based on property type
  const getAvailableAmenities = () => {
    if (!formData.propertyType) return AMENITIES;
    
    const propertyType = PROPERTY_TYPES.find(pt => pt.value === formData.propertyType);
    if (!propertyType) return AMENITIES;
    
    // Special case for Farm House
    if (formData.propertyType === 'Farm House') {
      const amenityIds = PROPERTY_TYPE_AMENITIES.residential_farmhouse;
      return AMENITIES.filter(a => amenityIds.includes(a.id));
    }
    
    // Special case for Plot/Land
    if (formData.propertyType === 'Plot / Land') {
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
      <div className="step-content">
        <h3 className="step-heading">Amenities & Description</h3>
        <p className="step-subheading">Select the amenities available and describe your property</p>

        <div className="form-group">
          <label>Select Amenities</label>
          <div className="amenities-grid">
            {availableAmenities.map(amenity => (
              <button
                key={amenity.id}
                type="button"
                className={`amenity-btn ${formData.amenities.includes(amenity.id) ? 'active' : ''}`}
                onClick={() => toggleAmenity(amenity.id)}
              >
                <span className="amenity-icon">{amenity.icon}</span>
                <span className="amenity-label">{amenity.label}</span>
                {formData.amenities.includes(amenity.id) && (
                  <span className="check-icon">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Property Description <span className="required">*</span></label>
          <textarea
            placeholder="Describe your property in detail (minimum 100 characters required). Mention unique features, nearby landmarks, connectivity, etc. Note: Mobile numbers and email addresses are not allowed."
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={5}
            className={errors.description ? 'error' : ''}
          />
          <span className="char-count">
            Characters: {(formData.description || '').length}/1000 (min: 100)
          </span>
          {errors.description && <span className="error-text">{errors.description}</span>}
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="step-content">
      <h3 className="step-heading">Upload Photos, Video & Brochure</h3>
      <p className="step-subheading">Add up to 10 high-quality photos, optional video and brochure</p>

      {/* ===== TOP: Image / Video / Brochure upload boxes (no scroll needed to reach) ===== */}
      <div className="media-upload-row">
        {/* Images */}
        <div 
          className={`upload-zone media-upload ${errors.images ? 'error' : ''}`}
          onClick={() => imagesRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload Images"
        >
          <input
            ref={imagesRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <div className="upload-content">
            <div className="upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h4>Upload Photos</h4>
            <p>JPG, PNG, WEBP — Max 5MB each</p>
          </div>
        </div>

        {/* Video */}
        <div 
          className={`upload-zone media-upload ${errors.video ? 'error' : ''}`}
          onClick={() => videoRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload Video"
        >
          <input
            ref={videoRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/ogg"
            onChange={handleVideoUpload}
            style={{ display: 'none' }}
          />
          <div className="upload-content">
            <div className="upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M23 7v10a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h18a2 2 0 012 2zM10 8l6 4-6 4V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h4>Upload Video (Optional)</h4>
            <p>MP4, WEBM, MOV — Max 50MB</p>
            {errors.video && <span className="error-text small">{errors.video}</span>}
          </div>
        </div>

        {/* Brochure */}
        <div 
          className={`upload-zone media-upload ${errors.brochure ? 'error' : ''}`}
          onClick={() => brochureRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload Brochure"
        >
          <input
            ref={brochureRef}
            type="file"
            accept="application/pdf"
            onChange={handleBrochureUpload}
            style={{ display: 'none' }}
          />
          <div className="upload-content">
            <div className="upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h4>Upload Brochure (PDF)</h4>
            <p>PDF — Max 10MB</p>
            {errors.brochure && <span className="error-text small">{errors.brochure}</span>}
          </div>
        </div>
      </div>

      {/* ===== previews: Video and Brochure appear BEFORE images preview grid so user sees them without scrolling ===== */}
      <div className="media-preview-row">
        {formData.video && (
          <div className="video-preview-card preview-item media-card">
            <video controls src={formData.video.url} className="video-player" />
            <div className="media-card-footer">
              <div className="media-info">
                <strong>{formData.video.name}</strong>
                <span className="media-size">{Math.round(formData.video.size / 1024 / 1024 * 100) / 100} MB</span>
              </div>
              <div className="media-actions">
                <button type="button" className="remove-btn small" onClick={removeVideo} aria-label="Remove video">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {formData.brochure && (
          <div className="brochure-preview-card preview-item media-card">
            <div className="brochure-card">
              <div className="pdf-icon">📄</div>
              <div className="brochure-info">
                <strong className="brochure-name">{formData.brochure.name}</strong>
                <span className="media-size">{Math.round(formData.brochure.size / 1024) } KB</span>
              </div>
              <div className="media-actions">
                <button type="button" className="remove-btn small" onClick={removeBrochure} aria-label="Remove brochure">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Images preview grid with validation status */}
      {errors.images && <span className="error-text center">{errors.images}</span>}

      {formData.images?.length > 0 && (
        <div className="image-preview-section">
          <div className="preview-header">
            <span>Uploaded Photos ({formData.images.length}/10)</span>
            <div>
              <button 
                type="button" 
                className="add-more-btn"
                onClick={() => imagesRef.current?.click()}
                disabled={isCheckingImages}
              >
                + Add More
              </button>
            </div>
          </div>
          <div className="image-preview-grid">
            {formData.images.map((src, idx) => {
              const validationStatus = imageValidationStatus[idx] || { status: 'pending', errorMessage: '' };
              
              return (
                <div key={idx} className={`preview-item image-validation-item ${validationStatus.status}`}>
                  <img src={src} alt={`Preview ${idx + 1}`} />
                  {idx === 0 && <span className="cover-badge">Cover</span>}
                  
                  {/* Validation Overlays */}
                  {validationStatus.status === 'checking' && (
                    <div className="validation-overlay checking-overlay">
                      <div className="overlay-content">
                        <div className="spinner"></div>
                        <p className="status-message-text">Checking...</p>
                      </div>
                    </div>
                  )}
                  
                  {validationStatus.status === 'approved' && (
                    <div className="validation-overlay approved-overlay">
                      <div className="overlay-content">
                        <svg className="checkmark" width="32" height="32" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <p className="approved-text">Approved</p>
                      </div>
                    </div>
                  )}
                  
                  {validationStatus.status === 'rejected' && (
                    <div className="validation-overlay rejected-overlay">
                      <div className="overlay-content">
                        <svg className="x-icon" width="32" height="32" viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                        <p className="rejected-title">REJECTED</p>
                        <p className="rejected-message">{validationStatus.errorMessage || 'Image rejected'}</p>
                        <button
                          type="button"
                          className="remove-rejected-btn"
                          onClick={() => !isRestrictedEdit && removeImage(idx)}
                          disabled={isRestrictedEdit}
                        >
                          Remove & Try Again
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  {validationStatus.status === 'approved' && (
                    <div className="status-badge approved-badge">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                  
                  {validationStatus.status === 'rejected' && (
                    <div className="status-badge rejected-badge">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                  )}
                  
                  {/* Remove Button - ALWAYS visible (except when checking) */}
                  {validationStatus.status !== 'checking' && (
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => !isRestrictedEdit && removeImage(idx)}
                      disabled={isRestrictedEdit}
                      title="Remove image"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Warning if rejected images exist */}
          {imageValidationStatus.some(img => img.status === 'rejected') && (
            <div className="image-validation-warning">
              <strong>⚠️ Remove rejected images to continue</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                {imageValidationStatus.filter(img => img.status === 'rejected').length} image(s) were rejected. 
                Please remove them and upload valid property images only.
              </p>
            </div>
          )}
          
          {/* Success message if all approved */}
          {imageValidationStatus.length > 0 && 
           imageValidationStatus.every(img => img.status === 'approved') && 
           !isCheckingImages && (
            <div className="image-validation-success" style={{
              background: '#e8f5e9',
              color: '#2e7d32',
              padding: '12px',
              borderRadius: '4px',
              marginTop: '16px',
              fontSize: '14px',
              border: '1px solid #4CAF50',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>✅</span>
              <span>All images approved! Proceeding to next step...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="step-content">
      <h3 className="step-heading">Pricing Details</h3>
      <p className="step-subheading">Set the right price for your property</p>

      <div className="form-group">
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
        {errors.price && <span className="error-text">{errors.price}</span>}
      </div>

      <div className="form-group">
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
          <div className="form-group">
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
            {formData.depositAmount && (
              <span className="price-words">
                {formatPriceInWords(formData.depositAmount)}
              </span>
            )}
          </div>

          <div className="form-group">
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
            {formData.maintenanceCharges && (
              <span className="price-words">
                {formatPriceInWords(formData.maintenanceCharges)}
              </span>
            )}
          </div>
        </div>
      )}

      {formData.status === 'sale' && (
        <div className="form-group">
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
          {formData.maintenanceCharges && (
            <span className="price-words">
              {formatPriceInWords(formData.maintenanceCharges)}
            </span>
          )}
        </div>
      )}  

      <div className="listing-summary">
        <h4>Listing Summary</h4>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Property</span>
            <span className="summary-value">{formData.title || '-'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Type</span>
            <span className="summary-value">{formData.propertyType || '-'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Location</span>
            <span className="summary-value">{formData.location || '-'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Configuration</span>
            <span className="summary-value">
              {formData.bedrooms ? `${formData.bedrooms} BHK` : '-'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Area</span>
            <span className="summary-value">
              {formData.area ? `${formData.area} sq.ft` : '-'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Photos</span>
            <span className="summary-value">
              {formData.images?.length || 0} uploaded
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Video</span>
            <span className="summary-value">{formData.video ? formData.video.name : '—'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Brochure</span>
            <span className="summary-value">{formData.brochure ? formData.brochure.name : '—'}</span>
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
    <div className="popup-overlay" onClick={(e) => e.target.classList.contains('popup-overlay') && onClose()}>
      
      {/* 24-Hour Edit Notice Modal */}
      {showEditNoticeModal && (
        <div className="popup-overlay" style={{ zIndex: 10001 }}>
          <div className="popup-container" style={{ maxWidth: '500px', padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ color: 'white' }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1a1a1a' }}>
                Property Published Successfully!
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: '1.6', marginBottom: '0.5rem', color: '#333' }}>
                You can edit this property only within <strong style={{ color: '#667eea' }}>24 hours</strong> of creation.
              </p>
              <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                After 24 hours, you'll only be able to edit the title and price.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
              <button 
                className="next-btn" 
                onClick={() => {
                  setShowEditNoticeModal(false);
                  onClose();
                }}
                style={{ minWidth: '150px' }}
              >
                Got it
              </button>
            </div>

            <button 
              className="close-btn" 
              onClick={() => {
                setShowEditNoticeModal(false);
                onClose();
              }} 
              aria-label="Close"
              style={{ position: 'absolute', top: '1rem', right: '1rem' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Popup - Only show if edit notice not shown */}
      {!showEditNoticeModal && (
      <div className="popup-container" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="popup-header">
          <h2>{editIndex !== null ? 'Edit Property' : 'List Your Property'}</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Form Content */}
        <div className="popup-body" ref={popupBodyRef}>
          {renderCurrentStep()}
        </div>

        {/* Footer */}
        <div className="popup-footer">
          {currentStep > 1 && (
            <button type="button" className="back-btn" onClick={handleBack}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Back
            </button>
          )}
          
          <div className="footer-right">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            
            {currentStep < 5 ? (
              <button type="button" className="next-btn" onClick={handleNext}>
                Next
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            ) : (
              <button 
                type="button" 
                className="submit-btn" 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner"></span>
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
      )}
    </div>
  );
}
