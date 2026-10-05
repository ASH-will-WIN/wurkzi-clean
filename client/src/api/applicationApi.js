import { apiClient } from "./apiClient";

export const createApplication = async (appData) => {
  const response = await apiClient.post("/applications", appData);
  return response.data; // This now returns { application, clientSecret }
};

export const getMyApplications = async () => {
  const response = await apiClient.get("/applications");
  return response.data;
};

export const getApplicationsForJob = async (jobId) => {
  const response = await apiClient.get(`/applications/jobs/${jobId}`);
  return response.data;
};

export const acceptApplication = async (appId) => {
  const response = await apiClient.patch(`/applications/${appId}/accept`);
  return response.data;
};

export const rejectApplication = async (appId) => {
  const response = await apiClient.patch(`/applications/${appId}/reject`);
  return response.data;
};

export const withdrawApplication = async (appId) => {
  const response = await apiClient.patch(`/applications/${appId}/withdraw`);
  return response.data;
};

