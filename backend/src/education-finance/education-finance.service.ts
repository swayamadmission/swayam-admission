import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface EducationFinanceScheme {
  id: string;
  schemeName: string;
  schemeCode: string;
  state: string;
  stateCode?: string;
  description: string;
  eligibilityCriteria: string;
  applicationGuidance: string;
  documentsRequired: string[];
  maximumFinancing: number;
  interestRate: string;
  moratoriumPeriod: string;
  applicableEducationLevels: string[];
  officialUrl: string;
  academicSession: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_SCHEMES: EducationFinanceScheme[] = [
  {
    id: 'scheme_bihar_bscc',
    schemeName: 'Bihar Student Credit Card Scheme (BSCC / DRCC)',
    schemeCode: 'BIHAR-BSCC-01',
    state: 'Bihar',
    stateCode: 'BR',
    description:
      'Flagship Bihar State Government scheme providing education financing up to ₹4 Lakhs for higher studies in General, Technical, and Professional courses.',
    eligibilityCriteria:
      'Bihar resident; 12th pass; Age up to 25 years (30 for PG); Admitted to recognized institutional program.',
    applicationGuidance:
      'Administered by District Registration and Counseling Centers (DRCC) under Bihar State Education Finance Corporation (BSEFC). Apply online on the MNSSBY portal or visit the local district DRCC center.',
    documentsRequired: [
      'Student & Parent Aadhaar Card',
      'Class 10th & 12th Passing Certificate / Marksheet',
      'Institute Bonafide Certificate & Fee Schedule',
      'Residential / Domicile Certificate of Bihar',
      'Parental Income Certificate',
      'Passport size photographs (2)',
      'Bank Passbook / Cancelled Cheque',
    ],
    maximumFinancing: 400000,
    interestRate: '0% for Female/Transgender/Divyang; 1% simple interest for Male candidates',
    moratoriumPeriod: 'Course duration + 1 year after completion',
    applicableEducationLevels: ['UNDERGRADUATE', 'POSTGRADUATE', 'DIPLOMA', 'PROFESSIONAL'],
    officialUrl: 'https://www.7nishchay-yuvaupmission.bihar.gov.in/',
    academicSession: '2026-2027',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'scheme_wb_sccs',
    schemeName: 'West Bengal Student Credit Card Scheme (WBSCCS)',
    schemeCode: 'WB-SCC-01',
    state: 'West Bengal',
    stateCode: 'WB',
    description:
      'Government of West Bengal initiative offering collateral-free education credit card up to ₹10 Lakhs at 4% simple interest rate with 15-year repayment period.',
    eligibilityCriteria:
      'West Bengal resident for at least 10 years; Age up to 40 years; Enrolled in recognized Undergraduate, Postgraduate, Professional, or Doctoral courses.',
    applicationGuidance:
      'Submit application via the official WBSCC web portal. Institutional nodal officer verifies and forwards to Higher Education Department and State Bank.',
    documentsRequired: [
      'Color photograph of student and co-applicant',
      'Signature of student and parent / guardian',
      'Student Aadhaar Card (or Class 10 Admit Card if Aadhaar unavailable)',
      'Co-applicant Guardian PAN Card / Form 60',
      'Admission Receipt & Institutional Fee Structure',
      'Domicile / Residence Certificate',
    ],
    maximumFinancing: 1000000,
    interestRate: '4% simple interest per annum (1% concession if interest is serviced during study)',
    moratoriumPeriod: 'Course duration + 1 year moratorium',
    applicableEducationLevels: ['UNDERGRADUATE', 'POSTGRADUATE', 'DIPLOMA', 'PROFESSIONAL'],
    officialUrl: 'https://wbscc.wb.gov.in/',
    academicSession: '2026-2027',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'scheme_jh_gscc',
    schemeName: 'Guruji Student Credit Card (GSCC) Scheme',
    schemeCode: 'JH-GSCC-01',
    state: 'Jharkhand',
    stateCode: 'JH',
    description:
      'Jharkhand Government education credit card scheme providing up to ₹15 Lakhs loan without collateral or processing fees for higher and technical education.',
    eligibilityCriteria:
      'Resident of Jharkhand; Passed 10th and 12th from recognized board in Jharkhand; Admitted to NIRF ranked or state-approved higher education institution.',
    applicationGuidance:
      'Apply online on the Guruji Student Credit Card portal. District level committee verifies eligibility and sanctions loan directly through designated partner banks.',
    documentsRequired: [
      'Jharkhand Residential / Domicile Certificate',
      '10th and 12th Marksheets & Certificates',
      'College Admission Letter & Approved Fee Breakdown',
      'Family Income Certificate issued by Circle Officer / SDO',
      'Student & Guardian Aadhaar Card',
      'Bank Account Details',
    ],
    maximumFinancing: 1500000,
    interestRate: '4% simple interest per annum',
    moratoriumPeriod: 'Course duration + 1 year after graduation',
    applicableEducationLevels: ['UNDERGRADUATE', 'POSTGRADUATE', 'DIPLOMA', 'PROFESSIONAL'],
    officialUrl: 'https://gscc.jharkhand.gov.in/',
    academicSession: '2026-2027',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'scheme_nat_vidya',
    schemeName: 'Pradhan Mantri Vidya Lakshmi Education Loan Scheme',
    schemeCode: 'NAT-VIDYA-01',
    state: 'ALL',
    stateCode: 'IN',
    description:
      'Central Ministry of Education single-window platform to access education loans from 40+ public and private banks with Central Sector Interest Subsidy (CSIS).',
    eligibilityCriteria:
      'Indian citizen; Secured admission to higher education course in recognized college / university in India or abroad.',
    applicationGuidance:
      'Register on the official Vidya Lakshmi portal (vidyalakshmi.co.in), fill the Common Educational Loan Application Form (CELAF), and track status across multiple partner banks.',
    documentsRequired: [
      'Proof of identity and address (Aadhaar / Voter ID / Passport)',
      '10th, 12th, and Graduation (if applicable) mark sheets',
      'Admission Confirmation Letter & Official Fee Breakdown',
      'Income Proof of Parent / Co-borrower (Salary Slips / ITR / Form 16)',
      'Bank Account Statements of past 6 months',
    ],
    maximumFinancing: 750000,
    interestRate: 'Bank benchmark linked rate; 100% interest subsidy during moratorium under CSIS for eligible family income',
    moratoriumPeriod: 'Course period + 1 year',
    applicableEducationLevels: ['UNDERGRADUATE', 'POSTGRADUATE', 'DIPLOMA', 'PROFESSIONAL'],
    officialUrl: 'https://www.vidyalakshmi.co.in/',
    academicSession: '2026-2027',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

@Injectable()
export class EducationFinanceService {
  private readonly logger = new Logger(EducationFinanceService.name);
  private schemes: EducationFinanceScheme[] = [...DEFAULT_SCHEMES];

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get applicable schemes based on student's State and course level
   */
  async getSchemes(filter?: {
    state?: string;
    courseLevel?: string;
    activeOnly?: boolean;
  }): Promise<EducationFinanceScheme[]> {
    let result = [...this.schemes];

    if (filter?.activeOnly !== false) {
      result = result.filter((s) => s.isActive);
    }

    if (filter?.state) {
      const sLower = filter.state.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.state === 'ALL' ||
          s.state.toLowerCase() === sLower ||
          s.stateCode?.toLowerCase() === sLower,
      );
    }

    if (filter?.courseLevel) {
      const cUpper = filter.courseLevel.trim().toUpperCase();
      result = result.filter(
        (s) =>
          s.applicableEducationLevels.includes('ALL') ||
          s.applicableEducationLevels.includes(cUpper),
      );
    }

    return result;
  }

  /**
   * Get scheme by ID
   */
  async getSchemeById(id: string): Promise<EducationFinanceScheme> {
    const scheme = this.schemes.find((s) => s.id === id || s.schemeCode === id);
    if (!scheme) {
      throw new NotFoundException(`Education Finance Scheme with ID "${id}" not found.`);
    }
    return scheme;
  }

  /**
   * Admin: Create new Education Finance Scheme
   */
  async createScheme(
    dto: Partial<EducationFinanceScheme>,
    actorUserId?: string,
  ): Promise<EducationFinanceScheme> {
    const newScheme: EducationFinanceScheme = {
      id: `scheme_${Date.now()}`,
      schemeName: dto.schemeName || 'New Scheme',
      schemeCode: (dto.schemeCode || `SCHEME-${Date.now()}`).toUpperCase(),
      state: dto.state || 'ALL',
      stateCode: dto.stateCode?.toUpperCase(),
      description: dto.description || '',
      eligibilityCriteria: dto.eligibilityCriteria || '',
      applicationGuidance: dto.applicationGuidance || '',
      documentsRequired: dto.documentsRequired || [],
      maximumFinancing: dto.maximumFinancing || 500000,
      interestRate: dto.interestRate || '4% simple interest',
      moratoriumPeriod: dto.moratoriumPeriod || 'Course duration + 1 year',
      applicableEducationLevels: dto.applicableEducationLevels || ['UNDERGRADUATE', 'POSTGRADUATE'],
      officialUrl: dto.officialUrl || '',
      academicSession: dto.academicSession || '2026-2027',
      isActive: dto.isActive !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.schemes.push(newScheme);

    if (actorUserId) {
      await this.auditService.logAction({
        module: 'FINANCE',
        action: 'EDUCATION_FINANCE_SCHEME_CREATED',
        entity: 'EDUCATION_FINANCE_SCHEME',
        entityId: newScheme.id,
        entityName: newScheme.schemeName,
        userId: actorUserId,
        newValue: newScheme,
        description: `Created education finance scheme "${newScheme.schemeName}" for ${newScheme.state}`,
      });
    }

    return newScheme;
  }

  /**
   * Admin: Update scheme
   */
  async updateScheme(
    id: string,
    dto: Partial<EducationFinanceScheme>,
    actorUserId?: string,
  ): Promise<EducationFinanceScheme> {
    const index = this.schemes.findIndex((s) => s.id === id || s.schemeCode === id);
    if (index === -1) {
      throw new NotFoundException(`Education Finance Scheme "${id}" not found.`);
    }

    const updated: EducationFinanceScheme = {
      ...this.schemes[index],
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    this.schemes[index] = updated;

    if (actorUserId) {
      await this.auditService.logAction({
        module: 'FINANCE',
        action: 'EDUCATION_FINANCE_SCHEME_UPDATED',
        entity: 'EDUCATION_FINANCE_SCHEME',
        entityId: updated.id,
        entityName: updated.schemeName,
        userId: actorUserId,
        newValue: updated,
        description: `Updated education finance scheme "${updated.schemeName}"`,
      });
    }

    return updated;
  }

  /**
   * Admin: Toggle active status
   */
  async toggleActive(id: string, actorUserId?: string): Promise<EducationFinanceScheme> {
    const scheme = await this.getSchemeById(id);
    return this.updateScheme(id, { isActive: !scheme.isActive }, actorUserId);
  }
}
