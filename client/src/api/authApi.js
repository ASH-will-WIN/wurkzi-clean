import { apiClient } from "./apiClient";

export const registerUser = async (userData) => {
  const response = await apiClient.post("/auth/register", userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await apiClient.post("/auth/login", credentials);
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await apiClient.post("/auth/forgot-password", { email });
  return response.data;
};


export const resetPassword = async (data) => {
  const response = await apiClient.post("/auth/reset-password", data);
  return response.data;
};

export const deleteAccount = async () => {
  const response = await apiClient.delete("/auth/delete");
  return response.data;
};
