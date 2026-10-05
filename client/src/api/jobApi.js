import { apiClient } from "./apiClient";
import imageCompression from 'browser-image-compression';

// Existing job functions
export const createJob = async (jobData) => {
  const response = await apiClient.post("/jobs", jobData);
  return response.data;
};

export const getJobs = async () => {
  const response = await apiClient.get("/jobs");
  return response.data;
};

export const getJobById = async (id) => {
  const response = await apiClient.get(`/jobs/${id}`);
  return response.data;
};

export const deleteJob = async (id) => {
  const response = await apiClient.delete(`/jobs/${id}`);
  return response.data;
};

// New job workflow functions
export const startJob = async (jobId) => {
  const response = await apiClient.patch(`/jobs/${jobId}/start`);
  return response.data;
};

export const completeJob = async (jobId) => {
  const response = await apiClient.patch(`/jobs/${jobId}/complete`);
  return response.data;
};

export const getJobsByHirer = async () => {
  const response = await apiClient.get("/jobs/hirer/my-jobs");
  return response.data;
};

// Job image functions
export const addJobImage = async (jobId, imageData) => {
  const response = await apiClient.post(`/jobs/${jobId}/images`, imageData);
  return response.data;
};

export const getJobImages = async (jobId) => {
  const response = await apiClient.get(`/jobs/${jobId}/images`);
  return response.data;
};

export const deleteJobImage = async (imageId) => {
  const response = await apiClient.delete(`/jobs/images/${imageId}`);
  return response.data;
};

// Upload image to base64 for demo purposes
// In production, you'd upload to a service like AWS S3, Cloudinary, etc.

// ... (existing imports if any)

export const uploadImageToBase64 = async (file) => {
  if (!file) {
    throw new Error('No file provided');
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only JPEG, PNG, GIF, and WebP images are allowed');
  }

  // Compression Options
  const options = {
    maxSizeMB: 0.5,           // Compress to ~500KB
    maxWidthOrHeight: 1280,   // Max dimension 1280px
    useWebWorker: true,
    fileType: file.type       // Preserve original file type
  };

  try {
    const compressedFile = await imageCompression(file, options);

    // Convert compressed file to Base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsDataURL(compressedFile);
    });
  } catch (error) {
    console.error('Compression ended with error:', error);
    throw error;
  }
};
