import { apiClient } from "./apiClient";

export const getActiveLeaderboard = async (audience) => {
  const response = await apiClient.get(`/leaderboards/active?audience=${audience}`);
  return response.data;
};

export const getMyLeaderboardStatus = async () => {
  const response = await apiClient.get("/leaderboards/me");
  return response.data;
};

export const enrollInLeaderboard = async (data) => {
  const response = await apiClient.post("/leaderboards/enroll", data);
  return response.data;
};
