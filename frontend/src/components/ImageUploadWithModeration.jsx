import React, { useState, useRef } from 'react';
import { API_BASE_URL } from '../config/api.config';
import './ImageUploadWithModeration.css';

/**
 * Image Upload Component with Moderation
 * Handles uploading property images with Google Vision API moderation
 * 
 * Props:
 * - propertyId (required): Property ID to associate images with
 * - onUploadComplete (optional): Callback when all uploads complete
 */
const ImageUploadWithModeration = ({ propertyId, onUploadComplete }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState({});
  const [errorMessages, setErrorMessages] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [previews, setPreviews] = useState({});
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate files
    const validFiles = [];
    const errors = {};
    
    files.forEach((file) => {
      // Check file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        errors[file.name] = 'Invalid file type. Only JPG, PNG, and WebP are allowed.';
        return;
      }
      
      // Check file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        errors[file.name] = 'File size exceeds 5MB limit.';
        return;
      }
      
      validFiles.push(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews(prev => ({
          ...prev,
          [file.name]: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    });
    
    // Update state
    setSelectedFiles(prev => [...prev, ...validFiles]);
    setErrorMessages(prev => ({ ...prev, ...errors }));
    setUploadStatus(prev => {
      const newStatus = { ...prev };
      validFiles.forEach(file => {
        newStatus[file.name] = 'pending';
      });
      return newStatus;
    });
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove file from selection
  const removeFile = (filename) => {
    setSelectedFiles(prev => prev.filter(file => file.name !== filename));
    setUploadStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[filename];
      return newStatus;
    });
    setErrorMessages(prev => {
      const newStatus = { ...prev };
      delete newStatus[filename];
      return newStatus;
    });
    setPreviews(prev => {
      const newStatus = { ...prev };
      delete newStatus[filename];
      return newStatus;
    });
  };

  // Upload single file
  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('property_id', propertyId);

    try {
      setUploadStatus(prev => ({ ...prev, [file.name]: 'uploading' }));
      setErrorMessages(prev => {
        const newStatus = { ...prev };
        delete newStatus[file.name];
        return newStatus;
      });

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/images/moderate-and-upload.php`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.status === 'success') {
        if (data.data?.status === 'pending_review') {
          setUploadStatus(prev => ({ ...prev, [file.name]: 'reviewing' }));
        } else {
          setUploadStatus(prev => ({ ...prev, [file.name]: 'approved' }));
        }
        return { success: true, data };
      } else {
        setUploadStatus(prev => ({ ...prev, [file.name]: 'rejected' }));
        setErrorMessages(prev => ({
          ...prev,
          [file.name]: data.message || 'Upload failed'
        }));
        return { success: false, error: data.message };
      }
    } catch (error) {
      setUploadStatus(prev => ({ ...prev, [file.name]: 'rejected' }));
      setErrorMessages(prev => ({
        ...prev,
        [file.name]: error.message || 'Network error occurred'
      }));
      return { success: false, error: error.message };
    }
  };

  // Upload all files
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      return;
    }

    setIsUploading(true);

    // Upload files one by one
    const results = [];
    for (const file of selectedFiles) {
      const result = await uploadFile(file);
      results.push({ file: file.name, ...result });
    }

    setIsUploading(false);

    // Call completion callback
    if (onUploadComplete) {
      onUploadComplete(results);
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'uploading':
        return <div className="status-spinner"></div>;
      case 'approved':
        return <span className="status-icon approved">✓</span>;
      case 'rejected':
        return <span className="status-icon rejected">✗</span>;
      case 'reviewing':
        return <span className="status-icon reviewing">⏱</span>;
      default:
        return null;
    }
  };

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'uploading':
        return 'Checking image...';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'reviewing':
        return 'Under Review';
      default:
        return 'Pending';
    }
  };

  return (
    <div className="image-upload-moderation">
      <div className="upload-header">
        <h3>Upload Property Images</h3>
        <p className="upload-hint">
          Upload images (JPG, PNG, WebP, max 5MB each). Images will be automatically checked for appropriate content.
        </p>
      </div>

      <div className="file-input-wrapper">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={handleFileSelect}
          className="file-input"
          id="image-upload-input"
        />
        <label htmlFor="image-upload-input" className="file-input-label">
          <span className="upload-icon">📷</span>
          <span>Select Images</span>
        </label>
      </div>

      {selectedFiles.length > 0 && (
        <div className="selected-files">
          <div className="files-list">
            {selectedFiles.map((file) => (
              <div key={file.name} className="file-item">
                <div className="file-preview">
                  {previews[file.name] && (
                    <img src={previews[file.name]} alt={file.name} />
                  )}
                </div>
                <div className="file-info">
                  <div className="file-name">{file.name}</div>
                  <div className="file-size">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                  <div className="file-status">
                    {getStatusIcon(uploadStatus[file.name])}
                    <span className={`status-text ${uploadStatus[file.name] || 'pending'}`}>
                      {getStatusText(uploadStatus[file.name])}
                    </span>
                  </div>
                  {errorMessages[file.name] && (
                    <div className="file-error">{errorMessages[file.name]}</div>
                  )}
                </div>
                <button
                  type="button"
                  className="remove-file-btn"
                  onClick={() => removeFile(file.name)}
                  disabled={uploadStatus[file.name] === 'uploading'}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="upload-btn"
            onClick={handleUpload}
            disabled={isUploading || selectedFiles.length === 0}
          >
            {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} Image(s)`}
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUploadWithModeration;

