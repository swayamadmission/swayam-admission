import api from "./axios";

export interface PaymentQueryParams {
  skip?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentMethod?: string;
  paymentType?: string;
  collegeId?: string;
  courseId?: string;
  counselorId?: string;
  studentId?: string;
  applicationId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreatePaymentPayload {
  applicationId?: string;
  studentId?: string;
  userId?: string;
  counselorId?: string;
  collegeId?: string;
  courseId?: string;
  scholarshipId?: string;
  leadId?: string;
  paymentType: string;
  paymentMethod?: string;
  amount: number;
  discountAmount?: number;
  scholarshipAmount?: number;
  gstAmount?: number;
  taxAmount?: number;
  processingFee?: number;
  currency?: string;
  transactionId?: string;
  gateway?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  dueDate?: string;
  remarks?: string;
  notes?: string;
  metadata?: any;
}

export interface VerifyPaymentPayload {
  paymentId: string;
  transactionId?: string;
  gatewayTransactionId?: string;
  status?: string;
  remarks?: string;
}

export interface RefundPaymentPayload {
  paymentId: string;
  refundAmount: number;
  reason: string;
  refundReference?: string;
}

export interface InstallmentPaymentPayload {
  paymentId?: string;
  applicationId?: string;
  amount: number;
  installmentNumber: number;
  totalInstallments: number;
  dueDate?: string;
  paymentMethod?: string;
  remarks?: string;
}

export const paymentsApi = {
  getStats: () => api.get("/payments/stats"),

  findAll: (params?: PaymentQueryParams) =>
    api.get("/payments", { params }),

  findOne: (id: string) =>
    api.get(`/payments/${id}`),

  create: (data: CreatePaymentPayload) =>
    api.post("/payments", data),

  update: (id: string, data: any) =>
    api.patch(`/payments/${id}`, data),

  verify: (data: VerifyPaymentPayload) =>
    api.post("/payments/verify", data),

  refund: (data: RefundPaymentPayload) =>
    api.post("/payments/refund", data),

  installment: (data: InstallmentPaymentPayload) =>
    api.post("/payments/installment", data),

  generateInvoice: (paymentId: string) =>
    api.post("/payments/generate-invoice", { paymentId }),

  generateReceipt: (paymentId: string) =>
    api.post("/payments/generate-receipt", { paymentId }),

  export: (params?: PaymentQueryParams) =>
    api.get("/payments/export", { params, responseType: 'blob' }),

  getStudentPayments: (studentId: string) =>
    api.get(`/payments/student/${studentId}`),

  getApplicationPayments: (applicationId: string) =>
    api.get(`/payments/application/${applicationId}`),

  getCounselorPayments: (counselorId: string) =>
    api.get(`/payments/counselor/${counselorId}`),

  delete: (id: string) =>
    api.delete(`/payments/${id}`),

  getGovernanceKpis: () =>
    api.get("/payments/governance-kpis"),

  getVerificationQueue: (params?: any) =>
    api.get("/payments/verification-queue", { params }),

  verifyStep: (data: { paymentId: string; action: string; remarks?: string; requestedUTR?: boolean }) =>
    api.post("/payments/verify-step", data),

  createPaymentRequest: (data: any) =>
    api.post("/payments/request", data),

  getCollegeConfig: (collegeId: string) =>
    api.get(`/payments/college-config/${collegeId}`),

  updateCollegeConfig: (collegeId: string, data: any) =>
    api.patch(`/payments/college-config/${collegeId}`, data),

  getTimeline: (paymentId: string) =>
    api.get(`/payments/timeline/${paymentId}`),

  getFeeHeads: (params?: any) =>
    api.get("/payments/fee-heads", { params }),

  createFeeHead: (data: any) =>
    api.post("/payments/fee-heads", data),

  updateFeeHead: (id: string, data: any) =>
    api.patch(`/payments/fee-heads/${id}`, data),

  deleteFeeHead: (id: string) =>
    api.delete(`/payments/fee-heads/${id}`),

  assignVerification: (data: { paymentId: string; reviewerId?: string; reviewerRole?: string; remarks?: string }) =>
    api.post("/payments/assign-verification", data),

  getSlaBreaches: () =>
    api.get("/payments/sla-breaches"),

  getFraudAlerts: () =>
    api.get("/payments/fraud-alerts"),

  configureCollegeBank: (data: any) =>
    api.post("/payments/configure-bank", data),

  getAdminDashboard: () =>
    api.get("/payments/admin-dashboard"),

  getAdminAnalytics: () =>
    api.get("/payments/admin-analytics"),

  getAdminRequests: (params?: any) =>
    api.get("/payments/requests/admin", { params }),

  updatePaymentRequest: (id: string, data: any) =>
    api.patch(`/payments/requests/${id}`, data),

  batchCreateRequests: (data: { requests: any[] }) =>
    api.post("/payments/requests/batch", data),

  getStudentContext: (studentId: string) =>
    api.get(`/payments/student-context/${studentId}`),

  // ==========================================
  // ENTERPRISE PAYMENT & FINANCE API METHODS
  // ==========================================
  counselorCreateRequest: (data: any) =>
    api.post("/payments/counselor/request", data),

  getFinanceQueue: (params?: any) =>
    api.get("/payments/finance/queue", { params }),

  financeApproveRequest: (id: string, data: any) =>
    api.post(`/payments/requests/${id}/finance-approve`, data),

  financeRejectRequest: (id: string, data: any) =>
    api.post(`/payments/requests/${id}/finance-reject`, data),

  seniorCounselorCollegeConfirm: (id: string, data: any) =>
    api.post(`/payments/requests/${id}/college-confirm`, data),

  financeVerifyPaymentFinal: (id: string, data: any) =>
    api.post(`/payments/requests/${id}/verify-final`, data),

  confirmAdmissionFinal: (applicationId: string) =>
    api.post(`/payments/applications/${applicationId}/confirm-admission`),

  // Invoices API
  generateAuthoritativeInvoice: (data: { applicationId: string; feePlan?: string; customLineItems?: any[]; discountAmount?: number; scholarshipAmount?: number; dueDate?: string; notes?: string }) =>
    api.post("/payments/invoices/generate", data),

  getInvoices: (params?: any) =>
    api.get("/payments/invoices", { params }),

  getInvoiceById: (id: string) =>
    api.get(`/payments/invoices/${id}`),

  cancelInvoice: (id: string, reason: string) =>
    api.post(`/payments/invoices/${id}/cancel`, { reason }),

  // Reconciliation API
  processSettlementBatch: (records: any[]) =>
    api.post("/payments/reconciliation/batch", { records }),

  getReconciliationQueue: (params?: any) =>
    api.get("/payments/reconciliation/queue", { params }),

  resolveReconciliation: (id: string, data: { remarks: string; action: 'RESOLVE_MATCH' | 'FORCE_RECONCILE' | 'FLAG_FRAUD' }) =>
    api.post(`/payments/reconciliation/${id}/resolve`, data),
};
