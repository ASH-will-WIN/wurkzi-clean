import { apiClient } from "./apiClient";

export const getMyReferralSummary = async () => {
  const response = await apiClient.get("/referrals/me");
  return response.data;
};
