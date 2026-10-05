import React, { useState, useRef } from 'react';
import { uploadImageToBase64 } from '../api/jobApi';

const ImageUpload = ({ 
  onImagesChange, 
  maxImages = 5, 
  acceptedTypes = 'image/*',
  maxSizeMB = 5,
  className = '' 
}) => {
  const [images, setImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxSizeMB}MB`;
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'Only JPEG, PNG, GIF, and WebP images are allowed';
    }

    return null;
  };

  const processFiles = async (files) => {
    setError('');
    setUploading(true);

    const fileArray = Array.from(files);
    const remainingSlots = maxImages - images.length;
    
    if (fileArray.length > remainingSlots) {
      setError(`You can only upload ${remainingSlots} more image(s). Maximum is ${maxImages}.`);
      setUploading(false);
      return;
    }

    try {
      const processedImages = [];
      
      for (const file of fileArray) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          setUploading(false);
          return;
        }

        try {
          const base64Url = await uploadImageToBase64(file);
          processedImages.push({
            id: Date.now() + Math.random(), // Simple unique ID
            file,
            url: base64Url,
            name: file.name,
            size: file.size,
            isPublic: true, // Default to public
            caption: ''
          });
        } catch (uploadError) {
          setError(`Failed to process ${file.name}: ${uploadError.message}`);
          setUploading(false);
          return;
        }
      }

      const newImages = [...images, ...processedImages];
      setImages(newImages);
      onImagesChange(newImages);
    } catch (error) {
      setError('An error occurred while processing images');
      console.error('Image processing error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const removeImage = (imageId) => {
    const newImages = images.filter(img => img.id !== imageId);
    setImages(newImages);
    onImagesChange(newImages);
  };

  const updateImageCaption = (imageId, caption) => {
    const newImages = images.map(img => 
      img.id === imageId ? { ...img, caption } : img
    );
    setImages(newImages);
    onImagesChange(newImages);
  };

  const toggleImageVisibility = (imageId) => {
    const newImages = images.map(img => 
      img.id === imageId ? { ...img, isPublic: !img.isPublic } : img
    );
    setImages(newImages);
    onImagesChange(newImages);
  };

  return (
    <div className={`image-upload-container ${className}`}>
      {/* Upload Area */}
      {images.length < maxImages && (
        <div
          className={`image-upload-area ${isDragging ? 'dragging' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <div className="upload-content">
            {uploading ? (
              <div className="upload-loading">
                <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600 mt-2">Processing images...</p>
              </div>
            ) : (
              <>
                <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drop images here or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Upload up to {maxImages} images (max {maxSizeMB}MB each)
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supports: JPEG, PNG, GIF, WebP
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="upload-error">
          <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="image-previews">
          <h4 className="preview-title">
            Image Previews ({images.length}/{maxImages})
          </h4>
          <div className="preview-grid">
            {images.map((image) => (
              <div key={image.id} className="image-preview-item">
                <div className="image-preview-wrapper">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="preview-image"
                  />
                  <div className="image-overlay">
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      className="remove-image-btn"
                      title="Remove image"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="image-controls">
                  <input
                    type="text"
                    placeholder="Add caption (optional)"
                    value={image.caption}
                    onChange={(e) => updateImageCaption(image.id, e.target.value)}
                    className="caption-input"
                  />
                  
                  <label className="visibility-toggle">
                    <input
                      type="checkbox"
                      checked={image.isPublic}
                      onChange={() => toggleImageVisibility(image.id)}
                    />
                    <span className="toggle-text">
                      {image.isPublic ? 'Public' : 'Private'}
                    </span>
                  </label>
                </div>
                
                <div className="image-info">
                  <span className="image-name">{image.name}</span>
                  <span className="image-size">
                    {(image.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;