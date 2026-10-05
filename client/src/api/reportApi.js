import { apiClient } from "./apiClient";

export const createReport = async (data) => {
    const response = await apiClient.post("/reports", data);
    return response.data;
};
