/**
 * Indian Entrance Exams Knowledge Base
 * Hardcoded for Phase 1 — replaceable with database model or Gemini API later.
 */

export interface ExamData {
  name: string;
  fullName: string;
  streams: string[];
  description: string;
  eligibility: string;
  minMarksRequired: number; // minimum 12th marks percentage
  examMonth: string;
  preparationTips: string[];
  officialWebsite: string;
}

export const EXAMS_DATABASE: ExamData[] = [
  {
    name: 'JEE Main',
    fullName: 'Joint Entrance Examination Main',
    streams: ['SCIENCE'],
    description:
      'National-level exam for admission to NITs, IIITs, and other centrally funded institutions for B.Tech/B.E. programs.',
    eligibility:
      'Passed or appearing in 12th with Physics, Mathematics, and Chemistry/Biology. Minimum 75% in 12th (65% for SC/ST).',
    minMarksRequired: 65,
    examMonth: 'January & April',
    preparationTips: [
      'Focus on NCERT textbooks for basics',
      'Practice previous year papers extensively',
      'Take mock tests regularly from NTA website',
      'Strengthen Mathematics — it carries maximum weightage',
      'Study Physics HC Verma and DC Pandey',
    ],
    officialWebsite: 'https://jeemain.nta.nic.in',
  },
  {
    name: 'JEE Advanced',
    fullName: 'Joint Entrance Examination Advanced',
    streams: ['SCIENCE'],
    description:
      'Exam for admission to 23 IITs. Only top 2.5 lakh JEE Main qualifiers can appear.',
    eligibility:
      'Must qualify JEE Main and be in top 2,50,000 candidates. Maximum 2 attempts in consecutive years.',
    minMarksRequired: 75,
    examMonth: 'May/June',
    preparationTips: [
      'Master JEE Main level first',
      'Focus on conceptual understanding over rote learning',
      'Practice Irodov for Physics, Arihant for Mathematics',
      'Solve IIT previous year papers (last 20 years)',
      'Join a reputed coaching or follow structured self-study plan',
    ],
    officialWebsite: 'https://jeeadv.ac.in',
  },
  {
    name: 'NEET',
    fullName: 'National Eligibility cum Entrance Test',
    streams: ['SCIENCE'],
    description:
      'Single entrance exam for admission to MBBS, BDS, AYUSH, and other medical courses in India.',
    eligibility:
      'Passed 12th with Physics, Chemistry, Biology/Biotechnology. Minimum 50% aggregate (40% for SC/ST/OBC).',
    minMarksRequired: 40,
    examMonth: 'May',
    preparationTips: [
      'NCERT is the bible — read every line, diagram, and example',
      'Biology carries 360/720 marks — focus heavily on it',
      'Practice MTG and Dinesh Objective Biology',
      'For Chemistry, read NCERT + MS Chouhan for Organic',
      'Take full-length mock tests every week',
    ],
    officialWebsite: 'https://neet.nta.nic.in',
  },
  {
    name: 'CUET',
    fullName: 'Common University Entrance Test',
    streams: ['SCIENCE', 'COMMERCE', 'ARTS'],
    description:
      'National-level exam for UG admissions to Central Universities, including DU, JNU, BHU, Jamia, and 200+ universities.',
    eligibility:
      'Passed or appearing in 12th from a recognized board. Subject requirements vary by university/program.',
    minMarksRequired: 50,
    examMonth: 'May/June',
    preparationTips: [
      'Focus on NCERT textbooks (Class 11 & 12) for domain subjects',
      'Practice General Test section — reasoning, quantitative, and general awareness',
      'Read newspapers daily for current affairs',
      'Take NTA mock tests available on the official website',
      'Focus on your best 2-3 domain subjects',
    ],
    officialWebsite: 'https://cuet.samarth.ac.in',
  },
  {
    name: 'CLAT',
    fullName: 'Common Law Admission Test',
    streams: ['ARTS', 'COMMERCE'],
    description:
      'National-level exam for admission to 22 National Law Universities (NLUs) for BA LLB and LLM programs.',
    eligibility:
      'Passed or appearing in 12th with minimum 45% marks (40% for SC/ST). No age limit.',
    minMarksRequired: 40,
    examMonth: 'December',
    preparationTips: [
      'Read newspapers daily — The Hindu or Indian Express',
      'Practice reading comprehension extensively',
      'Study Legal Reasoning from AP Bhardwaj',
      'Solve previous year CLAT papers',
      'Focus on Current Affairs & GK — covers 25% of paper',
    ],
    officialWebsite: 'https://consortiumofnlus.ac.in',
  },
  {
    name: 'CAT',
    fullName: 'Common Admission Test',
    streams: ['COMMERCE', 'SCIENCE', 'ARTS'],
    description:
      'Premier MBA entrance exam for admission to 20 IIMs and 1200+ B-schools across India.',
    eligibility:
      "Bachelor's degree with minimum 50% marks (45% for SC/ST/DA). Final year students eligible.",
    minMarksRequired: 50,
    examMonth: 'November',
    preparationTips: [
      'Start with Quantitative Aptitude — Arun Sharma',
      'Practice Verbal Ability through reading — read editorial articles',
      'DILR section needs daily practice of sets',
      'Take at least 30 full-length mock tests',
      'Focus on accuracy over attempting all questions',
    ],
    officialWebsite: 'https://iimcat.ac.in',
  },
  {
    name: 'GATE',
    fullName: 'Graduate Aptitude Test in Engineering',
    streams: ['SCIENCE'],
    description:
      'Exam for M.Tech/M.E. admissions to IITs/NITs and PSU recruitment. Also required for PhD admissions.',
    eligibility:
      "Bachelor's degree in Engineering/Technology or Master's in Science. Final year students eligible.",
    minMarksRequired: 55,
    examMonth: 'February',
    preparationTips: [
      'Focus on your core engineering subjects',
      'Practice Made Easy or ACE Academy study material',
      'Solve previous year GATE papers (last 15 years)',
      'Engineering Mathematics and Aptitude are scoring',
      'Take subject-wise and full-length mock tests',
    ],
    officialWebsite: 'https://gate.iitb.ac.in',
  },
  {
    name: 'NATA',
    fullName: 'National Aptitude Test in Architecture',
    streams: ['SCIENCE', 'ARTS'],
    description:
      'Entrance exam for B.Arch admissions to architecture colleges across India.',
    eligibility: 'Passed 12th with Mathematics. Minimum 50% aggregate marks.',
    minMarksRequired: 50,
    examMonth: 'April',
    preparationTips: [
      'Practice drawing and sketching daily',
      'Study 3D visualization and spatial reasoning',
      'Solve previous NATA papers for pattern understanding',
      'Focus on Mathematics — PCM concepts',
      'Study basic architecture history and aesthetics',
    ],
    officialWebsite: 'https://nata.in',
  },
  {
    name: 'NDA',
    fullName: 'National Defence Academy Examination',
    streams: ['SCIENCE', 'COMMERCE', 'ARTS'],
    description:
      'UPSC-conducted exam for admission to Army, Navy, and Air Force wings of NDA. Only for male candidates (females for OTA).',
    eligibility:
      'Passed or appearing in 12th. Age 16.5 to 19.5 years. Unmarried males only.',
    minMarksRequired: 50,
    examMonth: 'April & September',
    preparationTips: [
      'Focus on Mathematics — covers 50% of Paper I',
      'Study General Ability — English, GK, Physics, Chemistry',
      'Practice previous year papers',
      'Maintain physical fitness for SSB interview',
      'Read Pathfinder NDA by Arihant',
    ],
    officialWebsite: 'https://upsc.gov.in',
  },
  {
    name: 'IPMAT',
    fullName: 'Integrated Program in Management Aptitude Test',
    streams: ['COMMERCE', 'SCIENCE', 'ARTS'],
    description:
      'Entrance exam for 5-year Integrated MBA program at IIM Indore, IIM Ranchi, IIM Rohtak, and IIM Bodh Gaya.',
    eligibility:
      'Passed 12th with minimum 60% marks (55% for SC/ST/DA). Age limit: born on or after specified date.',
    minMarksRequired: 55,
    examMonth: 'May',
    preparationTips: [
      'Strong Quantitative Aptitude foundation needed',
      'Practice Verbal Ability — grammar, vocabulary, comprehension',
      'Solve previous IPMAT papers',
      'Focus on speed and accuracy in time-bound practice',
      'Written Ability Test (WAT) needs essay practice',
    ],
    officialWebsite: 'https://iimidr.ac.in',
  },
  {
    name: 'BITSAT',
    fullName: 'Birla Institute of Technology and Science Admission Test',
    streams: ['SCIENCE'],
    description:
      'Computer-based exam for admission to BITS Pilani, Goa, and Hyderabad campuses for B.E./B.Pharm/M.Sc programs.',
    eligibility:
      'Passed 12th with Physics, Chemistry, and Mathematics. Minimum 75% aggregate with 60% in each PCM subject.',
    minMarksRequired: 75,
    examMonth: 'May/June',
    preparationTips: [
      'Speed is key — 150 questions in 3 hours',
      'NCERT + HC Verma + Cengage Mathematics',
      'Practice online mock tests for computer-based format',
      'English Proficiency and Logical Reasoning sections are scoring',
      'Solve BITSAT previous year papers',
    ],
    officialWebsite: 'https://bitsadmission.com',
  },
  {
    name: 'COMEDK',
    fullName:
      'Consortium of Medical, Engineering and Dental Colleges of Karnataka',
    streams: ['SCIENCE'],
    description:
      'State-level exam for engineering admissions to private colleges in Karnataka.',
    eligibility:
      'Passed 12th with Physics, Chemistry, Mathematics. Minimum 45% aggregate (40% for SC/ST/OBC).',
    minMarksRequired: 40,
    examMonth: 'May',
    preparationTips: [
      'Difficulty level between JEE Main and board exams',
      'Focus on NCERT and standard reference books',
      'Practice previous year COMEDK papers',
      'Time management is crucial — 180 questions in 3 hours',
      'Karnataka domicile candidates get preference',
    ],
    officialWebsite: 'https://comedk.org',
  },
];
