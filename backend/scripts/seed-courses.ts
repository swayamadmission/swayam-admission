import {
  PrismaClient,
  CourseCategory,
  CourseLevel,
  CourseDurationType,
  CourseMode,
  CollegeStatus,
  CollegeType,
  CollegeOwnership,
} from '@prisma/client';

const prisma = new PrismaClient();

interface BranchSeedDefinition {
  name: string;
  code?: string;
  slug: string;
  type?: string;
  order?: number;
}

interface EligibilitySeedDefinition {
  educationLevel: string;
  stream?: string;
  entryType?: string;
  lateralEntry?: boolean;
}

interface CourseFamilySeedDefinition {
  name: string;
  slug: string;
  category: CourseCategory;
  level: CourseLevel;
  duration: string;
  durationType: CourseDurationType;
  mode: CourseMode;
  eligibility: string;
  eligibleLevels: string[];
  eligibleStreams: string[];
  allowOtherBranch?: boolean;
  featured?: boolean;
  totalFees?: number;
  semesterFees?: number;
  description: string;
  careerScope: string;
  eligibilities: EligibilitySeedDefinition[];
  branches?: BranchSeedDefinition[];
}

export const PROGRAM_FAMILIES_SEED: CourseFamilySeedDefinition[] = [
  // ── 1. B.TECH (ENGINEERING & TECHNOLOGY) ──────────────────────────────────
  {
    name: 'B.Tech - Bachelor of Technology',
    slug: 'btech-bachelor-of-technology',
    category: CourseCategory.ENGINEERING,
    level: CourseLevel.UG,
    duration: '4',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '12th Pass with Physics, Mathematics, and Chemistry/CS (or Diploma in Engineering for Lateral Entry)',
    eligibleLevels: ['12th', 'Diploma'],
    eligibleStreams: ['Science'],
    allowOtherBranch: true,
    featured: true,
    totalFees: 480000,
    semesterFees: 60000,
    description: 'Premier 4-year undergraduate engineering program covering foundational concepts, hands-on lab projects, industry internships, and specialized technical disciplines.',
    careerScope: 'Software Engineer, AI Architect, Cloud Developer, Systems Engineer, Mechanical Engineer, Civil Designer, Data Scientist.',
    eligibilities: [
      { educationLevel: '12th', stream: 'Science', entryType: 'DIRECT', lateralEntry: false },
      { educationLevel: 'Diploma', stream: undefined, entryType: 'LATERAL', lateralEntry: true },
    ],
    branches: [
      { name: 'Computer Science & Engineering', code: 'CSE', slug: 'btech-cse', type: 'BRANCH', order: 1 },
      { name: 'Artificial Intelligence & Machine Learning', code: 'AI & ML', slug: 'btech-aiml', type: 'SPECIALIZATION', order: 2 },
      { name: 'Data Science', code: 'DS', slug: 'btech-ds', type: 'SPECIALIZATION', order: 3 },
      { name: 'Civil Engineering', code: 'CE', slug: 'btech-civil', type: 'BRANCH', order: 4 },
      { name: 'Mechanical Engineering', code: 'ME', slug: 'btech-mech', type: 'BRANCH', order: 5 },
      { name: 'Electronics & Communication', code: 'ECE', slug: 'btech-ece', type: 'BRANCH', order: 6 },
      { name: 'Electrical Engineering', code: 'EE', slug: 'btech-ee', type: 'BRANCH', order: 7 },
      { name: 'Biotechnology', code: 'BT', slug: 'btech-biotech', type: 'BRANCH', order: 8 },
      { name: 'Automobile Engineering', code: 'Auto', slug: 'btech-auto', type: 'BRANCH', order: 9 },
      { name: 'Cloud Computing & Cyber Security', code: 'CC & CS', slug: 'btech-cloud-cyber', type: 'SPECIALIZATION', order: 10 },
    ],
  },

  // ── 2. POLYTECHNIC DIPLOMA (AFTER 10TH / 12TH) ─────────────────────────────
  {
    name: 'Polytechnic - Diploma in Engineering',
    slug: 'polytechnic-diploma-in-engineering',
    category: CourseCategory.ENGINEERING,
    level: CourseLevel.DIPLOMA,
    duration: '3',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10th pass with Science & Math or 12th / ITI for lateral entry',
    eligibleLevels: ['10th', '12th', 'ITI'],
    eligibleStreams: [],
    allowOtherBranch: true,
    featured: true,
    totalFees: 120000,
    semesterFees: 20000,
    description: 'Skill-oriented technical diploma focused on practical engineering fundamentals, workshop training, and industrial technician skills.',
    careerScope: 'Junior Engineer, Technical Supervisor, CAD Drafter, Plant Maintenance Engineer, Hardware Specialist.',
    eligibilities: [
      { educationLevel: '10th', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
      { educationLevel: '12th', stream: 'Science', entryType: 'DIRECT', lateralEntry: false },
      { educationLevel: '12th', stream: 'Vocational', entryType: 'DIRECT', lateralEntry: false },
      { educationLevel: 'ITI', stream: undefined, entryType: 'LATERAL', lateralEntry: true },
    ],
    branches: [
      { name: 'Computer Science & Engineering', code: 'CSE', slug: 'poly-cse', type: 'BRANCH', order: 1 },
      { name: 'Mechanical Engineering', code: 'ME', slug: 'poly-mech', type: 'BRANCH', order: 2 },
      { name: 'Civil Engineering', code: 'CE', slug: 'poly-civil', type: 'BRANCH', order: 3 },
      { name: 'Electrical Engineering', code: 'EE', slug: 'poly-ee', type: 'BRANCH', order: 4 },
      { name: 'Electronics & Communication', code: 'ECE', slug: 'poly-ece', type: 'BRANCH', order: 5 },
      { name: 'Automobile Engineering', code: 'Auto', slug: 'poly-auto', type: 'BRANCH', order: 6 },
    ],
  },

  // ── 3. B.SC (SCIENCE & APPLIED SCIENCES) ──────────────────────────────────
  {
    name: 'B.Sc - Bachelor of Science',
    slug: 'bsc-bachelor-of-science',
    category: CourseCategory.SCIENCE,
    level: CourseLevel.UG,
    duration: '3',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10+2 with Physics, Chemistry, and Mathematics or Biology with minimum 50% marks',
    eligibleLevels: ['12th'],
    eligibleStreams: ['Science'],
    allowOtherBranch: true,
    featured: true,
    totalFees: 180000,
    semesterFees: 30000,
    description: 'Rigorous undergraduate scientific program offering broad analytical foundations and deep domain specializations across pure and applied disciplines.',
    careerScope: 'Research Associate, Scientific Analyst, Lab Technologist, Data Scientist, Agronomist, Registered Staff Nurse.',
    eligibilities: [
      { educationLevel: '12th', stream: 'Science', entryType: 'DIRECT', lateralEntry: false },
    ],
    branches: [
      { name: 'Physics / Chemistry / Mathematics (PCM)', code: 'PCM', slug: 'bsc-pcm', type: 'BRANCH', order: 1 },
      { name: 'Computer Science', code: 'CS', slug: 'bsc-cs', type: 'BRANCH', order: 2 },
      { name: 'Information Technology', code: 'IT', slug: 'bsc-it', type: 'BRANCH', order: 3 },
      { name: 'Biotechnology', code: 'Biotech', slug: 'bsc-biotech', type: 'BRANCH', order: 4 },
      { name: 'Agriculture (Hons.)', code: 'Agri', slug: 'bsc-agri', type: 'BRANCH', order: 5 },
      { name: 'Nursing', code: 'Nursing', slug: 'bsc-nursing', type: 'BRANCH', order: 6 },
    ],
  },

  // ── 4. B.COM (COMMERCE, FINANCE & FINTECH) ────────────────────────────────
  {
    name: 'B.Com - Bachelor of Commerce',
    slug: 'bcom-bachelor-of-commerce',
    category: CourseCategory.COMMERCE,
    level: CourseLevel.UG,
    duration: '3',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10+2 with Commerce, Science, or Arts with minimum 45% marks',
    eligibleLevels: ['12th'],
    eligibleStreams: ['Commerce', 'Science', 'Arts'],
    allowOtherBranch: true,
    featured: true,
    totalFees: 140000,
    semesterFees: 23333,
    description: 'Comprehensive undergraduate degree in financial accounting, corporate taxation, modern fintech, banking systems, and business law.',
    careerScope: 'Financial Analyst, Accountant, Tax Consultant, Wealth Manager, Investment Banking Associate, Auditor.',
    eligibilities: [
      { educationLevel: '12th', stream: 'Commerce', entryType: 'DIRECT', lateralEntry: false },
      { educationLevel: '12th', stream: 'Science', entryType: 'DIRECT', lateralEntry: false },
      { educationLevel: '12th', stream: 'Arts', entryType: 'DIRECT', lateralEntry: false },
    ],
    branches: [
      { name: 'General Financial Accounting', code: 'FA', slug: 'bcom-general', type: 'SPECIALIZATION', order: 1 },
      { name: 'Honours - Fintech & Analytics', code: 'FinTech', slug: 'bcom-fintech', type: 'SPECIALIZATION', order: 2 },
      { name: 'Banking & Insurance', code: 'BI', slug: 'bcom-banking', type: 'SPECIALIZATION', order: 3 },
    ],
  },

  // ── 5. BBA (BUSINESS ADMINISTRATION & MANAGEMENT) ────────────────────────
  {
    name: 'BBA - Bachelor of Business Administration',
    slug: 'bba-bachelor-of-business-administration',
    category: CourseCategory.MANAGEMENT,
    level: CourseLevel.UG,
    duration: '3',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10+2 in any stream (Commerce / Science / Arts) with minimum 50% aggregate marks',
    eligibleLevels: ['12th'],
    eligibleStreams: [],
    allowOtherBranch: true,
    featured: true,
    totalFees: 240000,
    semesterFees: 40000,
    description: 'Flagship undergraduate management program fostering leadership, strategic marketing, corporate finance, analytics, and entrepreneurship.',
    careerScope: 'Business Development Manager, Marketing Executive, HR Specialist, Operations Associate, Startup Founder.',
    eligibilities: [
      { educationLevel: '12th', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
    branches: [
      { name: 'General Management', code: 'GM', slug: 'bba-general', type: 'SPECIALIZATION', order: 1 },
      { name: 'Marketing & Digital Media', code: 'MKT', slug: 'bba-marketing', type: 'SPECIALIZATION', order: 2 },
      { name: 'Finance & Banking', code: 'FIN', slug: 'bba-finance', type: 'SPECIALIZATION', order: 3 },
      { name: 'Human Resource Management', code: 'HR', slug: 'bba-hr', type: 'SPECIALIZATION', order: 4 },
      { name: 'Business Analytics', code: 'BA', slug: 'bba-analytics', type: 'SPECIALIZATION', order: 5 },
    ],
  },

  // ── 6. MBA (MASTER OF BUSINESS ADMINISTRATION) ────────────────────────────
  {
    name: 'MBA - Master of Business Administration',
    slug: 'mba-master-of-business-administration',
    category: CourseCategory.MANAGEMENT,
    level: CourseLevel.PG,
    duration: '2',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: 'Graduation in any discipline with minimum 50% marks (CAT / MAT / XAT / CMAT / University Entrance)',
    eligibleLevels: ['Undergraduate'],
    eligibleStreams: [],
    allowOtherBranch: true,
    featured: true,
    totalFees: 550000,
    semesterFees: 137500,
    description: 'Transformative 2-year postgraduate program equipping future business leaders with strategic decision-making, executive communication, and deep specialization.',
    careerScope: 'Product Manager, Management Consultant, Investment Banker, Strategy Director, Brand Manager, Chief Financial Officer.',
    eligibilities: [
      { educationLevel: 'Undergraduate', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
    branches: [
      { name: 'Dual Specialization (Finance / Marketing / HR)', code: 'Core', slug: 'mba-core', type: 'SPECIALIZATION', order: 1 },
      { name: 'Business Analytics & Data Intelligence', code: 'BA', slug: 'mba-analytics', type: 'SPECIALIZATION', order: 2 },
      { name: 'Operations & Supply Chain Management', code: 'SCM', slug: 'mba-operations', type: 'SPECIALIZATION', order: 3 },
      { name: 'Healthcare & Hospital Administration', code: 'HHA', slug: 'mba-healthcare', type: 'SPECIALIZATION', order: 4 },
    ],
  },

  // ── 7. M.TECH (MASTER OF TECHNOLOGY) ──────────────────────────────────────
  {
    name: 'M.Tech - Master of Technology',
    slug: 'mtech-master-of-technology',
    category: CourseCategory.ENGINEERING,
    level: CourseLevel.PG,
    duration: '2',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: 'B.Tech / B.E. / M.Sc / MCA with minimum 55% marks and valid GATE / PG Entrance score',
    eligibleLevels: ['Undergraduate'],
    eligibleStreams: ['Engineering', 'Science', 'Computer Science'],
    allowOtherBranch: true,
    featured: false,
    totalFees: 260000,
    semesterFees: 65000,
    description: 'Advanced postgraduate engineering and research program in cutting-edge computer architectures, embedded VLSI systems, and intelligent machines.',
    careerScope: 'Senior Systems Architect, VLSI Design Engineer, Principal Research Scientist, AI Research Lead, Professor.',
    eligibilities: [
      { educationLevel: 'Undergraduate', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
    branches: [
      { name: 'Computer Science & Engineering', code: 'CSE', slug: 'mtech-cse', type: 'BRANCH', order: 1 },
      { name: 'VLSI & Embedded Systems', code: 'VLSI', slug: 'mtech-vlsi', type: 'BRANCH', order: 2 },
    ],
  },

  // ── 8. M.SC (MASTER OF SCIENCE) ──────────────────────────────────────────
  {
    name: 'M.Sc - Master of Science',
    slug: 'msc-master-of-science',
    category: CourseCategory.SCIENCE,
    level: CourseLevel.PG,
    duration: '2',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: 'B.Sc / BCA / B.Tech in relevant scientific or computational disciplines with minimum 50% marks',
    eligibleLevels: ['Undergraduate'],
    eligibleStreams: ['Science'],
    allowOtherBranch: true,
    featured: false,
    totalFees: 200000,
    semesterFees: 50000,
    description: 'Advanced postgraduate studies integrating scientific experimentation, computational algorithms, and industrial laboratory research.',
    careerScope: 'Senior Data Scientist, Machine Learning Engineer, Clinical Research Associate, Microbiologist, Bioinformatician.',
    eligibilities: [
      { educationLevel: 'Undergraduate', stream: 'Science', entryType: 'DIRECT', lateralEntry: false },
    ],
    branches: [
      { name: 'Data Science & Artificial Intelligence', code: 'DS & AI', slug: 'msc-ds-ai', type: 'SPECIALIZATION', order: 1 },
      { name: 'Biotechnology & Microbiology', code: 'Biotech', slug: 'msc-biotech', type: 'SPECIALIZATION', order: 2 },
    ],
  },

  // ── 9. B.A. (HUMANITIES & SOCIAL SCIENCES) ───────────────────────────────
  {
    name: 'B.A. - Bachelor of Arts',
    slug: 'ba-bachelor-of-arts',
    category: CourseCategory.ARTS,
    level: CourseLevel.UG,
    duration: '3',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10+2 from recognized board in Arts, Commerce, or Science',
    eligibleLevels: ['12th'],
    eligibleStreams: [],
    allowOtherBranch: true,
    featured: false,
    totalFees: 120000,
    semesterFees: 20000,
    description: 'Interdisciplinary humanities program in critical analysis, historical perspectives, behavioral sciences, and media communication.',
    careerScope: 'Journalist, Content Director, Public Policy Analyst, Human Services Counselor, Civil Services Aspirant.',
    eligibilities: [
      { educationLevel: '12th', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
    branches: [
      { name: 'Honours (English / Political Science / History)', code: 'BA Hons', slug: 'ba-hons', type: 'MAJOR', order: 1 },
      { name: 'Journalism & Mass Communication (BJMC)', code: 'BJMC', slug: 'ba-bjmc', type: 'MAJOR', order: 2 },
      { name: 'Psychology & Behavioral Studies', code: 'Psych', slug: 'ba-psych', type: 'MAJOR', order: 3 },
    ],
  },

  // ── 10. PH.D (DOCTORAL RESEARCH) ──────────────────────────────────────────
  {
    name: 'Ph.D - Doctor of Philosophy',
    slug: 'phd-doctor-of-philosophy',
    category: CourseCategory.OTHER,
    level: CourseLevel.PHD,
    duration: '3',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: "Master's degree in relevant discipline with minimum 55% marks and UGC-NET / CSIR / Entrance Test qualification",
    eligibleLevels: ['Postgraduate'],
    eligibleStreams: [],
    allowOtherBranch: true,
    featured: false,
    totalFees: 300000,
    semesterFees: 50000,
    description: 'Highest academic research degree dedicated to original doctoral research, peer-reviewed publications, and university scholarship.',
    careerScope: 'University Professor, Principal Scientist, R&D Director, Chief Policy Advisor, Industrial Research Fellow.',
    eligibilities: [
      { educationLevel: 'Postgraduate', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
    branches: [
      { name: 'Computer Science & Engineering', code: 'Ph.D CSE', slug: 'phd-cse', type: 'CONCENTRATION', order: 1 },
      { name: 'Management Studies', code: 'Ph.D Mgmt', slug: 'phd-mgmt', type: 'CONCENTRATION', order: 2 },
      { name: 'Pharmaceutical Sciences', code: 'Ph.D Pharm', slug: 'phd-pharm', type: 'CONCENTRATION', order: 3 },
    ],
  },

  // ── 11. INDEPENDENT / BRANCHLESS PROGRAMS (COUNT = 0 BRANCHES) ────────────

  {
    name: 'BCA - Bachelor of Computer Applications',
    slug: 'bca-bachelor-of-computer-applications',
    category: CourseCategory.COMPUTER_APPLICATIONS,
    level: CourseLevel.UG,
    duration: '3',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10+2 in any stream (Science/Commerce/Arts) with Mathematics/Computer/IP or minimum 45% marks',
    eligibleLevels: ['12th'],
    eligibleStreams: [],
    allowOtherBranch: false,
    featured: true,
    totalFees: 240000,
    semesterFees: 40000,
    description: 'Industry-driven software application development program focused on full-stack web, cloud computing, database engineering, and modern DevOps.',
    careerScope: 'Full-Stack Developer, Cloud Administrator, Database Engineer, QA Automation Engineer, Application Specialist.',
    eligibilities: [
      { educationLevel: '12th', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'MCA - Master of Computer Applications',
    slug: 'mca-master-of-computer-applications',
    category: CourseCategory.COMPUTER_APPLICATIONS,
    level: CourseLevel.PG,
    duration: '2',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: 'BCA / B.Sc (IT/CS) / B.Tech or Graduation with Mathematics at 10+2 / UG level with 50% marks',
    eligibleLevels: ['Undergraduate'],
    eligibleStreams: [],
    allowOtherBranch: false,
    featured: true,
    totalFees: 280000,
    semesterFees: 70000,
    description: '2-year advanced postgraduate computing degree focusing on cloud architectures, enterprise software, AI integration, and systems design.',
    careerScope: 'Lead Software Architect, Principal Developer, Cloud Solutions Engineer, Engineering Manager, Data Engineer.',
    eligibilities: [
      { educationLevel: 'Undergraduate', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'MBBS - Bachelor of Medicine & Bachelor of Surgery',
    slug: 'mbbs-bachelor-of-medicine-bachelor-of-surgery',
    category: CourseCategory.MEDICAL,
    level: CourseLevel.UG,
    duration: '5.5',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10+2 with Physics, Chemistry, Biology (PCB) with 50% marks + Qualified NEET-UG Exam',
    eligibleLevels: ['12th'],
    eligibleStreams: ['Science'],
    allowOtherBranch: false,
    featured: true,
    totalFees: 4500000,
    semesterFees: 450000,
    description: 'Premier medical degree preparing licensed clinical doctors with extensive rotatory hospital internships and comprehensive clinical exposure.',
    careerScope: 'General Physician, Clinical Resident, Medical Officer, Hospitalist, Medical Researcher.',
    eligibilities: [
      { educationLevel: '12th', stream: 'Science', entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'BDS - Bachelor of Dental Surgery',
    slug: 'bds-bachelor-of-dental-surgery',
    category: CourseCategory.MEDICAL,
    level: CourseLevel.UG,
    duration: '5',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10+2 with PCB (minimum 50%) + NEET-UG Qualified',
    eligibleLevels: ['12th'],
    eligibleStreams: ['Science'],
    allowOtherBranch: false,
    featured: false,
    totalFees: 1200000,
    semesterFees: 120000,
    description: 'Comprehensive dental surgery and oral healthcare degree covering maxillofacial diagnosis, orthodontics, and restorative dentistry.',
    careerScope: 'Dental Surgeon, Oral Healthcare Consultant, Orthodontic Practitioner, Public Health Dentist.',
    eligibilities: [
      { educationLevel: '12th', stream: 'Science', entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'BAMS - Bachelor of Ayurvedic Medicine & Surgery',
    slug: 'bams-bachelor-of-ayurvedic-medicine-surgery',
    category: CourseCategory.MEDICAL,
    level: CourseLevel.UG,
    duration: '5.5',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10+2 with PCB (minimum 50%) + NEET-UG Qualified',
    eligibleLevels: ['12th'],
    eligibleStreams: ['Science'],
    allowOtherBranch: false,
    featured: false,
    totalFees: 1000000,
    semesterFees: 100000,
    description: 'Integrative traditional Indian medicine and modern diagnostic sciences program with hospital rotatory internship.',
    careerScope: 'Ayurvedic Medical Officer, Panchakarma Specialist, Wellness Director, Clinical Researcher.',
    eligibilities: [
      { educationLevel: '12th', stream: 'Science', entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'BHMS - Bachelor of Homeopathic Medicine & Surgery',
    slug: 'bhms-bachelor-of-homeopathic-medicine-surgery',
    category: CourseCategory.MEDICAL,
    level: CourseLevel.UG,
    duration: '5.5',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10+2 with PCB (minimum 50%) + NEET-UG Qualified',
    eligibleLevels: ['12th'],
    eligibleStreams: ['Science'],
    allowOtherBranch: false,
    featured: false,
    totalFees: 900000,
    semesterFees: 90000,
    description: 'Professional homeopathic medical degree focusing on holistic patient care, chronic disease management, and pharmacology.',
    careerScope: 'Homeopathic Physician, Medical Officer, Holistic Health Advisor, Healthcare Executive.',
    eligibilities: [
      { educationLevel: '12th', stream: 'Science', entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'BPT - Bachelor of Physiotherapy',
    slug: 'bpt-bachelor-of-physiotherapy',
    category: CourseCategory.MEDICAL,
    level: CourseLevel.UG,
    duration: '4.5',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10+2 with PCB and English with minimum 50% aggregate marks',
    eligibleLevels: ['12th'],
    eligibleStreams: ['Science'],
    allowOtherBranch: false,
    featured: false,
    totalFees: 360000,
    semesterFees: 45000,
    description: 'Rehabilitative healthcare program preparing certified physical therapists for musculoskeletal, neurological, and sports rehabilitation.',
    careerScope: 'Consultant Physiotherapist, Sports Rehab Specialist, ICU Physiotherapist, Ergonomist.',
    eligibilities: [
      { educationLevel: '12th', stream: 'Science', entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'B.Pharm - Bachelor of Pharmacy',
    slug: 'bpharm-bachelor-of-pharmacy',
    category: CourseCategory.PHARMACY,
    level: CourseLevel.UG,
    duration: '4',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10+2 with PCM/PCB or D.Pharm for Lateral Entry (2nd Year)',
    eligibleLevels: ['12th', 'Diploma'],
    eligibleStreams: ['Science'],
    allowOtherBranch: false,
    featured: true,
    totalFees: 380000,
    semesterFees: 47500,
    description: 'PCI-approved pharmaceutical sciences degree spanning drug discovery, organic pharmacology, clinical trials, and manufacturing.',
    careerScope: 'Registered Pharmacist, Drug Safety Officer, Quality Control Specialist, Clinical Research Associate.',
    eligibilities: [
      { educationLevel: '12th', stream: 'Science', entryType: 'DIRECT', lateralEntry: false },
      { educationLevel: 'Diploma', stream: undefined, entryType: 'LATERAL', lateralEntry: true },
    ],
  },
  {
    name: 'D.Pharm - Diploma in Pharmacy',
    slug: 'dpharm-diploma-in-pharmacy',
    category: CourseCategory.PHARMACY,
    level: CourseLevel.DIPLOMA,
    duration: '2',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10+2 with Physics, Chemistry, and Biology or Mathematics',
    eligibleLevels: ['12th'],
    eligibleStreams: ['Science'],
    allowOtherBranch: false,
    featured: false,
    totalFees: 160000,
    semesterFees: 40000,
    description: '2-year foundational pharmacy diploma preparing certified community pharmacists, hospital dispensary staff, and sales executives.',
    careerScope: 'Hospital Pharmacist, Retail Pharmacy Manager, Medical Representative, Quality Assistant.',
    eligibilities: [
      { educationLevel: '12th', stream: 'Science', entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'B.Arch - Bachelor of Architecture',
    slug: 'barch-bachelor-of-architecture',
    category: CourseCategory.DESIGN,
    level: CourseLevel.UG,
    duration: '5',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10+2 with PCM (minimum 50%) + Qualified NATA / JEE Main Paper 2',
    eligibleLevels: ['12th'],
    eligibleStreams: ['Science'],
    allowOtherBranch: false,
    featured: false,
    totalFees: 600000,
    semesterFees: 60000,
    description: 'COA-approved architectural design degree developing sustainable building design, urban planning, BIM software, and structural engineering.',
    careerScope: 'Architectural Consultant, Urban Designer, Landscape Architect, BIM Manager, Interior Architect.',
    eligibilities: [
      { educationLevel: '12th', stream: 'Science', entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'B.Des - Bachelor of Design',
    slug: 'bdes-bachelor-of-design',
    category: CourseCategory.DESIGN,
    level: CourseLevel.UG,
    duration: '4',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10+2 in any stream from a recognized board with minimum 50% marks',
    eligibleLevels: ['12th'],
    eligibleStreams: [],
    allowOtherBranch: false,
    featured: false,
    totalFees: 440000,
    semesterFees: 55000,
    description: 'Comprehensive creative design curriculum covering UI/UX digital design, fashion ergonomics, interior architecture, and communication design.',
    careerScope: 'UI/UX Designer, Fashion Designer, Interior Stylist, Creative Art Director, Product Stylist.',
    eligibilities: [
      { educationLevel: '12th', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'BHM - Bachelor of Hotel Management',
    slug: 'bhm-bachelor-of-hotel-management',
    category: CourseCategory.HOTEL_MANAGEMENT,
    level: CourseLevel.UG,
    duration: '4',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10+2 from recognized board in any stream with minimum 45% marks',
    eligibleLevels: ['12th'],
    eligibleStreams: [],
    allowOtherBranch: false,
    featured: false,
    totalFees: 320000,
    semesterFees: 40000,
    description: 'International hospitality and culinary arts management program including 5-star hotel operational internships.',
    careerScope: 'Hotel Operations Manager, Executive Chef, Food & Beverage Director, Cruise Hospitality Officer.',
    eligibilities: [
      { educationLevel: '12th', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'Integrated B.A. LL.B (5 Years Dual Law Degree)',
    slug: 'integrated-ba-llb-5-years',
    category: CourseCategory.LAW,
    level: CourseLevel.INTEGRATED,
    duration: '5',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10+2 in any stream (Commerce / Science / Arts) with minimum 45% marks',
    eligibleLevels: ['12th'],
    eligibleStreams: [],
    allowOtherBranch: false,
    featured: true,
    totalFees: 450000,
    semesterFees: 45000,
    description: 'BCI-approved integrated 5-year law curriculum combining socio-political humanities foundations with comprehensive legal jurisprudence and moot court advocacy.',
    careerScope: 'Advocate / Litigator, Corporate Legal Counsel, Judicial Services Officer, Legal Journalist.',
    eligibilities: [
      { educationLevel: '12th', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'Integrated B.B.A. LL.B (5 Years Dual Law Degree)',
    slug: 'integrated-bba-llb-5-years',
    category: CourseCategory.LAW,
    level: CourseLevel.INTEGRATED,
    duration: '5',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10+2 in any stream with minimum 45% marks',
    eligibleLevels: ['12th'],
    eligibleStreams: [],
    allowOtherBranch: false,
    featured: false,
    totalFees: 480000,
    semesterFees: 48000,
    description: 'Dual corporate law and management degree tailored for international mergers, corporate governance, intellectual property, and arbitration.',
    careerScope: 'Corporate Lawyer, M&A Consultant, Compliance Officer, IP Attorney, Legal Advisor.',
    eligibilities: [
      { educationLevel: '12th', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'Integrated BBA + MBA (5 Years Dual Degree)',
    slug: 'integrated-bba-mba-5-years',
    category: CourseCategory.MANAGEMENT,
    level: CourseLevel.INTEGRATED,
    duration: '5',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10+2 in any stream with minimum 50% aggregate marks',
    eligibleLevels: ['12th'],
    eligibleStreams: [],
    allowOtherBranch: false,
    featured: false,
    totalFees: 600000,
    semesterFees: 60000,
    description: 'Seamless 5-year fast-track management program combining foundational undergraduate management with executive MBA specialization.',
    careerScope: 'Strategy Consultant, Assistant Vice President, Brand Director, Investment Manager.',
    eligibilities: [
      { educationLevel: '12th', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'LL.B - Bachelor of Laws (3-Year Degree)',
    slug: 'llb-bachelor-of-laws-3-years',
    category: CourseCategory.LAW,
    level: CourseLevel.PG,
    duration: '3',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: 'Graduation in any discipline with minimum 45% marks (General) / 40% (SC/ST)',
    eligibleLevels: ['Undergraduate'],
    eligibleStreams: [],
    allowOtherBranch: false,
    featured: false,
    totalFees: 180000,
    semesterFees: 30000,
    description: 'Professional 3-year law degree for university graduates covering civil litigation, criminal law, constitutional law, and court practice.',
    careerScope: 'Practicing Advocate, Legal Advisor, Public Prosecutor, Corporate Counsel, Legal Auditor.',
    eligibilities: [
      { educationLevel: 'Undergraduate', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'LL.M - Master of Laws',
    slug: 'llm-master-of-laws',
    category: CourseCategory.LAW,
    level: CourseLevel.PG,
    duration: '1',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: 'LL.B or 5-Year Integrated Law degree with minimum 50% marks',
    eligibleLevels: ['Undergraduate'],
    eligibleStreams: ['Law'],
    allowOtherBranch: false,
    featured: false,
    totalFees: 120000,
    semesterFees: 60000,
    description: 'Specialized 1-year postgraduate legal research program in constitutional jurisprudence, cyber law, or corporate arbitration.',
    careerScope: 'Senior Legal Consultant, Law Professor, Judicial Clerk, Arbitration Expert.',
    eligibilities: [
      { educationLevel: 'Undergraduate', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'B.Ed - Bachelor of Education',
    slug: 'bed-bachelor-of-education',
    category: CourseCategory.EDUCATION,
    level: CourseLevel.UG,
    duration: '2',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: "Bachelor's or Master's degree in any discipline with minimum 50% marks",
    eligibleLevels: ['Undergraduate'],
    eligibleStreams: [],
    allowOtherBranch: false,
    featured: false,
    totalFees: 110000,
    semesterFees: 27500,
    description: 'NCTE-approved professional teaching qualification covering modern pedagogy, educational psychology, curriculum design, and school internships.',
    careerScope: 'Trained Graduate Teacher (TGT), Post Graduate Teacher (PGT), Academic Counselor, Curriculum Designer.',
    eligibilities: [
      { educationLevel: 'Undergraduate', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'B.El.Ed - Bachelor of Elementary Education',
    slug: 'beled-bachelor-of-elementary-education',
    category: CourseCategory.EDUCATION,
    level: CourseLevel.UG,
    duration: '4',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10+2 with minimum 50% aggregate marks in any stream',
    eligibleLevels: ['12th'],
    eligibleStreams: [],
    allowOtherBranch: false,
    featured: false,
    totalFees: 160000,
    semesterFees: 20000,
    description: '4-year integrated professional primary education degree preparing educators with child psychology and pedagogy expertise.',
    careerScope: 'Primary School Teacher, Educational Content Creator, Child Education Specialist.',
    eligibilities: [
      { educationLevel: '12th', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'M.Pharm - Master of Pharmacy',
    slug: 'mpharm-master-of-pharmacy',
    category: CourseCategory.PHARMACY,
    level: CourseLevel.PG,
    duration: '2',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: 'B.Pharm with minimum 55% marks + GPAT / University Entrance Score',
    eligibleLevels: ['Undergraduate'],
    eligibleStreams: ['Pharmacy', 'Science'],
    allowOtherBranch: false,
    featured: false,
    totalFees: 240000,
    semesterFees: 60000,
    description: 'Advanced postgraduate pharmaceutical degree in drug formulation, pharmaceutical chemistry, and clinical research.',
    careerScope: 'Formulation Scientist, Regulatory Affairs Director, Drug Inspector, Senior Pharmacology Researcher.',
    eligibilities: [
      { educationLevel: 'Undergraduate', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'M.Com - Master of Commerce',
    slug: 'mcom-master-of-commerce',
    category: CourseCategory.COMMERCE,
    level: CourseLevel.PG,
    duration: '2',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: 'B.Com / BBA / BBS with minimum 50% marks from a recognized university',
    eligibleLevels: ['Undergraduate'],
    eligibleStreams: ['Commerce', 'Management'],
    allowOtherBranch: false,
    featured: false,
    totalFees: 130000,
    semesterFees: 32500,
    description: 'Postgraduate business and finance curriculum covering international economics, corporate taxation, and portfolio analytics.',
    careerScope: 'Senior Financial Analyst, Corporate Accountant, Assistant Professor, Banking Executive.',
    eligibilities: [
      { educationLevel: 'Undergraduate', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'M.A. - Master of Arts',
    slug: 'ma-master-of-arts',
    category: CourseCategory.ARTS,
    level: CourseLevel.PG,
    duration: '2',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: "Bachelor's degree in any discipline with minimum 45% marks",
    eligibleLevels: ['Undergraduate'],
    eligibleStreams: [],
    allowOtherBranch: false,
    featured: false,
    totalFees: 100000,
    semesterFees: 25000,
    description: 'Postgraduate humanities studies fostering deep scholarship in literature, economics, mass media, and political science.',
    careerScope: 'Senior Editor, Public Relations Specialist, Social Researcher, Civil Servant.',
    eligibilities: [
      { educationLevel: 'Undergraduate', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'PGDM - Post Graduate Diploma in Management',
    slug: 'pgdm-post-graduate-diploma-management',
    category: CourseCategory.MANAGEMENT,
    level: CourseLevel.PG,
    duration: '2',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: 'Graduation in any stream with minimum 50% marks (AICTE Approved)',
    eligibleLevels: ['Undergraduate'],
    eligibleStreams: [],
    allowOtherBranch: false,
    featured: false,
    totalFees: 650000,
    semesterFees: 162500,
    description: 'AICTE-approved autonomous management diploma focusing on corporate strategy, industry immersion, and fintech.',
    careerScope: 'Brand Manager, Business Analyst, Investment Consultant, Management Associate.',
    eligibilities: [
      { educationLevel: 'Undergraduate', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'Diploma in Medical Laboratory Technology (DMLT)',
    slug: 'diploma-medical-laboratory-technology',
    category: CourseCategory.MEDICAL,
    level: CourseLevel.DIPLOMA,
    duration: '2',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10th or 12th with Science (PCB/PCM) with minimum 45% marks',
    eligibleLevels: ['10th', '12th'],
    eligibleStreams: [],
    allowOtherBranch: false,
    featured: false,
    totalFees: 90000,
    semesterFees: 22500,
    description: 'Clinical laboratory diagnostic diploma training students in blood analysis, pathology, histology, and diagnostic equipment.',
    careerScope: 'Medical Lab Technician, Pathology Assistant, Diagnostic Lab Supervisor.',
    eligibilities: [
      { educationLevel: '10th', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
      { educationLevel: '12th', stream: 'Science', entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'Diploma in Hotel Management & Catering Technology',
    slug: 'diploma-hotel-management-catering',
    category: CourseCategory.HOTEL_MANAGEMENT,
    level: CourseLevel.DIPLOMA,
    duration: '2',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10th / 12th pass from any recognized board with minimum 40% marks',
    eligibleLevels: ['10th', '12th'],
    eligibleStreams: [],
    allowOtherBranch: false,
    featured: false,
    totalFees: 80000,
    semesterFees: 20000,
    description: 'Practical training in hotel reception, culinary skills, housekeeping, and restaurant operations.',
    careerScope: 'Restaurant Captain, Front Office Supervisor, Catering Associate.',
    eligibilities: [
      { educationLevel: '10th', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
      { educationLevel: '12th', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'Diploma in Fashion Design & Garment Technology',
    slug: 'diploma-fashion-design-garment-technology',
    category: CourseCategory.DESIGN,
    level: CourseLevel.DIPLOMA,
    duration: '2',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10th or 12th pass with creative interest in textiles and pattern making',
    eligibleLevels: ['10th', '12th'],
    eligibleStreams: [],
    allowOtherBranch: false,
    featured: false,
    totalFees: 85000,
    semesterFees: 21250,
    description: 'Foundational fashion diploma covering sketching, textile science, garment construction, and CAD styling.',
    careerScope: 'Fashion Stylist, Garment Technician, Textile Merchandiser.',
    eligibilities: [
      { educationLevel: '10th', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
      { educationLevel: '12th', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
  },
  {
    name: 'ITI - Industrial Training in Electrician & Fitter',
    slug: 'iti-electrician-fitter',
    category: CourseCategory.OTHER,
    level: CourseLevel.CERTIFICATE,
    duration: '2',
    durationType: CourseDurationType.YEARS,
    mode: CourseMode.FULL_TIME,
    eligibility: '10th standard pass from a recognized state board',
    eligibleLevels: ['10th'],
    eligibleStreams: [],
    allowOtherBranch: false,
    featured: false,
    totalFees: 40000,
    semesterFees: 10000,
    description: 'NCVT certified vocational technical training in industrial electrical equipment, motor winding, wiring, and mechanical fitting.',
    careerScope: 'Licensed Electrician, Maintenance Fitter, Rail Technician, PSU Apprentice.',
    eligibilities: [
      { educationLevel: '10th', stream: undefined, entryType: 'DIRECT', lateralEntry: false },
    ],
  },
];

async function seedNormalizedCatalog() {
  console.log('====================================================');
  console.log('🚀 SEEDING NORMALIZED PROGRAM FAMILIES & BRANCHES');
  console.log('====================================================\n');

  // 1. Ensure Anchor College exists
  let anchorCollege = await prisma.college.findFirst({
    where: { status: CollegeStatus.PUBLISHED },
  });

  if (!anchorCollege) {
    anchorCollege = await prisma.college.create({
      data: {
        name: 'Swayam National Academic Consortium',
        slug: 'swayam-national-academic-consortium',
        city: 'Patna',
        state: 'Bihar',
        university: 'UGC Recognized Consortium',
        establishedYear: 2012,
        type: CollegeType.PRIVATE,
        ownership: CollegeOwnership.TRUST,
        status: CollegeStatus.PUBLISHED,
        featured: true,
      },
    });
  }

  let totalPrograms = 0;
  let totalBranches = 0;
  let totalRules = 0;

  for (const prog of PROGRAM_FAMILIES_SEED) {
    // Upsert Parent Course / Program Family
    const course = await prisma.course.upsert({
      where: { slug: prog.slug },
      update: {
        name: prog.name,
        category: prog.category,
        level: prog.level,
        duration: prog.duration,
        durationType: prog.durationType,
        mode: prog.mode,
        eligibility: prog.eligibility,
        eligibleLevels: prog.eligibleLevels,
        eligibleStreams: prog.eligibleStreams,
        allowOtherBranch: prog.allowOtherBranch ?? true,
        featured: prog.featured ?? false,
        totalFees: prog.totalFees ?? null,
        semesterFees: prog.semesterFees ?? null,
        description: prog.description,
        careerScope: prog.careerScope,
        status: CollegeStatus.PUBLISHED,
      },
      create: {
        collegeId: anchorCollege.id,
        name: prog.name,
        slug: prog.slug,
        category: prog.category,
        level: prog.level,
        duration: prog.duration,
        durationType: prog.durationType,
        mode: prog.mode,
        eligibility: prog.eligibility,
        eligibleLevels: prog.eligibleLevels,
        eligibleStreams: prog.eligibleStreams,
        allowOtherBranch: prog.allowOtherBranch ?? true,
        featured: prog.featured ?? false,
        totalFees: prog.totalFees ?? null,
        semesterFees: prog.semesterFees ?? null,
        description: prog.description,
        careerScope: prog.careerScope,
        status: CollegeStatus.PUBLISHED,
      },
    });
    totalPrograms++;

    // Seed Child Branches
    if (prog.branches && prog.branches.length > 0) {
      for (const br of prog.branches) {
        await prisma.courseBranch.upsert({
          where: { courseId_slug: { courseId: course.id, slug: br.slug } },
          update: {
            name: br.name,
            code: br.code || null,
            type: br.type || 'BRANCH',
            order: br.order ?? 0,
            status: 'ACTIVE',
          },
          create: {
            courseId: course.id,
            name: br.name,
            code: br.code || null,
            slug: br.slug,
            type: br.type || 'BRANCH',
            order: br.order ?? 0,
            status: 'ACTIVE',
          },
        });
        totalBranches++;
      }
    }

    // Seed Course Eligibility Rules
    for (const el of prog.eligibilities) {
      await prisma.courseEligibility.upsert({
        where: {
          courseId_educationLevel_stream_entryType: {
            courseId: course.id,
            educationLevel: el.educationLevel,
            stream: el.stream || '',
            entryType: el.entryType || 'DIRECT',
          },
        },
        update: {
          lateralEntry: el.lateralEntry ?? false,
          status: 'ACTIVE',
        },
        create: {
          courseId: course.id,
          educationLevel: el.educationLevel,
          stream: el.stream || null,
          entryType: el.entryType || 'DIRECT',
          lateralEntry: el.lateralEntry ?? false,
          status: 'ACTIVE',
        },
      });
      totalRules++;
    }
  }

  console.log(`✅ Seeded ${totalPrograms} Program Families`);
  console.log(`✅ Seeded ${totalBranches} Child Branches / Specializations`);
  console.log(`✅ Seeded ${totalRules} Course Eligibility Rules\n`);

  console.log('====================================================');
  console.log('🎉 NORMALIZED CATALOG SEED COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
}

seedNormalizedCatalog()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
