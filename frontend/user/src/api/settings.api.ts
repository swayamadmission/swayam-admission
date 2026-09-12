import api from "./axios";

export const settingsApi = {
  getPublicSettings: () => api.get("/settings/public"),
};
