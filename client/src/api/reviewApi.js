import { apiClient } from "./apiClient";

export const getReviewsForJob = async (jobId) => {
  const response = await apiClient.get(`/reviews/job/${jobId}`);
  return response.data;
};

export const createReview = async (jobId, reviewData) => {
  const response = await apiClient.post(`/reviews/job/${jobId}`, reviewData);
  return response.data;
};
