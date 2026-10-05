import { apiClient } from "./apiClient";

export const createConversation = async ({ participantId, jobId = null }) => {
  const response = await apiClient.post("/messages/conversations", { participantId, jobId });
  return response.data.conversation;
};

export const getConversations = async () => {
  const response = await apiClient.get("/messages/conversations");
  return response.data.conversations || [];
};

export const getConversationMessages = async (conversationId, cursor = null) => {
  const response = await apiClient.get(`/messages/conversations/${conversationId}/messages`, {
    params: cursor ? { cursor } : {},
  });
  return response.data;
};

export const sendMessage = async (conversationId, { content, imageDataUrl = null }) => {
  const response = await apiClient.post(`/messages/conversations/${conversationId}/messages`, {
    content,
    imageDataUrl,
  });
  return response.data.message;
};

export const markConversationAsRead = async (conversationId) => {
  await apiClient.post(`/messages/conversations/${conversationId}/read`);
};

export const getUnreadCount = async () => {
  const response = await apiClient.get("/messages/unread-count");
  return response.data;
};

export const blockUser = async (userId) => {
  await apiClient.post(`/blocks/${userId}`);
};

export const unblockUser = async (userId) => {
  await apiClient.delete(`/blocks/${userId}`);
};
