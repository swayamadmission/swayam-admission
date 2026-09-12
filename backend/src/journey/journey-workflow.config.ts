export interface WorkflowMilestoneConfig {
  id: string;
  priority: number;
  title: string;
  label: string;
  level: 'STUDENT' | 'APPLICATION';
  descriptionPending: string;
  descriptionCompleted: string;
  isOptional?: boolean;
}

export const STUDENT_LEVEL_SEQUENCE: WorkflowMilestoneConfig[] = [
  {
    id: 'ACCOUNT_CREATED',
    priority: 1,
    title: 'Account Created',
    label: 'Account Created',
    level: 'STUDENT',
    descriptionPending: 'Register account.',
    descriptionCompleted: 'Account registered and welcome onboarding completed.',
  },
  {
    id: 'PROFILE_COMPLETED',
    priority: 2,
    title: 'Profile Completed',
    label: 'Profile Completed',
    level: 'STUDENT',
    descriptionPending: 'Fill in your stream and 12th marks.',
    descriptionCompleted: 'Personal and academic details recorded.',
  },
  {
    id: 'COUNSELOR_ASSIGNED',
    priority: 3,
    title: 'Counselor Assigned',
    label: 'Counselor Assigned',
    level: 'STUDENT',
    descriptionPending: 'Request personal counselor guidance.',
    descriptionCompleted: 'Assigned to Senior Educational Counselor.',
  },
  {
    id: 'DOCUMENT_UPLOADED',
    priority: 4,
    title: 'Documents Uploaded',
    label: 'Documents Uploaded',
    level: 'STUDENT',
    descriptionPending: 'Upload marksheets and identity proofs.',
    descriptionCompleted: 'Documents uploaded successfully.',
  },
  {
    id: 'DOCUMENT_VERIFIED',
    priority: 5,
    title: 'Documents Verified',
    label: 'Documents Verified',
    level: 'STUDENT',
    descriptionPending: 'Document verification pending.',
    descriptionCompleted: 'Documents verified by admission officers.',
  },
  {
    id: 'COLLEGE_SHORTLISTED',
    priority: 6,
    title: 'College Shortlisted',
    label: 'College Shortlisted',
    level: 'STUDENT',
    descriptionPending: 'Explore & shortlist preferred colleges.',
    descriptionCompleted: 'Colleges shortlisted with course and branch choices.',
  },
];

export const APPLICATION_LEVEL_SEQUENCE: WorkflowMilestoneConfig[] = [
  {
    id: 'APPLICATION_SUBMITTED',
    priority: 7,
    title: 'Application Submitted',
    label: 'Application Submitted',
    level: 'APPLICATION',
    descriptionPending: 'Submit application to target college.',
    descriptionCompleted: 'Application submitted successfully to target university.',
  },
  {
    id: 'APPLICATION_REVIEW',
    priority: 8,
    title: 'Application Under Review',
    label: 'Application Under Review',
    level: 'APPLICATION',
    descriptionPending: 'Pending application evaluation.',
    descriptionCompleted: 'Application being evaluated by college committee.',
  },
  {
    id: 'ADMISSION_APPROVED',
    priority: 9,
    title: 'Admission Approved',
    label: 'Admission Approved',
    level: 'APPLICATION',
    descriptionPending: 'Awaiting university decision.',
    descriptionCompleted: 'Admission approved by target university.',
  },
  {
    id: 'FEE_PAID',
    priority: 10,
    title: 'Fee Payment Completed',
    label: 'Fee Payment Completed',
    level: 'APPLICATION',
    descriptionPending: 'Pay registration / seat acceptance fee.',
    descriptionCompleted: 'Application fee payment verified successfully.',
  },
  {
    id: 'ADMISSION_CONFIRMED',
    priority: 11,
    title: 'Admission Confirmed',
    label: 'Admission Confirmed',
    level: 'APPLICATION',
    descriptionPending: 'Complete fee payment & offer acceptance to lock seat.',
    descriptionCompleted: 'Seat locked and enrollment ID generated.',
  },
  {
    id: 'COUNSELOR_REVIEW',
    priority: 12,
    title: 'Counselor Review',
    label: 'Counselor Review',
    level: 'APPLICATION',
    isOptional: true,
    descriptionPending: 'Share feedback about your counselor guidance (Optional).',
    descriptionCompleted: 'Counselor review submitted.',
  },
  {
    id: 'REPORTING_COMPLETED',
    priority: 13,
    title: 'Reporting Completed',
    label: 'Reporting Completed',
    level: 'APPLICATION',
    descriptionPending: 'Campus reporting pending.',
    descriptionCompleted: 'Physical / online reporting completed.',
  },
  {
    id: 'COLLEGE_REVIEW',
    priority: 14,
    title: 'College Review',
    label: 'College Review',
    level: 'APPLICATION',
    isOptional: true,
    descriptionPending: 'Share feedback about your college experience (Optional).',
    descriptionCompleted: 'College review submitted.',
  },
  {
    id: 'JOURNEY_COMPLETED',
    priority: 15,
    title: 'Journey Completed',
    label: 'Journey Completed',
    level: 'APPLICATION',
    descriptionPending: 'Complete all admission steps.',
    descriptionCompleted: 'Enrolled as student! Application journey complete.',
  },
];

export const ADMISSION_WORKFLOW_SEQUENCE: WorkflowMilestoneConfig[] = [
  ...STUDENT_LEVEL_SEQUENCE,
  ...APPLICATION_LEVEL_SEQUENCE,
];

export const CHECKPOINT_PRIORITY: Record<string, number> =
  ADMISSION_WORKFLOW_SEQUENCE.reduce(
    (acc, curr) => {
      acc[curr.id] = curr.priority;
      return acc;
    },
    {} as Record<string, number>,
  );
