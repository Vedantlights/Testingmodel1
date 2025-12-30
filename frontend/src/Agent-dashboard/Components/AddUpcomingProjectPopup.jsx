// src/components/AddUpcomingProjectPopup.jsx
import React, { useState, useRef, useEffect } from "react";
import { useProperty } from "./PropertyContext";
import { sellerPropertiesAPI, authAPI } from "../../services/api.service";
import { API_BASE_URL, API_ENDPOINTS } from "../../config/api.config";
import { validateImageFile } from "../../utils/validation";
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
  { value: "UNDER CONSTRUCTION", label: "UNDER CONSTRUCTION" },
  { value: "PRE-LAUNCH", label: "PRE-LAUNCH" },
  { value: "COMPLETED", label: "COMPLETED" }
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

const BANK_OPTIONS = [
  "SBI",
  "HDFC Bank",
  "Kotak Mahindra Bank",
  "ICICI Bank",
  "Axis Bank",
  "Bank of Baroda (BoB)",
  "Other"
];

export default function AddUpcomingProjectPopup({ onClose }) {
  const { addProperty } = useProperty();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [errors, setErrors] = useState({});
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [imageValidationStatus, setImageValidationStatus] = useState([]); // Track validation status for each image
  const [isCheckingImages, setIsCheckingImages] = useState(false);
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
    projectStatus: "UNDER CONSTRUCTION",
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
    approvedBanks: [],
    otherBankName: "",
    
    // Step 7: Media
    coverImage: null,
    projectImages: [],
    floorPlans: [],
    brochure: null,
    masterPlan: null,
    
    // Step 8: Contact & Sales
    salesName: "",
    salesNumber: "",
    emailId: "",
    mobileNumber: "",
    whatsappNumber: "",
    alternativeNumber: "",
    
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

  // Handle carpet area range input - strip sq.ft if user types it, store numeric only
  const handleCarpetAreaChange = (value) => {
    // Remove "sq.ft" if user typed it
    const cleanValue = value.replace(/\s*sq\.ft\s*/gi, '').trim();
    handleChange('carpetAreaRange', cleanValue);
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

  const toggleBank = (bank) => {
    setFormData(prev => ({
      ...prev,
      approvedBanks: (prev.approvedBanks || []).includes(bank)
        ? (prev.approvedBanks || []).filter(b => b !== bank)
        : [...(prev.approvedBanks || []), bank]
    }));
  };

  const handleLocationSelect = (locationData) => {
    setFormData(prev => ({
      ...prev,
      latitude: locationData.latitude.toString(),
      longitude: locationData.longitude.toString(),
      location: locationData.fullAddress || prev.location || prev.area,
      fullAddress: locationData.fullAddress || prev.fullAddress
    }));
    setShowLocationPicker(false);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    const currentCount = formData.projectImages?.length || 0;
    if (currentCount + files.length > 20) {
      setErrors(prev => ({ 
        ...prev, 
        projectImages: `Maximum 20 photos allowed. You have ${currentCount} and trying to add ${files.length}` 
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
          projectImages: fileValidation.message 
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
    setImageFiles(prev => [...prev, ...validFiles].slice(0, 20));
    setImageValidationStatus(prev => [...prev, ...newImageObjects].slice(0, 20));
    
    // Create blob URLs for preview
    const newImages = validFiles.map(f => URL.createObjectURL(f));
    setFormData(prev => ({
      ...prev,
      projectImages: [...(prev.projectImages || []), ...newImages].slice(0, 20)
    }));
    
    // Clear any previous errors
    if (errors.projectImages) {
      setErrors(prev => ({ ...prev, projectImages: null }));
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
      // Use 0 for property ID (validation-only mode for new projects)
      const propertyId = 0;
      
      const formData = new FormData();
      formData.append('image', imageObj.file);
      formData.append('property_id', propertyId);
      formData.append('validate_only', 'true');
      
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
  
  const removeImage = (idx) => {
    // Revoke blob URL to free memory
    if (formData.projectImages && formData.projectImages[idx] && formData.projectImages[idx].startsWith('blob:')) {
      URL.revokeObjectURL(formData.projectImages[idx]);
    }
    
    // Also revoke preview URL from validation status
    if (imageValidationStatus[idx]?.preview && imageValidationStatus[idx].preview.startsWith('blob:')) {
      URL.revokeObjectURL(imageValidationStatus[idx].preview);
    }
    
    setFormData(prev => ({
      ...prev,
      projectImages: prev.projectImages.filter((_, i) => i !== idx)
    }));
    
    // Also remove from imageFiles array
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
    
    // Remove from validation status
    setImageValidationStatus(prev => prev.filter((_, i) => i !== idx));
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
        if (!formData.location?.trim() && !formData.area?.trim()) {
          newErrors.location = "Location is required";
        }
        break;
      case 3:
        if (formData.configurations.length === 0) newErrors.configurations = "At least one configuration is required";
        if (!formData.carpetAreaRange?.trim()) newErrors.carpetAreaRange = "Carpet area range is required";
        break;
      case 4:
        if (!formData.startingPrice?.trim()) newErrors.startingPrice = "Starting price is required";
        break;
      case 7:
        if (formData.projectImages.length === 0) {
          newErrors.projectImages = "At least one project image is required";
        } else {
          // Check if any images are still being validated
          if (isCheckingImages) {
            newErrors.projectImages = "Please wait for all images to be validated";
          }
          // Check if any images were rejected
          const rejectedCount = imageValidationStatus.filter(img => img.status === 'rejected').length;
          if (rejectedCount > 0) {
            newErrors.projectImages = `Please remove ${rejectedCount} rejected image(s) before proceeding`;
          }
          // Check if at least one image is approved
          const approvedCount = imageValidationStatus.filter(img => img.status === 'approved').length;
          if (approvedCount === 0 && imageValidationStatus.length > 0 && !isCheckingImages) {
            newErrors.projectImages = "At least one image must be approved";
          }
        }
        break;
      case 8:
        if (!formData.salesName?.trim()) newErrors.salesName = "Sales name is required";
        if (!formData.salesNumber?.trim()) newErrors.salesNumber = "Sales number is required";
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

  // Format price in words (same as List Property) - handles ranges
  const formatPriceInWords = (price) => {
    if (!price) return '';
    
    // Check if it's a range (contains "-" or "to" or " - ")
    const isRange = /[-–—]|to/i.test(price);
    
    if (isRange) {
      // Split by common range separators
      const rangeParts = price.split(/[-–—]|to/i).map(p => p.trim()).filter(p => p);
      if (rangeParts.length === 2) {
        const startPrice = formatSinglePrice(rangeParts[0]);
        const endPrice = formatSinglePrice(rangeParts[1]);
        if (startPrice && endPrice) {
          return `${startPrice} - ${endPrice}`;
        }
      }
    }
    
    // Single price
    return formatSinglePrice(price);
  };
  
  // Helper function to format a single price value
  const formatSinglePrice = (priceStr) => {
    if (!priceStr) return '';
    // Extract numeric value from string (e.g., "₹45 Lakhs" -> 4500000)
    let num = 0;
    const cleanStr = priceStr.toString().replace(/[^\d.]/g, '');
    num = parseFloat(cleanStr) || 0;
    
    // If the string contains "lakh" or "lac", multiply by 100000
    if (priceStr.toString().toLowerCase().includes('lakh') || priceStr.toString().toLowerCase().includes('lac')) {
      num = num * 100000;
    } else if (priceStr.toString().toLowerCase().includes('crore') || priceStr.toString().toLowerCase().includes('cr')) {
      num = num * 10000000;
    }
    
    if (isNaN(num) || num === 0) return '';
    
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Crore`;
    } else if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} Lakh`;
    } else if (num >= 1000) {
      return `₹${(num / 1000).toFixed(2)} Thousand`;
    }
    return `₹${num}`;
  };

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
      
      // Validate required fields before submission
      if (!priceValue || priceValue <= 0) {
        throw new Error('Starting price is required and must be greater than 0');
      }
      
      const propertyData = {
        title: formData.projectName,
        property_type: formData.projectType,
        status: "sale", // Upcoming projects are always for sale
        location: formData.location || formData.area || '',
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        state: formData.state || null,
        additional_address: formData.fullAddress || null,
        description: formData.description,
        price: priceValue,
        area: 1, // Required field, set minimum value for upcoming projects (1 sq ft as placeholder)
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
          approvedBanks: (() => {
            // Combine selected banks and custom bank names
            const banks = [...(formData.approvedBanks || [])];
            // Remove "Other" from the array as it's just a trigger
            const banksWithoutOther = banks.filter(b => b !== 'Other');
            if (formData.otherBankName && formData.otherBankName.trim()) {
              // Parse comma-separated custom bank names and add them
              const customBanks = formData.otherBankName.split(',').map(b => b.trim()).filter(b => b);
              banksWithoutOther.push(...customBanks);
            }
            return banksWithoutOther;
          })(),
          salesName: formData.salesName || null,
          salesNumber: formData.salesNumber || null,
          emailId: formData.emailId || null,
          mobileNumber: formData.mobileNumber || null,
          whatsappNumber: formData.whatsappNumber || null,
          alternativeNumber: formData.alternativeNumber || null,
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
        console.log('Submitting property data:', propertyData);
        createdProperty = await addProperty(propertyData);
        console.log('Property created successfully:', createdProperty);
      } catch (error) {
        console.error('Property creation failed - Full error:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          errors: error.errors,
          data: error.data,
          response: error.response
        });
        
        // Extract validation errors if available
        let errorMessage = 'Failed to create project. Please try again.';
        
        // Check various error formats
        if (error.message) {
          errorMessage = error.message;
        } else if (error.errors && typeof error.errors === 'object') {
          const errorList = Object.values(error.errors).join(', ');
          errorMessage = `Validation failed: ${errorList}`;
        } else if (error.data?.errors && typeof error.data.errors === 'object') {
          const errorList = Object.values(error.data.errors).join(', ');
          errorMessage = `Validation failed: ${errorList}`;
        } else if (error.data?.message) {
          errorMessage = error.data.message;
        } else if (error.response?.data?.errors) {
          const errorList = Object.values(error.response.data.errors).join(', ');
          errorMessage = `Validation failed: ${errorList}`;
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        
        console.error('Final error message:', errorMessage);
        throw new Error(errorMessage);
      }
      
      if (!createdProperty || !createdProperty.id) {
        throw new Error('Failed to get project ID after creation.');
      }
      
      const propertyId = createdProperty.id;
      
      // Upload images with moderation (images already validated on selection)
      // Get approved images from validation status
      const approvedImages = imageValidationStatus.filter(img => img.status === 'approved');
      
      if (approvedImages.length > 0) {
        setUploadingImages(true);
        try {
          // Upload each approved image with property ID
          const uploadPromises = approvedImages.map(async (imgObj, index) => {
            try {
              console.log(`Uploading image ${index + 1}/${approvedImages.length}:`, imgObj.file.name);
              const response = await sellerPropertiesAPI.uploadImage(imgObj.file, propertyId);
              console.log(`Image ${index + 1} upload response:`, response);
              
              if (response.success && response.data) {
                const imageUrl = response.data.image_url || response.data.url;
                if (imageUrl) {
                  return { success: true, url: imageUrl };
                }
              }
              return { success: false, error: response.message || 'Upload failed - no URL returned' };
            } catch (error) {
              console.error(`Image ${index + 1} upload error:`, error);
              return { 
                success: false, 
                error: error.message || error.status || 'Upload failed',
                details: error
              };
            }
          });
          
          const results = await Promise.all(uploadPromises);
          const successful = results.filter(r => r.success);
          const failed = results.filter(r => !r.success);
          
          console.log(`Image upload results: ${successful.length} successful, ${failed.length} failed`);
          
          if (failed.length > 0) {
            console.warn('Failed image uploads:', failed);
            // Show warning but don't fail the entire project creation
            const errorMessages = failed.map((f, i) => `Image ${i + 1}: ${f.error}`).join('; ');
            console.warn(`Some images failed to upload: ${errorMessages}`);
          }
          
          if (successful.length === 0 && approvedImages.length > 0) {
            console.warn('All images failed to upload, but project was created successfully');
          }
        } catch (uploadError) {
          console.error('Image upload batch error:', uploadError);
          // Don't throw - project was created successfully
        } finally {
          setUploadingImages(false);
        }
      } else if (imageFiles.length > 0) {
        // Images were selected but none approved
        console.warn('No approved images found. Project created without images.');
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
        <label>Location <span className="required">*</span></label>
        <LocationAutoSuggest
          placeholder="Enter locality, area or landmark"
          value={formData.location || formData.area || ''}
          onChange={(locationData) => {
            if (!locationData) {
              setFormData(prev => ({ 
                ...prev, 
                location: "", 
                area: "",
                city: "",
                latitude: "", 
                longitude: "" 
              }));
              return;
            }
            setFormData(prev => ({
              ...prev,
              location: locationData.fullAddress || locationData.placeName || "",
              area: locationData.placeName || prev.area || "",
              city: locationData.city || prev.city || "",
              latitude: locationData.coordinates?.lat ?? "",
              longitude: locationData.coordinates?.lng ?? ""
            }));
          }}
          className={`location-autosuggest-popup ${errors.location || errors.area ? 'agent-location-error' : ''}`}
          error={errors.location || errors.area}
        />
        {(errors.location || errors.area) && (
          <span className="error-text">{errors.location || errors.area}</span>
        )}
      </div>

      {/* Location Picker Button */}
      <div className="form-group-map">
        <label>Project Location on Map (Optional)</label>
        {!formData.latitude || !formData.longitude ? (
          <>
            <button
              type="button"
              className="location-picker-btn"
              onClick={() => setShowLocationPicker(true)}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: 'white',
                border: '2px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-color)';
                e.currentTarget.style.color = 'var(--accent-color)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span>Add Location on Map</span>
            </button>
            <span className="hint-text" style={{ 
              display: 'block', 
              marginTop: '0.5rem', 
              fontSize: '0.85rem', 
              color: 'var(--text-muted)' 
            }}>
              Select exact location on map for better visibility
            </span>
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
            <small className="location-picker-coordinates" style={{ 
              marginLeft: '26px', 
              fontSize: '0.75rem', 
              color: '#059669', 
              fontFamily: 'monospace' 
            }}>
              Coordinates: {parseFloat(formData.latitude).toFixed(6)}, {parseFloat(formData.longitude).toFixed(6)}
            </small>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="location-picker-change-btn"
                onClick={() => setShowLocationPicker(true)}
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

      {/* State and Additional Address Fields */}
      <div className="form-row two-cols">
        <div className="form-group">
          <label>State (Optional)</label>
          <StateAutoSuggest
            placeholder="Enter state"
            value={formData.state || ''}
            onChange={(stateName) => {
              handleChange('state', stateName);
            }}
            className={`state-autosuggest-popup ${errors.state ? 'agent-state-error' : ''}`}
            error={errors.state}
          />
        </div>

        <div className="form-group">
          <label>Additional Address (Optional)</label>
          <input
            type="text"
            placeholder="Enter additional address details"
            value={formData.fullAddress || formData.additionalAddress || ''}
            onChange={(e) => handleChange('fullAddress', e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Pincode (Optional)</label>
        <input
          type="text"
          value={formData.pincode || ''}
          onChange={(e) => handleChange('pincode', e.target.value.replace(/\D/g, ''))}
          placeholder="Enter pincode"
          maxLength={6}
        />
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
        <div className="input-with-suffix">
          <input
            type="text"
            value={formData.carpetAreaRange}
            onChange={(e) => handleCarpetAreaChange(e.target.value)}
            placeholder="e.g., 650 - 1200"
            className={errors.carpetAreaRange ? 'error' : ''}
          />
          <span className="suffix">sq.ft</span>
        </div>
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
        <div className="price-input-wrapper">
          <span className="currency">₹</span>
          <input
            type="text"
            value={formData.startingPrice}
            onChange={(e) => handleChange('startingPrice', e.target.value)}
            placeholder="e.g., 4500000 or 45 Lakhs or 45-60 Lakhs"
            className={errors.startingPrice ? 'error' : ''}
          />
        </div>
        {formData.startingPrice && (
          <span className="price-words">
            Price: {formatPriceInWords(formData.startingPrice)}
          </span>
        )}
        {errors.startingPrice && <span className="error-text">{errors.startingPrice}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Price per Sq.ft (Optional)</label>
          <div className="price-input-wrapper">
            <span className="currency">₹</span>
            <input
              type="text"
              value={formData.pricePerSqft}
              onChange={(e) => handleChange('pricePerSqft', e.target.value)}
              placeholder="e.g., 5000 or 5000-6000"
            />
          </div>
          {formData.pricePerSqft && (
            <span className="price-words">
              Price: {formatPriceInWords(formData.pricePerSqft)}/sq.ft
            </span>
          )}
        </div>

        <div className="form-group">
          <label>Booking Amount Price (Optional)</label>
          <div className="price-input-wrapper">
            <span className="currency">₹</span>
            <input
              type="text"
              value={formData.bookingAmount}
              onChange={(e) => handleChange('bookingAmount', e.target.value)}
              placeholder="e.g., 2 Lakhs or 1.5-2.5 Lakhs"
            />
          </div>
          {formData.bookingAmount && (
            <span className="price-words">
              Price: {formatPriceInWords(formData.bookingAmount)}
            </span>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Launch Date</label>
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
          onChange={(e) => {
            handleChange('bankApproved', e.target.value);
            // Clear approved banks if "No" or empty is selected
            if (e.target.value !== 'Yes') {
              setFormData(prev => ({
                ...prev,
                approvedBanks: [],
                otherBankName: ''
              }));
            }
          }}
        >
          <option value="">Select</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>

      {formData.bankApproved === 'Yes' && (
        <>
          <div className="form-group">
            <label>Select Approved Banks <span className="required">*</span></label>
            <div className="amenities-grid">
              {BANK_OPTIONS.map(bank => (
                <button
                  key={bank}
                  type="button"
                  className={`amenity-btn ${(formData.approvedBanks || []).includes(bank) ? 'active' : ''}`}
                  onClick={() => toggleBank(bank)}
                >
                  <span className="amenity-label">{bank}</span>
                  {(formData.approvedBanks || []).includes(bank) && (
                    <span className="check-icon">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {(formData.approvedBanks || []).includes('Other') && (
            <div className="form-group">
              <label>Other Bank Name(s)</label>
              <input
                type="text"
                value={formData.otherBankName || ''}
                onChange={(e) => handleChange('otherBankName', e.target.value)}
                placeholder="Enter bank names separated by comma (e.g., PNB, Canara Bank)"
              />
              <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                You can enter multiple bank names separated by commas
              </small>
            </div>
          )}
        </>
      )}
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
          {formData.projectImages.map((img, idx) => {
            const validationStatus = imageValidationStatus[idx] || { status: 'pending', errorMessage: '' };
            
            return (
              <div key={idx} className={`preview-item image-validation-item ${validationStatus.status}`}>
                <img src={img} alt={`Project ${idx + 1}`} />
                
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
                        onClick={() => removeImage(idx)}
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
                    onClick={() => removeImage(idx)}
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
            <span>All images approved!</span>
          </div>
        )}
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

      <div className="form-row two-cols">
        <div className="form-group">
          <label>Sales Name <span className="required">*</span></label>
          <input
            type="text"
            value={formData.salesName}
            onChange={(e) => handleChange('salesName', e.target.value)}
            placeholder="Enter sales person name"
            className={errors.salesName ? 'error' : ''}
          />
          {errors.salesName && <span className="error-text">{errors.salesName}</span>}
        </div>

        <div className="form-group">
          <label>Sales Number <span className="required">*</span></label>
          <input
            type="tel"
            value={formData.salesNumber}
            onChange={(e) => handleChange('salesNumber', e.target.value.replace(/\D/g, ''))}
            placeholder="10"
            maxLength={10}
            className={errors.salesNumber ? 'error' : ''}
          />
          {errors.salesNumber && <span className="error-text">{errors.salesNumber}</span>}
        </div>
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

      <div className="form-group">
        <label>Mobile Number (Optional)</label>
        <input
          type="tel"
          value={formData.mobileNumber}
          onChange={(e) => handleChange('mobileNumber', e.target.value.replace(/\D/g, ''))}
          placeholder="10"
          maxLength={10}
        />
      </div>

      <div className="form-row two-cols">
        <div className="form-group">
          <label>WhatsApp Number (Optional)</label>
          <input
            type="tel"
            value={formData.whatsappNumber}
            onChange={(e) => handleChange('whatsappNumber', e.target.value.replace(/\D/g, ''))}
            placeholder="10"
            maxLength={10}
          />
        </div>

        <div className="form-group">
          <label>Alternative Number (Optional)</label>
          <input
            type="tel"
            value={formData.alternativeNumber}
            onChange={(e) => handleChange('alternativeNumber', e.target.value.replace(/\D/g, ''))}
            placeholder="10"
            maxLength={10}
          />
        </div>
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

      <div className="preview-section preview-uppercase" style={{ textAlign: 'left' }}>
        <h4>Basic Information</h4>
        <p><strong>Project Name:</strong> {formData.projectName}</p>
        <p><strong>Builder:</strong> {formData.builderName || builderName}</p>
        <p><strong>Project Type:</strong> {formData.projectType}</p>
        <p><strong>Status:</strong> {formData.projectStatus}</p>
        {formData.reraNumber && <p><strong>RERA Number:</strong> {formData.reraNumber}</p>}

        <h4>Location</h4>
        <p><strong>Location:</strong> {formData.location || formData.area || 'Not specified'}</p>
        {formData.fullAddress && <p><strong>Full Address:</strong> {formData.fullAddress}</p>}
        {formData.state && <p><strong>State:</strong> {formData.state}</p>}
        {(formData.latitude && formData.longitude) && (
          <p><strong>Coordinates:</strong> {parseFloat(formData.latitude).toFixed(6)}, {parseFloat(formData.longitude).toFixed(6)}</p>
        )}

        <h4>Configuration</h4>
        <p><strong>Configurations:</strong> {formData.configurations.join(', ') || 'None'}</p>
        <p><strong>Carpet Area Range:</strong> {formData.carpetAreaRange ? `${formData.carpetAreaRange} sq.ft` : 'Not specified'}</p>

        <h4>Pricing</h4>
        <p><strong>Starting Price:</strong> {formData.startingPrice}</p>
        {formData.pricePerSqft && <p><strong>Price per Sq.ft:</strong> {formData.pricePerSqft}</p>}

        <h4>Contact</h4>
        <p><strong>Sales Name:</strong> {formData.salesName || 'Not specified'}</p>
        <p><strong>Sales Number:</strong> {formData.salesNumber}</p>
        <p><strong>Email:</strong> {formData.emailId}</p>
        {formData.mobileNumber && <p><strong>Mobile Number:</strong> {formData.mobileNumber}</p>}
        {formData.whatsappNumber && <p><strong>WhatsApp Number:</strong> {formData.whatsappNumber}</p>}
        {formData.alternativeNumber && <p><strong>Alternative Number:</strong> {formData.alternativeNumber}</p>}
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
        <div className="location-picker-modal-overlay" onClick={(e) => {
          if (e.target.classList.contains('location-picker-modal-overlay')) {
            setShowLocationPicker(false);
          }
        }}>
          <LocationPicker
            initialLocation={formData.latitude && formData.longitude ? {
              latitude: parseFloat(formData.latitude),
              longitude: parseFloat(formData.longitude),
              fullAddress: formData.location || formData.fullAddress
            } : null}
            onLocationChange={handleLocationSelect}
            onClose={() => setShowLocationPicker(false)}
          />
        </div>
      )}
    </>
  );
}
