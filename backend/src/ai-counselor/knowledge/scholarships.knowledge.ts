/**
 * Indian Scholarships Knowledge Base
 * Hardcoded for Phase 1 — replaceable with database model or API later.
 */

export interface ScholarshipData {
  name: string;
  provider: string;
  amount: string;
  eligibility: string;
  category: string; // MERIT, INCOME, MINORITY, SC_ST, GIRL, GENERAL
  minMarksRequired: number;
  maxFamilyIncome?: number; // in LPA
  applicationDeadline: string;
  website: string;
  streams: string[]; // applicable streams
}

export const SCHOLARSHIPS_DATABASE: ScholarshipData[] = [
  {
    name: 'National Scholarship Portal (NSP) — Post Matric Scholarship',
    provider: 'Ministry of Social Justice & Empowerment',
    amount: '₹7,000 - ₹12,000 per year + tuition fees',
    eligibility:
      'SC/ST/OBC/Minority students with family income below ₹2.5 LPA. Must have 50%+ in previous exam.',
    category: 'SC_ST',
    minMarksRequired: 50,
    maxFamilyIncome: 2.5,
    applicationDeadline: 'October - November',
    website: 'https://scholarships.gov.in',
    streams: ['SCIENCE', 'COMMERCE', 'ARTS', 'OTHER'],
  },
  {
    name: 'PM Vidyalaxmi Scholarship (Central Sector Scheme)',
    provider: 'Ministry of Education, Government of India',
    amount: '₹10,000 - ₹20,000 per year for 3-5 years',
    eligibility:
      'Students above 80th percentile in 12th board exams. Family income below ₹8 LPA. Must be in regular college.',
    category: 'MERIT',
    minMarksRequired: 80,
    maxFamilyIncome: 8,
    applicationDeadline: 'September - October',
    website: 'https://scholarships.gov.in',
    streams: ['SCIENCE', 'COMMERCE', 'ARTS', 'OTHER'],
  },
  {
    name: 'INSPIRE Scholarship (SHE)',
    provider: 'Department of Science & Technology (DST)',
    amount: '₹80,000 per year for 5 years',
    eligibility:
      'Top 1% in 12th board exams pursuing B.Sc/M.Sc in Natural/Basic Sciences. No income criteria.',
    category: 'MERIT',
    minMarksRequired: 90,
    applicationDeadline: 'September - December',
    website: 'https://online-inspire.gov.in',
    streams: ['SCIENCE'],
  },
  {
    name: 'Maulana Azad National Fellowship (MANF)',
    provider: 'Ministry of Minority Affairs',
    amount: '₹25,000 - ₹28,000 per month (JRF/SRF level)',
    eligibility:
      'Minority community students (Muslim, Christian, Sikh, Buddhist, Jain, Parsi) for M.Phil/PhD. Must clear NET/SET.',
    category: 'MINORITY',
    minMarksRequired: 55,
    applicationDeadline: 'March - April',
    website: 'https://scholarships.gov.in',
    streams: ['SCIENCE', 'COMMERCE', 'ARTS', 'OTHER'],
  },
  {
    name: 'AICTE Pragati Scholarship (for Girls)',
    provider: 'AICTE',
    amount: '₹50,000 per year for tuition + incidentals',
    eligibility:
      'Girl students in AICTE-approved technical degree/diploma. Family income below ₹8 LPA. 1st/2nd year students.',
    category: 'GIRL',
    minMarksRequired: 50,
    maxFamilyIncome: 8,
    applicationDeadline: 'October - December',
    website: 'https://www.aicte-india.org',
    streams: ['SCIENCE'],
  },
  {
    name: 'Bihar State Merit Scholarship',
    provider: 'Government of Bihar',
    amount: '₹10,000 - ₹25,000 (one-time for 12th toppers)',
    eligibility:
      'Students passing 12th from Bihar Board with 1st/2nd division. Must be Bihar domicile.',
    category: 'MERIT',
    minMarksRequired: 60,
    applicationDeadline: 'Varies — check state portal',
    website: 'https://medhasoft.bih.nic.in',
    streams: ['SCIENCE', 'COMMERCE', 'ARTS', 'OTHER'],
  },
  {
    name: 'UP Scholarship (Post Matric)',
    provider: 'Government of Uttar Pradesh',
    amount: 'Tuition fee reimbursement + ₹2,000 maintenance',
    eligibility:
      'UP domicile students from SC/ST/OBC/General-EWS category. Family income criteria applies.',
    category: 'SC_ST',
    minMarksRequired: 50,
    maxFamilyIncome: 2,
    applicationDeadline: 'September - November',
    website: 'https://scholarship.up.gov.in',
    streams: ['SCIENCE', 'COMMERCE', 'ARTS', 'OTHER'],
  },
  {
    name: 'KVPY Fellowship (now merged into INSPIRE)',
    provider: 'IISc Bangalore / DST',
    amount: '₹5,000 - ₹7,000 per month + contingency grant',
    eligibility:
      'Students pursuing B.Sc/M.Sc in basic sciences from recognized institutions. Based on aptitude test + interview.',
    category: 'MERIT',
    minMarksRequired: 75,
    applicationDeadline: 'July - August',
    website: 'https://kvpy.iisc.ac.in',
    streams: ['SCIENCE'],
  },
  {
    name: 'Sitaram Jindal Foundation Scholarship',
    provider: 'Sitaram Jindal Foundation',
    amount: '₹1,500 - ₹6,500 per month',
    eligibility:
      'Students from economically weaker sections across all streams. Family income below ₹2 LPA.',
    category: 'INCOME',
    minMarksRequired: 60,
    maxFamilyIncome: 2,
    applicationDeadline: 'Rolling (check website)',
    website: 'https://www.sitaramjindalfoundation.org',
    streams: ['SCIENCE', 'COMMERCE', 'ARTS', 'OTHER'],
  },
  {
    name: 'Tata Trusts Scholarship',
    provider: 'Tata Trusts',
    amount: 'Up to 80% of tuition fees + living expenses',
    eligibility:
      'Students from low-income backgrounds pursuing professional courses. Strong academic record required.',
    category: 'INCOME',
    minMarksRequired: 60,
    maxFamilyIncome: 4,
    applicationDeadline: 'August - October',
    website: 'https://www.tatatrusts.org',
    streams: ['SCIENCE', 'COMMERCE', 'ARTS', 'OTHER'],
  },
];
