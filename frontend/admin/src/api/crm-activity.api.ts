import api from './axios';

export interface TimelineEventItem {
  id: string;
  source: string;
  channel: string; // CALL, WHATSAPP, SMS, EMAIL, MEETING, NOTE, FOLLOW_UP, SYSTEM_EVENT
  category: 'STAFF_ACTIVITY' | 'SYSTEM_EVENT';
  direction: 'OUTBOUND' | 'INBOUND' | 'INTERNAL' | 'SYSTEM';
  title: string;
  content?: string | null;
  callOutcome?: string | null;
  callDurationSecs?: number | null;
  meetingMode?: string | null;
  meetingOutcome?: string | null;
  visibility: 'INTERNAL' | 'STUDENT_VISIBLE';
  actorName: string;
  actorRole?: string | null;
  metadata?: any;
  timestamp: string;
}

export interface CrmActivityQueryParams {
  channel?: string;
  category?: string;
  visibility?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const crmActivityApi = {
  logActivity: (data: {
    leadId?: string;
    studentId?: string;
    applicationId?: string;
    channel: string;
    direction?: string;
    category?: string;
    title: string;
    content?: string;
    callOutcome?: string;
    callDurationSecs?: number;
    meetingMode?: string;
    meetingOutcome?: string;
    visibility?: string;
    metadata?: any;
    occurredAt?: string;
  }) => api.post('/crm-activity', data),

  logCall: (data: {
    leadId?: string;
    studentId?: string;
    applicationId?: string;
    outcome: string; // CONNECTED, NO_ANSWER, BUSY, CALL_BACK_REQUESTED, WRONG_NUMBER, INTERESTED, NOT_INTERESTED, CONVERTED
    durationSecs?: number;
    notes?: string;
    direction?: string;
    nextFollowUpDate?: string;
    nextFollowUpTitle?: string;
    occurredAt?: string;
  }) => api.post('/crm-activity/call', data),

  logMeeting: (data: {
    leadId?: string;
    studentId?: string;
    applicationId?: string;
    title: string;
    mode?: string;
    purpose?: string;
    outcome?: string;
    notes?: string;
    durationMins?: number;
    nextFollowUpDate?: string;
    occurredAt?: string;
  }) => api.post('/crm-activity/meeting', data),

  getTimeline: (
    contextType: 'LEAD' | 'STUDENT' | 'APPLICATION',
    contextId: string,
    params?: CrmActivityQueryParams,
  ) =>
    api.get<{
      data: TimelineEventItem[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/crm-activity/timeline/${contextType}/${contextId}`, { params }),

  voidActivity: (id: string, reason: string) =>
    api.patch(`/crm-activity/${id}/void`, { reason }),
};
