import { apiClient } from "./apiClient";

export const getNotifications = async () => {
  const response = await apiClient.get("/notifications");
  return {
    notifications: response.data.notifications || [],
    unreadCount: response.data.unreadCount || 0,
  };
};

export const markNotificationRead = async (notificationId) => {
  const response = await apiClient.patch(`/notifications/${notificationId}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await apiClient.post("/notifications/read-all");
  return response.data;
};

export const getNotificationPreferences = async () => {
  const response = await apiClient.get("/notifications/preferences");
  return response.data;
};

export const updateNotificationPreferences = async (preferences) => {
  const response = await apiClient.patch("/notifications/preferences", preferences);
  return response.data;
};
