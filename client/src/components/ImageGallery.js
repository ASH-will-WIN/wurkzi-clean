import React, { useState } from 'react';

const ImageGallery = ({ images = [], className = '' }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [showLightbox, setShowLightbox] = useState(false);

  const openLightbox = (image) => {
    setSelectedImage(image);
    setShowLightbox(true);
  };

  const closeLightbox = () => {
    setShowLightbox(false);
    setSelectedImage(null);
  };

  const navigateImage = (direction) => {
    if (!selectedImage || !images.length) return;
    
    const currentIndex = images.findIndex(img => img.id === selectedImage.id);
    let newIndex;
    
    if (direction === 'next') {
      newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
    } else {
      newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    }
    
    setSelectedImage(images[newIndex]);
  };

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showLightbox) return;
      
      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          navigateImage('prev');
          break;
        case 'ArrowRight':
          navigateImage('next');
          break;
        default:
          break;
      }
    };

    if (showLightbox) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showLightbox, selectedImage, images]);

  if (!images || images.length === 0) {
    return (
      <div className={`gallery-empty ${className}`}>
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-gray-500 text-sm">No images available for this job</p>
      </div>
    );
  }

  return (
    <>
      <div className={`image-gallery ${className}`}>
        {images.map((image, index) => (
          <div 
            key={image.id} 
            className="gallery-item cursor-pointer"
            onClick={() => openLightbox(image)}
          >
            <img
              src={image.url}
              alt={image.caption || `Job image ${index + 1}`}
              className="gallery-image"
              loading="lazy"
            />
            <div className="gallery-overlay">
              <div className="flex items-center justify-center h-full">
                <svg className="w-8 h-8 text-white" width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </div>
            {image.caption && (
              <div className="gallery-caption">
                {image.caption}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {showLightbox && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors duration-200 z-10"
          >
            <svg className="w-8 h-8" width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Navigation Buttons */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => navigateImage('prev')}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors duration-200 z-10"
              >
                <svg className="w-8 h-8" width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={() => navigateImage('next')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors duration-200 z-10"
              >
                <svg className="w-8 h-8" width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Main Image */}
          <div className="max-w-4xl max-h-full p-4 flex flex-col items-center">
            <img
              src={selectedImage.url}
              alt={selectedImage.caption || 'Job image'}
              className="max-w-full max-h-full object-contain"
            />
            
            {/* Image Info */}
            <div className="mt-4 text-center text-white">
              {selectedImage.caption && (
                <p className="text-lg font-medium mb-2">{selectedImage.caption}</p>
              )}
              <p className="text-sm text-gray-300">
                Image {images.findIndex(img => img.id === selectedImage.id) + 1} of {images.length}
              </p>
            </div>
          </div>

          {/* Click outside to close */}
          <div 
            className="absolute inset-0 -z-10"
            onClick={closeLightbox}
          />
        </div>
      )}
    </>
  );
};

export default ImageGallery;