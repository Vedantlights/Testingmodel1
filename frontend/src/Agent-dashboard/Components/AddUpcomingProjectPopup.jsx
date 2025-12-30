// src/components/AddUpcomingProjectPopup.jsx
import React, { useState, useRef, useEffect } from "react";
import { useProperty } from "./PropertyContext";
import { sellerPropertiesAPI, authAPI } from "../../services/api.service";
import LocationPicker from "../../components/Map/LocationPicker";
import LocationAutoSuggest from "../../components/LocationAutoSuggest";
import StateAutoSuggest from "../../components/StateAutoSuggest";
import "../styles/AddPropertyPopup.css";

const STEPS = [
  { id: 1, title: "Basic Info", icon: "📝" },
  { id: 2, title: "Location", icon: "📍" },
  { id: 3, title: "Configuration", icon: "🏗️" },
  { id: 4, title: "Pricing & Timeline", icon: "💰" },
  { id: 5, title: "Amenities", icon: "✨" },
  { id: 6, title: "Legal & Approval", icon: "⚖️" },
  { id: 7, title: "Media", icon: "📷" },
  { id: 8, title: "Contact & Sales", icon: "📞" },
  { id: 9, title: "Marketing", icon: "📢" },
  { id: 10, title: "Preview", icon: "👁️" }
];

const PROJECT_TYPES = [
  { value: "Apartment", icon: "🏢" },
  { value: "Villa", icon: "🏡" },
  { value: "Plot", icon: "📐" },
  { value: "Commercial", icon: "🏢" }
];

const PROJECT_STATUS_OPTIONS = [
  { value: "Upcoming", label: "Upcoming" },
  { value: "Pre-Launch", label: "Pre-Launch" }
];

const CONFIGURATION_OPTIONS = [
  "1 BHK", "2 BHK", "3 BHK", "4 BHK", "5+ BHK", "Villa", "Plot"
];

const AMENITIES = [
  { id: "lift", label: "Lift", icon: "🛗" },
  { id: "parking", label: "Parking", icon: "🚗" },
  { id: "power_backup", label: "Power Backup", icon: "⚡" },
  { id: "garden", label: "Garden / Open Space", icon: "🌳" },
  { id: "gym", label: "Gym", icon: "🏋️" },
  { id: "swimming_pool", label: "Swimming Pool", icon: "🏊" },
  { id: "play_area", label: "Children Play Area", icon: "🎢" },
  { id: "clubhouse", label: "Club House", icon: "🏛️" },
  { id: "security", label: "Security / CCTV", icon: "👮" }
];

const RERA_STATUS_OPTIONS = [
  { value: "Applied", label: "Applied" },
  { value: "Approved", label: "Approved" }
];

const LAND_OWNERSHIP_OPTIONS = [
  "Freehold", "Leasehold", "Power of Attorney", "Co-operative Society"
];

export default function AddUpcomingProjectPopup({ onClose }) {
  const { addProperty } = useProperty();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [errors, setErrors] = useState({});
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [builderName, setBuilderName] = useState('');
  const imagesRef = useRef();
  const floorPlansRef = useRef();
  const brochureRef = useRef();
  const masterPlanRef = useRef();
  const popupBodyRef = useRef(null);

  // Get builder name from logged-in user
  useEffect(() => {
    const user = authAPI.getUser();
    if (user && user.full_name) {
      setBuilderName(user.full_name);
    }
  }, []);

  const [formData, setFormData] = useState({
    // Step 1: Basic Project Information
    projectName: "",
    builderName: "",
    projectType: "",
    projectStatus: "Upcoming",
    reraNumber: "",
    description: "",
    
    // Step 2: Location Details
    city: "",
    area: "",
    fullAddress: "",
    latitude: "",
    longitude: "",
    state: "",
    pincode: "",
    mapLink: "",
    
    // Step 3: Configuration & Inventory
    configurations: [],
    carpetAreaRange: "",
    numberOfTowers: "",
    totalUnits: "",
    floorsCount: "",
    
    // Step 4: Pricing & Timeline
    startingPrice: "",
    pricePerSqft: "",
    bookingAmount: "",
    expectedLaunchDate: "",
    expectedPossessionDate: "",
    
    // Step 5: Amenities
    amenities: [],
    
    // Step 6: Legal & Approval
    reraStatus: "",
    landOwnershipType: "",
    bankApproved: "",
    
    // Step 7: Media
    coverImage: null,
    projectImages: [],
    floorPlans: [],
    brochure: null,
    masterPlan: null,
    
    // Step 8: Contact & Sales
    salesContactName: "",
    mobileNumber: "",
    emailId: "",
    siteVisitAvailable: "Yes",
    preferredContactTime: "",
    
    // Step 9: Marketing
    projectHighlights: "",
    usp: ""
  });

  // Close on escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (formData.projectImages) {
        formData.projectImages.forEach(img => {
          if (typeof img === 'string' && img.startsWith('blob:')) {
            URL.revokeObjectURL(img);
          }
        });
      }
    };
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const toggleConfiguration = (config) => {
    setFormData(prev => ({
      ...prev,
      configurations: prev.configurations.includes(config)
        ? prev.configurations.filter(c => c !== config)
        : [...prev.configurations, config]
    }));
  };

  const toggleAmenity = (amenityId) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(a => a !== amenityId)
        : [...prev.amenities, amenityId]
    }));
  };

  const handleLocationSelect = (locationData) => {
    setFormData(prev => ({
      ...prev,
      latitude: locationData.latitude.toString(),
      longitude: locationData.longitude.toString(),
      fullAddress: locationData.fullAddress || prev.fullAddress
    }));
    setShowLocationPicker(false);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const currentCount = formData.projectImages?.length || 0;
    if (currentCount + files.length > 20) {
      setErrors(prev => ({ 
        ...prev, 
        projectImages: `Maximum 20 photos allowed. You have ${currentCount} and trying to add ${files.length}` 
      }));
      return;
    }
    
    setImageFiles(prev => [...prev, ...files].slice(0, 20));
    const newImages = files.map(f => URL.createObjectURL(f));
    setFormData(prev => ({
      ...prev,
      projectImages: [...(prev.projectImages || []), ...newImages].slice(0, 20)
    }));
    
    if (errors.projectImages) {
      setErrors(prev => ({ ...prev, projectImages: null }));
    }
  };

  const removeImage = (idx) => {
    const imageToRemove = formData.projectImages[idx];
    if (imageToRemove && imageToRemove.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove);
      const blobUrlsBefore = formData.projectImages.slice(0, idx).filter(img => img.startsWith('blob:'));
      const fileIndex = blobUrlsBefore.length;
      setImageFiles(prev => prev.filter((_, i) => i !== fileIndex));
    }
    
    setFormData(prev => ({
      ...prev,
      projectImages: prev.projectImages.filter((_, i) => i !== idx)
    }));
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.projectName?.trim()) newErrors.projectName = "Project name is required";
        if (!formData.projectType) newErrors.projectType = "Project type is required";
        if (!formData.projectStatus) newErrors.projectStatus = "Project status is required";
        if (!formData.description?.trim()) newErrors.description = "Project description is required";
        break;
      case 2:
        if (!formData.city?.trim()) newErrors.city = "City is required";
        if (!formData.area?.trim()) newErrors.area = "Area/Locality is required";
        if (!formData.fullAddress?.trim()) newErrors.fullAddress = "Full address is required";
        break;
      case 3:
        if (formData.configurations.length === 0) newErrors.configurations = "At least one configuration is required";
        if (!formData.carpetAreaRange?.trim()) newErrors.carpetAreaRange = "Carpet area range is required";
        break;
      case 4:
        if (!formData.startingPrice?.trim()) newErrors.startingPrice = "Starting price is required";
        break;
      case 7:
        if (formData.projectImages.length === 0) newErrors.projectImages = "At least one project image is required";
        break;
      case 8:
        if (!formData.salesContactName?.trim()) newErrors.salesContactName = "Sales contact name is required";
        if (!formData.mobileNumber?.trim()) newErrors.mobileNumber = "Mobile number is required";
        if (!formData.emailId?.trim()) newErrors.emailId = "Email ID is required";
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 10));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const isStepCompleted = (stepId) => {
    return currentStep > stepId;
  };

  const handleStepClick = (stepId) => {
    if (stepId === currentStep) return;
    if (stepId < currentStep) {
      setCurrentStep(stepId);
    }
  };

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
      // Convert form data to property format
      // Extract numeric price value from string (e.g., "₹45 Lakhs onwards" -> 4500000)
      let priceValue = 0;
      if (formData.startingPrice) {
        const priceStr = formData.startingPrice.replace(/[^\d.]/g, '');
        priceValue = parseFloat(priceStr) || 0;
        // If the string contains "lakh" or "lac", multiply by 100000
        if (formData.startingPrice.toLowerCase().includes('lakh') || formData.startingPrice.toLowerCase().includes('lac')) {
          priceValue = priceValue * 100000;
        } else if (formData.startingPrice.toLowerCase().includes('crore') || formData.startingPrice.toLowerCase().includes('cr')) {
          priceValue = priceValue * 10000000;
        }
      }
      
      const propertyData = {
        title: formData.projectName,
        property_type: formData.projectType,
        status: "sale", // Upcoming projects are always for sale
        location: formData.area ? `${formData.area}, ${formData.city}` : formData.city,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        state: formData.state || null,
        additional_address: formData.fullAddress || null,
        description: formData.description,
        price: priceValue,
        area: 0, // Required field, set default for upcoming projects
        project_type: "upcoming", // CRITICAL FLAG
        // Additional upcoming project fields stored as JSON
        upcoming_project_data: {
          builderName: formData.builderName || builderName,
          projectStatus: formData.projectStatus,
          reraNumber: formData.reraNumber || null,
          configurations: formData.configurations,
          carpetAreaRange: formData.carpetAreaRange || null,
          numberOfTowers: formData.numberOfTowers || null,
          totalUnits: formData.totalUnits || null,
          floorsCount: formData.floorsCount || null,
          pricePerSqft: formData.pricePerSqft || null,
          bookingAmount: formData.bookingAmount || null,
          expectedLaunchDate: formData.expectedLaunchDate || null,
          expectedPossessionDate: formData.expectedPossessionDate || null,
          reraStatus: formData.reraStatus || null,
          landOwnershipType: formData.landOwnershipType || null,
          bankApproved: formData.bankApproved || null,
          salesContactName: formData.salesContactName || null,
          mobileNumber: formData.mobileNumber || null,
          emailId: formData.emailId || null,
          siteVisitAvailable: formData.siteVisitAvailable || null,
          preferredContactTime: formData.preferredContactTime || null,
          projectHighlights: formData.projectHighlights || null,
          usp: formData.usp || null,
          pincode: formData.pincode || null,
          mapLink: formData.mapLink || null
        },
        images: [],
        amenities: formData.amenities || []
      };

      // Create property first to get ID
      let createdProperty;
      try {
        createdProperty = await addProperty(propertyData);
      } catch (error) {
        console.error('Property creation failed:', error);
        throw new Error('Failed to create project. Please try again.');
      }
      
      if (!createdProperty || !createdProperty.id) {
        throw new Error('Failed to get project ID after creation.');
      }
      
      const propertyId = createdProperty.id;
      
      // Upload images with moderation
      if (imageFiles.length > 0) {
        setUploadingImages(true);
        try {
          const uploadPromises = imageFiles.map(async (file) => {
            try {
              const response = await sellerPropertiesAPI.uploadImage(file, propertyId);
              if (response.success && response.data && response.data.url) {
                return { success: true, url: response.data.url };
              }
              return { success: false, error: response.message || 'Upload failed' };
            } catch (error) {
              return { success: false, error: error.message || 'Upload failed' };
            }
          });
          
          const results = await Promise.all(uploadPromises);
          const failed = results.filter(r => !r.success);
          
          if (failed.length > 0) {
            console.warn(`${failed.length} images failed to upload`);
          }
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
        }
      }
      
      setUploadingImages(false);
      alert('Upcoming project published successfully! It is now visible to buyers.');
      onClose();
    } catch (error) {
      console.error('Project save error:', error);
      alert(error.message || 'Failed to save project. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadingImages(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="step-indicator">
      {STEPS.map((step, idx) => {
        const isCompleted = isStepCompleted(step.id);
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

  // Step 1: Basic Project Information
  const renderStep1 = () => (
    <div className="step-content">
      <h3 className="step-heading">Basic Project Information</h3>
      <p className="step-subheading">Let's start with the basic details of your upcoming project</p>

      <div className="form-group">
        <label>Project Name <span className="required">*</span></label>
        <input
          type="text"
          value={formData.projectName}
          onChange={(e) => handleChange('projectName', e.target.value)}
          placeholder="e.g., Green Valley Residency"
          className={errors.projectName ? 'error' : ''}
        />
        {errors.projectName && <span className="error-text">{errors.projectName}</span>}
      </div>

      <div className="form-group">
        <label>Builder / Developer Name</label>
        <input
          type="text"
          value={formData.builderName || builderName}
          onChange={(e) => handleChange('builderName', e.target.value)}
          placeholder="Auto-filled from your account"
          disabled
          style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
        />
      </div>

      <div className="form-group">
        <label>Project Type <span className="required">*</span></label>
        <div className="property-type-grid">
          {PROJECT_TYPES.map(type => (
            <button
              key={type.value}
              type="button"
              className={`property-type-btn ${formData.projectType === type.value ? 'active' : ''}`}
              onClick={() => handleChange('projectType', type.value)}
            >
              <span className="type-icon">{type.icon}</span>
              <span className="type-label">{type.value}</span>
            </button>
          ))}
        </div>
        {errors.projectType && <span className="error-text">{errors.projectType}</span>}
      </div>

      <div className="form-group">
        <label>Project Status <span className="required">*</span></label>
        <select
          value={formData.projectStatus}
          onChange={(e) => handleChange('projectStatus', e.target.value)}
          className={errors.projectStatus ? 'error' : ''}
        >
          {PROJECT_STATUS_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {errors.projectStatus && <span className="error-text">{errors.projectStatus}</span>}
      </div>

      <div className="form-group">
        <label>RERA Number (Optional but recommended)</label>
        <input
          type="text"
          value={formData.reraNumber}
          onChange={(e) => handleChange('reraNumber', e.target.value)}
          placeholder="e.g., RERA/PKR/2019/001234"
        />
      </div>

      <div className="form-group">
        <label>Project Description <span className="required">*</span></label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Provide a short overview of your project (500-1000 characters)"
          rows={6}
          maxLength={1000}
          className={errors.description ? 'error' : ''}
        />
        <div className="char-count">{formData.description.length}/1000</div>
        {errors.description && <span className="error-text">{errors.description}</span>}
      </div>
    </div>
  );

  // Step 2: Location Details
  const renderStep2 = () => (
    <div className="step-content">
      <h3 className="step-heading">Location Details</h3>
      <p className="step-subheading">Where is your project located?</p>

      <div className="form-group">
        <label>City <span className="required">*</span></label>
        <LocationAutoSuggest
          value={formData.city}
          onChange={(value) => handleChange('city', value)}
          placeholder="Enter city"
        />
        {errors.city && <span className="error-text">{errors.city}</span>}
      </div>

      <div className="form-group">
        <label>Area / Locality <span className="required">*</span></label>
        <input
          type="text"
          value={formData.area}
          onChange={(e) => handleChange('area', e.target.value)}
          placeholder="e.g., Sector 62, Noida"
          className={errors.area ? 'error' : ''}
        />
        {errors.area && <span className="error-text">{errors.area}</span>}
      </div>

      <div className="form-group">
        <label>Full Address <span className="required">*</span></label>
        <textarea
          value={formData.fullAddress}
          onChange={(e) => handleChange('fullAddress', e.target.value)}
          placeholder="Complete address with landmark"
          rows={3}
          className={errors.fullAddress ? 'error' : ''}
        />
        {errors.fullAddress && <span className="error-text">{errors.fullAddress}</span>}
      </div>

      <div className="form-group">
        <label>State</label>
        <StateAutoSuggest
          value={formData.state}
          onChange={(value) => handleChange('state', value)}
          placeholder="Select state"
        />
      </div>

      <div className="form-group">
        <label>Pincode</label>
        <input
          type="text"
          value={formData.pincode}
          onChange={(e) => handleChange('pincode', e.target.value.replace(/\D/g, ''))}
          placeholder="Enter pincode"
          maxLength={6}
        />
      </div>

      <div className="form-group">
        <label>Google Map Location</label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="cancel-btn"
            onClick={() => setShowLocationPicker(true)}
            style={{ background: 'white', border: '2px solid var(--border-color)' }}
          >
            📍 Pick on Map
          </button>
          <input
            type="text"
            value={formData.mapLink}
            onChange={(e) => handleChange('mapLink', e.target.value)}
            placeholder="Or paste Google Maps link"
            style={{ flex: 1 }}
          />
        </div>
      </div>
    </div>
  );

  // Step 3: Configuration & Inventory
  const renderStep3 = () => (
    <div className="step-content">
      <h3 className="step-heading">Configuration & Inventory Details</h3>
      <p className="step-subheading">Tell us about the property configurations available</p>

      <div className="form-group">
        <label>Property Configurations <span className="required">*</span></label>
        <div className="amenities-grid">
          {CONFIGURATION_OPTIONS.map(config => (
            <button
              key={config}
              type="button"
              className={`amenity-btn ${formData.configurations.includes(config) ? 'active' : ''}`}
              onClick={() => toggleConfiguration(config)}
            >
              {config}
            </button>
          ))}
        </div>
        {errors.configurations && <span className="error-text">{errors.configurations}</span>}
      </div>

      <div className="form-group">
        <label>Carpet Area Range <span className="required">*</span></label>
        <input
          type="text"
          value={formData.carpetAreaRange}
          onChange={(e) => handleChange('carpetAreaRange', e.target.value)}
          placeholder="e.g., 650 - 1200 sq.ft"
          className={errors.carpetAreaRange ? 'error' : ''}
        />
        {errors.carpetAreaRange && <span className="error-text">{errors.carpetAreaRange}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Number of Towers / Buildings</label>
          <input
            type="number"
            value={formData.numberOfTowers}
            onChange={(e) => handleChange('numberOfTowers', e.target.value)}
            placeholder="e.g., 3"
            min="1"
          />
        </div>

        <div className="form-group">
          <label>Total Units</label>
          <input
            type="number"
            value={formData.totalUnits}
            onChange={(e) => handleChange('totalUnits', e.target.value)}
            placeholder="e.g., 200"
            min="1"
          />
        </div>
      </div>

      <div className="form-group">
        <label>Floors Count</label>
        <input
          type="number"
          value={formData.floorsCount}
          onChange={(e) => handleChange('floorsCount', e.target.value)}
          placeholder="e.g., 15"
          min="1"
        />
      </div>
    </div>
  );

  // Step 4: Pricing & Timeline
  const renderStep4 = () => (
    <div className="step-content">
      <h3 className="step-heading">Pricing & Timeline</h3>
      <p className="step-subheading">Approximate values are allowed for upcoming projects</p>

      <div className="form-group">
        <label>Starting Price <span className="required">*</span></label>
        <input
          type="text"
          value={formData.startingPrice}
          onChange={(e) => handleChange('startingPrice', e.target.value)}
          placeholder="e.g., ₹45 Lakhs onwards"
          className={errors.startingPrice ? 'error' : ''}
        />
        {errors.startingPrice && <span className="error-text">{errors.startingPrice}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Price per Sq.ft (Optional)</label>
          <input
            type="text"
            value={formData.pricePerSqft}
            onChange={(e) => handleChange('pricePerSqft', e.target.value)}
            placeholder="e.g., ₹5000/sq.ft"
          />
        </div>

        <div className="form-group">
          <label>Booking Amount (Optional)</label>
          <input
            type="text"
            value={formData.bookingAmount}
            onChange={(e) => handleChange('bookingAmount', e.target.value)}
            placeholder="e.g., ₹2 Lakhs"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Expected Launch Date</label>
          <input
            type="date"
            value={formData.expectedLaunchDate}
            onChange={(e) => handleChange('expectedLaunchDate', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Expected Possession Date</label>
          <input
            type="date"
            value={formData.expectedPossessionDate}
            onChange={(e) => handleChange('expectedPossessionDate', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  // Step 5: Amenities
  const renderStep5 = () => (
    <div className="step-content">
      <h3 className="step-heading">Amenities</h3>
      <p className="step-subheading">Select the amenities your project will offer</p>

      <div className="amenities-grid">
        {AMENITIES.map(amenity => (
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
  );

  // Step 6: Legal & Approval
  const renderStep6 = () => (
    <div className="step-content">
      <h3 className="step-heading">Legal & Approval Information</h3>
      <p className="step-subheading">Provide legal and approval details</p>

      <div className="form-group">
        <label>RERA Status</label>
        <select
          value={formData.reraStatus}
          onChange={(e) => handleChange('reraStatus', e.target.value)}
        >
          <option value="">Select RERA Status</option>
          {RERA_STATUS_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Land Ownership Type</label>
        <select
          value={formData.landOwnershipType}
          onChange={(e) => handleChange('landOwnershipType', e.target.value)}
        >
          <option value="">Select Ownership Type</option>
          {LAND_OWNERSHIP_OPTIONS.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Bank Approved</label>
        <select
          value={formData.bankApproved}
          onChange={(e) => handleChange('bankApproved', e.target.value)}
        >
          <option value="">Select</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>
    </div>
  );

  // Step 7: Media Uploads
  const renderStep7 = () => (
    <div className="step-content">
      <h3 className="step-heading">Media Uploads</h3>
      <p className="step-subheading">Upload project images, floor plans, and brochures (Concept images and 3D renders allowed)</p>

      <div className="form-group">
        <label>Project Cover Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const url = URL.createObjectURL(file);
              handleChange('coverImage', { file, url });
            }
          }}
        />
        {formData.coverImage && (
          <div style={{ marginTop: '10px' }}>
            <img src={formData.coverImage.url} alt="Cover" style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px' }} />
          </div>
        )}
      </div>

      <div className="form-group">
        <label>Project Images <span className="required">*</span> (Concept images / 3D renders allowed)</label>
        <input
          ref={imagesRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="cancel-btn"
          onClick={() => imagesRef.current?.click()}
          style={{ background: 'white', border: '2px solid var(--border-color)' }}
        >
          📷 Upload Images (Max 20)
        </button>
        {errors.projectImages && <span className="error-text">{errors.projectImages}</span>}
        
        <div className="image-preview-grid" style={{ marginTop: '15px' }}>
          {formData.projectImages.map((img, idx) => (
            <div key={idx} className="preview-item">
              <img src={img} alt={`Project ${idx + 1}`} />
              <button
                type="button"
                className="remove-btn"
                onClick={() => removeImage(idx)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Floor Plans (PDF / Images)</label>
        <input
          ref={floorPlansRef}
          type="file"
          accept=".pdf,image/*"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            const fileObjects = files.map(f => ({ file: f, name: f.name }));
            handleChange('floorPlans', [...(formData.floorPlans || []), ...fileObjects]);
          }}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="cancel-btn"
          onClick={() => floorPlansRef.current?.click()}
          style={{ background: 'white', border: '2px solid var(--border-color)' }}
        >
          📄 Upload Floor Plans
        </button>
      </div>

      <div className="form-group">
        <label>Brochure (PDF)</label>
        <input
          ref={brochureRef}
          type="file"
          accept=".pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleChange('brochure', { file, name: file.name });
            }
          }}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="cancel-btn"
          onClick={() => brochureRef.current?.click()}
          style={{ background: 'white', border: '2px solid var(--border-color)' }}
        >
          📑 Upload Brochure
        </button>
        {formData.brochure && <div style={{ marginTop: '10px' }}>📄 {formData.brochure.name}</div>}
      </div>

      <div className="form-group">
        <label>Master Plan Image</label>
        <input
          ref={masterPlanRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const url = URL.createObjectURL(file);
              handleChange('masterPlan', { file, url });
            }
          }}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="cancel-btn"
          onClick={() => masterPlanRef.current?.click()}
          style={{ background: 'white', border: '2px solid var(--border-color)' }}
        >
          🗺️ Upload Master Plan
        </button>
        {formData.masterPlan && (
          <div style={{ marginTop: '10px' }}>
            <img src={formData.masterPlan.url} alt="Master Plan" style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px' }} />
          </div>
        )}
      </div>
    </div>
  );

  // Step 8: Contact & Sales
  const renderStep8 = () => (
    <div className="step-content">
      <h3 className="step-heading">Contact & Sales Information</h3>
      <p className="step-subheading">How can buyers reach you?</p>

      <div className="form-group">
        <label>Sales Contact Name <span className="required">*</span></label>
        <input
          type="text"
          value={formData.salesContactName}
          onChange={(e) => handleChange('salesContactName', e.target.value)}
          placeholder="Enter contact person name"
          className={errors.salesContactName ? 'error' : ''}
        />
        {errors.salesContactName && <span className="error-text">{errors.salesContactName}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Mobile Number <span className="required">*</span></label>
          <input
            type="tel"
            value={formData.mobileNumber}
            onChange={(e) => handleChange('mobileNumber', e.target.value.replace(/\D/g, ''))}
            placeholder="Enter mobile number"
            maxLength={10}
            className={errors.mobileNumber ? 'error' : ''}
          />
          {errors.mobileNumber && <span className="error-text">{errors.mobileNumber}</span>}
        </div>

        <div className="form-group">
          <label>Email ID <span className="required">*</span></label>
          <input
            type="email"
            value={formData.emailId}
            onChange={(e) => handleChange('emailId', e.target.value)}
            placeholder="Enter email address"
            className={errors.emailId ? 'error' : ''}
          />
          {errors.emailId && <span className="error-text">{errors.emailId}</span>}
        </div>
      </div>

      <div className="form-group">
        <label>Site Visit Available</label>
        <select
          value={formData.siteVisitAvailable}
          onChange={(e) => handleChange('siteVisitAvailable', e.target.value)}
        >
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>

      <div className="form-group">
        <label>Preferred Contact Time</label>
        <input
          type="text"
          value={formData.preferredContactTime}
          onChange={(e) => handleChange('preferredContactTime', e.target.value)}
          placeholder="e.g., 10 AM - 7 PM"
        />
      </div>
    </div>
  );

  // Step 9: Marketing Highlights
  const renderStep9 = () => (
    <div className="step-content">
      <h3 className="step-heading">Marketing Highlights</h3>
      <p className="step-subheading">What makes your project special? (Optional but recommended)</p>

      <div className="form-group">
        <label>Project Highlights</label>
        <textarea
          value={formData.projectHighlights}
          onChange={(e) => handleChange('projectHighlights', e.target.value)}
          placeholder="e.g., Near Metro Station, Sea View, Golf Course Nearby"
          rows={4}
        />
      </div>

      <div className="form-group">
        <label>USP (Unique Selling Points)</label>
        <textarea
          value={formData.usp}
          onChange={(e) => handleChange('usp', e.target.value)}
          placeholder="What makes your project unique?"
          rows={4}
        />
      </div>
    </div>
  );

  // Step 10: Preview
  const renderStep10 = () => (
    <div className="step-content">
      <h3 className="step-heading">Preview & Submit</h3>
      <p className="step-subheading">Review your project details before submitting</p>

      <div className="preview-section">
        <h4>Basic Information</h4>
        <p><strong>Project Name:</strong> {formData.projectName}</p>
        <p><strong>Builder:</strong> {formData.builderName || builderName}</p>
        <p><strong>Project Type:</strong> {formData.projectType}</p>
        <p><strong>Status:</strong> {formData.projectStatus}</p>
        {formData.reraNumber && <p><strong>RERA Number:</strong> {formData.reraNumber}</p>}

        <h4>Location</h4>
        <p><strong>Address:</strong> {formData.fullAddress}</p>
        <p><strong>Area:</strong> {formData.area}, {formData.city}</p>

        <h4>Configuration</h4>
        <p><strong>Configurations:</strong> {formData.configurations.join(', ') || 'None'}</p>
        <p><strong>Carpet Area Range:</strong> {formData.carpetAreaRange}</p>

        <h4>Pricing</h4>
        <p><strong>Starting Price:</strong> {formData.startingPrice}</p>
        {formData.pricePerSqft && <p><strong>Price per Sq.ft:</strong> {formData.pricePerSqft}</p>}

        <h4>Contact</h4>
        <p><strong>Contact Name:</strong> {formData.salesContactName}</p>
        <p><strong>Mobile:</strong> {formData.mobileNumber}</p>
        <p><strong>Email:</strong> {formData.emailId}</p>
      </div>

      <div className="info-box" style={{ marginTop: '20px', padding: '15px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px' }}>
        <p><strong>✅ Ready to Publish:</strong> Your project will be immediately visible to buyers once submitted.</p>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      case 8: return renderStep8();
      case 9: return renderStep9();
      case 10: return renderStep10();
      default: return renderStep1();
    }
  };

  return (
    <>
      <div className="popup-overlay" onClick={(e) => e.target.className === 'popup-overlay' && onClose()}>
        <div className="popup-container" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="popup-header">
            <h2>Add Upcoming Project</h2>
            <button className="close-btn" onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Body */}
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
              
              {currentStep < 10 ? (
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
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Publish Project
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <LocationPicker
          onSelect={handleLocationSelect}
          onClose={() => setShowLocationPicker(false)}
          initialLat={formData.latitude ? parseFloat(formData.latitude) : null}
          initialLng={formData.longitude ? parseFloat(formData.longitude) : null}
        />
      )}
    </>
  );
}
