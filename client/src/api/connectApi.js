import { apiClient } from "./apiClient";

const getStripeAccount = async () => {
  const response = await apiClient.get("/connect/status");
  return response.data;
};

const createStripeAccountLink = async () => {
  const response = await apiClient.post("/connect/account", {});
  return response.data;
};

const refreshStripeStatus = async () => {
  const response = await apiClient.post("/connect/refresh", {});
  return response.data;
};

export const connectApi = {
  getStripeAccount,
  createStripeAccountLink,
  refreshStripeStatus,
};

