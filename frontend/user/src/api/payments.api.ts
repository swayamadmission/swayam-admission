import api from "./axios";

export interface StudentPayment {
  id: string;
  transactionId?: string;
  orderId?: string;
  invoiceNumber?: string;
  receiptNumber?: string;
  amount: number;
  paidAmount: number;
  pendingAmount: number;
  discountAmount: number;
  scholarshipAmount: number;
  gstAmount: number;
  currency: string;
  paymentMethod: string;
  paymentMode?: string;
  gateway?: string;
  status: string;
  verificationStatus?: string;
  verificationRemarks?: string;
  proofDocument?: string;
  utrNumber?: string;
  installmentNumber: number;
  totalInstallments: number;
  dueDate?: string;
  paidAt?: string;
  receiptUrl?: string;
  invoiceUrl?: string;
  remarks?: string;
  application?: any;
  college?: any;
  course?: any;
  collegeBank?: any;
}

export const paymentsApi = {
  getSummary: () =>
    api.get("/payments/summary"),

  getMyPayments: () =>
    api.get("/payments/me"),

  getCollegeBankDetails: (collegeId: string) =>
    api.get(`/payments/college-bank/${collegeId}`),

  getPaymentDetails: (id: string) =>
    api.get(`/payments/${id}`),

  createOrder: (data: { applicationId?: string; collegeId?: string; courseId?: string; amount: number; paymentMode?: string; paymentType?: string; paymentMethod?: string; remarks?: string }) =>
    api.post("/payments/create-order", data),

  uploadProof: (data: { paymentId: string; requestId?: string; proofDocument: string; utrNumber: string; transactionReference?: string; paidAmount?: number; remarks?: string }) =>
    api.post("/payments/upload-proof", data),

  payInstallment: (data: { paymentId?: string; applicationId?: string; amount: number; installmentNumber: number; totalInstallments: number; paymentMethod?: string }) =>
    api.post("/payments/installment", data),

  createPayment: (data: { applicationId?: string; paymentType: string; amount: number; paymentMethod?: string }) =>
    api.post("/payments", data),

  getMyRequests: () =>
    api.get("/payments/requests/my"),

  submitUtr: (paymentId: string, utrNumber: string) =>
    api.post("/payments/submit-utr", { paymentId, utrNumber }),

  getCollegeConfig: (collegeId: string) =>
    api.get(`/payments/college-config/${collegeId}`),

  getTimeline: (paymentId: string) =>
    api.get(`/payments/timeline/${paymentId}`),

  acceptTerms: (data: { paymentRequestId?: string; paymentId?: string; acceptedTerms: boolean }) =>
    api.post("/payments/terms-accept", data),

  submitManualProof: (data: {
    paymentRequestId: string;
    paymentAllocationId?: string;
    utrNumber: string;
    paidAmount: number;
    proofUrl?: string;
    proofDocument?: string;
    paymentDate?: string;
    paymentMethod?: string;
    remarks?: string;
  }) => api.post("/payments/student/submit-proof", data),
};
