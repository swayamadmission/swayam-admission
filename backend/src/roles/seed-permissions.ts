export interface PermissionSeed {
  module: string;
  resource: string;
  action: string;
  code: string;
  description: string;
  category: string;
  group: string;
}

export const ALL_35_MODULES = [
  {
    "id": "dashboard",
    "label": "Dashboard",
    "resource": "Dashboard",
    "category": "OVERVIEW",
    "group": "Overview"
  },
  {
    "id": "leads",
    "label": "Leads",
    "resource": "Lead",
    "category": "CRM",
    "group": "CRM & Staff",
    "singular": "lead"
  },
  {
    "id": "tasks",
    "label": "Tasks & Follow-ups",
    "resource": "Task",
    "category": "CRM",
    "group": "CRM & Staff",
    "singular": "task"
  },
  {
    "id": "students",
    "label": "Students",
    "resource": "Student",
    "category": "CRM",
    "group": "CRM & Staff",
    "singular": "student"
  },
  {
    "id": "referrals",
    "label": "Student Referrals & Rewards",
    "resource": "Referral",
    "category": "CRM",
    "group": "CRM & Staff",
    "singular": "referral"
  },
  {
    "id": "counselors",
    "label": "Counselors",
    "resource": "Counselor",
    "category": "CRM",
    "group": "CRM & Staff",
    "singular": "counselor"
  },
  {
    "id": "staff-onboarding",
    "label": "Staff Onboarding & KYC",
    "resource": "StaffOnboarding",
    "category": "CRM",
    "group": "CRM & Staff",
    "singular": "staff.onboard"
  },
  {
    "id": "applications",
    "label": "Applications",
    "resource": "Application",
    "category": "CRM",
    "group": "CRM & Staff",
    "singular": "application"
  },
  {
    "id": "reporting",
    "label": "Reporting & Enrollment",
    "resource": "ReportingEnrollment",
    "category": "CRM",
    "group": "CRM & Staff",
    "singular": "reporting"
  },
  {
    "id": "review-moderation",
    "label": "Reviews & Moderation",
    "resource": "ReviewModeration",
    "category": "CRM",
    "group": "CRM & Staff",
    "singular": "reviews"
  },
  {
    "id": "testimonials",
    "label": "Success Stories",
    "resource": "Testimonial",
    "category": "CONTENT",
    "group": "Content",
    "singular": "testimonial"
  },
  {
    "id": "college-portal",
    "label": "College Partner Portal",
    "resource": "CollegePortal",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal",
    "singular": "college-portal"
  },
  {
    "id": "college-rankings",
    "label": "College Rankings Engine",
    "resource": "CollegeRanking",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal",
    "singular": "rankings"
  },
  {
    "id": "colleges",
    "label": "Colleges Directory",
    "resource": "College",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal",
    "singular": "college"
  },
  {
    "id": "courses",
    "label": "Course Catalog",
    "resource": "Course",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal",
    "singular": "course"
  },
  {
    "id": "states",
    "label": "State Management",
    "resource": "StateManagement",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal",
    "singular": "state"
  },
  {
    "id": "exams",
    "label": "Exams",
    "resource": "Exam",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal",
    "singular": "exam"
  },
  {
    "id": "scholarships",
    "label": "Scholarships",
    "resource": "Scholarship",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal",
    "singular": "scholarship"
  },
  {
    "id": "materials",
    "label": "Study Materials",
    "resource": "StudyMaterial",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal",
    "singular": "material"
  },
  {
    "id": "blogs",
    "label": "Career & Admission Guides / CMS",
    "resource": "CareerGuideBlog",
    "category": "CONTENT",
    "group": "Content",
    "singular": "blog"
  },
  {
    "id": "faqs",
    "label": "FAQs",
    "resource": "FAQ",
    "category": "CONTENT",
    "group": "Content",
    "singular": "faq"
  },
  {
    "id": "documents",
    "label": "Documents",
    "resource": "Document",
    "category": "CONTENT",
    "group": "Content",
    "singular": "document"
  },
  {
    "id": "ai",
    "label": "AI Counselor",
    "resource": "AICounselor",
    "category": "INTELLIGENCE",
    "group": "Intelligence",
    "singular": "ai"
  },
  {
    "id": "analytics",
    "label": "Reports & Analytics",
    "resource": "Analytics",
    "category": "INTELLIGENCE",
    "group": "Intelligence",
    "singular": "analytics"
  },
  {
    "id": "marketing",
    "label": "Marketing",
    "resource": "Marketing",
    "category": "INTELLIGENCE",
    "group": "Intelligence",
    "singular": "marketing"
  },
  {
    "id": "notifications",
    "label": "Notifications",
    "resource": "Notification",
    "category": "OPERATIONS",
    "group": "Operations",
    "singular": "notification"
  },
  {
    "id": "payments",
    "label": "Payments",
    "resource": "Payment",
    "category": "OPERATIONS",
    "group": "Operations",
    "singular": "payment"
  },
  {
    "id": "fee-catalog",
    "label": "Fee Catalog",
    "resource": "FeeCatalog",
    "category": "OPERATIONS",
    "group": "Operations",
    "singular": "fees"
  },
  {
    "id": "coupons",
    "label": "Coupons & Discounts",
    "resource": "Coupon",
    "category": "OPERATIONS",
    "group": "Operations",
    "singular": "coupon"
  },
  {
    "id": "support",
    "label": "Help & Support",
    "resource": "SupportTicket",
    "category": "OPERATIONS",
    "group": "Operations",
    "singular": "support"
  },
  {
    "id": "contact-management",
    "label": "Contact Management",
    "resource": "ContactManagement",
    "category": "CONTENT",
    "group": "Content",
    "singular": "contact"
  },
  {
    "id": "organization",
    "label": "Organization Structure",
    "resource": "Organization",
    "category": "SYSTEM",
    "group": "System",
    "singular": "organization"
  },
  {
    "id": "rbac",
    "label": "Roles & Permissions",
    "resource": "RolePermission",
    "category": "SYSTEM",
    "group": "System",
    "singular": "roles"
  },
  {
    "id": "settings",
    "label": "Settings",
    "resource": "Setting",
    "category": "SYSTEM",
    "group": "System",
    "singular": "settings"
  },
  {
    "id": "logs",
    "label": "Activity Logs",
    "resource": "ActivityLog",
    "category": "SYSTEM",
    "group": "System",
    "singular": "logs"
  }
];

export const MODULE_ALIASES: Record<string, string[]> = {
  "dashboard": [
    "dashboard"
  ],
  "leads": [
    "leads",
    "lead"
  ],
  "tasks": [
    "tasks",
    "task"
  ],
  "students": [
    "students",
    "student"
  ],
  "referrals": [
    "referrals",
    "referral"
  ],
  "counselors": [
    "counselors",
    "counselor"
  ],
  "staff-onboarding": [
    "staff-onboarding",
    "staff_onboarding",
    "staff.onboard",
    "staff"
  ],
  "applications": [
    "applications",
    "application"
  ],
  "reporting": [
    "reporting",
    "reporting-enrollment",
    "enrollment"
  ],
  "review-moderation": [
    "review-moderation",
    "review_moderation",
    "reviews",
    "review"
  ],
  "reviews": [
    "reviews",
    "review",
    "review-moderation",
    "review_moderation"
  ],
  "testimonials": [
    "testimonials",
    "testimonial",
    "success-stories",
    "success_stories",
    "stories"
  ],
  "success-stories": [
    "success-stories",
    "success_stories",
    "testimonials",
    "testimonial",
    "stories"
  ],
  "college-portal": [
    "college-portal",
    "college_portal",
    "college"
  ],
  "college-rankings": [
    "college-rankings",
    "rankings",
    "ranking"
  ],
  "colleges": [
    "colleges",
    "college"
  ],
  "courses": [
    "courses",
    "course"
  ],
  "states": [
    "states",
    "state",
    "state-management"
  ],
  "exams": [
    "exams",
    "exam"
  ],
  "scholarships": [
    "scholarships",
    "scholarship"
  ],
  "materials": [
    "materials",
    "material",
    "study-materials"
  ],
  "blogs": [
    "blogs",
    "blog",
    "guides",
    "guide",
    "career-guides",
    "career_guides",
    "cms"
  ],
  "guides": [
    "guides",
    "guide",
    "blogs",
    "blog",
    "career-guides",
    "career_guides",
    "cms"
  ],
  "cms": [
    "cms",
    "guides",
    "guide",
    "blogs",
    "blog"
  ],
  "faqs": [
    "faqs",
    "faq"
  ],
  "documents": [
    "documents",
    "document"
  ],
  "ai": [
    "ai",
    "ai-counselor"
  ],
  "analytics": [
    "analytics"
  ],
  "marketing": [
    "marketing"
  ],
  "notifications": [
    "notifications",
    "notification"
  ],
  "payments": [
    "payments",
    "payment"
  ],
  "fee-catalog": [
    "fee-catalog",
    "fees",
    "fee"
  ],
  "coupons": [
    "coupons",
    "coupon"
  ],
  "support": [
    "support",
    "help-support"
  ],
  "contact-management": [
    "contact-management",
    "contact_management",
    "contacts",
    "contact"
  ],
  "contacts": [
    "contacts",
    "contact",
    "contact-management",
    "contact_management"
  ],
  "organization": [
    "organization"
  ],
  "rbac": [
    "rbac",
    "roles",
    "role"
  ],
  "settings": [
    "settings",
    "setting"
  ],
  "logs": [
    "logs",
    "log",
    "audit"
  ]
};

export const SYSTEM_PERMISSIONS: PermissionSeed[] = [
  {
    "module": "dashboard",
    "resource": "Dashboard",
    "action": "view",
    "code": "dashboard.view",
    "description": "View in Dashboard",
    "category": "OVERVIEW",
    "group": "Overview"
  },
  {
    "module": "dashboard",
    "resource": "Dashboard",
    "action": "create",
    "code": "dashboard.create",
    "description": "Create in Dashboard",
    "category": "OVERVIEW",
    "group": "Overview"
  },
  {
    "module": "dashboard",
    "resource": "Dashboard",
    "action": "edit",
    "code": "dashboard.edit",
    "description": "Edit in Dashboard",
    "category": "OVERVIEW",
    "group": "Overview"
  },
  {
    "module": "dashboard",
    "resource": "Dashboard",
    "action": "delete",
    "code": "dashboard.delete",
    "description": "Delete in Dashboard",
    "category": "OVERVIEW",
    "group": "Overview"
  },
  {
    "module": "dashboard",
    "resource": "Dashboard",
    "action": "export",
    "code": "dashboard.export",
    "description": "Export in Dashboard",
    "category": "OVERVIEW",
    "group": "Overview"
  },
  {
    "module": "dashboard",
    "resource": "Dashboard",
    "action": "approve",
    "code": "dashboard.approve",
    "description": "Approve/Verify in Dashboard",
    "category": "OVERVIEW",
    "group": "Overview"
  },
  {
    "module": "leads",
    "resource": "Lead",
    "action": "view",
    "code": "leads.view",
    "description": "View in Leads",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "leads",
    "resource": "Lead",
    "action": "view",
    "code": "lead.view",
    "description": "View in Leads (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "leads",
    "resource": "Lead",
    "action": "create",
    "code": "leads.create",
    "description": "Create in Leads",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "leads",
    "resource": "Lead",
    "action": "create",
    "code": "lead.create",
    "description": "Create in Leads (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "leads",
    "resource": "Lead",
    "action": "edit",
    "code": "leads.edit",
    "description": "Edit in Leads",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "leads",
    "resource": "Lead",
    "action": "edit",
    "code": "lead.edit",
    "description": "Edit in Leads (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "leads",
    "resource": "Lead",
    "action": "delete",
    "code": "leads.delete",
    "description": "Delete in Leads",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "leads",
    "resource": "Lead",
    "action": "delete",
    "code": "lead.delete",
    "description": "Delete in Leads (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "leads",
    "resource": "Lead",
    "action": "export",
    "code": "leads.export",
    "description": "Export in Leads",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "leads",
    "resource": "Lead",
    "action": "export",
    "code": "lead.export",
    "description": "Export in Leads (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "leads",
    "resource": "Lead",
    "action": "approve",
    "code": "leads.approve",
    "description": "Approve/Verify in Leads",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "leads",
    "resource": "Lead",
    "action": "approve",
    "code": "lead.approve",
    "description": "Approve/Verify in Leads (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "tasks",
    "resource": "Task",
    "action": "view",
    "code": "tasks.view",
    "description": "View in Tasks & Follow-ups",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "tasks",
    "resource": "Task",
    "action": "view",
    "code": "task.view",
    "description": "View in Tasks & Follow-ups (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "tasks",
    "resource": "Task",
    "action": "create",
    "code": "tasks.create",
    "description": "Create in Tasks & Follow-ups",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "tasks",
    "resource": "Task",
    "action": "create",
    "code": "task.create",
    "description": "Create in Tasks & Follow-ups (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "tasks",
    "resource": "Task",
    "action": "edit",
    "code": "tasks.edit",
    "description": "Edit in Tasks & Follow-ups",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "tasks",
    "resource": "Task",
    "action": "edit",
    "code": "task.edit",
    "description": "Edit in Tasks & Follow-ups (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "tasks",
    "resource": "Task",
    "action": "delete",
    "code": "tasks.delete",
    "description": "Delete in Tasks & Follow-ups",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "tasks",
    "resource": "Task",
    "action": "delete",
    "code": "task.delete",
    "description": "Delete in Tasks & Follow-ups (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "tasks",
    "resource": "Task",
    "action": "export",
    "code": "tasks.export",
    "description": "Export in Tasks & Follow-ups",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "tasks",
    "resource": "Task",
    "action": "export",
    "code": "task.export",
    "description": "Export in Tasks & Follow-ups (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "tasks",
    "resource": "Task",
    "action": "approve",
    "code": "tasks.approve",
    "description": "Approve/Verify in Tasks & Follow-ups",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "tasks",
    "resource": "Task",
    "action": "approve",
    "code": "task.approve",
    "description": "Approve/Verify in Tasks & Follow-ups (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "students",
    "resource": "Student",
    "action": "view",
    "code": "students.view",
    "description": "View in Students",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "students",
    "resource": "Student",
    "action": "view",
    "code": "student.view",
    "description": "View in Students (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "students",
    "resource": "Student",
    "action": "create",
    "code": "students.create",
    "description": "Create in Students",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "students",
    "resource": "Student",
    "action": "create",
    "code": "student.create",
    "description": "Create in Students (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "students",
    "resource": "Student",
    "action": "edit",
    "code": "students.edit",
    "description": "Edit in Students",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "students",
    "resource": "Student",
    "action": "edit",
    "code": "student.edit",
    "description": "Edit in Students (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "students",
    "resource": "Student",
    "action": "delete",
    "code": "students.delete",
    "description": "Delete in Students",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "students",
    "resource": "Student",
    "action": "delete",
    "code": "student.delete",
    "description": "Delete in Students (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "students",
    "resource": "Student",
    "action": "export",
    "code": "students.export",
    "description": "Export in Students",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "students",
    "resource": "Student",
    "action": "export",
    "code": "student.export",
    "description": "Export in Students (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "students",
    "resource": "Student",
    "action": "approve",
    "code": "students.approve",
    "description": "Approve/Verify in Students",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "students",
    "resource": "Student",
    "action": "approve",
    "code": "student.approve",
    "description": "Approve/Verify in Students (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "referrals",
    "resource": "Referral",
    "action": "view",
    "code": "referrals.view",
    "description": "View in Student Referrals & Rewards",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "referrals",
    "resource": "Referral",
    "action": "view",
    "code": "referral.view",
    "description": "View in Student Referrals & Rewards (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "referrals",
    "resource": "Referral",
    "action": "create",
    "code": "referrals.create",
    "description": "Create in Student Referrals & Rewards",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "referrals",
    "resource": "Referral",
    "action": "create",
    "code": "referral.create",
    "description": "Create in Student Referrals & Rewards (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "referrals",
    "resource": "Referral",
    "action": "edit",
    "code": "referrals.edit",
    "description": "Edit in Student Referrals & Rewards",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "referrals",
    "resource": "Referral",
    "action": "edit",
    "code": "referral.edit",
    "description": "Edit in Student Referrals & Rewards (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "referrals",
    "resource": "Referral",
    "action": "delete",
    "code": "referrals.delete",
    "description": "Delete in Student Referrals & Rewards",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "referrals",
    "resource": "Referral",
    "action": "delete",
    "code": "referral.delete",
    "description": "Delete in Student Referrals & Rewards (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "referrals",
    "resource": "Referral",
    "action": "export",
    "code": "referrals.export",
    "description": "Export in Student Referrals & Rewards",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "referrals",
    "resource": "Referral",
    "action": "export",
    "code": "referral.export",
    "description": "Export in Student Referrals & Rewards (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "referrals",
    "resource": "Referral",
    "action": "approve",
    "code": "referrals.approve",
    "description": "Approve/Verify in Student Referrals & Rewards",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "referrals",
    "resource": "Referral",
    "action": "approve",
    "code": "referral.approve",
    "description": "Approve/Verify in Student Referrals & Rewards (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "counselors",
    "resource": "Counselor",
    "action": "view",
    "code": "counselors.view",
    "description": "View in Counselors",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "counselors",
    "resource": "Counselor",
    "action": "view",
    "code": "counselor.view",
    "description": "View in Counselors (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "counselors",
    "resource": "Counselor",
    "action": "create",
    "code": "counselors.create",
    "description": "Create in Counselors",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "counselors",
    "resource": "Counselor",
    "action": "create",
    "code": "counselor.create",
    "description": "Create in Counselors (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "counselors",
    "resource": "Counselor",
    "action": "edit",
    "code": "counselors.edit",
    "description": "Edit in Counselors",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "counselors",
    "resource": "Counselor",
    "action": "edit",
    "code": "counselor.edit",
    "description": "Edit in Counselors (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "counselors",
    "resource": "Counselor",
    "action": "delete",
    "code": "counselors.delete",
    "description": "Delete in Counselors",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "counselors",
    "resource": "Counselor",
    "action": "delete",
    "code": "counselor.delete",
    "description": "Delete in Counselors (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "counselors",
    "resource": "Counselor",
    "action": "export",
    "code": "counselors.export",
    "description": "Export in Counselors",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "counselors",
    "resource": "Counselor",
    "action": "export",
    "code": "counselor.export",
    "description": "Export in Counselors (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "counselors",
    "resource": "Counselor",
    "action": "approve",
    "code": "counselors.approve",
    "description": "Approve/Verify in Counselors",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "counselors",
    "resource": "Counselor",
    "action": "approve",
    "code": "counselor.approve",
    "description": "Approve/Verify in Counselors (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "staff-onboarding",
    "resource": "StaffOnboarding",
    "action": "view",
    "code": "staff-onboarding.view",
    "description": "View in Staff Onboarding & KYC",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "staff-onboarding",
    "resource": "StaffOnboarding",
    "action": "view",
    "code": "staff.onboard.view",
    "description": "View in Staff Onboarding & KYC (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "staff-onboarding",
    "resource": "StaffOnboarding",
    "action": "create",
    "code": "staff-onboarding.create",
    "description": "Create in Staff Onboarding & KYC",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "staff-onboarding",
    "resource": "StaffOnboarding",
    "action": "create",
    "code": "staff.onboard.create",
    "description": "Create in Staff Onboarding & KYC (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "staff-onboarding",
    "resource": "StaffOnboarding",
    "action": "edit",
    "code": "staff-onboarding.edit",
    "description": "Edit in Staff Onboarding & KYC",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "staff-onboarding",
    "resource": "StaffOnboarding",
    "action": "edit",
    "code": "staff.onboard.edit",
    "description": "Edit in Staff Onboarding & KYC (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "staff-onboarding",
    "resource": "StaffOnboarding",
    "action": "delete",
    "code": "staff-onboarding.delete",
    "description": "Delete in Staff Onboarding & KYC",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "staff-onboarding",
    "resource": "StaffOnboarding",
    "action": "delete",
    "code": "staff.onboard.delete",
    "description": "Delete in Staff Onboarding & KYC (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "staff-onboarding",
    "resource": "StaffOnboarding",
    "action": "export",
    "code": "staff-onboarding.export",
    "description": "Export in Staff Onboarding & KYC",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "staff-onboarding",
    "resource": "StaffOnboarding",
    "action": "export",
    "code": "staff.onboard.export",
    "description": "Export in Staff Onboarding & KYC (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "staff-onboarding",
    "resource": "StaffOnboarding",
    "action": "approve",
    "code": "staff-onboarding.approve",
    "description": "Approve/Verify in Staff Onboarding & KYC",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "staff-onboarding",
    "resource": "StaffOnboarding",
    "action": "approve",
    "code": "staff.onboard.approve",
    "description": "Approve/Verify in Staff Onboarding & KYC (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "applications",
    "resource": "Application",
    "action": "view",
    "code": "applications.view",
    "description": "View in Applications",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "applications",
    "resource": "Application",
    "action": "view",
    "code": "application.view",
    "description": "View in Applications (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "applications",
    "resource": "Application",
    "action": "create",
    "code": "applications.create",
    "description": "Create in Applications",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "applications",
    "resource": "Application",
    "action": "create",
    "code": "application.create",
    "description": "Create in Applications (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "applications",
    "resource": "Application",
    "action": "edit",
    "code": "applications.edit",
    "description": "Edit in Applications",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "applications",
    "resource": "Application",
    "action": "edit",
    "code": "application.edit",
    "description": "Edit in Applications (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "applications",
    "resource": "Application",
    "action": "delete",
    "code": "applications.delete",
    "description": "Delete in Applications",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "applications",
    "resource": "Application",
    "action": "delete",
    "code": "application.delete",
    "description": "Delete in Applications (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "applications",
    "resource": "Application",
    "action": "export",
    "code": "applications.export",
    "description": "Export in Applications",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "applications",
    "resource": "Application",
    "action": "export",
    "code": "application.export",
    "description": "Export in Applications (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "applications",
    "resource": "Application",
    "action": "approve",
    "code": "applications.approve",
    "description": "Approve/Verify in Applications",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "applications",
    "resource": "Application",
    "action": "approve",
    "code": "application.approve",
    "description": "Approve/Verify in Applications (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "reporting",
    "resource": "ReportingEnrollment",
    "action": "view",
    "code": "reporting.view",
    "description": "View in Reporting & Enrollment",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "reporting",
    "resource": "ReportingEnrollment",
    "action": "create",
    "code": "reporting.create",
    "description": "Create in Reporting & Enrollment",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "reporting",
    "resource": "ReportingEnrollment",
    "action": "edit",
    "code": "reporting.edit",
    "description": "Edit in Reporting & Enrollment",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "reporting",
    "resource": "ReportingEnrollment",
    "action": "delete",
    "code": "reporting.delete",
    "description": "Delete in Reporting & Enrollment",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "reporting",
    "resource": "ReportingEnrollment",
    "action": "export",
    "code": "reporting.export",
    "description": "Export in Reporting & Enrollment",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "reporting",
    "resource": "ReportingEnrollment",
    "action": "approve",
    "code": "reporting.approve",
    "description": "Approve/Verify in Reporting & Enrollment",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "review-moderation",
    "resource": "ReviewModeration",
    "action": "view",
    "code": "review-moderation.view",
    "description": "View in Reviews & Moderation",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "review-moderation",
    "resource": "ReviewModeration",
    "action": "view",
    "code": "reviews.view",
    "description": "View in Reviews & Moderation (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "review-moderation",
    "resource": "ReviewModeration",
    "action": "create",
    "code": "review-moderation.create",
    "description": "Create in Reviews & Moderation",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "review-moderation",
    "resource": "ReviewModeration",
    "action": "create",
    "code": "reviews.create",
    "description": "Create in Reviews & Moderation (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "review-moderation",
    "resource": "ReviewModeration",
    "action": "edit",
    "code": "review-moderation.edit",
    "description": "Edit in Reviews & Moderation",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "review-moderation",
    "resource": "ReviewModeration",
    "action": "edit",
    "code": "reviews.edit",
    "description": "Edit in Reviews & Moderation (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "review-moderation",
    "resource": "ReviewModeration",
    "action": "delete",
    "code": "review-moderation.delete",
    "description": "Delete in Reviews & Moderation",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "review-moderation",
    "resource": "ReviewModeration",
    "action": "delete",
    "code": "reviews.delete",
    "description": "Delete in Reviews & Moderation (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "review-moderation",
    "resource": "ReviewModeration",
    "action": "export",
    "code": "review-moderation.export",
    "description": "Export in Reviews & Moderation",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "review-moderation",
    "resource": "ReviewModeration",
    "action": "export",
    "code": "reviews.export",
    "description": "Export in Reviews & Moderation (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "review-moderation",
    "resource": "ReviewModeration",
    "action": "approve",
    "code": "review-moderation.approve",
    "description": "Approve/Verify in Reviews & Moderation",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "review-moderation",
    "resource": "ReviewModeration",
    "action": "approve",
    "code": "reviews.approve",
    "description": "Approve/Verify in Reviews & Moderation (Canonical alias)",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "testimonials",
    "resource": "Testimonial",
    "action": "view",
    "code": "testimonials.view",
    "description": "View in Success Stories",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "testimonials",
    "resource": "Testimonial",
    "action": "view",
    "code": "testimonial.view",
    "description": "View in Success Stories (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "testimonials",
    "resource": "Testimonial",
    "action": "create",
    "code": "testimonials.create",
    "description": "Create in Success Stories",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "testimonials",
    "resource": "Testimonial",
    "action": "create",
    "code": "testimonial.create",
    "description": "Create in Success Stories (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "testimonials",
    "resource": "Testimonial",
    "action": "edit",
    "code": "testimonials.edit",
    "description": "Edit in Success Stories",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "testimonials",
    "resource": "Testimonial",
    "action": "edit",
    "code": "testimonial.edit",
    "description": "Edit in Success Stories (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "testimonials",
    "resource": "Testimonial",
    "action": "delete",
    "code": "testimonials.delete",
    "description": "Delete in Success Stories",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "testimonials",
    "resource": "Testimonial",
    "action": "delete",
    "code": "testimonial.delete",
    "description": "Delete in Success Stories (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "testimonials",
    "resource": "Testimonial",
    "action": "export",
    "code": "testimonials.export",
    "description": "Export in Success Stories",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "testimonials",
    "resource": "Testimonial",
    "action": "export",
    "code": "testimonial.export",
    "description": "Export in Success Stories (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "testimonials",
    "resource": "Testimonial",
    "action": "approve",
    "code": "testimonials.approve",
    "description": "Approve/Verify in Success Stories",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "testimonials",
    "resource": "Testimonial",
    "action": "approve",
    "code": "testimonial.approve",
    "description": "Approve/Verify in Success Stories (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "college-portal",
    "resource": "CollegePortal",
    "action": "view",
    "code": "college-portal.view",
    "description": "View in College Partner Portal",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "CollegePortal",
    "action": "create",
    "code": "college-portal.create",
    "description": "Create in College Partner Portal",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "CollegePortal",
    "action": "edit",
    "code": "college-portal.edit",
    "description": "Edit in College Partner Portal",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "CollegePortal",
    "action": "delete",
    "code": "college-portal.delete",
    "description": "Delete in College Partner Portal",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "CollegePortal",
    "action": "export",
    "code": "college-portal.export",
    "description": "Export in College Partner Portal",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "CollegePortal",
    "action": "approve",
    "code": "college-portal.approve",
    "description": "Approve/Verify in College Partner Portal",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "CollegeRanking",
    "action": "view",
    "code": "college-rankings.view",
    "description": "View in College Rankings Engine",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "CollegeRanking",
    "action": "view",
    "code": "rankings.view",
    "description": "View in College Rankings Engine (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "CollegeRanking",
    "action": "create",
    "code": "college-rankings.create",
    "description": "Create in College Rankings Engine",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "CollegeRanking",
    "action": "create",
    "code": "rankings.create",
    "description": "Create in College Rankings Engine (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "CollegeRanking",
    "action": "edit",
    "code": "college-rankings.edit",
    "description": "Edit in College Rankings Engine",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "CollegeRanking",
    "action": "edit",
    "code": "rankings.edit",
    "description": "Edit in College Rankings Engine (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "CollegeRanking",
    "action": "delete",
    "code": "college-rankings.delete",
    "description": "Delete in College Rankings Engine",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "CollegeRanking",
    "action": "delete",
    "code": "rankings.delete",
    "description": "Delete in College Rankings Engine (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "CollegeRanking",
    "action": "export",
    "code": "college-rankings.export",
    "description": "Export in College Rankings Engine",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "CollegeRanking",
    "action": "export",
    "code": "rankings.export",
    "description": "Export in College Rankings Engine (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "CollegeRanking",
    "action": "approve",
    "code": "college-rankings.approve",
    "description": "Approve/Verify in College Rankings Engine",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "CollegeRanking",
    "action": "approve",
    "code": "rankings.approve",
    "description": "Approve/Verify in College Rankings Engine (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "colleges",
    "resource": "College",
    "action": "view",
    "code": "colleges.view",
    "description": "View in Colleges Directory",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "colleges",
    "resource": "College",
    "action": "view",
    "code": "college.view",
    "description": "View in Colleges Directory (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "colleges",
    "resource": "College",
    "action": "create",
    "code": "colleges.create",
    "description": "Create in Colleges Directory",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "colleges",
    "resource": "College",
    "action": "create",
    "code": "college.create",
    "description": "Create in Colleges Directory (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "colleges",
    "resource": "College",
    "action": "edit",
    "code": "colleges.edit",
    "description": "Edit in Colleges Directory",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "colleges",
    "resource": "College",
    "action": "edit",
    "code": "college.edit",
    "description": "Edit in Colleges Directory (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "colleges",
    "resource": "College",
    "action": "delete",
    "code": "colleges.delete",
    "description": "Delete in Colleges Directory",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "colleges",
    "resource": "College",
    "action": "delete",
    "code": "college.delete",
    "description": "Delete in Colleges Directory (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "colleges",
    "resource": "College",
    "action": "export",
    "code": "colleges.export",
    "description": "Export in Colleges Directory",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "colleges",
    "resource": "College",
    "action": "export",
    "code": "college.export",
    "description": "Export in Colleges Directory (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "colleges",
    "resource": "College",
    "action": "approve",
    "code": "colleges.approve",
    "description": "Approve/Verify in Colleges Directory",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "colleges",
    "resource": "College",
    "action": "approve",
    "code": "college.approve",
    "description": "Approve/Verify in Colleges Directory (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "courses",
    "resource": "Course",
    "action": "view",
    "code": "courses.view",
    "description": "View in Course Catalog",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "courses",
    "resource": "Course",
    "action": "view",
    "code": "course.view",
    "description": "View in Course Catalog (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "courses",
    "resource": "Course",
    "action": "create",
    "code": "courses.create",
    "description": "Create in Course Catalog",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "courses",
    "resource": "Course",
    "action": "create",
    "code": "course.create",
    "description": "Create in Course Catalog (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "courses",
    "resource": "Course",
    "action": "edit",
    "code": "courses.edit",
    "description": "Edit in Course Catalog",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "courses",
    "resource": "Course",
    "action": "edit",
    "code": "course.edit",
    "description": "Edit in Course Catalog (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "courses",
    "resource": "Course",
    "action": "delete",
    "code": "courses.delete",
    "description": "Delete in Course Catalog",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "courses",
    "resource": "Course",
    "action": "delete",
    "code": "course.delete",
    "description": "Delete in Course Catalog (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "courses",
    "resource": "Course",
    "action": "export",
    "code": "courses.export",
    "description": "Export in Course Catalog",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "courses",
    "resource": "Course",
    "action": "export",
    "code": "course.export",
    "description": "Export in Course Catalog (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "courses",
    "resource": "Course",
    "action": "approve",
    "code": "courses.approve",
    "description": "Approve/Verify in Course Catalog",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "courses",
    "resource": "Course",
    "action": "approve",
    "code": "course.approve",
    "description": "Approve/Verify in Course Catalog (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "states",
    "resource": "StateManagement",
    "action": "view",
    "code": "states.view",
    "description": "View in State Management",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "states",
    "resource": "StateManagement",
    "action": "view",
    "code": "state.view",
    "description": "View in State Management (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "states",
    "resource": "StateManagement",
    "action": "create",
    "code": "states.create",
    "description": "Create in State Management",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "states",
    "resource": "StateManagement",
    "action": "create",
    "code": "state.create",
    "description": "Create in State Management (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "states",
    "resource": "StateManagement",
    "action": "edit",
    "code": "states.edit",
    "description": "Edit in State Management",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "states",
    "resource": "StateManagement",
    "action": "edit",
    "code": "state.edit",
    "description": "Edit in State Management (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "states",
    "resource": "StateManagement",
    "action": "delete",
    "code": "states.delete",
    "description": "Delete in State Management",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "states",
    "resource": "StateManagement",
    "action": "delete",
    "code": "state.delete",
    "description": "Delete in State Management (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "states",
    "resource": "StateManagement",
    "action": "export",
    "code": "states.export",
    "description": "Export in State Management",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "states",
    "resource": "StateManagement",
    "action": "export",
    "code": "state.export",
    "description": "Export in State Management (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "states",
    "resource": "StateManagement",
    "action": "approve",
    "code": "states.approve",
    "description": "Approve/Verify in State Management",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "states",
    "resource": "StateManagement",
    "action": "approve",
    "code": "state.approve",
    "description": "Approve/Verify in State Management (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "exams",
    "resource": "Exam",
    "action": "view",
    "code": "exams.view",
    "description": "View in Exams",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "exams",
    "resource": "Exam",
    "action": "view",
    "code": "exam.view",
    "description": "View in Exams (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "exams",
    "resource": "Exam",
    "action": "create",
    "code": "exams.create",
    "description": "Create in Exams",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "exams",
    "resource": "Exam",
    "action": "create",
    "code": "exam.create",
    "description": "Create in Exams (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "exams",
    "resource": "Exam",
    "action": "edit",
    "code": "exams.edit",
    "description": "Edit in Exams",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "exams",
    "resource": "Exam",
    "action": "edit",
    "code": "exam.edit",
    "description": "Edit in Exams (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "exams",
    "resource": "Exam",
    "action": "delete",
    "code": "exams.delete",
    "description": "Delete in Exams",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "exams",
    "resource": "Exam",
    "action": "delete",
    "code": "exam.delete",
    "description": "Delete in Exams (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "exams",
    "resource": "Exam",
    "action": "export",
    "code": "exams.export",
    "description": "Export in Exams",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "exams",
    "resource": "Exam",
    "action": "export",
    "code": "exam.export",
    "description": "Export in Exams (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "exams",
    "resource": "Exam",
    "action": "approve",
    "code": "exams.approve",
    "description": "Approve/Verify in Exams",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "exams",
    "resource": "Exam",
    "action": "approve",
    "code": "exam.approve",
    "description": "Approve/Verify in Exams (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "scholarships",
    "resource": "Scholarship",
    "action": "view",
    "code": "scholarships.view",
    "description": "View in Scholarships",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "scholarships",
    "resource": "Scholarship",
    "action": "view",
    "code": "scholarship.view",
    "description": "View in Scholarships (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "scholarships",
    "resource": "Scholarship",
    "action": "create",
    "code": "scholarships.create",
    "description": "Create in Scholarships",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "scholarships",
    "resource": "Scholarship",
    "action": "create",
    "code": "scholarship.create",
    "description": "Create in Scholarships (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "scholarships",
    "resource": "Scholarship",
    "action": "edit",
    "code": "scholarships.edit",
    "description": "Edit in Scholarships",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "scholarships",
    "resource": "Scholarship",
    "action": "edit",
    "code": "scholarship.edit",
    "description": "Edit in Scholarships (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "scholarships",
    "resource": "Scholarship",
    "action": "delete",
    "code": "scholarships.delete",
    "description": "Delete in Scholarships",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "scholarships",
    "resource": "Scholarship",
    "action": "delete",
    "code": "scholarship.delete",
    "description": "Delete in Scholarships (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "scholarships",
    "resource": "Scholarship",
    "action": "export",
    "code": "scholarships.export",
    "description": "Export in Scholarships",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "scholarships",
    "resource": "Scholarship",
    "action": "export",
    "code": "scholarship.export",
    "description": "Export in Scholarships (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "scholarships",
    "resource": "Scholarship",
    "action": "approve",
    "code": "scholarships.approve",
    "description": "Approve/Verify in Scholarships",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "scholarships",
    "resource": "Scholarship",
    "action": "approve",
    "code": "scholarship.approve",
    "description": "Approve/Verify in Scholarships (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "materials",
    "resource": "StudyMaterial",
    "action": "view",
    "code": "materials.view",
    "description": "View in Study Materials",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "materials",
    "resource": "StudyMaterial",
    "action": "view",
    "code": "material.view",
    "description": "View in Study Materials (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "materials",
    "resource": "StudyMaterial",
    "action": "create",
    "code": "materials.create",
    "description": "Create in Study Materials",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "materials",
    "resource": "StudyMaterial",
    "action": "create",
    "code": "material.create",
    "description": "Create in Study Materials (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "materials",
    "resource": "StudyMaterial",
    "action": "edit",
    "code": "materials.edit",
    "description": "Edit in Study Materials",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "materials",
    "resource": "StudyMaterial",
    "action": "edit",
    "code": "material.edit",
    "description": "Edit in Study Materials (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "materials",
    "resource": "StudyMaterial",
    "action": "delete",
    "code": "materials.delete",
    "description": "Delete in Study Materials",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "materials",
    "resource": "StudyMaterial",
    "action": "delete",
    "code": "material.delete",
    "description": "Delete in Study Materials (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "materials",
    "resource": "StudyMaterial",
    "action": "export",
    "code": "materials.export",
    "description": "Export in Study Materials",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "materials",
    "resource": "StudyMaterial",
    "action": "export",
    "code": "material.export",
    "description": "Export in Study Materials (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "materials",
    "resource": "StudyMaterial",
    "action": "approve",
    "code": "materials.approve",
    "description": "Approve/Verify in Study Materials",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "materials",
    "resource": "StudyMaterial",
    "action": "approve",
    "code": "material.approve",
    "description": "Approve/Verify in Study Materials (Canonical alias)",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "blogs",
    "resource": "CareerGuideBlog",
    "action": "view",
    "code": "blogs.view",
    "description": "View in Career & Admission Guides / CMS",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "blogs",
    "resource": "CareerGuideBlog",
    "action": "view",
    "code": "blog.view",
    "description": "View in Career & Admission Guides / CMS (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "blogs",
    "resource": "CareerGuideBlog",
    "action": "create",
    "code": "blogs.create",
    "description": "Create in Career & Admission Guides / CMS",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "blogs",
    "resource": "CareerGuideBlog",
    "action": "create",
    "code": "blog.create",
    "description": "Create in Career & Admission Guides / CMS (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "blogs",
    "resource": "CareerGuideBlog",
    "action": "edit",
    "code": "blogs.edit",
    "description": "Edit in Career & Admission Guides / CMS",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "blogs",
    "resource": "CareerGuideBlog",
    "action": "edit",
    "code": "blog.edit",
    "description": "Edit in Career & Admission Guides / CMS (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "blogs",
    "resource": "CareerGuideBlog",
    "action": "delete",
    "code": "blogs.delete",
    "description": "Delete in Career & Admission Guides / CMS",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "blogs",
    "resource": "CareerGuideBlog",
    "action": "delete",
    "code": "blog.delete",
    "description": "Delete in Career & Admission Guides / CMS (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "blogs",
    "resource": "CareerGuideBlog",
    "action": "export",
    "code": "blogs.export",
    "description": "Export in Career & Admission Guides / CMS",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "blogs",
    "resource": "CareerGuideBlog",
    "action": "export",
    "code": "blog.export",
    "description": "Export in Career & Admission Guides / CMS (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "blogs",
    "resource": "CareerGuideBlog",
    "action": "approve",
    "code": "blogs.approve",
    "description": "Approve/Verify in Career & Admission Guides / CMS",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "blogs",
    "resource": "CareerGuideBlog",
    "action": "approve",
    "code": "blog.approve",
    "description": "Approve/Verify in Career & Admission Guides / CMS (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "faqs",
    "resource": "FAQ",
    "action": "view",
    "code": "faqs.view",
    "description": "View in FAQs",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "faqs",
    "resource": "FAQ",
    "action": "view",
    "code": "faq.view",
    "description": "View in FAQs (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "faqs",
    "resource": "FAQ",
    "action": "create",
    "code": "faqs.create",
    "description": "Create in FAQs",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "faqs",
    "resource": "FAQ",
    "action": "create",
    "code": "faq.create",
    "description": "Create in FAQs (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "faqs",
    "resource": "FAQ",
    "action": "edit",
    "code": "faqs.edit",
    "description": "Edit in FAQs",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "faqs",
    "resource": "FAQ",
    "action": "edit",
    "code": "faq.edit",
    "description": "Edit in FAQs (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "faqs",
    "resource": "FAQ",
    "action": "delete",
    "code": "faqs.delete",
    "description": "Delete in FAQs",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "faqs",
    "resource": "FAQ",
    "action": "delete",
    "code": "faq.delete",
    "description": "Delete in FAQs (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "faqs",
    "resource": "FAQ",
    "action": "export",
    "code": "faqs.export",
    "description": "Export in FAQs",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "faqs",
    "resource": "FAQ",
    "action": "export",
    "code": "faq.export",
    "description": "Export in FAQs (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "faqs",
    "resource": "FAQ",
    "action": "approve",
    "code": "faqs.approve",
    "description": "Approve/Verify in FAQs",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "faqs",
    "resource": "FAQ",
    "action": "approve",
    "code": "faq.approve",
    "description": "Approve/Verify in FAQs (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "documents",
    "resource": "Document",
    "action": "view",
    "code": "documents.view",
    "description": "View in Documents",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "documents",
    "resource": "Document",
    "action": "view",
    "code": "document.view",
    "description": "View in Documents (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "documents",
    "resource": "Document",
    "action": "create",
    "code": "documents.create",
    "description": "Create in Documents",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "documents",
    "resource": "Document",
    "action": "create",
    "code": "document.create",
    "description": "Create in Documents (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "documents",
    "resource": "Document",
    "action": "edit",
    "code": "documents.edit",
    "description": "Edit in Documents",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "documents",
    "resource": "Document",
    "action": "edit",
    "code": "document.edit",
    "description": "Edit in Documents (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "documents",
    "resource": "Document",
    "action": "delete",
    "code": "documents.delete",
    "description": "Delete in Documents",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "documents",
    "resource": "Document",
    "action": "delete",
    "code": "document.delete",
    "description": "Delete in Documents (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "documents",
    "resource": "Document",
    "action": "export",
    "code": "documents.export",
    "description": "Export in Documents",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "documents",
    "resource": "Document",
    "action": "export",
    "code": "document.export",
    "description": "Export in Documents (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "documents",
    "resource": "Document",
    "action": "approve",
    "code": "documents.approve",
    "description": "Approve/Verify in Documents",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "documents",
    "resource": "Document",
    "action": "approve",
    "code": "document.approve",
    "description": "Approve/Verify in Documents (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "ai",
    "resource": "AICounselor",
    "action": "view",
    "code": "ai.view",
    "description": "View in AI Counselor",
    "category": "INTELLIGENCE",
    "group": "Intelligence"
  },
  {
    "module": "ai",
    "resource": "AICounselor",
    "action": "create",
    "code": "ai.create",
    "description": "Create in AI Counselor",
    "category": "INTELLIGENCE",
    "group": "Intelligence"
  },
  {
    "module": "ai",
    "resource": "AICounselor",
    "action": "edit",
    "code": "ai.edit",
    "description": "Edit in AI Counselor",
    "category": "INTELLIGENCE",
    "group": "Intelligence"
  },
  {
    "module": "ai",
    "resource": "AICounselor",
    "action": "delete",
    "code": "ai.delete",
    "description": "Delete in AI Counselor",
    "category": "INTELLIGENCE",
    "group": "Intelligence"
  },
  {
    "module": "ai",
    "resource": "AICounselor",
    "action": "export",
    "code": "ai.export",
    "description": "Export in AI Counselor",
    "category": "INTELLIGENCE",
    "group": "Intelligence"
  },
  {
    "module": "ai",
    "resource": "AICounselor",
    "action": "approve",
    "code": "ai.approve",
    "description": "Approve/Verify in AI Counselor",
    "category": "INTELLIGENCE",
    "group": "Intelligence"
  },
  {
    "module": "analytics",
    "resource": "Analytics",
    "action": "view",
    "code": "analytics.view",
    "description": "View in Reports & Analytics",
    "category": "INTELLIGENCE",
    "group": "Intelligence"
  },
  {
    "module": "analytics",
    "resource": "Analytics",
    "action": "create",
    "code": "analytics.create",
    "description": "Create in Reports & Analytics",
    "category": "INTELLIGENCE",
    "group": "Intelligence"
  },
  {
    "module": "analytics",
    "resource": "Analytics",
    "action": "edit",
    "code": "analytics.edit",
    "description": "Edit in Reports & Analytics",
    "category": "INTELLIGENCE",
    "group": "Intelligence"
  },
  {
    "module": "analytics",
    "resource": "Analytics",
    "action": "delete",
    "code": "analytics.delete",
    "description": "Delete in Reports & Analytics",
    "category": "INTELLIGENCE",
    "group": "Intelligence"
  },
  {
    "module": "analytics",
    "resource": "Analytics",
    "action": "export",
    "code": "analytics.export",
    "description": "Export in Reports & Analytics",
    "category": "INTELLIGENCE",
    "group": "Intelligence"
  },
  {
    "module": "analytics",
    "resource": "Analytics",
    "action": "approve",
    "code": "analytics.approve",
    "description": "Approve/Verify in Reports & Analytics",
    "category": "INTELLIGENCE",
    "group": "Intelligence"
  },
  {
    "module": "marketing",
    "resource": "Marketing",
    "action": "view",
    "code": "marketing.view",
    "description": "View in Marketing",
    "category": "INTELLIGENCE",
    "group": "Intelligence"
  },
  {
    "module": "marketing",
    "resource": "Marketing",
    "action": "create",
    "code": "marketing.create",
    "description": "Create in Marketing",
    "category": "INTELLIGENCE",
    "group": "Intelligence"
  },
  {
    "module": "marketing",
    "resource": "Marketing",
    "action": "edit",
    "code": "marketing.edit",
    "description": "Edit in Marketing",
    "category": "INTELLIGENCE",
    "group": "Intelligence"
  },
  {
    "module": "marketing",
    "resource": "Marketing",
    "action": "delete",
    "code": "marketing.delete",
    "description": "Delete in Marketing",
    "category": "INTELLIGENCE",
    "group": "Intelligence"
  },
  {
    "module": "marketing",
    "resource": "Marketing",
    "action": "export",
    "code": "marketing.export",
    "description": "Export in Marketing",
    "category": "INTELLIGENCE",
    "group": "Intelligence"
  },
  {
    "module": "marketing",
    "resource": "Marketing",
    "action": "approve",
    "code": "marketing.approve",
    "description": "Approve/Verify in Marketing",
    "category": "INTELLIGENCE",
    "group": "Intelligence"
  },
  {
    "module": "notifications",
    "resource": "Notification",
    "action": "view",
    "code": "notifications.view",
    "description": "View in Notifications",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "notifications",
    "resource": "Notification",
    "action": "view",
    "code": "notification.view",
    "description": "View in Notifications (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "notifications",
    "resource": "Notification",
    "action": "create",
    "code": "notifications.create",
    "description": "Create in Notifications",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "notifications",
    "resource": "Notification",
    "action": "create",
    "code": "notification.create",
    "description": "Create in Notifications (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "notifications",
    "resource": "Notification",
    "action": "edit",
    "code": "notifications.edit",
    "description": "Edit in Notifications",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "notifications",
    "resource": "Notification",
    "action": "edit",
    "code": "notification.edit",
    "description": "Edit in Notifications (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "notifications",
    "resource": "Notification",
    "action": "delete",
    "code": "notifications.delete",
    "description": "Delete in Notifications",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "notifications",
    "resource": "Notification",
    "action": "delete",
    "code": "notification.delete",
    "description": "Delete in Notifications (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "notifications",
    "resource": "Notification",
    "action": "export",
    "code": "notifications.export",
    "description": "Export in Notifications",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "notifications",
    "resource": "Notification",
    "action": "export",
    "code": "notification.export",
    "description": "Export in Notifications (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "notifications",
    "resource": "Notification",
    "action": "approve",
    "code": "notifications.approve",
    "description": "Approve/Verify in Notifications",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "notifications",
    "resource": "Notification",
    "action": "approve",
    "code": "notification.approve",
    "description": "Approve/Verify in Notifications (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "payments",
    "resource": "Payment",
    "action": "view",
    "code": "payments.view",
    "description": "View in Payments",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "payments",
    "resource": "Payment",
    "action": "view",
    "code": "payment.view",
    "description": "View in Payments (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "payments",
    "resource": "Payment",
    "action": "create",
    "code": "payments.create",
    "description": "Create in Payments",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "payments",
    "resource": "Payment",
    "action": "create",
    "code": "payment.create",
    "description": "Create in Payments (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "payments",
    "resource": "Payment",
    "action": "edit",
    "code": "payments.edit",
    "description": "Edit in Payments",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "payments",
    "resource": "Payment",
    "action": "edit",
    "code": "payment.edit",
    "description": "Edit in Payments (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "payments",
    "resource": "Payment",
    "action": "delete",
    "code": "payments.delete",
    "description": "Delete in Payments",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "payments",
    "resource": "Payment",
    "action": "delete",
    "code": "payment.delete",
    "description": "Delete in Payments (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "payments",
    "resource": "Payment",
    "action": "export",
    "code": "payments.export",
    "description": "Export in Payments",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "payments",
    "resource": "Payment",
    "action": "export",
    "code": "payment.export",
    "description": "Export in Payments (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "payments",
    "resource": "Payment",
    "action": "approve",
    "code": "payments.approve",
    "description": "Approve/Verify in Payments",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "payments",
    "resource": "Payment",
    "action": "approve",
    "code": "payment.approve",
    "description": "Approve/Verify in Payments (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "fee-catalog",
    "resource": "FeeCatalog",
    "action": "view",
    "code": "fee-catalog.view",
    "description": "View in Fee Catalog",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "fee-catalog",
    "resource": "FeeCatalog",
    "action": "view",
    "code": "fees.view",
    "description": "View in Fee Catalog (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "fee-catalog",
    "resource": "FeeCatalog",
    "action": "create",
    "code": "fee-catalog.create",
    "description": "Create in Fee Catalog",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "fee-catalog",
    "resource": "FeeCatalog",
    "action": "create",
    "code": "fees.create",
    "description": "Create in Fee Catalog (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "fee-catalog",
    "resource": "FeeCatalog",
    "action": "edit",
    "code": "fee-catalog.edit",
    "description": "Edit in Fee Catalog",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "fee-catalog",
    "resource": "FeeCatalog",
    "action": "edit",
    "code": "fees.edit",
    "description": "Edit in Fee Catalog (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "fee-catalog",
    "resource": "FeeCatalog",
    "action": "delete",
    "code": "fee-catalog.delete",
    "description": "Delete in Fee Catalog",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "fee-catalog",
    "resource": "FeeCatalog",
    "action": "delete",
    "code": "fees.delete",
    "description": "Delete in Fee Catalog (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "fee-catalog",
    "resource": "FeeCatalog",
    "action": "export",
    "code": "fee-catalog.export",
    "description": "Export in Fee Catalog",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "fee-catalog",
    "resource": "FeeCatalog",
    "action": "export",
    "code": "fees.export",
    "description": "Export in Fee Catalog (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "fee-catalog",
    "resource": "FeeCatalog",
    "action": "approve",
    "code": "fee-catalog.approve",
    "description": "Approve/Verify in Fee Catalog",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "fee-catalog",
    "resource": "FeeCatalog",
    "action": "approve",
    "code": "fees.approve",
    "description": "Approve/Verify in Fee Catalog (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "coupons",
    "resource": "Coupon",
    "action": "view",
    "code": "coupons.view",
    "description": "View in Coupons & Discounts",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "coupons",
    "resource": "Coupon",
    "action": "view",
    "code": "coupon.view",
    "description": "View in Coupons & Discounts (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "coupons",
    "resource": "Coupon",
    "action": "create",
    "code": "coupons.create",
    "description": "Create in Coupons & Discounts",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "coupons",
    "resource": "Coupon",
    "action": "create",
    "code": "coupon.create",
    "description": "Create in Coupons & Discounts (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "coupons",
    "resource": "Coupon",
    "action": "edit",
    "code": "coupons.edit",
    "description": "Edit in Coupons & Discounts",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "coupons",
    "resource": "Coupon",
    "action": "edit",
    "code": "coupon.edit",
    "description": "Edit in Coupons & Discounts (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "coupons",
    "resource": "Coupon",
    "action": "delete",
    "code": "coupons.delete",
    "description": "Delete in Coupons & Discounts",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "coupons",
    "resource": "Coupon",
    "action": "delete",
    "code": "coupon.delete",
    "description": "Delete in Coupons & Discounts (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "coupons",
    "resource": "Coupon",
    "action": "export",
    "code": "coupons.export",
    "description": "Export in Coupons & Discounts",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "coupons",
    "resource": "Coupon",
    "action": "export",
    "code": "coupon.export",
    "description": "Export in Coupons & Discounts (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "coupons",
    "resource": "Coupon",
    "action": "approve",
    "code": "coupons.approve",
    "description": "Approve/Verify in Coupons & Discounts",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "coupons",
    "resource": "Coupon",
    "action": "approve",
    "code": "coupon.approve",
    "description": "Approve/Verify in Coupons & Discounts (Canonical alias)",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "support",
    "resource": "SupportTicket",
    "action": "view",
    "code": "support.view",
    "description": "View in Help & Support",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "support",
    "resource": "SupportTicket",
    "action": "create",
    "code": "support.create",
    "description": "Create in Help & Support",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "support",
    "resource": "SupportTicket",
    "action": "edit",
    "code": "support.edit",
    "description": "Edit in Help & Support",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "support",
    "resource": "SupportTicket",
    "action": "delete",
    "code": "support.delete",
    "description": "Delete in Help & Support",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "support",
    "resource": "SupportTicket",
    "action": "export",
    "code": "support.export",
    "description": "Export in Help & Support",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "support",
    "resource": "SupportTicket",
    "action": "approve",
    "code": "support.approve",
    "description": "Approve/Verify in Help & Support",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "contact-management",
    "resource": "ContactManagement",
    "action": "view",
    "code": "contact-management.view",
    "description": "View in Contact Management",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "contact-management",
    "resource": "ContactManagement",
    "action": "view",
    "code": "contact.view",
    "description": "View in Contact Management (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "contact-management",
    "resource": "ContactManagement",
    "action": "create",
    "code": "contact-management.create",
    "description": "Create in Contact Management",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "contact-management",
    "resource": "ContactManagement",
    "action": "create",
    "code": "contact.create",
    "description": "Create in Contact Management (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "contact-management",
    "resource": "ContactManagement",
    "action": "edit",
    "code": "contact-management.edit",
    "description": "Edit in Contact Management",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "contact-management",
    "resource": "ContactManagement",
    "action": "edit",
    "code": "contact.edit",
    "description": "Edit in Contact Management (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "contact-management",
    "resource": "ContactManagement",
    "action": "delete",
    "code": "contact-management.delete",
    "description": "Delete in Contact Management",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "contact-management",
    "resource": "ContactManagement",
    "action": "delete",
    "code": "contact.delete",
    "description": "Delete in Contact Management (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "contact-management",
    "resource": "ContactManagement",
    "action": "export",
    "code": "contact-management.export",
    "description": "Export in Contact Management",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "contact-management",
    "resource": "ContactManagement",
    "action": "export",
    "code": "contact.export",
    "description": "Export in Contact Management (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "contact-management",
    "resource": "ContactManagement",
    "action": "approve",
    "code": "contact-management.approve",
    "description": "Approve/Verify in Contact Management",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "contact-management",
    "resource": "ContactManagement",
    "action": "approve",
    "code": "contact.approve",
    "description": "Approve/Verify in Contact Management (Canonical alias)",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "organization",
    "resource": "Organization",
    "action": "view",
    "code": "organization.view",
    "description": "View in Organization Structure",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "organization",
    "resource": "Organization",
    "action": "create",
    "code": "organization.create",
    "description": "Create in Organization Structure",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "organization",
    "resource": "Organization",
    "action": "edit",
    "code": "organization.edit",
    "description": "Edit in Organization Structure",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "organization",
    "resource": "Organization",
    "action": "delete",
    "code": "organization.delete",
    "description": "Delete in Organization Structure",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "organization",
    "resource": "Organization",
    "action": "export",
    "code": "organization.export",
    "description": "Export in Organization Structure",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "organization",
    "resource": "Organization",
    "action": "approve",
    "code": "organization.approve",
    "description": "Approve/Verify in Organization Structure",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "RolePermission",
    "action": "view",
    "code": "rbac.view",
    "description": "View in Roles & Permissions",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "RolePermission",
    "action": "view",
    "code": "roles.view",
    "description": "View in Roles & Permissions (Canonical alias)",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "RolePermission",
    "action": "create",
    "code": "rbac.create",
    "description": "Create in Roles & Permissions",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "RolePermission",
    "action": "create",
    "code": "roles.create",
    "description": "Create in Roles & Permissions (Canonical alias)",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "RolePermission",
    "action": "edit",
    "code": "rbac.edit",
    "description": "Edit in Roles & Permissions",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "RolePermission",
    "action": "edit",
    "code": "roles.edit",
    "description": "Edit in Roles & Permissions (Canonical alias)",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "RolePermission",
    "action": "delete",
    "code": "rbac.delete",
    "description": "Delete in Roles & Permissions",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "RolePermission",
    "action": "delete",
    "code": "roles.delete",
    "description": "Delete in Roles & Permissions (Canonical alias)",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "RolePermission",
    "action": "export",
    "code": "rbac.export",
    "description": "Export in Roles & Permissions",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "RolePermission",
    "action": "export",
    "code": "roles.export",
    "description": "Export in Roles & Permissions (Canonical alias)",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "RolePermission",
    "action": "approve",
    "code": "rbac.approve",
    "description": "Approve/Verify in Roles & Permissions",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "RolePermission",
    "action": "approve",
    "code": "roles.approve",
    "description": "Approve/Verify in Roles & Permissions (Canonical alias)",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "settings",
    "resource": "Setting",
    "action": "view",
    "code": "settings.view",
    "description": "View in Settings",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "settings",
    "resource": "Setting",
    "action": "create",
    "code": "settings.create",
    "description": "Create in Settings",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "settings",
    "resource": "Setting",
    "action": "edit",
    "code": "settings.edit",
    "description": "Edit in Settings",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "settings",
    "resource": "Setting",
    "action": "delete",
    "code": "settings.delete",
    "description": "Delete in Settings",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "settings",
    "resource": "Setting",
    "action": "export",
    "code": "settings.export",
    "description": "Export in Settings",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "settings",
    "resource": "Setting",
    "action": "approve",
    "code": "settings.approve",
    "description": "Approve/Verify in Settings",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "logs",
    "resource": "ActivityLog",
    "action": "view",
    "code": "logs.view",
    "description": "View in Activity Logs",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "logs",
    "resource": "ActivityLog",
    "action": "create",
    "code": "logs.create",
    "description": "Create in Activity Logs",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "logs",
    "resource": "ActivityLog",
    "action": "edit",
    "code": "logs.edit",
    "description": "Edit in Activity Logs",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "logs",
    "resource": "ActivityLog",
    "action": "delete",
    "code": "logs.delete",
    "description": "Delete in Activity Logs",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "logs",
    "resource": "ActivityLog",
    "action": "export",
    "code": "logs.export",
    "description": "Export in Activity Logs",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "logs",
    "resource": "ActivityLog",
    "action": "approve",
    "code": "logs.approve",
    "description": "Approve/Verify in Activity Logs",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "leads",
    "resource": "Lead",
    "action": "assign",
    "code": "lead.assign",
    "description": "Assign leads to counselors",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "leads",
    "resource": "Lead",
    "action": "assign",
    "code": "leads.assign",
    "description": "Assign leads to counselors",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "counselors",
    "resource": "Counselor",
    "action": "assign",
    "code": "counselor.assign",
    "description": "Assign counselors to teams/regions",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "counselors",
    "resource": "Counselor",
    "action": "assign",
    "code": "counselors.assign",
    "description": "Assign counselors to teams/regions",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "students",
    "resource": "Student",
    "action": "assign",
    "code": "student.assign",
    "description": "Assign students to counselors",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "students",
    "resource": "Student",
    "action": "assign",
    "code": "students.assign",
    "description": "Assign students to counselors",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "applications",
    "resource": "Application",
    "action": "reject",
    "code": "application.reject",
    "description": "Reject college application",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "applications",
    "resource": "Application",
    "action": "reject",
    "code": "applications.reject",
    "description": "Reject college application",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "applications",
    "resource": "Application",
    "action": "assign",
    "code": "application.assign",
    "description": "Assign application reviewer",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "applications",
    "resource": "Application",
    "action": "review",
    "code": "application.review",
    "description": "Review college application",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "applications",
    "resource": "Application",
    "action": "reopen",
    "code": "application.reopen",
    "description": "Reopen college application",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "colleges",
    "resource": "College",
    "action": "manage",
    "code": "college.manage",
    "description": "Manage college details",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "colleges",
    "resource": "College",
    "action": "verify",
    "code": "college.verify",
    "description": "Verify college profile",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "colleges",
    "resource": "College",
    "action": "suspend",
    "code": "college.suspend",
    "description": "Suspend college partnership",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "Offering",
    "action": "submit",
    "code": "college.offering.submit",
    "description": "Submit college course offering",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "Offering",
    "action": "close",
    "code": "college.offering.close",
    "description": "Close college course offering",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "Offering",
    "action": "view",
    "code": "college.offering.view",
    "description": "View course offerings",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "Offering",
    "action": "create",
    "code": "college.offering.create",
    "description": "Create course offering",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "Offering",
    "action": "edit",
    "code": "college.offering.edit",
    "description": "Edit course offering",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "Offering",
    "action": "approve",
    "code": "college.offering.approve",
    "description": "Approve course offering",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "Application",
    "action": "claim",
    "code": "college.application.claim",
    "description": "Claim student application",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "Application",
    "action": "review",
    "code": "college.application.review",
    "description": "Review student application",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "Application",
    "action": "reject",
    "code": "college.application.reject",
    "description": "Reject student application",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "Application",
    "action": "reopen",
    "code": "college.application.reopen",
    "description": "Reopen student application",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "Application",
    "action": "view",
    "code": "college.application.view",
    "description": "View college applications",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "Reporting",
    "action": "verify",
    "code": "college.reporting.verify",
    "description": "Verify college reporting data",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "Reporting",
    "action": "view",
    "code": "college.reporting.view",
    "description": "View college reporting data",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "Enrollment",
    "action": "confirm",
    "code": "college.enrollment.confirm",
    "description": "Confirm student college enrollment",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "Enrollment",
    "action": "view",
    "code": "college.enrollment.view",
    "description": "View college enrollments",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "Staff",
    "action": "manage",
    "code": "college.staff.manage",
    "description": "Manage college partner staff",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "Staff",
    "action": "view",
    "code": "college.staff.view",
    "description": "View college partner staff",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "Documents",
    "action": "manage",
    "code": "college.documents.manage",
    "description": "Manage college portal documents",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "Documents",
    "action": "view",
    "code": "college.documents.view",
    "description": "View college portal documents",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-portal",
    "resource": "Documents",
    "action": "upload",
    "code": "college.documents.upload",
    "description": "Upload college portal documents",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "documents",
    "resource": "Document",
    "action": "upload",
    "code": "document.upload",
    "description": "Upload verification document",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "documents",
    "resource": "Document",
    "action": "upload",
    "code": "documents.upload",
    "description": "Upload verification document",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "documents",
    "resource": "Document",
    "action": "verify",
    "code": "document.verify",
    "description": "Verify uploaded student document",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "documents",
    "resource": "Document",
    "action": "verify",
    "code": "documents.verify",
    "description": "Verify uploaded student document",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "documents",
    "resource": "Document",
    "action": "reject",
    "code": "document.reject",
    "description": "Reject document upload",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "documents",
    "resource": "Document",
    "action": "reject",
    "code": "documents.reject",
    "description": "Reject document upload",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "blogs",
    "resource": "Blog",
    "action": "publish",
    "code": "blog.publish",
    "description": "Publish career guide blog post",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "blogs",
    "resource": "Blog",
    "action": "publish",
    "code": "blogs.publish",
    "description": "Publish career guide blog post",
    "category": "CONTENT",
    "group": "Content"
  },
  {
    "module": "ai",
    "resource": "AI",
    "action": "manage",
    "code": "ai.manage",
    "description": "Manage AI counselor tuning and prompts",
    "category": "INTELLIGENCE",
    "group": "Intelligence"
  },
  {
    "module": "notifications",
    "resource": "Notification",
    "action": "send",
    "code": "notification.send",
    "description": "Send broadcast notification",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "notifications",
    "resource": "Notification",
    "action": "send",
    "code": "notifications.send",
    "description": "Send broadcast notification",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "payments",
    "resource": "Payment",
    "action": "verify",
    "code": "payment.verify",
    "description": "Verify student transaction receipt",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "payments",
    "resource": "Payment",
    "action": "verify",
    "code": "payments.verify",
    "description": "Verify student transaction receipt",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "payments",
    "resource": "Payment",
    "action": "refund",
    "code": "payment.refund",
    "description": "Process payment refund",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "payments",
    "resource": "Payment",
    "action": "refund",
    "code": "payments.refund",
    "description": "Process payment refund",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "payments",
    "resource": "Payment",
    "action": "issue",
    "code": "payment.issue",
    "description": "Issue offline payment challan",
    "category": "OPERATIONS",
    "group": "Operations"
  },
  {
    "module": "rbac",
    "resource": "Role",
    "action": "manage",
    "code": "roles.manage",
    "description": "Manage roles and permissions",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "Role",
    "action": "hierarchy",
    "code": "roles.hierarchy",
    "description": "Manage role hierarchy and re-parenting",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "Role",
    "action": "lock",
    "code": "roles.lock",
    "description": "Execute security emergency lock",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "Role",
    "action": "unlock",
    "code": "roles.unlock",
    "description": "Unlock security locked role",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "Role",
    "action": "disable",
    "code": "roles.disable",
    "description": "Disable enterprise access role",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "Role",
    "action": "enable",
    "code": "roles.enable",
    "description": "Enable enterprise access role",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "Role",
    "action": "archive",
    "code": "roles.archive",
    "description": "Archive access role",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "Role",
    "action": "assign",
    "code": "roles.assign",
    "description": "Assign role to staff user",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "Governance",
    "action": "view",
    "code": "governance.view",
    "description": "View governance approval requests",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "Governance",
    "action": "create",
    "code": "governance.create",
    "description": "Create governance request",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "Governance",
    "action": "approve",
    "code": "governance.approve",
    "description": "Approve governance request",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "rbac",
    "resource": "Governance",
    "action": "reject",
    "code": "governance.reject",
    "description": "Reject governance request",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "settings",
    "resource": "Setting",
    "action": "manage",
    "code": "settings.manage",
    "description": "Manage system settings",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "organization",
    "resource": "Organization",
    "action": "manage",
    "code": "organization.manage",
    "description": "Manage organization units",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "organization",
    "resource": "Department",
    "action": "disable",
    "code": "department.disable",
    "description": "Disable department",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "organization",
    "resource": "Department",
    "action": "enable",
    "code": "department.enable",
    "description": "Enable department",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "organization",
    "resource": "Department",
    "action": "archive",
    "code": "department.archive",
    "description": "Archive department",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "organization",
    "resource": "Team",
    "action": "disable",
    "code": "unit.disable",
    "description": "Disable organizational team",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "organization",
    "resource": "Team",
    "action": "enable",
    "code": "unit.enable",
    "description": "Enable organizational team",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "organization",
    "resource": "Team",
    "action": "archive",
    "code": "unit.archive",
    "description": "Archive organizational team",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "organization",
    "resource": "Team",
    "action": "manage_members",
    "code": "unit.manage_members",
    "description": "Manage team staff members",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "organization",
    "resource": "Team",
    "action": "manage_manager",
    "code": "unit.manage_manager",
    "description": "Assign manager to team",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "organization",
    "resource": "GeographicAssignment",
    "action": "manage",
    "code": "geographic.manage",
    "description": "Manage geographic state/district assignments",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "organization",
    "resource": "Position",
    "action": "assign",
    "code": "position.assign",
    "description": "Assign staff to organizational position",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "organization",
    "resource": "Position",
    "action": "retire",
    "code": "position.retire",
    "description": "Retire organizational position",
    "category": "SYSTEM",
    "group": "System"
  },
  {
    "module": "staff-onboarding",
    "resource": "StaffRegistration",
    "action": "verify",
    "code": "staff.kyc.verify",
    "description": "Verify staff KYC verification documents",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "staff-onboarding",
    "resource": "StaffRegistration",
    "action": "edit",
    "code": "staff.resign",
    "description": "Handle staff resignation",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "staff-onboarding",
    "resource": "StaffRegistration",
    "action": "edit",
    "code": "staff.transfer",
    "description": "Transfer staff between departments/districts",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "staff-onboarding",
    "resource": "StaffRegistration",
    "action": "edit",
    "code": "staff.password.reset",
    "description": "Force password reset on staff account",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "staff-onboarding",
    "resource": "StaffRegistration",
    "action": "delete",
    "code": "staff.session.revoke",
    "description": "Revoke staff active sessions",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "staff-onboarding",
    "resource": "StaffRegistration",
    "action": "edit",
    "code": "staff.account.lock",
    "description": "Lock staff account",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "staff-onboarding",
    "resource": "StaffRegistration",
    "action": "edit",
    "code": "staff.account.unlock",
    "description": "Unlock staff account",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "staff-onboarding",
    "resource": "StaffRegistration",
    "action": "edit",
    "code": "staff.account.disable",
    "description": "Disable staff account",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "staff-onboarding",
    "resource": "StaffRegistration",
    "action": "edit",
    "code": "staff.account.enable",
    "description": "Enable staff account",
    "category": "CRM",
    "group": "CRM & Staff"
  },
  {
    "module": "college-rankings",
    "resource": "Methodology",
    "action": "manage",
    "code": "rankings.methodology.manage",
    "description": "Manage ranking methodology weights",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "Methodology",
    "action": "view",
    "code": "rankings.methodology.view",
    "description": "View ranking methodology",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "Survey",
    "action": "manage",
    "code": "rankings.survey.manage",
    "description": "Manage ranking surveys",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "Survey",
    "action": "view",
    "code": "rankings.survey.view",
    "description": "View ranking surveys",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "Review",
    "action": "manage",
    "code": "rankings.review.manage",
    "description": "Moderate college reviews",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "Review",
    "action": "view",
    "code": "rankings.review.view",
    "description": "View college reviews",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "Verification",
    "action": "verify",
    "code": "rankings.verify",
    "description": "Verify college ranking metrics",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "Calculation",
    "action": "generate",
    "code": "rankings.generate",
    "description": "Generate rankings snapshot",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "AnnualReport",
    "action": "view",
    "code": "rankings.report.view",
    "description": "View annual ranking report",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "AnnualReport",
    "action": "generate",
    "code": "rankings.report.generate",
    "description": "Generate annual ranking report",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "AnnualReport",
    "action": "approve",
    "code": "rankings.report.approve",
    "description": "Approve annual ranking report",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "Publication",
    "action": "publish",
    "code": "rankings.publish",
    "description": "Publish rankings",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  },
  {
    "module": "college-rankings",
    "resource": "Publication",
    "action": "archive",
    "code": "rankings.archive",
    "description": "Archive rankings",
    "category": "ACADEMIC",
    "group": "Academic & Partner Portal"
  }
];
