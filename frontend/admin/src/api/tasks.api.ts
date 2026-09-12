import api from './axios';

export interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  assignedTo: string;
  type: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE' | 'ESCALATED';
  rawStatus: string;
  isOverdue: boolean;
  overdueMinutes: number;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  relatedTo?: string | null;
  contextType: string;
  leadId?: string | null;
  studentId?: string | null;
  applicationId?: string | null;
  isEscalated: boolean;
  escalatedAt?: string | null;
  escalationReason?: string | null;
  rescheduledFrom?: string | null;
  rescheduledReason?: string | null;
  completedAt?: string | null;
  completionNotes?: string | null;
  completionOutcome?: string | null;
  createdAt: string;
  updatedAt: string;
  User?: {
    id: string;
    fullName: string;
    email: string;
  };
  creator?: {
    id: string;
    fullName: string;
  };
  completer?: {
    id: string;
    fullName: string;
  };
  escalatedTo?: {
    id: string;
    fullName: string;
  };
  lead?: {
    id: string;
    fullName: string;
    mobile: string;
    preferredCourse?: string;
    preferredCollege?: string;
    state?: string;
    district?: string;
  };
  student?: {
    id: string;
    fullName: string;
    email: string;
    mobile?: string;
  };
  application?: {
    id: string;
    applicationNumber: string;
    status: string;
    course?: { name: string };
    college?: { name: string };
  };
}

export interface TaskStats {
  totalTasks: number;
  activeTotal: number;
  dueToday: number;
  overdue: number;
  upcoming: number;
  completed: number;
  escalated: number;
  completionRate: number;
}

export interface CounselorWorkload {
  counselorId: string;
  fullName: string;
  email: string;
  employeeId: string;
  department: string;
  openTasks: number;
  dueToday: number;
  overdue: number;
  completedThisWeek: number;
  totalAssignedTasks: number;
  completionRatePct: number;
  capacityStatus: 'NORMAL' | 'HIGH_LOAD' | 'FULL';
}

export interface TaskQueryParams {
  status?: string;
  priority?: string;
  contextType?: string;
  search?: string;
  counselorId?: string;
  leadId?: string;
  studentId?: string;
  applicationId?: string;
  dateFilter?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const tasksApi = {
  create: (data: {
    title: string;
    description?: string;
    assignedTo: string;
    dueDate: string;
    priority?: string;
    contextType?: string;
    leadId?: string;
    studentId?: string;
    applicationId?: string;
    paymentId?: string;
    type?: string;
  }) => api.post('/tasks', data),

  getMyTasks: (params?: TaskQueryParams) =>
    api.get<{ data: TaskItem[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      '/tasks/my',
      { params },
    ),

  getTeamTasks: (params?: TaskQueryParams) =>
    api.get<{ data: TaskItem[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      '/tasks/team',
      { params },
    ),

  getAdminTasks: (params?: TaskQueryParams) =>
    api.get<{ data: TaskItem[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      '/tasks/all',
      { params },
    ),

  getStats: () => api.get<TaskStats>('/tasks/stats'),

  getTeamWorkload: () => api.get<CounselorWorkload[]>('/tasks/team-workload'),

  complete: (id: string, data: { outcome?: string; notes?: string; nextFollowUpDate?: string }) =>
    api.patch(`/tasks/${id}/complete`, data),

  reschedule: (id: string, data: { newDueDate: string; reason: string }) =>
    api.patch(`/tasks/${id}/reschedule`, data),

  reassign: (id: string, data: { newAssignedToId: string; reason: string }) =>
    api.patch(`/tasks/${id}/reassign`, data),

  cancel: (id: string, reason: string) =>
    api.patch(`/tasks/${id}/cancel`, { reason }),

  runEscalations: () => api.post('/tasks/run-escalations'),
};
