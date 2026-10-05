import imageCompression from "browser-image-compression";
import { apiClient } from "./apiClient";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const getMyProfile = async () => {
  const response = await apiClient.get("/profile/me");
  return response.data.profile;
};

export const updateMyProfile = async (profile) => {
  const response = await apiClient.patch("/profile/me", profile);
  return response.data.profile;
};

export const uploadMyAvatar = async (file) => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Choose a JPEG, PNG, GIF, or WebP image.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Choose an image smaller than 5 MB.");
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 512,
    useWebWorker: true,
    fileType: file.type,
  });
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = () => reject(new Error("Unable to read the selected image."));
    reader.readAsDataURL(compressed);
  });

  const response = await apiClient.put("/profile/me/avatar", { dataUrl });
  return response.data.profile;
};

export const deleteMyAvatar = async () => {
  const response = await apiClient.delete("/profile/me/avatar");
  return response.data.profile;
};
