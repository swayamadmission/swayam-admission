import api from "./axios";

export const dashboardsApi = {
  getAdminMetrics: () => api.get("/dashboards/admin/metrics"),
};
