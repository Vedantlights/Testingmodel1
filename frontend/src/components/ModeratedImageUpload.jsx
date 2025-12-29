import React, { useState, useRef } from 'react';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api.config';
import './ModeratedImageUpload.css';

const ModeratedImageUpload = ({ propertyId, onImagesChange, maxImages = 10 }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessages, setErrorMessages] = useState({});
  const fileInputRef = useRef(null);

  // Client-side validation
  const validateFiles = (files) => {
    const errors = [];
    const maxSizeMB = 5;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];

    files.forEach((file, index) => {
      // Check file size
      if (file.size > maxSizeBytes) {
        errors.push({
          index,
          filename: file.name,
          message: `${file.name}: File size exceeds ${maxSizeMB}MB`
        });
      }

      // Check file type
      const extension = file.name.split('.').pop().toLowerCase();
      if (!allowedExtensions.includes(extension) || !allowedTypes.includes(file.type)) {
        errors.push({
          index,
          filename: file.name,
          message: `${file.name}: Invalid file type. Allowed: jpg, jpeg, png, webp`
        });
      }
    });

    return errors;
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Check total image count
    const currentCount = selectedFiles.length;
    if (currentCount + files.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed. You have ${currentCount} and trying to add ${files.length}`);
      return;
    }

    // Validate files
    const validationErrors = validateFiles(files);
    
    if (validationErrors.length > 0) {
      const errorMap = {};
      validationErrors.forEach(err => {
        errorMap[err.filename] = err.message;
      });
      setErrorMessages(prev => ({ ...prev, ...errorMap }));
      return;
    }

    // Add files to selected files
    const newFiles = files.map(file => ({
      file,
      id: Date.now() + Math.random(),
      preview: URL.createObjectURL(file),
      status: 'pending'
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Auto-upload files
    newFiles.forEach(fileObj => {
      uploadFile(fileObj);
    });
  };

  // Upload single file
  const uploadFile = async (fileObj) => {
    const { file, id } = fileObj;
    
    // Set uploading status
    setUploadStatus(prev => ({ ...prev, [id]: 'uploading' }));
    setIsUploading(true);
    setErrorMessages(prev => {
      const newErrors = { ...prev };
      delete newErrors[file.name];
      return newErrors;
    });

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('property_id', propertyId);

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MODERATE_AND_UPLOAD}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      // Handle different response statuses
      if (data.status === 'success' || data.success) {
        setUploadStatus(prev => ({ ...prev, [id]: 'approved' }));
        
        // Update file object with image URL
        const updatedFile = {
          ...fileObj,
          status: 'approved',
          imageUrl: data.data?.image_url || data.image_url
        };
        
        setSelectedFiles(prev => 
          prev.map(f => f.id === id ? updatedFile : f)
        );

        // Notify parent component
        if (onImagesChange) {
          const approvedFiles = selectedFiles
            .map(f => f.id === id ? updatedFile : f)
            .filter(f => f.status === 'approved');
          onImagesChange(approvedFiles);
        }
      } else if (data.status === 'pending_review') {
        setUploadStatus(prev => ({ ...prev, [id]: 'reviewing' }));
        
        const updatedFile = {
          ...fileObj,
          status: 'reviewing'
        };
        
        setSelectedFiles(prev => 
          prev.map(f => f.id === id ? updatedFile : f)
        );
      } else {
        throw new Error(data.message || 'Unknown response status');
      }

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(prev => ({ ...prev, [id]: 'error' }));
      setErrorMessages(prev => ({
        ...prev,
        [file.name]: error.message || 'Upload failed. Please try again.'
      }));
      
      // Update file object
      setSelectedFiles(prev => 
        prev.map(f => f.id === id ? { ...f, status: 'error' } : f)
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Remove file
  const removeFile = (id) => {
    const fileObj = selectedFiles.find(f => f.id === id);
    
    // Revoke blob URL
    if (fileObj?.preview && fileObj.preview.startsWith('blob:')) {
      URL.revokeObjectURL(fileObj.preview);
    }

    setSelectedFiles(prev => prev.filter(f => f.id !== id));
    setUploadStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[id];
      return newStatus;
    });
    setErrorMessages(prev => {
      const newErrors = { ...prev };
      if (fileObj?.file?.name) {
        delete newErrors[fileObj.file.name];
      }
      return newErrors;
    });

    // Notify parent component
    if (onImagesChange) {
      const remainingFiles = selectedFiles
        .filter(f => f.id !== id)
        .filter(f => f.status === 'approved');
      onImagesChange(remainingFiles);
    }
  };

  // Get status icon and text
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'uploading':
        return {
          icon: '⏳',
          text: 'Checking image...',
          className: 'status-uploading'
        };
      case 'approved':
        return {
          icon: '✅',
          text: 'Approved',
          className: 'status-approved'
        };
      case 'reviewing':
        return {
          icon: '⏰',
          text: 'Under Review',
          className: 'status-reviewing'
        };
      case 'error':
        return {
          icon: '❌',
          text: 'Rejected',
          className: 'status-error'
        };
      default:
        return {
          icon: '',
          text: 'Pending',
          className: 'status-pending'
        };
    }
  };

  return (
    <div className="moderated-image-upload">
      <div className="upload-controls">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={handleFileSelect}
          disabled={isUploading || selectedFiles.length >= maxImages}
          className="file-input"
          id="image-upload-input"
        />
        <label 
          htmlFor="image-upload-input" 
          className={`upload-button ${isUploading || selectedFiles.length >= maxImages ? 'disabled' : ''}`}
        >
          {isUploading ? 'Uploading...' : `Select Images (${selectedFiles.length}/${maxImages})`}
        </label>
      </div>

      {Object.keys(errorMessages).length > 0 && (
        <div className="error-messages">
          {Object.entries(errorMessages).map(([filename, message]) => (
            <div key={filename} className="error-message">
              {message}
            </div>
          ))}
        </div>
      )}

      <div className="image-preview-grid">
        {selectedFiles.map((fileObj) => {
          const statusDisplay = getStatusDisplay(uploadStatus[fileObj.id] || fileObj.status);
          return (
            <div key={fileObj.id} className={`image-preview-item ${statusDisplay.className}`}>
              <div className="image-wrapper">
                <img 
                  src={fileObj.preview || fileObj.imageUrl} 
                  alt={fileObj.file?.name || 'Preview'} 
                  className="preview-image"
                />
                <div className="status-overlay">
                  <div className="status-icon">{statusDisplay.icon}</div>
                  <div className="status-text">{statusDisplay.text}</div>
                </div>
                {uploadStatus[fileObj.id] === 'uploading' && (
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                  </div>
                )}
              </div>
              <div className="image-info">
                <div className="image-name" title={fileObj.file?.name}>
                  {fileObj.file?.name || 'Unknown'}
                </div>
                {errorMessages[fileObj.file?.name] && (
                  <div className="image-error">
                    {errorMessages[fileObj.file.name]}
                  </div>
                )}
                <button
                  type="button"
                  className="remove-button"
                  onClick={() => removeFile(fileObj.id)}
                  disabled={uploadStatus[fileObj.id] === 'uploading'}
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedFiles.length === 0 && (
        <div className="empty-state">
          No images selected. Click the button above to select images.
        </div>
      )}
    </div>
  );
};

export default ModeratedImageUpload;

