const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// 1. Process id and updatedAt line by line
let lines = content.split(/\r?\n/);
let processedLines = [];
let currentModel = null;

for (let line of lines) {
  let trimmed = line.trim();
  
  if (trimmed.startsWith('model ')) {
    currentModel = trimmed.split(' ')[1];
  } else if (trimmed === '}') {
    currentModel = null;
  }

  // Add @default(cuid()) to id lines
  if (currentModel && /^\s*id\s+String\s+@id\b/.test(line)) {
    if (!line.includes('@default(')) {
      line = line.replace(/(@id)/, '$1 @default(cuid())');
    }
  }

  // Add @updatedAt to updatedAt lines
  if (currentModel && /^\s*updatedAt\s+DateTime\b/.test(line)) {
    if (!line.includes('@updatedAt')) {
      if (!line.includes('@default(')) {
        line = line.replace(/(DateTime)/, '$1 @default(now()) @updatedAt');
      } else {
        line = line + ' @updatedAt';
      }
    }
  }

  processedLines.push(line);
}

let schema = processedLines.join('\n');

function transformModel(modelName, transformer) {
  const regex = new RegExp(`model\\s+${modelName}\\s+\\{([\\s\\S]*?)\\n\\}`);
  schema = schema.replace(regex, (match, body) => {
    return `model ${modelName} {${transformer(body)}\n}`;
  });
}

// User
transformModel('User', (body) => {
  let b = body;
  b = b.replace(/StudentProfile\s+StudentProfile\?/g, 'profile                                                           StudentProfile?');
  b = b.replace(/StudentPreference\s+StudentPreference\?/g, 'studentPreference                                                 StudentPreference?');
  b = b.replace(/Application_Application_userIdToUser\s+Application\[\]/g, 'applications                                                      Application[]');
  b = b.replace(/Application_Application_counselorIdToUser\s+Application\[\]/g, 'counseledApplications                                             Application[]');
  b = b.replace(/Notification\s+Notification\[\]/g, 'notifications                                                     Notification[]');
  b = b.replace(/Task\s+Task\[\]/g, 'assignedTasks                                                         Task[]');
  b = b.replace(/AuditLog\s+AuditLog\[\]/g, 'auditLogs                                                             AuditLog[]');
  b = b.replace(/Lead\s+Lead\[\]/g, 'assignedLeads                                                     Lead[]');
  b = b.replace(/LeadActivity\s+LeadActivity\[\]/g, 'leadActivities                                                    LeadActivity[]');
  b = b.replace(/LeadNote\s+LeadNote\[\]/g, 'leadNotes                                                         LeadNote[]');
  b = b.replace(/Document_Document_userIdToUser\s+Document\[\]/g, 'documents                                                         Document[]');
  b = b.replace(/Document_Document_counselorIdToUser\s+Document\[\]/g, 'counselorDocuments                                                Document[]');
  b = b.replace(/Document_Document_verifiedByToUser\s+Document\[\]/g, 'verifiedDocuments                                                 Document[]');
  b = b.replace(/Payment_Payment_userIdToUser\s+Payment\[\]/g, 'payments                                                          Payment[]');
  b = b.replace(/Payment_Payment_counselorIdToUser\s+Payment\[\]/g, 'counselorPayments                                                 Payment[]');
  b = b.replace(/Payment_Payment_verifiedByToUser\s+Payment\[\]/g, 'verifiedPayments                                                  Payment[]');
  b = b.replace(/UserRole\s+UserRole\[\]/g, 'userRoles                                                         UserRole[]');
  b = b.replace(/CounselorProfile_CounselorProfile_userIdToUser\s+CounselorProfile\?/g, 'counselorProfile                                                  CounselorProfile?');
  b = b.replace(/CounselorAssignment_CounselorAssignment_counselorIdToUser\s+CounselorAssignment\[\]/g, 'counselorAssignments                                              CounselorAssignment[]');
  b = b.replace(/CounselorAssignment_CounselorAssignment_assignedByToUser\s+CounselorAssignment\[\]/g, 'assignedCounselorAssignments                                      CounselorAssignment[]');
  b = b.replace(/Department_User_departmentIdToDepartment\s+Department\?/g, 'departmentEntity                                                   Department?');
  b = b.replace(/Department_Department_managerIdToUser\s+Department\[\]/g, 'managedDepartments                                                Department[]');
  b = b.replace(/Team_Team_managerIdToUser\s+Team\[\]/g, 'managedTeams                                                      Team[]');
  b = b.replace(/TeamMember\s+TeamMember\[\]/g, 'teamMemberships                                                   TeamMember[]');
  b = b.replace(/GeographicAssignment_GeographicAssignment_responsibleUserIdToUser\s+GeographicAssignment\[\]/g, 'primaryGeographicAssignments                                     GeographicAssignment[]');
  b = b.replace(/GeographicAssignment_GeographicAssignment_backupUserIdToUser\s+GeographicAssignment\[\]/g, 'backupGeographicAssignments                                      GeographicAssignment[]');
  b = b.replace(/FollowUpReminder\s+FollowUpReminder\[\]/g, 'reminders                                                         FollowUpReminder[]');
  b = b.replace(/SupportTicket_SupportTicket_counselorIdToUser\s+SupportTicket\[\]/g, 'counselorSupportTickets                                         SupportTicket[]');
  b = b.replace(/SupportTicket_SupportTicket_assignedToIdToUser\s+SupportTicket\[\]/g, 'assignedSupportTickets                                           SupportTicket[]');
  b = b.replace(/SupportTicket_SupportTicket_userIdToUser\s+SupportTicket\[\]\s+@relation\("SupportTicket_userIdToUser"\)/g, 'supportTickets                                                   SupportTicket[]          @relation("SupportTicket_userIdToUser")');
  b = b.replace(/User\s+User\?\s+@relation\("UserToUser", fields: \[assignedCounselorId\], references: \[id\]\)/g, 'assignedCounselor                                               User?                    @relation("UserCounselor", fields: [assignedCounselorId], references: [id])');
  b = b.replace(/other_User\s+User\[\]\s+@relation\("UserToUser"\)/g, 'assignedStudents                                                 User[]                   @relation("UserCounselor")');
  return b;
});

// College
transformModel('College', (body) => {
  let b = body;
  b = b.replace(/CollegeBankAccount\s+CollegeBankAccount\[\]/g, 'bankAccounts CollegeBankAccount[]');
  b = b.replace(/Course\s+Course\[\]/g, 'courses Course[]');
  b = b.replace(/Application\s+Application\[\]/g, 'applications Application[]');
  b = b.replace(/CollegeGallery\s+CollegeGallery\[\]/g, 'gallery CollegeGallery[]');
  b = b.replace(/CollegeReview\s+CollegeReview\[\]/g, 'reviews CollegeReview[]');
  b = b.replace(/FAQ\s+FAQ\[\]/g, 'faqs FAQ[]');
  b = b.replace(/Lead\s+Lead\[\]/g, 'leads Lead[]');
  return b;
});

// CounselorProfile
transformModel('CounselorProfile', (body) => {
  let b = body;
  b = b.replace(/User_CounselorProfile_reportingManagerIdToUser\s+User\?/g, 'reportingManager User?');
  b = b.replace(/User_CounselorProfile_userIdToUser\s+User/g, 'user User');
  b = b.replace(/CounselorActivityLog\s+CounselorActivityLog\[\]/g, 'counselorActivities CounselorActivityLog[]');
  b = b.replace(/CounselorAttendance\s+CounselorAttendance\[\]/g, 'counselorAttendance CounselorAttendance[]');
  b = b.replace(/CounselorCommission\s+CounselorCommission\[\]/g, 'counselorCommissions CounselorCommission[]');
  b = b.replace(/CounselorMeeting\s+CounselorMeeting\[\]/g, 'counselorMeetings CounselorMeeting[]');
  return b;
});

// CounselorCommission
transformModel('CounselorCommission', (body) => {
  let b = body;
  b = b.replace(/CounselorProfile\s+CounselorProfile\s+@relation/g, 'counselor CounselorProfile @relation');
  b = b.replace(/User\s+User\s+@relation/g, 'counselor User @relation');
  return b;
});

// CounselorActivityLog
transformModel('CounselorActivityLog', (body) => {
  let b = body;
  b = b.replace(/CounselorProfile\s+CounselorProfile\s+@relation/g, 'counselor CounselorProfile @relation');
  b = b.replace(/User\s+User\s+@relation/g, 'counselor User @relation');
  return b;
});

// CounselorMeeting
transformModel('CounselorMeeting', (body) => {
  let b = body;
  b = b.replace(/CounselorProfile\s+CounselorProfile\s+@relation/g, 'counselor CounselorProfile @relation');
  return b;
});

// CounselorAttendance
transformModel('CounselorAttendance', (body) => {
  let b = body;
  b = b.replace(/CounselorProfile\s+CounselorProfile\s+@relation/g, 'counselor CounselorProfile @relation');
  return b;
});

// Blog
transformModel('Blog', (body) => {
  let b = body;
  b = b.replace(/BlogRevision\s+BlogRevision\[\]/g, 'revisions BlogRevision[]');
  b = b.replace(/User\s+User\??\s+@relation/g, 'author User? @relation');
  b = b.replace(/College\s+College\?\s+@relation/g, 'college College? @relation');
  b = b.replace(/Course\s+Course\?\s+@relation/g, 'course Course? @relation');
  b = b.replace(/Exam\s+Exam\?\s+@relation/g, 'exam Exam? @relation');
  b = b.replace(/Scholarship\s+Scholarship\?\s+@relation/g, 'scholarship Scholarship? @relation');
  return b;
});

// Career
transformModel('Career', (body) => {
  let b = body;
  b = b.replace(/CareerCourse\s+CareerCourse\[\]/g, 'courses CareerCourse[]');
  return b;
});

// AIConversation
transformModel('AIConversation', (body) => {
  let b = body;
  b = b.replace(/AIMessage\s+AIMessage\[\]/g, 'messages AIMessage[]');
  b = b.replace(/AIMemory\s+AIMemory\?/g, 'memory AIMemory?');
  b = b.replace(/AIEscalation\s+AIEscalation\[\]/g, 'escalations AIEscalation[]');
  b = b.replace(/AIFeedback\s+AIFeedback\[\]/g, 'feedbacks AIFeedback[]');
  b = b.replace(/AIRecommendation\s+AIRecommendation\[\]/g, 'recommendations AIRecommendation[]');
  b = b.replace(/User\s+User\??\s+@relation/g, 'user User @relation');
  return b;
});

// AIUsage
transformModel('AIUsage', (body) => {
  let b = body;
  b = b.replace(/User\s+User\??\s+@relation/g, 'user User? @relation');
  return b;
});

// AIKnowledgeDocument
transformModel('AIKnowledgeDocument', (body) => {
  let b = body;
  b = b.replace(/AIChunk\s+AIChunk\[\]/g, 'chunks AIChunk[]');
  return b;
});

// AIChunk
transformModel('AIChunk', (body) => {
  let b = body;
  b = b.replace(/AIKnowledgeDocument\s+AIKnowledgeDocument\??\s+@relation/g, 'document AIKnowledgeDocument? @relation');
  return b;
});

// SavedRecommendation
transformModel('SavedRecommendation', (body) => {
  let b = body;
  b = b.replace(/College\s+College\s+@relation/g, 'college College @relation');
  b = b.replace(/Course\s+Course\s+@relation/g, 'course Course @relation');
  b = b.replace(/User\s+User\s+@relation/g, 'user User @relation');
  return b;
});

// Department
transformModel('Department', (body) => {
  let b = body;
  b = b.replace(/User_Department_createdByIdToUser\s+User\?/g, 'createdBy User?');
  b = b.replace(/User_Department_managerIdToUser\s+User\?/g, 'manager User?');
  b = b.replace(/Department\s+Department\?\s+@relation\("DepartmentToDepartment", fields: \[parentDepartmentId\], references: \[id\]\)/g, 'parentDepartment Department? @relation("DepartmentToDepartment", fields: [parentDepartmentId], references: [id])');
  b = b.replace(/other_Department\s+Department\[\]\s+@relation\("DepartmentToDepartment"\)/g, 'childDepartments Department[] @relation("DepartmentToDepartment")');
  b = b.replace(/RoleEntity\s+RoleEntity\[\]/g, 'roles RoleEntity[]');
  b = b.replace(/Team\s+Team\[\]/g, 'teams Team[]');
  b = b.replace(/User_User_departmentIdToDepartment\s+User\[\]/g, 'users User[]');
  return b;
});

// FeeHead
transformModel('FeeHead', (body) => {
  b = body.replace(/College\s+College\?\s+@relation\(fields:\s*\[applicableCollegeId\]/g, 'applicableCollege College? @relation(fields: [applicableCollegeId]');
  b = b.replace(/Course\s+Course\?\s+@relation\(fields:\s*\[applicableCourseId\]/g, 'applicableCourse Course? @relation(fields: [applicableCourseId]');
  return b;
});

// PaymentRequest
transformModel('PaymentRequest', (body) => {
  let b = body;
  b = b.replace(/User\s+User\s+@relation\(fields:\s*\[studentId\]/g, 'student User @relation(fields: [studentId]');
  b = b.replace(/College\s+College\?\s+@relation/g, 'college College? @relation');
  b = b.replace(/Course\s+Course\?\s+@relation/g, 'course Course? @relation');
  b = b.replace(/CollegeBankAccount\s+CollegeBankAccount\?\s+@relation/g, 'collegeBank CollegeBankAccount? @relation');
  b = b.replace(/Application\s+Application\?\s+@relation/g, 'application Application? @relation');
  b = b.replace(/Payment\s+Payment\[\]/g, 'payments Payment[]');
  return b;
});

// PaymentTimelineEvent
transformModel('PaymentTimelineEvent', (body) => {
  let b = body;
  b = b.replace(/User\s+User\?\s+@relation\(fields:\s*\[userId\]/g, 'user User? @relation(fields: [userId]');
  b = b.replace(/Payment\s+Payment\s+@relation/g, 'payment Payment @relation');
  return b;
});

// PaymentVerification
transformModel('PaymentVerification', (body) => {
  let b = body;
  b = b.replace(/Payment\s+Payment\s+@relation/g, 'payment Payment @relation');
  b = b.replace(/User\s+User\?\s+@relation\(fields:\s*\[reviewerId\]/g, 'reviewer User? @relation(fields: [reviewerId]');
  return b;
});

// FinancialLedger
transformModel('FinancialLedger', (body) => {
  let b = body;
  b = b.replace(/Payment\s+Payment\?\s+@relation/g, 'payment Payment? @relation');
  return b;
});

// Scholarship
transformModel('Scholarship', (body) => {
  let b = body;
  b = b.replace(/Payment\s+Payment\[\]/g, 'payments Payment[]');
  return b;
});

// AIRecommendation
transformModel('AIRecommendation', (body) => {
  let b = body;
  b = b.replace(/College\s+College\??\s+@relation/g, 'college College? @relation');
  b = b.replace(/Course\s+Course\??\s+@relation/g, 'course Course? @relation');
  b = b.replace(/User\s+User\??\s+@relation/g, 'user User? @relation');
  return b;
});

// CollegeReview
transformModel('CollegeReview', (body) => {
  let b = body;
  b = b.replace(/College\s+College\s+@relation/g, 'college College @relation');
  b = b.replace(/User\s+User\s+@relation/g, 'user User @relation');
  return b;
});

// CareerCourse
transformModel('CareerCourse', (body) => {
  let b = body;
  b = b.replace(/Career\s+Career\s+@relation/g, 'career Career @relation');
  b = b.replace(/Course\s+Course\s+@relation/g, 'course Course @relation');
  return b;
});

// CourseExam
transformModel('CourseExam', (body) => {
  let b = body;
  b = b.replace(/Course\s+Course\s+@relation/g, 'course Course @relation');
  b = b.replace(/Exam\s+Exam\s+@relation/g, 'exam Exam @relation');
  return b;
});

// Exam
transformModel('Exam', (body) => {
  let b = body;
  b = b.replace(/CourseExam\s+CourseExam\[\]/g, 'courses CourseExam[]');
  return b;
});

// FAQ
transformModel('FAQ', (body) => {
  let b = body;
  b = b.replace(/College\s+College\?\s+@relation/g, 'college College? @relation');
  b = b.replace(/Course\s+Course\?\s+@relation/g, 'course Course? @relation');
  b = b.replace(/Exam\s+Exam\?\s+@relation/g, 'exam Exam? @relation');
  b = b.replace(/Scholarship\s+Scholarship\?\s+@relation/g, 'scholarship Scholarship? @relation');
  b = b.replace(/Blog\s+Blog\?\s+@relation/g, 'blog Blog? @relation');
  b = b.replace(/StudyMaterial\s+StudyMaterial\?\s+@relation/g, 'studyMaterial StudyMaterial? @relation');
  return b;
});

// LeadActivity
transformModel('LeadActivity', (body) => {
  let b = body;
  b = b.replace(/User\s+User\??\s+@relation/g, 'user User? @relation');
  b = b.replace(/Lead\s+Lead\s+@relation/g, 'lead Lead @relation');
  return b;
});

// LeadNote
transformModel('LeadNote', (body) => {
  let b = body;
  b = b.replace(/User\s+User\??\s+@relation/g, 'user User @relation');
  b = b.replace(/Lead\s+Lead\s+@relation/g, 'lead Lead @relation');
  return b;
});

// Campaign
transformModel('Campaign', (body) => {
  let b = body;
  b = b.replace(/CampaignLead\s+CampaignLead\[\]/g, 'leads CampaignLead[]');
  b = b.replace(/LandingPage\s+LandingPage\[\]/g, 'landingPages LandingPage[]');
  b = b.replace(/ReferralCampaign\s+ReferralCampaign\[\]/g, 'referrals ReferralCampaign[]');
  return b;
});

// CampaignLead
transformModel('CampaignLead', (body) => {
  let b = body;
  b = b.replace(/Campaign\s+Campaign\s+@relation/g, 'campaign Campaign @relation');
  b = b.replace(/Lead\s+Lead\s+@relation/g, 'lead Lead @relation');
  return b;
});

// LandingPage
transformModel('LandingPage', (body) => {
  let b = body;
  b = b.replace(/Campaign\s+Campaign\?\s+@relation/g, 'campaign Campaign? @relation');
  return b;
});

// ReferralCampaign
transformModel('ReferralCampaign', (body) => {
  let b = body;
  b = b.replace(/Campaign\s+Campaign\?\s+@relation/g, 'campaign Campaign? @relation');
  b = b.replace(/User\s+User\?\s+@relation\(fields:\s*\[studentId\]/g, 'student User? @relation(fields: [studentId]');
  return b;
});

// Notification
transformModel('Notification', (body) => {
  let b = body;
  b = b.replace(/User\s+User\??\s+@relation/g, 'user User? @relation');
  return b;
});

// Lead
transformModel('Lead', (body) => {
  let b = body;
  b = b.replace(/College\s+College\?\s+@relation\(fields:\s*\[collegeId\]/g, 'collegeRel College? @relation(fields: [collegeId]');
  b = b.replace(/Course\s+Course\?\s+@relation\(fields:\s*\[courseId\]/g, 'courseRel Course? @relation(fields: [courseId]');
  b = b.replace(/District\s+District\?\s+@relation\(fields:\s*\[districtId\]/g, 'districtRel District? @relation(fields: [districtId]');
  b = b.replace(/State\s+State\?\s+@relation\(fields:\s*\[stateId\]/g, 'stateRel State? @relation(fields: [stateId]');
  b = b.replace(/LeadActivity\s+LeadActivity\[\]/g, 'activities LeadActivity[]');
  b = b.replace(/LeadNote\s+LeadNote\[\]/g, 'notes LeadNote[]');
  b = b.replace(/CounselorAssignment\s+CounselorAssignment\[\]/g, 'assignments CounselorAssignment[]');
  b = b.replace(/FollowUpReminder\s+FollowUpReminder\[\]/g, 'reminders FollowUpReminder[]');
  b = b.replace(/User\s+User\?\s+@relation\(fields:\s*\[assignedCounselorId\]/g, 'assignedCounselor User? @relation(fields: [assignedCounselorId]');
  return b;
});

// Application
transformModel('Application', (body) => {
  let b = body;
  b = b.replace(/College\s+College\s+@relation/g, 'college College @relation');
  b = b.replace(/Course\s+Course\s+@relation/g, 'course Course @relation');
  b = b.replace(/User_Application_userIdToUser\s+User/g, 'user User');
  b = b.replace(/User_Application_counselorIdToUser\s+User\?/g, 'counselor User?');
  b = b.replace(/ApplicationTimeline\s+ApplicationTimeline\[\]/g, 'timeline ApplicationTimeline[]');
  b = b.replace(/Document\s+Document\[\]/g, 'documents Document[]');
  b = b.replace(/Payment\s+Payment\[\]/g, 'payments Payment[]');
  return b;
});

// ApplicationTimeline
transformModel('ApplicationTimeline', (body) => {
  let b = body;
  b = b.replace(/Application\s+Application\s+@relation/g, 'application Application @relation');
  b = b.replace(/User\s+User\??\s+@relation/g, 'user User? @relation');
  return b;
});

// Course
transformModel('Course', (body) => {
  let b = body;
  b = b.replace(/College\s+College\s+@relation/g, 'college College @relation');
  b = b.replace(/Application\s+Application\[\]/g, 'applications Application[]');
  b = b.replace(/Document\s+Document\[\]/g, 'documents Document[]');
  b = b.replace(/Payment\s+Payment\[\]/g, 'payments Payment[]');
  b = b.replace(/Lead\s+Lead\[\]/g, 'leads Lead[]');
  b = b.replace(/CourseExam\s+CourseExam\[\]/g, 'exams CourseExam[]');
  b = b.replace(/CareerCourse\s+CareerCourse\[\]/g, 'careers CareerCourse[]');
  return b;
});

// Document
transformModel('Document', (body) => {
  let b = body;
  b = b.replace(/User_Document_verifiedByToUser\s+User\?/g, 'verifier User?');
  b = b.replace(/User_Document_counselorIdToUser\s+User\?/g, 'counselor User?');
  b = b.replace(/User_Document_userIdToUser\s+User/g, 'user User');
  b = b.replace(/College\s+College\?\s+@relation/g, 'college College? @relation');
  b = b.replace(/Course\s+Course\?\s+@relation/g, 'course Course? @relation');
  b = b.replace(/Application\s+Application\?\s+@relation\(fields:\s*\[applicationId\]/g, 'application Application? @relation(fields: [applicationId]');
  b = b.replace(/DocumentHistory\s+DocumentHistory\[\]/g, 'history DocumentHistory[]');
  return b;
});

// DocumentHistory
transformModel('DocumentHistory', (body) => {
  let b = body;
  b = b.replace(/User\s+User\?\s+@relation/g, 'user User? @relation');
  b = b.replace(/Document\s+Document\s+@relation/g, 'document Document @relation');
  return b;
});

// Payment
transformModel('Payment', (body) => {
  let b = body;
  b = b.replace(/User_Payment_userIdToUser\s+User/g, 'user User');
  b = b.replace(/User_Payment_counselorIdToUser\s+User\?/g, 'counselor User?');
  b = b.replace(/College\s+College\?\s+@relation\(fields:\s*\[collegeId\]/g, 'college College? @relation(fields: [collegeId]');
  b = b.replace(/Course\s+Course\?\s+@relation\(fields:\s*\[courseId\]/g, 'course Course? @relation(fields: [courseId]');
  b = b.replace(/Application\s+Application\?\s+@relation\(fields:\s*\[applicationId\]/g, 'application Application? @relation(fields: [applicationId]');
  b = b.replace(/PaymentRequest\s+PaymentRequest\?\s+@relation\(fields:\s*\[requestId\]/g, 'request PaymentRequest? @relation(fields: [requestId]');
  b = b.replace(/User_Payment_verifiedByToUser\s+User\?\s+@relation\("Payment_verifiedByToUser", fields: \[verifiedBy\]/g, 'verifier User? @relation("Payment_verifiedByToUser", fields: [verifiedBy]');
  b = b.replace(/PaymentVerification\s+PaymentVerification\[\]/g, 'verifications PaymentVerification[]');
  b = b.replace(/PaymentTimelineEvent\s+PaymentTimelineEvent\[\]/g, 'timelineEvents PaymentTimelineEvent[]');
  b = b.replace(/Scholarship\s+Scholarship\?\s+@relation/g, 'scholarship Scholarship? @relation');
  b = b.replace(/CollegeBankAccount\s+CollegeBankAccount\?\s+@relation/g, 'collegeBank CollegeBankAccount? @relation');
  b = b.replace(/FinancialLedger\s+FinancialLedger\[\]/g, 'ledgerEntries FinancialLedger[]');
  b = b.replace(/Lead\s+Lead\?\s+@relation/g, 'lead Lead? @relation');
  return b;
});

// StudentNote
transformModel('StudentNote', (body) => {
  let b = body;
  b = b.replace(/User_StudentNote_authorIdToUser\s+User/g, 'author User');
  b = b.replace(/User_StudentNote_studentIdToUser\s+User/g, 'student User');
  return b;
});

// StudentCommunication
transformModel('StudentCommunication', (body) => {
  let b = body;
  b = b.replace(/User_StudentCommunication_senderIdToUser\s+User/g, 'sender User');
  b = b.replace(/User_StudentCommunication_studentIdToUser\s+User/g, 'student User');
  return b;
});

// CounselorAssignment
transformModel('CounselorAssignment', (body) => {
  let b = body;
  b = b.replace(/Lead\s+Lead\s+@relation/g, 'lead Lead @relation');
  b = b.replace(/User_CounselorAssignment_counselorIdToUser\s+User/g, 'counselor User');
  b = b.replace(/User_CounselorAssignment_assignedByToUser\s+User\?/g, 'assigner User?');
  return b;
});

// StudyMaterial
transformModel('StudyMaterial', (body) => {
  let b = body;
  b = b.replace(/College\s+College\?\s+@relation/g, 'college College? @relation');
  b = b.replace(/Course\s+Course\?\s+@relation/g, 'course Course? @relation');
  b = b.replace(/Exam\s+Exam\?\s+@relation/g, 'exam Exam? @relation');
  return b;
});

// SupportTicket
transformModel('SupportTicket', (body) => {
  let b = body;
  b = b.replace(/SupportAttachment\s+SupportAttachment\[\]/g, 'attachments SupportAttachment[]');
  b = b.replace(/SupportAudit\s+SupportAudit\[\]/g, 'audits SupportAudit[]');
  b = b.replace(/SupportFeedback\s+SupportFeedback\?/g, 'feedback SupportFeedback?');
  b = b.replace(/SupportMessage\s+SupportMessage\[\]/g, 'messages SupportMessage[]');
  b = b.replace(/User_SupportTicket_assignedToIdToUser\s+User\?/g, 'assignedTo User?');
  b = b.replace(/User_SupportTicket_counselorIdToUser\s+User\?/g, 'counselor User?');
  b = b.replace(/SupportDepartment\s+SupportDepartment\?/g, 'department SupportDepartment?');
  b = b.replace(/User_SupportTicket_userIdToUser\s+User/g, 'user User');
  return b;
});

// SupportMessage
transformModel('SupportMessage', (body) => {
  let b = body;
  b = b.replace(/SupportTicket\s+SupportTicket\s+@relation/g, 'ticket SupportTicket @relation');
  b = b.replace(/User\s+User\s+@relation\(fields:\s*\[senderId\]/g, 'sender User @relation(fields: [senderId]');
  b = b.replace(/SupportAttachment\s+SupportAttachment\[\]/g, 'attachments SupportAttachment[]');
  return b;
});

// GovernanceRequest
transformModel('GovernanceRequest', (body) => {
  let b = body;
  b = b.replace(/User_GovernanceRequest_approvedByIdToUser\s+User\?/g, 'approvedBy User?');
  b = b.replace(/User_GovernanceRequest_requestedByIdToUser\s+User\?/g, 'requestedBy User?');
  b = b.replace(/RoleEntity\s+RoleEntity\?\s+@relation\(fields:\s*\[targetRoleId\]/g, 'targetRole RoleEntity? @relation(fields: [targetRoleId]');
  return b;
});

// GeographicAssignment
transformModel('GeographicAssignment', (body) => {
  let b = body;
  b = b.replace(/User_GeographicAssignment_backupUserIdToUser\s+User\?/g, 'backupUser User?');
  b = b.replace(/User_GeographicAssignment_createdByIdToUser\s+User\?/g, 'createdBy User?');
  b = b.replace(/District\s+District\?\s+@relation/g, 'district District? @relation');
  b = b.replace(/User_GeographicAssignment_responsibleUserIdToUser\s+User/g, 'responsibleUser User');
  b = b.replace(/State\s+State\s+@relation/g, 'state State @relation');
  return b;
});

// Team
transformModel('Team', (body) => {
  let b = body;
  b = b.replace(/TeamMember\s+TeamMember\[\]/g, 'members TeamMember[]');
  b = b.replace(/other_Team\s+Team\[\]\s+@relation\("TeamToTeam"\)/g, 'childTeams Team[] @relation("TeamToTeam")');
  b = b.replace(/Team\s+Team\?\s+@relation\("TeamToTeam", fields: \[parentTeamId\], references: \[id\]\)/g, 'parentTeam Team? @relation("TeamToTeam", fields: [parentTeamId], references: [id])');
  b = b.replace(/Department\s+Department\s+@relation/g, 'department Department @relation');
  b = b.replace(/User_Team_managerIdToUser\s+User\?/g, 'manager User?');
  b = b.replace(/User_Team_createdByIdToUser\s+User\?/g, 'createdBy User?');
  return b;
});

// TeamMember
transformModel('TeamMember', (body) => {
  let b = body;
  b = b.replace(/Team\s+Team\s+@relation\(fields:\s*\[teamId\]/g, 'team Team @relation(fields: [teamId]');
  b = b.replace(/User\s+User\s+@relation\(fields:\s*\[userId\]/g, 'user User @relation(fields: [userId]');
  return b;
});

// State & District
transformModel('State', (body) => {
  let b = body;
  b = b.replace(/District\s+District\[\]/g, 'districts District[]');
  b = b.replace(/Lead\s+Lead\[\]/g, 'leads Lead[]');
  b = b.replace(/GeographicAssignment\s+GeographicAssignment\[\]/g, 'assignments GeographicAssignment[]');
  return b;
});

transformModel('District', (body) => {
  let b = body;
  b = b.replace(/State\s+State\s+@relation/g, 'state State @relation');
  b = b.replace(/Lead\s+Lead\[\]/g, 'leads Lead[]');
  b = b.replace(/GeographicAssignment\s+GeographicAssignment\[\]/g, 'assignments GeographicAssignment[]');
  return b;
});

// Role & Permission
transformModel('RoleEntity', (body) => {
  let b = body;
  b = b.replace(/RoleEntity\s+RoleEntity\?\s+@relation\("RoleEntityToRoleEntity"[^)]*\)/g, 'parentRole RoleEntity? @relation("RoleHierarchy", fields: [parentRoleId], references: [id])');
  b = b.replace(/other_RoleEntity\s+RoleEntity\[\]\s+@relation\("RoleEntityToRoleEntity"\)/g, 'childRoles RoleEntity[] @relation("RoleHierarchy")');
  b = b.replace(/RoleAuditLog\s+RoleAuditLog\[\]/g, 'auditLogs RoleAuditLog[]');
  b = b.replace(/RolePermission\s+RolePermission\[\]/g, 'permissions RolePermission[]');
  b = b.replace(/UserRole\s+UserRole\[\]/g, 'userRoles UserRole[]');
  b = b.replace(/StateRestriction\s+StateRestriction\[\]/g, 'stateRestrictions StateRestriction[]');
  b = b.replace(/PermissionPolicy\s+PermissionPolicy\[\]/g, 'permissionPolicies PermissionPolicy[]');
  b = b.replace(/GovernanceRequest\s+GovernanceRequest\[\]/g, 'governanceRequests GovernanceRequest[]');
  return b;
});

transformModel('RoleAuditLog', (body) => {
  let b = body;
  b = b.replace(/RoleEntity\s+RoleEntity\?\s+@relation/g, 'role RoleEntity? @relation');
  b = b.replace(/User\s+User\?\s+@relation/g, 'user User? @relation');
  return b;
});

transformModel('Permission', (body) => {
  let b = body;
  b = b.replace(/RolePermission\s+RolePermission\[\]/g, 'permissions RolePermission[]');
  b = b.replace(/PermissionPolicy\s+PermissionPolicy\[\]/g, 'policies PermissionPolicy[]');
  return b;
});

transformModel('PermissionPolicy', (body) => {
  let b = body;
  b = b.replace(/Permission\s+Permission\s+@relation/g, 'permission Permission @relation');
  b = b.replace(/RoleEntity\s+RoleEntity\s+@relation/g, 'role RoleEntity @relation');
  return b;
});

transformModel('StateRestriction', (body) => {
  let b = body;
  b = b.replace(/RoleEntity\s+RoleEntity\s+@relation/g, 'role RoleEntity @relation');
  return b;
});

transformModel('RolePermission', (body) => {
  let b = body;
  b = b.replace(/Permission\s+Permission\s+@relation/g, 'permission Permission @relation');
  b = b.replace(/RoleEntity\s+RoleEntity\s+@relation/g, 'role RoleEntity @relation');
  return b;
});

transformModel('UserRole', (body) => {
  let b = body;
  b = b.replace(/RoleEntity\s+RoleEntity\s+@relation/g, 'role RoleEntity @relation');
  b = b.replace(/User\s+User\s+@relation/g, 'user User @relation');
  return b;
});

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Successfully enhanced schema.prisma with model-scoped transformations!');
