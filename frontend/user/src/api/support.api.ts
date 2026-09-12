import api from "./axios";

export interface StudentSupportTicketQuery {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const supportApi = {
  getDashboard: () => api.get("/support/dashboard"),

  getFaqs: (category?: string, search?: string) =>
    api.get("/support/faqs", { params: { category, search } }),

  getKnowledgeBase: (category?: string, search?: string) =>
    api.get("/support/kb", { params: { category, search } }),

  getCategories: () => api.get("/support/categories"),

  getTickets: (params?: StudentSupportTicketQuery) => api.get("/support/tickets", { params }),

  getTicket: (id: string) => api.get(`/support/tickets/${id}`),

  createTicket: (data: {
    subject: string;
    description: string;
    category?: string;
    priority?: string;
    applicationId?: string;
    collegeId?: string;
    courseId?: string;
    paymentId?: string;
    attachmentUrl?: string;
    attachmentName?: string;
  }) => api.post("/support/tickets", data),

  replyTicket: (id: string, data: { message: string; attachmentUrl?: string; attachmentName?: string }) =>
    api.post(`/support/tickets/${id}/reply`, data),

  closeTicket: (id: string, rating?: number, comment?: string) =>
    api.post(`/support/tickets/${id}/close`, { rating, comment }),

  reopenTicket: (id: string, reason?: string) => api.post(`/support/tickets/${id}/reopen`, { reason }),
};
