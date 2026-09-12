import api from "./axios";

export const profileApi = {
  getProfile: () => api.get("/profile"),

  updateProfile: (data: any) => api.patch("/profile", data),

  updateAvatar: (avatar: string) => api.patch("/profile/avatar", { avatar }),

  deleteAvatar: () => api.post("/profile/delete-avatar"),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch("/profile/password", data),

  toggleTwoFactor: (enable: boolean) => api.patch("/profile/2fa", { enable }),

  getLoginHistory: () => api.get("/profile/login-history"),

  getDevices: () => api.get("/profile/devices"),

  deleteDevice: (id: string) => api.delete(`/profile/device/${id}`),

  logoutAllDevices: () => api.post("/profile/logout-all"),
};
