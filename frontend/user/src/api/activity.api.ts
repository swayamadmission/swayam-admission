import api from "./axios";

export const activityApi = {
  getMyActivity: () => api.get("/audit/my-activity"),
};
