import api from "./axios";

export interface SupportTicketQuery {
  search?: string;
  category?: string;
  priority?: string;
  status?: string;
  queue?: string; // 'my' | 'team' | 'unassigned' | 'escalated' | 'overdue' | 'resolved'
  slaStatus?: string; // 'ON_TRACK' | 'DUE_SOON' | 'BREACHED'
  departmentId?: string;
  assignedToId?: string;
  userId?: string;
  collegeId?: string;
  applicationId?: string;
  page?: number;
  limit?: number;
}

export interface SupportTicketItem {
  id: string;
  ticketId: string;
  userId: string;
  user?: { id: string; fullName: string; email: string; mobile?: string; role?: string };
  assignedTo?: { id: string; fullName: string; email: string };
  counselor?: { id: string; fullName: string; email: string };
  department?: { id: string; name: string };
  collegeId?: string;
  courseId?: string;
  applicationId?: string;
  paymentId?: string;
  subject: string;
  description: string;
  category: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | "CRITICAL";
  status: "OPEN" | "PENDING" | "IN_PROGRESS" | "WAITING_FOR_STUDENT" | "WAITING_STUDENT" | "WAITING_COUNSELOR" | "RESOLVED" | "CLOSED" | "ESCALATED" | "REOPENED";
  slaDeadline?: string;
  slaStatus?: "ON_TRACK" | "DUE_SOON" | "BREACHED" | "COMPLETED";
  isEscalated: boolean;
  closedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  messages?: any[];
  attachments?: any[];
  feedback?: any;
  audits?: any[];
  _count?: { messages: number; attachments: number };
}

export interface BulkSupportActionPayload {
  ticketIds: string[];
  action: "ASSIGN" | "CHANGE_STATUS" | "CHANGE_PRIORITY" | "CLOSE";
  assignedToId?: string;
  status?: string;
  priority?: string;
  reason?: string;
}

export const supportApi = {
  getDashboard: () => api.get("/support/dashboard"),

  getDepartments: () => api.get("/support/departments"),

  getCategories: () => api.get("/support/categories"),

  getFaqs: (category?: string, search?: string) =>
    api.get("/support/faqs", { params: { category, search } }),

  getKnowledgeBase: (category?: string, search?: string) =>
    api.get("/support/kb", { params: { category, search } }),

  getTickets: (params?: SupportTicketQuery) => api.get("/support/tickets", { params }),

  getTicket: (id: string) => api.get(`/support/tickets/${id}`),

  createTicket: (data: {
    subject: string;
    description: string;
    category?: string;
    priority?: string;
    departmentId?: string;
    collegeId?: string;
    courseId?: string;
    applicationId?: string;
    paymentId?: string;
    attachmentUrl?: string;
    attachmentName?: string;
  }) => api.post("/support/tickets", data),

  updateTicket: (id: string, data: any) => api.patch(`/support/tickets/${id}`, data),

  deleteTicket: (id: string) => api.delete(`/support/tickets/${id}`),

  claimTicket: (id: string) => api.post(`/support/tickets/${id}/claim`),

  addInternalNote: (id: string, data: { note: string; attachmentUrl?: string; attachmentName?: string }) =>
    api.post(`/support/tickets/${id}/note`, data),

  replyTicket: (id: string, data: { message: string; isInternal?: boolean; attachmentUrl?: string; attachmentName?: string }) =>
    api.post(`/support/tickets/${id}/reply`, data),

  resolveTicket: (id: string, data: { resolutionSummary: string; resolutionCode?: string }) =>
    api.post(`/support/tickets/${id}/resolve`, data),

  assignTicket: (id: string, assignedToId: string, reason?: string) =>
    api.post(`/support/tickets/${id}/assign`, { assignedToId, reason }),

  closeTicket: (id: string, rating?: number, comment?: string) =>
    api.post(`/support/tickets/${id}/close`, { rating, comment }),

  reopenTicket: (id: string, reason?: string) => api.post(`/support/tickets/${id}/reopen`, { reason }),

  escalateTicket: (id: string, reason?: string) => api.post(`/support/tickets/${id}/escalate`, { reason }),

  bulkAction: (data: BulkSupportActionPayload) => api.post("/support/tickets/bulk", data),

  exportTickets: (format: string = "json", params?: SupportTicketQuery) =>
    api.get("/support/export", { params: { format, ...params } }),
};
