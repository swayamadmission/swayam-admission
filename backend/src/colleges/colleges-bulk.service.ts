import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CollegeOwnership,
  CollegeType,
  CollegeStatus,
  CourseLevel,
} from '@prisma/client';
import * as XLSX from 'xlsx';

export interface BulkValidationRowError {
  row: number;
  collegeName?: string;
  field: string;
  message: string;
}

export interface BulkValidationResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  rowsToCreate: number;
  rowsToUpdate: number;
  errors: BulkValidationRowError[];
  previewRows: Array<{
    rowIndex: number;
    action: 'CREATE' | 'UPDATE' | 'INVALID';
    name: string;
    city: string;
    state: string;
    ownership: string;
    type: string;
    fees?: number | string;
    placementRate?: number | string;
    hasHostel: boolean;
    galleryCount: number;
    coursesCount: number;
    status: string;
    errors: string[];
    sanitizedData?: any;
  }>;
}

export interface BulkImportReportItem {
  row: number;
  name: string;
  city: string;
  state: string;
  status: 'CREATED' | 'UPDATED' | 'SKIPPED' | 'FAILED';
  collegeId?: string;
  message?: string;
}

export interface BulkImportSummaryResult {
  totalProcessed: number;
  successfullyCreated: number;
  successfullyUpdated: number;
  skipped: number;
  failed: number;
  duplicateRecords: number;
  items: BulkImportReportItem[];
  reportCsv: string;
}

const TEMPLATE_COLUMNS = [
  {
    key: 'name',
    label: 'College Name *',
    required: true,
    example: 'Delhi Technological University',
  },
  { key: 'city', label: 'City *', required: true, example: 'New Delhi' },
  { key: 'state', label: 'State *', required: true, example: 'Delhi' },
  {
    key: 'establishedYear',
    label: 'Established Year',
    required: false,
    example: '1941',
  },
  {
    key: 'ownership',
    label: 'Ownership (GOVERNMENT/PRIVATE/TRUST/PUBLIC_PRIVATE)',
    required: false,
    example: 'GOVERNMENT',
  },
  {
    key: 'type',
    label: 'Type (GOVERNMENT/PRIVATE/DEEMED/AUTONOMOUS)',
    required: false,
    example: 'GOVERNMENT',
  },
  {
    key: 'university',
    label: 'Affiliated University',
    required: false,
    example: 'Delhi Technological University',
  },
  {
    key: 'accreditation',
    label: 'Accreditation',
    required: false,
    example: 'UGC, AICTE, NBA',
  },
  {
    key: 'approvals',
    label: 'Approvals (Comma Separated)',
    required: false,
    example: 'UGC, AICTE',
  },
  { key: 'ranking', label: 'Ranking', required: false, example: '36' },
  { key: 'nirfRanking', label: 'NIRF Ranking', required: false, example: '35' },
  { key: 'naacGrade', label: 'NAAC Grade', required: false, example: 'A+' },
  { key: 'rating', label: 'Rating (0-5)', required: false, example: '4.6' },
  {
    key: 'shortDescription',
    label: 'Short Description',
    required: false,
    example: 'Premier government engineering university in Delhi.',
  },
  {
    key: 'fullDescription',
    label: 'Full Description',
    required: false,
    example:
      'Delhi Technological University (DTU), formerly known as Delhi College of Engineering, is a premier state university.',
  },
  {
    key: 'address',
    label: 'Address',
    required: false,
    example: 'Shahbad Daulatpur, Main Bawana Road',
  },
  { key: 'pincode', label: 'Pincode', required: false, example: '110042' },
  {
    key: 'website',
    label: 'Official Website',
    required: false,
    example: 'https://dtu.ac.in',
  },
  {
    key: 'email',
    label: 'Official Email',
    required: false,
    example: 'admissions@dtu.ac.in',
  },
  { key: 'phone', label: 'Phone', required: false, example: '+91 11 27871018' },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    required: false,
    example: '+91 9811000000',
  },
  {
    key: 'contactPerson',
    label: 'Contact Person',
    required: false,
    example: 'Dean Admissions',
  },
  {
    key: 'applicationFee',
    label: 'Application Fee (INR)',
    required: false,
    example: '1500',
  },
  {
    key: 'placementPercentage',
    label: 'Placement Percentage (%)',
    required: false,
    example: '88.5',
  },
  {
    key: 'highestPackage',
    label: 'Highest Package (LPA)',
    required: false,
    example: '64.5',
  },
  {
    key: 'averagePackage',
    label: 'Average Package (LPA)',
    required: false,
    example: '15.3',
  },
  {
    key: 'medianPackage',
    label: 'Median Package (LPA)',
    required: false,
    example: '13.0',
  },
  {
    key: 'placementCompanies',
    label: 'Placement Companies (Comma Separated)',
    required: false,
    example: 'Google, Microsoft, Amazon, Adobe, Goldman Sachs',
  },
  {
    key: 'placementInfo',
    label: 'Placement Summary',
    required: false,
    example:
      'Over 400 top tech and core recruiters participated in the placement drive.',
  },
  {
    key: 'placementYear',
    label: 'Placement Year / Session',
    required: false,
    example: '2024-2025',
  },
  {
    key: 'hostelAvailable',
    label: 'Hostel Available (YES/NO)',
    required: false,
    example: 'YES',
  },
  {
    key: 'boysHostelAvailable',
    label: 'Boys Hostel Available (YES/NO)',
    required: false,
    example: 'YES',
  },
  {
    key: 'girlsHostelAvailable',
    label: 'Girls Hostel Available (YES/NO)',
    required: false,
    example: 'YES',
  },
  {
    key: 'hostelFee',
    label: 'Annual Hostel Fee',
    required: false,
    example: '₹60,000–₹85,000/yr',
  },
  {
    key: 'hostelFacilities',
    label: 'Hostel Facilities (Comma Separated)',
    required: false,
    example: 'Wi-Fi, 24/7 Security, Mess, Gymnasium, Sports Grounds',
  },
  {
    key: 'messInfo',
    label: 'Mess / Food Details',
    required: false,
    example:
      'Hygienic subsidized multi-cuisine vegetarian and non-vegetarian mess',
  },
  {
    key: 'otherFacilities',
    label: 'Other Facilities (Comma Separated)',
    required: false,
    example: 'Central Library, High-performance Computing Lab, Auditorium',
  },
  {
    key: 'transportAvailable',
    label: 'Transport Available (YES/NO)',
    required: false,
    example: 'YES',
  },
  {
    key: 'scholarshipAvailable',
    label: 'Scholarship Available (YES/NO)',
    required: false,
    example: 'YES',
  },
  {
    key: 'logo',
    label: 'Logo Image URL',
    required: false,
    example:
      'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=200&q=80',
  },
  {
    key: 'banner',
    label: 'Cover / Banner URL',
    required: false,
    example:
      'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80',
  },
  {
    key: 'galleryUrls',
    label: 'Gallery URLs (Comma or Semicolon Separated)',
    required: false,
    example:
      'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800;https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
  },
  {
    key: 'featured',
    label: 'Featured College (YES/NO)',
    required: false,
    example: 'YES',
  },
  {
    key: 'verified',
    label: 'Verified College (YES/NO)',
    required: false,
    example: 'YES',
  },
  {
    key: 'status',
    label: 'Status (PUBLISHED/DRAFT/ACTIVE)',
    required: false,
    example: 'PUBLISHED',
  },
  {
    key: 'seoTitle',
    label: 'SEO Title',
    required: false,
    example:
      'Delhi Technological University Admissions, Fees, Placement, Cutoff',
  },
  {
    key: 'seoDescription',
    label: 'SEO Description',
    required: false,
    example:
      'Complete information about DTU admissions, courses, fees, scholarships, and placements.',
  },
  {
    key: 'seoKeywords',
    label: 'SEO Keywords (Comma Separated)',
    required: false,
    example: 'DTU, Delhi Tech, BTech Admissions, Engineering Delhi',
  },
  {
    key: 'defaultCourseName',
    label: 'Primary Course Name',
    required: false,
    example: 'B.Tech Computer Science and Engineering',
  },
  {
    key: 'defaultCourseLevel',
    label: 'Course Level (UG/PG/DIPLOMA)',
    required: false,
    example: 'UG',
  },
  {
    key: 'defaultCourseDuration',
    label: 'Course Duration',
    required: false,
    example: '4 Years',
  },
  {
    key: 'defaultCourseFees',
    label: 'Total Course Fees (INR)',
    required: false,
    example: '780000',
  },
  {
    key: 'defaultCourseSeats',
    label: 'Intake / Seats',
    required: false,
    example: '360',
  },
  {
    key: 'defaultCourseEligibility',
    label: 'Course Eligibility',
    required: false,
    example:
      '10+2 with minimum 60% in Physics, Chemistry, Maths & JEE Main Rank',
  },
];

@Injectable()
export class CollegesBulkService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Normalizes raw row object regardless of whether keys are human labels, case variations, or field keys.
   */
  normalizeRow(raw: any): Record<string, any> {
    if (!raw || typeof raw !== 'object') return {};
    const normalized: Record<string, any> = {};

    for (const [rawKey, val] of Object.entries(raw)) {
      if (val === undefined || val === null) continue;
      const cleanKey = rawKey
        .trim()
        .toLowerCase()
        .replace(/[*()/]/g, '')
        .replace(/\s+/g, ' ');

      if (cleanKey.includes('college name') || cleanKey === 'name') {
        normalized.name = val;
      } else if (cleanKey === 'city') {
        normalized.city = val;
      } else if (cleanKey === 'state') {
        normalized.state = val;
      } else if (cleanKey.includes('established') || cleanKey.includes('estd')) {
        normalized.establishedYear = val;
      } else if (cleanKey.includes('ownership')) {
        normalized.ownership = val;
      } else if (cleanKey.includes('college type') || cleanKey === 'type') {
        normalized.type = val;
      } else if (cleanKey.includes('university') || cleanKey.includes('affiliated')) {
        normalized.university = val;
      } else if (cleanKey.includes('accreditation')) {
        normalized.accreditation = val;
      } else if (cleanKey.includes('approval')) {
        normalized.approvals = val;
      } else if (cleanKey.includes('nirf')) {
        normalized.nirfRanking = val;
      } else if (cleanKey === 'ranking' || cleanKey.includes('rank')) {
        normalized.ranking = val;
      } else if (cleanKey.includes('naac')) {
        normalized.naacGrade = val;
      } else if (cleanKey === 'rating' || cleanKey.includes('rating')) {
        normalized.rating = val;
      } else if (cleanKey.includes('short desc')) {
        normalized.shortDescription = val;
      } else if (cleanKey.includes('full desc') || cleanKey.includes('description')) {
        normalized.fullDescription = val;
      } else if (cleanKey.includes('address')) {
        normalized.address = val;
      } else if (cleanKey.includes('pincode') || cleanKey.includes('pin code')) {
        normalized.pincode = val;
      } else if (cleanKey.includes('website')) {
        normalized.website = val;
      } else if (cleanKey.includes('email')) {
        normalized.email = val;
      } else if (cleanKey.includes('phone') || cleanKey.includes('contact num')) {
        normalized.phone = val;
      } else if (cleanKey.includes('whatsapp')) {
        normalized.whatsapp = val;
      } else if (cleanKey.includes('contact person')) {
        normalized.contactPerson = val;
      } else if (cleanKey.includes('application fee')) {
        normalized.applicationFee = val;
      } else if (cleanKey.includes('placement rate') || cleanKey.includes('placement percentage')) {
        normalized.placementPercentage = val;
      } else if (cleanKey.includes('highest package')) {
        normalized.highestPackage = val;
      } else if (cleanKey.includes('average package')) {
        normalized.averagePackage = val;
      } else if (cleanKey.includes('median package')) {
        normalized.medianPackage = val;
      } else if (cleanKey.includes('recruiter') || cleanKey.includes('placement compan') || cleanKey.includes('top recruiters')) {
        normalized.placementCompanies = val;
      } else if (cleanKey.includes('placement summary') || cleanKey.includes('placement info')) {
        normalized.placementInfo = val;
      } else if (cleanKey.includes('placement year') || cleanKey.includes('placement session')) {
        normalized.placementYear = val;
      } else if (cleanKey.includes('boys hostel')) {
        normalized.boysHostelAvailable = val;
      } else if (cleanKey.includes('girls hostel')) {
        normalized.girlsHostelAvailable = val;
      } else if (cleanKey.includes('hostel fee') || cleanKey.includes('hostel structure')) {
        normalized.hostelFee = val;
      } else if (cleanKey.includes('hostel facilit')) {
        normalized.hostelFacilities = val;
      } else if (cleanKey.includes('hostel available') || cleanKey === 'hostel') {
        normalized.hostelAvailable = val;
      } else if (cleanKey.includes('mess') || cleanKey.includes('food')) {
        normalized.messInfo = val;
      } else if (cleanKey.includes('other facilit')) {
        normalized.otherFacilities = val;
      } else if (cleanKey.includes('transport')) {
        normalized.transportAvailable = val;
      } else if (cleanKey.includes('scholarship')) {
        normalized.scholarshipAvailable = val;
      } else if (cleanKey === 'logo' || cleanKey.includes('logo image')) {
        normalized.logo = val;
      } else if (cleanKey.includes('banner') || cleanKey.includes('cover')) {
        normalized.banner = val;
      } else if (cleanKey.includes('gallery')) {
        normalized.galleryUrls = val;
      } else if (cleanKey.includes('featured')) {
        normalized.featured = val;
      } else if (cleanKey.includes('verified')) {
        normalized.verified = val;
      } else if (cleanKey.includes('status')) {
        normalized.status = val;
      } else if (cleanKey.includes('seo title')) {
        normalized.seoTitle = val;
      } else if (cleanKey.includes('seo desc')) {
        normalized.seoDescription = val;
      } else if (cleanKey.includes('seo keyword')) {
        normalized.seoKeywords = val;
      } else if (cleanKey.includes('course name') || cleanKey.includes('primary course')) {
        normalized.defaultCourseName = val;
      } else if (cleanKey.includes('course level') || cleanKey.includes('degree') || cleanKey.includes('level')) {
        normalized.defaultCourseLevel = val;
      } else if (cleanKey.includes('course duration') || cleanKey.includes('duration')) {
        normalized.defaultCourseDuration = val;
      } else if (cleanKey.includes('annual fee') || cleanKey.includes('course fee') || cleanKey.includes('fees')) {
        normalized.defaultCourseFees = val;
      } else if (cleanKey.includes('seat') || cleanKey.includes('intake')) {
        normalized.defaultCourseSeats = val;
      } else if (cleanKey.includes('eligibility')) {
        normalized.defaultCourseEligibility = val;
      } else {
        normalized[rawKey] = val;
      }
    }

    return normalized;
  }

  /**
   * Constructs a typed, sanitized college record ready for Prisma operations.
   */
  buildSanitizedCollegeData(
    row: Record<string, any>,
    candidateSlug?: string,
    existingMatch?: any,
  ) {
    const collegeName = (row.name || '').toString().trim();
    const city = (row.city || '').toString().trim();
    const state = (row.state || '').toString().trim();

    // Map ownership tolerant
    let ownership: CollegeOwnership = CollegeOwnership.PRIVATE;
    if (row.ownership) {
      const oStr = String(row.ownership).trim().toUpperCase();
      if (oStr.includes('GOV') || (oStr.includes('PUBLIC') && !oStr.includes('PRIVATE'))) {
        ownership = CollegeOwnership.GOVERNMENT;
      } else if (oStr.includes('TRUST')) {
        ownership = CollegeOwnership.TRUST;
      } else if (oStr.includes('PUBLIC_PRIVATE') || oStr.includes('PPP')) {
        ownership = CollegeOwnership.PUBLIC_PRIVATE;
      } else {
        ownership = CollegeOwnership.PRIVATE;
      }
    }

    // Map type tolerant
    let type: CollegeType = CollegeType.PRIVATE;
    if (row.type) {
      const tStr = String(row.type).trim().toUpperCase();
      if (tStr.includes('GOV')) {
        type = CollegeType.GOVERNMENT;
      } else if (tStr.includes('DEEMED')) {
        type = CollegeType.DEEMED;
      } else if (tStr.includes('AUTO')) {
        type = CollegeType.AUTONOMOUS;
      } else {
        type = CollegeType.PRIVATE;
      }
    }

    // Map status tolerant
    let status: CollegeStatus = CollegeStatus.PUBLISHED;
    if (row.status) {
      const sStr = String(row.status).trim().toUpperCase();
      if (sStr.includes('DRAFT')) {
        status = CollegeStatus.DRAFT;
      } else if (sStr.includes('ARCHIV')) {
        status = CollegeStatus.ARCHIVED;
      } else {
        status = CollegeStatus.PUBLISHED;
      }
    }

    // Map CourseLevel tolerant
    let courseLevel: CourseLevel = CourseLevel.UG;
    if (row.defaultCourseLevel) {
      const lStr = String(row.defaultCourseLevel).trim().toUpperCase();
      if (lStr.includes('PG') || lStr.includes('POST') || lStr.includes('MASTER')) {
        courseLevel = CourseLevel.PG;
      } else if (lStr.includes('DIP')) {
        courseLevel = CourseLevel.DIPLOMA;
      } else if (lStr.includes('CERT')) {
        courseLevel = CourseLevel.CERTIFICATE;
      } else if (lStr.includes('PHD') || lStr.includes('DOCTOR')) {
        courseLevel = CourseLevel.PHD;
      } else if (lStr.includes('INTEG')) {
        courseLevel = CourseLevel.INTEGRATED;
      } else {
        courseLevel = CourseLevel.UG;
      }
    }

    const slug = candidateSlug || this.generateSlug(collegeName, city);
    const galleryUrls = this.parseStringArray(row.galleryUrls);
    const placementPercentage = this.parseNumber(row.placementPercentage);
    const rating = this.parseNumber(row.rating);

    return {
      name: collegeName,
      slug: existingMatch ? existingMatch.slug : slug,
      existingId: existingMatch ? existingMatch.id : undefined,
      city,
      state,
      establishedYear: this.parseNumber(row.establishedYear),
      ownership,
      type,
      university: row.university ? String(row.university).trim() : undefined,
      accreditation: row.accreditation ? String(row.accreditation).trim() : undefined,
      approvals: this.parseStringArray(row.approvals),
      ranking: this.parseNumber(row.ranking),
      nirfRanking: this.parseNumber(row.nirfRanking),
      naacGrade: row.naacGrade ? String(row.naacGrade).trim() : undefined,
      rating: rating ?? 4.2,
      shortDescription: row.shortDescription ? String(row.shortDescription).trim() : undefined,
      fullDescription: row.fullDescription ? String(row.fullDescription).trim() : undefined,
      address: row.address ? String(row.address).trim() : undefined,
      pincode: row.pincode ? String(row.pincode).trim() : undefined,
      website: row.website ? String(row.website).trim() : undefined,
      email: row.email ? String(row.email).trim() : undefined,
      phone: row.phone ? String(row.phone).trim() : undefined,
      whatsapp: row.whatsapp ? String(row.whatsapp).trim() : undefined,
      contactPerson: row.contactPerson ? String(row.contactPerson).trim() : undefined,
      applicationFee: this.parseNumber(row.applicationFee),
      placementPercentage,
      highestPackage: this.parseNumber(row.highestPackage),
      averagePackage: this.parseNumber(row.averagePackage),
      medianPackage: this.parseNumber(row.medianPackage),
      placementCompanies: this.parseStringArray(row.placementCompanies),
      placementInfo: row.placementInfo ? String(row.placementInfo).trim() : undefined,
      placementYear: row.placementYear ? String(row.placementYear).trim() : '2024-2025',
      hostelAvailable: this.parseBoolean(
        row.hostelAvailable || row.boysHostelAvailable || row.girlsHostelAvailable,
      ),
      boysHostelAvailable: this.parseBoolean(row.boysHostelAvailable),
      girlsHostelAvailable: this.parseBoolean(row.girlsHostelAvailable),
      hostelFee: row.hostelFee ? String(row.hostelFee).trim() : undefined,
      hostelFacilities: this.parseStringArray(row.hostelFacilities),
      messInfo: row.messInfo ? String(row.messInfo).trim() : undefined,
      otherFacilities: this.parseStringArray(row.otherFacilities),
      transportAvailable: this.parseBoolean(row.transportAvailable),
      scholarshipAvailable: this.parseBoolean(row.scholarshipAvailable),
      logo: row.logo ? String(row.logo).trim() : undefined,
      banner: row.banner ? String(row.banner).trim() : undefined,
      galleryUrls,
      featured: this.parseBoolean(row.featured),
      verified: this.parseBoolean(row.verified),
      status,
      seoTitle: row.seoTitle ? String(row.seoTitle).trim() : `${collegeName} Admissions, Fees & Placements`,
      seoDescription: row.seoDescription ? String(row.seoDescription).trim() : `Information about ${collegeName}, ${city}, ${state}.`,
      seoKeywords: this.parseStringArray(row.seoKeywords),
      defaultCourse: row.defaultCourseName
        ? {
            name: String(row.defaultCourseName).trim(),
            level: courseLevel,
            duration: row.defaultCourseDuration ? String(row.defaultCourseDuration).trim() : '4 Years',
            totalFees: this.parseNumber(row.defaultCourseFees),
            seats: this.parseNumber(row.defaultCourseSeats),
            eligibility: row.defaultCourseEligibility ? String(row.defaultCourseEligibility).trim() : undefined,
          }
        : undefined,
    };
  }

  /**
   * Generates a complete production import template with sample data and guidelines.
   */
  generateTemplate(format: 'csv' | 'xlsx' = 'xlsx'): {
    buffer: Buffer;
    filename: string;
    contentType: string;
  } {
    const headers = TEMPLATE_COLUMNS.map((c) => c.label);

    // Sample rows demonstrating valid data
    const sampleRow1: Record<string, string> = {};
    const sampleRow2: Record<string, string> = {};
    TEMPLATE_COLUMNS.forEach((c) => {
      sampleRow1[c.label] = c.example;
    });

    sampleRow2['College Name *'] = 'BITS Pilani - Birla Institute of Technology & Science';
    sampleRow2['City *'] = 'Pilani';
    sampleRow2['State *'] = 'Rajasthan';
    sampleRow2['Established Year'] = '1964';
    sampleRow2['Ownership (GOVERNMENT/PRIVATE/TRUST/PUBLIC_PRIVATE)'] = 'PRIVATE';
    sampleRow2['Type (GOVERNMENT/PRIVATE/DEEMED/AUTONOMOUS)'] = 'DEEMED';
    sampleRow2['Affiliated University'] = 'BITS Pilani Deemed to be University';
    sampleRow2['Accreditation'] = 'NAAC A, UGC';
    sampleRow2['Approvals (Comma Separated)'] = 'UGC, AICTE';
    sampleRow2['Ranking'] = '25';
    sampleRow2['NIRF Ranking'] = '20';
    sampleRow2['NAAC Grade'] = 'A';
    sampleRow2['Rating (0-5)'] = '4.8';
    sampleRow2['Short Description'] =
      'Premier private deemed institute of higher education and research in India.';
    sampleRow2['Full Description'] =
      'Birla Institute of Technology and Science, Pilani is an all-India institute for higher education.';
    sampleRow2['Address'] = 'Vidya Vihar, Pilani';
    sampleRow2['Pincode'] = '333031';
    sampleRow2['Official Website'] = 'https://www.bits-pilani.ac.in';
    sampleRow2['Official Email'] = 'admissions@pilani.bits-pilani.ac.in';
    sampleRow2['Phone'] = '+91 1596 242205';
    sampleRow2['WhatsApp'] = '+91 9829000000';
    sampleRow2['Contact Person'] = 'Registrar';
    sampleRow2['Application Fee (INR)'] = '3400';
    sampleRow2['Placement Percentage (%)'] = '94.0';
    sampleRow2['Highest Package (LPA)'] = '60.75';
    sampleRow2['Average Package (LPA)'] = '19.8';
    sampleRow2['Median Package (LPA)'] = '18.0';
    sampleRow2['Placement Companies (Comma Separated)'] =
      'McKinsey, Apple, Google, Microsoft, Qualcomm, Uber';
    sampleRow2['Placement Summary'] =
      'Outstanding 94% placement with top multinational recruiters.';
    sampleRow2['Placement Year / Session'] = '2024-2025';
    sampleRow2['Hostel Available (YES/NO)'] = 'YES';
    sampleRow2['Boys Hostel Available (YES/NO)'] = 'YES';
    sampleRow2['Girls Hostel Available (YES/NO)'] = 'YES';
    sampleRow2['Annual Hostel Fee'] = '₹75,000–₹1,10,000/yr';
    sampleRow2['Hostel Facilities (Comma Separated)'] =
      'High-Speed Wi-Fi, Single/Double Rooms, Modern Mess, 24/7 Power Backup';
    sampleRow2['Mess / Food Details'] =
      'Multiple student-run messes with vegetarian and non-vegetarian selections';
    sampleRow2['Other Facilities (Comma Separated)'] =
      'Library, Sports Arena, Innovation Center, Student Activity Center';
    sampleRow2['Transport Available (YES/NO)'] = 'YES';
    sampleRow2['Scholarship Available (YES/NO)'] = 'YES';
    sampleRow2['Logo Image URL'] =
      'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=200&q=80';
    sampleRow2['Cover / Banner URL'] =
      'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80';
    sampleRow2['Gallery URLs (Comma or Semicolon Separated)'] =
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800;https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800';
    sampleRow2['Featured College (YES/NO)'] = 'YES';
    sampleRow2['Verified College (YES/NO)'] = 'YES';
    sampleRow2['Status (PUBLISHED/DRAFT/ACTIVE)'] = 'PUBLISHED';
    sampleRow2['SEO Title'] = 'BITS Pilani Admissions, Cutoff, Fees, Placements';
    sampleRow2['SEO Description'] =
      'Explore BITS Pilani admissions, BITSAT eligibility, programs, fees, and top salary packages.';
    sampleRow2['SEO Keywords (Comma Separated)'] =
      'BITS Pilani, BITSAT, BTech BITS, Top Private Engineering College';
    sampleRow2['Primary Course Name'] = 'B.E. Computer Science';
    sampleRow2['Course Level (UG/PG/DIPLOMA)'] = 'UG';
    sampleRow2['Course Duration'] = '4 Years';
    sampleRow2['Total Course Fees (INR)'] = '2100000';
    sampleRow2['Intake / Seats'] = '180';
    sampleRow2['Course Eligibility'] =
      'Class 12 with 75% aggregate in PCM and valid BITSAT score';

    if (format === 'csv') {
      const ws = XLSX.utils.json_to_sheet([sampleRow1, sampleRow2], {
        header: headers,
      });
      const csv = XLSX.utils.sheet_to_csv(ws);
      // Prepend UTF-8 BOM so Excel opens it with proper encoding
      const buffer = Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from(csv, 'utf8'),
      ]);
      return {
        buffer,
        filename: `swayam_colleges_bulk_template_${Date.now()}.csv`,
        contentType: 'text/csv; charset=utf-8',
      };
    }

    // Format is Excel (.xlsx)
    const wb = XLSX.utils.book_new();
    const wsTemplate = XLSX.utils.json_to_sheet([sampleRow1, sampleRow2], {
      header: headers,
    });

    // Set auto column widths
    wsTemplate['!cols'] = TEMPLATE_COLUMNS.map((c) => ({
      wch: Math.max(c.key.length, c.label.length, c.example.length, 18),
    }));

    XLSX.utils.book_append_sheet(wb, wsTemplate, 'Colleges Import Template');

    // Guidelines sheet
    const guidelines = TEMPLATE_COLUMNS.map((c, i) => ({
      'S.No': i + 1,
      'Column Key': c.key,
      'Field Name': c.label,
      Required: c.required ? 'YES (MANDATORY)' : 'NO (OPTIONAL)',
      'Allowed Values / Format':
        c.key === 'ownership'
          ? 'PRIVATE, GOVERNMENT, TRUST, PUBLIC_PRIVATE'
          : c.key === 'type'
            ? 'PRIVATE, GOVERNMENT, DEEMED, AUTONOMOUS'
            : c.key === 'status'
              ? 'PUBLISHED, DRAFT, ACTIVE'
              : c.key === 'defaultCourseLevel'
                ? 'UG, PG, DIPLOMA, CERTIFICATE, PHD, INTEGRATED'
                : c.key.includes('Available') ||
                    c.key === 'featured' ||
                    c.key === 'verified'
                  ? 'YES, NO, true, false, 1, 0'
                  : 'Text, Numbers, or URLs as indicated',
      'Example Value': c.example,
    }));

    const wsGuidelines = XLSX.utils.json_to_sheet(guidelines);
    wsGuidelines['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 30 },
      { wch: 18 },
      { wch: 40 },
      { wch: 35 },
    ];
    XLSX.utils.book_append_sheet(
      wb,
      wsGuidelines,
      'Guidelines & Allowed Values',
    );

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return {
      buffer,
      filename: `swayam_colleges_bulk_template_${Date.now()}.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  /**
   * Parse uploaded file buffer (CSV or XLSX) into raw row objects.
   */
  parseFileBuffer(buffer: Buffer): any[] {
    try {
      const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      const firstSheetName = wb.SheetNames[0];
      if (!firstSheetName) {
        throw new BadRequestException(
          'The uploaded file does not contain any sheets.',
        );
      }
      const ws = wb.Sheets[firstSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      return rows;
    } catch (err: any) {
      throw new BadRequestException(
        `Failed to parse file: ${err.message || 'Invalid format'}`,
      );
    }
  }

  /**
   * Generates a slug from college name (and optionally city).
   */
  generateSlug(name: string, city?: string): string {
    const base = `${name} ${city || ''}`
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    return base || `college-${Date.now()}`;
  }

  /**
   * Normalize boolean value strings.
   */
  private parseBoolean(val: any): boolean {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val === 1;
    if (!val) return false;
    const str = String(val).trim().toLowerCase();
    return str === 'yes' || str === 'true' || str === '1' || str === 'y';
  }

  /**
   * Normalize comma or semicolon separated array strings.
   */
  private parseStringArray(val: any): string[] {
    if (Array.isArray(val))
      return val.map((v) => String(v).trim()).filter(Boolean);
    if (!val) return [];
    return String(val)
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /**
   * Normalize numeric value.
   */
  private parseNumber(val: any): number | undefined {
    if (val === undefined || val === null || val === '') return undefined;
    if (typeof val === 'number') return isNaN(val) ? undefined : val;
    const clean = String(val).replace(/[^0-9.-]+/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Validates row data and checks existing college database records for duplication/updates.
   */
  async validateRows(rawRows: any[]): Promise<BulkValidationResult> {
    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      throw new BadRequestException('No rows provided for validation.');
    }

    // Query existing colleges to check duplicates/updates efficiently
    const existingColleges = await this.prisma.college.findMany({
      select: { id: true, name: true, slug: true, city: true, state: true },
    });

    const slugMap = new Map<string, (typeof existingColleges)[0]>();
    const nameCityMap = new Map<string, (typeof existingColleges)[0]>();

    for (const c of existingColleges) {
      slugMap.set(c.slug.toLowerCase(), c);
      const nameCityKey = `${c.name.trim().toLowerCase()}|${c.city.trim().toLowerCase()}`;
      nameCityMap.set(nameCityKey, c);
    }

    const errors: BulkValidationRowError[] = [];
    const previewRows: BulkValidationResult['previewRows'] = [];
    let invalidRows = 0;
    let duplicateRows = 0;
    let rowsToCreate = 0;
    let rowsToUpdate = 0;

    // Track duplicates within the uploaded file itself
    const seenInBatch = new Set<string>();

    for (let i = 0; i < rawRows.length; i++) {
      const rowIndex = i + 2; // Row number as seen in Excel (header is row 1)
      const raw = rawRows[i];
      const rowErrors: string[] = [];

      // Normalize row keys across various formats
      const row = this.normalizeRow(raw);

      const collegeName = (row.name || '').toString().trim();
      const city = (row.city || '').toString().trim();
      const state = (row.state || '').toString().trim();

      // Required validations
      if (!collegeName) {
        errors.push({
          row: rowIndex,
          field: 'name',
          message: 'College name is required.',
        });
        rowErrors.push('Missing college name');
      }
      if (!city) {
        errors.push({
          row: rowIndex,
          field: 'city',
          message: 'City is required.',
        });
        rowErrors.push('Missing city');
      }
      if (!state) {
        errors.push({
          row: rowIndex,
          field: 'state',
          message: 'State is required.',
        });
        rowErrors.push('Missing state');
      }

      // Numerical range validations
      const establishedYear = this.parseNumber(row.establishedYear);
      if (
        row.establishedYear &&
        (establishedYear === undefined ||
          establishedYear < 1700 ||
          establishedYear > 2100)
      ) {
        errors.push({
          row: rowIndex,
          collegeName,
          field: 'establishedYear',
          message: 'Invalid established year (must be between 1700 and 2100).',
        });
        rowErrors.push('Invalid established year');
      }

      const placementPercentage = this.parseNumber(row.placementPercentage);
      if (
        row.placementPercentage &&
        (placementPercentage === undefined ||
          placementPercentage < 0 ||
          placementPercentage > 100)
      ) {
        errors.push({
          row: rowIndex,
          collegeName,
          field: 'placementPercentage',
          message: 'Placement percentage must be between 0 and 100.',
        });
        rowErrors.push('Invalid placement percentage');
      }

      const rating = this.parseNumber(row.rating);
      if (row.rating && (rating === undefined || rating < 0 || rating > 5)) {
        errors.push({
          row: rowIndex,
          collegeName,
          field: 'rating',
          message: 'Rating must be between 0 and 5.',
        });
        rowErrors.push('Invalid rating');
      }

      // URL validations if provided
      const validateUrl = (urlStr?: string, fieldName = 'URL') => {
        if (!urlStr || !String(urlStr).trim()) return true;
        const clean = String(urlStr).trim();
        if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
          errors.push({
            row: rowIndex,
            collegeName,
            field: fieldName,
            message: `${fieldName} must begin with http:// or https://.`,
          });
          rowErrors.push(`Malformed ${fieldName}`);
          return false;
        }
        return true;
      };

      validateUrl(row.logo, 'logo');
      validateUrl(row.banner, 'banner');
      validateUrl(row.website, 'website');

      // Gallery URLs validation
      const galleryUrls = this.parseStringArray(row.galleryUrls);
      for (const gUrl of galleryUrls) {
        validateUrl(gUrl, 'galleryUrls');
      }

      // Check intra-batch duplicate
      const batchKey = `${collegeName.toLowerCase()}|${city.toLowerCase()}`;
      if (collegeName && city) {
        if (seenInBatch.has(batchKey)) {
          duplicateRows++;
          errors.push({
            row: rowIndex,
            collegeName,
            field: 'duplicate',
            message: 'Duplicate college row found within the same import file.',
          });
          rowErrors.push('Duplicate entry in uploaded file');
        } else {
          seenInBatch.add(batchKey);
        }
      }

      // Check database duplicate / existing match
      const candidateSlug = this.generateSlug(collegeName, city);
      const existingMatch =
        nameCityMap.get(batchKey) || slugMap.get(candidateSlug.toLowerCase());

      const isInvalid = rowErrors.length > 0;
      let action: 'CREATE' | 'UPDATE' | 'INVALID' = 'CREATE';

      if (isInvalid) {
        invalidRows++;
        action = 'INVALID';
      } else if (existingMatch) {
        rowsToUpdate++;
        duplicateRows++;
        action = 'UPDATE';
      } else {
        rowsToCreate++;
        action = 'CREATE';
      }

      // Build sanitized data object ready for database
      const sanitizedData = !isInvalid
        ? this.buildSanitizedCollegeData(row, candidateSlug, existingMatch)
        : undefined;

      previewRows.push({
        rowIndex,
        action,
        name: collegeName || '(Empty Name)',
        city: city || '(Empty City)',
        state: state || '(Empty State)',
        ownership: sanitizedData ? sanitizedData.ownership : 'PRIVATE',
        type: sanitizedData ? sanitizedData.type : 'PRIVATE',
        fees: row.defaultCourseFees || row.applicationFee || '-',
        placementRate:
          placementPercentage !== undefined ? `${placementPercentage}%` : '-',
        hasHostel: this.parseBoolean(
          row.hostelAvailable ||
            row.boysHostelAvailable ||
            row.girlsHostelAvailable,
        ),
        galleryCount: galleryUrls.length,
        coursesCount: row.defaultCourseName ? 1 : 0,
        status: sanitizedData ? sanitizedData.status : 'PUBLISHED',
        errors: rowErrors,
        sanitizedData,
      });
    }

    return {
      totalRows: rawRows.length,
      validRows: rawRows.length - invalidRows,
      invalidRows,
      duplicateRows,
      rowsToCreate,
      rowsToUpdate,
      errors,
      previewRows,
    };
  }

  /**
   * Executes chunked batch import with transaction safety, deduplication, and error reporting.
   */
  async executeImport(
    validatedRows: any[],
    strategy: 'UPDATE_EXISTING' | 'SKIP_EXISTING' = 'UPDATE_EXISTING',
    adminId: string,
  ): Promise<BulkImportSummaryResult> {
    if (!Array.isArray(validatedRows) || validatedRows.length === 0) {
      throw new BadRequestException(
        'No validated rows provided for execution.',
      );
    }

    let successfullyCreated = 0;
    let successfullyUpdated = 0;
    let skipped = 0;
    let failed = 0;
    let duplicateRecords = 0;
    const items: BulkImportReportItem[] = [];

    // Process in safe sequential chunks of 50 to avoid connection pool exhaustion and transaction timeouts
    const CHUNK_SIZE = 50;
    for (let i = 0; i < validatedRows.length; i += CHUNK_SIZE) {
      const chunk = validatedRows.slice(i, i + CHUNK_SIZE);

      for (const item of chunk) {
        let row = item.sanitizedData;
        if (!row) {
          const normalized = this.normalizeRow(item);
          if (normalized.name && normalized.city && normalized.state) {
            row = this.buildSanitizedCollegeData(normalized);
          }
        }
        const rowIndex = item.rowIndex || i + 1;

        if (!row || !row.name || !row.city || !row.state) {
          failed++;
          items.push({
            row: rowIndex,
            name: row?.name || item?.name || 'Unknown',
            city: row?.city || item?.city || 'Unknown',
            state: row?.state || item?.state || 'Unknown',
            status: 'FAILED',
            message:
              'Invalid row data: missing mandatory name, city, or state.',
          });
          continue;
        }

        try {
          // Check if exists
          let existingCollege: {
            id: string;
            name: string;
            slug: string;
          } | null = null;
          if (row.existingId) {
            existingCollege = await this.prisma.college.findUnique({
              where: { id: row.existingId },
              select: { id: true, name: true, slug: true },
            });
          } else {
            const candidateSlug = row.slug || this.generateSlug(row.name, row.city);
            existingCollege = await this.prisma.college.findFirst({
              where: {
                OR: [
                  { slug: candidateSlug },
                  {
                    name: { equals: row.name, mode: 'insensitive' },
                    city: { equals: row.city, mode: 'insensitive' },
                  },
                ],
              },
              select: { id: true, name: true, slug: true },
            });
          }

          if (existingCollege) {
            duplicateRecords++;
            if (strategy === 'SKIP_EXISTING') {
              skipped++;
              items.push({
                row: rowIndex,
                name: row.name,
                city: row.city,
                state: row.state,
                status: 'SKIPPED',
                collegeId: existingCollege.id,
                message: `College already exists (${existingCollege.slug}). Skipped per import strategy.`,
              });
              continue;
            }

            // Update existing college
            const updatePayload: any = {
              name: row.name,
              establishedYear: row.establishedYear,
              ownership: row.ownership,
              type: row.type,
              university: row.university,
              accreditation: row.accreditation,
              approvals: row.approvals,
              ranking: row.ranking,
              nirfRanking: row.nirfRanking,
              naacGrade: row.naacGrade,
              rating: row.rating,
              shortDescription: row.shortDescription,
              fullDescription: row.fullDescription,
              city: row.city,
              state: row.state,
              address: row.address,
              pincode: row.pincode,
              website: row.website,
              email: row.email,
              phone: row.phone,
              whatsapp: row.whatsapp,
              contactPerson: row.contactPerson,
              applicationFee: row.applicationFee,
              placementPercentage: row.placementPercentage,
              highestPackage: row.highestPackage,
              averagePackage: row.averagePackage,
              medianPackage: row.medianPackage,
              placementCompanies: row.placementCompanies,
              placementInfo: row.placementInfo,
              placementYear: row.placementYear,
              hostelAvailable: row.hostelAvailable,
              boysHostelAvailable: row.boysHostelAvailable,
              girlsHostelAvailable: row.girlsHostelAvailable,
              hostelFee: row.hostelFee,
              hostelFacilities: row.hostelFacilities,
              messInfo: row.messInfo,
              otherFacilities: row.otherFacilities,
              transportAvailable: row.transportAvailable,
              scholarshipAvailable: row.scholarshipAvailable,
              logo: row.logo,
              banner: row.banner,
              featured: row.featured,
              verified: row.verified,
              status: row.status,
              seoTitle: row.seoTitle,
              seoDescription: row.seoDescription,
              seoKeywords: row.seoKeywords,
            };

            await this.prisma.college.update({
              where: { id: existingCollege.id },
              data: updatePayload,
            });

            // Update or add gallery images if provided
            if (row.galleryUrls && row.galleryUrls.length > 0) {
              for (let gIdx = 0; gIdx < row.galleryUrls.length; gIdx++) {
                const imgUrl = row.galleryUrls[gIdx];
                const existingImg = await this.prisma.collegeGallery.findFirst({
                  where: { collegeId: existingCollege.id, imageUrl: imgUrl },
                });
                if (!existingImg) {
                  await this.prisma.collegeGallery.create({
                    data: {
                      collegeId: existingCollege.id,
                      imageUrl: imgUrl,
                      caption: `${row.name} Campus View ${gIdx + 1}`,
                      sortOrder: gIdx,
                      isCover: gIdx === 0,
                    },
                  });
                }
              }
            }

            // Update or add default course if provided
            if (row.defaultCourse && row.defaultCourse.name) {
              const baseCourseSlug = `${this.generateSlug(row.defaultCourse.name)}-${existingCollege.id.substring(0, 8)}`;
              const existingCourse = await this.prisma.course.findFirst({
                where: {
                  collegeId: existingCollege.id,
                  name: row.defaultCourse.name,
                },
              });
              if (existingCourse) {
                await this.prisma.course.update({
                  where: { id: existingCourse.id },
                  data: {
                    totalFees: row.defaultCourse.totalFees,
                    seats: row.defaultCourse.seats,
                    eligibility: row.defaultCourse.eligibility,
                    duration: row.defaultCourse.duration,
                  },
                });
              } else {
                let finalCourseSlug = baseCourseSlug;
                const existingCourseSlug = await this.prisma.course.findUnique({
                  where: { slug: finalCourseSlug },
                  select: { id: true },
                });
                if (existingCourseSlug) {
                  finalCourseSlug = `${baseCourseSlug}-${Math.random().toString(36).substring(2, 6)}`;
                }
                await this.prisma.course.create({
                  data: {
                    collegeId: existingCollege.id,
                    name: row.defaultCourse.name,
                    slug: finalCourseSlug,
                    level: row.defaultCourse.level || CourseLevel.UG,
                    duration: row.defaultCourse.duration || '4 Years',
                    totalFees: row.defaultCourse.totalFees,
                    seats: row.defaultCourse.seats,
                    eligibility: row.defaultCourse.eligibility,
                    status: 'PUBLISHED',
                  },
                });
              }
            }

            successfullyUpdated++;
            items.push({
              row: rowIndex,
              name: row.name,
              city: row.city,
              state: row.state,
              status: 'UPDATED',
              collegeId: existingCollege.id,
              message: 'Successfully updated existing college record.',
            });
          } else {
            // Safe unique slug generation for new college
            let finalSlug = row.slug || this.generateSlug(row.name, row.city);
            const slugCollision = await this.prisma.college.findUnique({
              where: { slug: finalSlug },
              select: { id: true },
            });
            if (slugCollision) {
              finalSlug = `${finalSlug}-${Math.random().toString(36).substring(2, 7)}`;
            }

            // Create new college record
            const createPayload: any = {
              name: row.name,
              slug: finalSlug,
              establishedYear: row.establishedYear,
              ownership: row.ownership,
              type: row.type,
              university: row.university,
              accreditation: row.accreditation,
              approvals: row.approvals || [],
              ranking: row.ranking,
              nirfRanking: row.nirfRanking,
              naacGrade: row.naacGrade,
              rating: row.rating ?? 4.2,
              shortDescription: row.shortDescription,
              fullDescription: row.fullDescription,
              city: row.city,
              state: row.state,
              address: row.address,
              pincode: row.pincode,
              website: row.website,
              email: row.email,
              phone: row.phone,
              whatsapp: row.whatsapp,
              contactPerson: row.contactPerson,
              applicationFee: row.applicationFee,
              placementPercentage: row.placementPercentage,
              highestPackage: row.highestPackage,
              averagePackage: row.averagePackage,
              medianPackage: row.medianPackage,
              placementCompanies: row.placementCompanies || [],
              placementInfo: row.placementInfo,
              placementYear: row.placementYear || '2024-2025',
              hostelAvailable: row.hostelAvailable ?? false,
              boysHostelAvailable: row.boysHostelAvailable ?? false,
              girlsHostelAvailable: row.girlsHostelAvailable ?? false,
              hostelFee: row.hostelFee,
              hostelFacilities: row.hostelFacilities || [],
              messInfo: row.messInfo,
              otherFacilities: row.otherFacilities || [],
              transportAvailable: row.transportAvailable ?? false,
              scholarshipAvailable: row.scholarshipAvailable ?? false,
              logo: row.logo,
              banner: row.banner,
              featured: row.featured ?? false,
              verified: row.verified ?? false,
              status: row.status || CollegeStatus.PUBLISHED,
              seoTitle: row.seoTitle,
              seoDescription: row.seoDescription,
              seoKeywords: row.seoKeywords || [],
            };

            const created = await this.prisma.college.create({
              data: createPayload,
            });

            // Create gallery items if any
            if (row.galleryUrls && row.galleryUrls.length > 0) {
              await this.prisma.collegeGallery.createMany({
                data: row.galleryUrls.map((imgUrl: string, gIdx: number) => ({
                  collegeId: created.id,
                  imageUrl: imgUrl,
                  caption: `${created.name} Campus View ${gIdx + 1}`,
                  sortOrder: gIdx,
                  isCover: gIdx === 0,
                })),
              });
            }

            // Create default course if provided
            if (row.defaultCourse && row.defaultCourse.name) {
              const baseCourseSlug = `${this.generateSlug(row.defaultCourse.name)}-${created.id.substring(0, 8)}`;
              let finalCourseSlug = baseCourseSlug;
              const existingCourseSlug = await this.prisma.course.findUnique({
                where: { slug: finalCourseSlug },
                select: { id: true },
              });
              if (existingCourseSlug) {
                finalCourseSlug = `${baseCourseSlug}-${Math.random().toString(36).substring(2, 6)}`;
              }
              await this.prisma.course.create({
                data: {
                  collegeId: created.id,
                  name: row.defaultCourse.name,
                  slug: finalCourseSlug,
                  level: row.defaultCourse.level || CourseLevel.UG,
                  duration: row.defaultCourse.duration || '4 Years',
                  totalFees: row.defaultCourse.totalFees,
                  seats: row.defaultCourse.seats,
                  eligibility: row.defaultCourse.eligibility,
                  status: 'PUBLISHED',
                },
              });
            }

            successfullyCreated++;
            items.push({
              row: rowIndex,
              name: row.name,
              city: row.city,
              state: row.state,
              status: 'CREATED',
              collegeId: created.id,
              message: 'Successfully created college profile.',
            });
          }
        } catch (itemErr: any) {
          failed++;
          items.push({
            row: rowIndex,
            name: row?.name || 'Unknown',
            city: row?.city || 'Unknown',
            state: row?.state || 'Unknown',
            status: 'FAILED',
            message:
              itemErr.message || 'Database error occurred during import.',
          });
        }
      }
    }

    // Log the bulk action to AuditLog
    await this.auditService.logAction({
      userId: adminId,
      action: 'BULK_IMPORT_COLLEGES',
      entity: 'College',
      description: `Bulk imported colleges. Created: ${successfullyCreated}, Updated: ${successfullyUpdated}, Skipped: ${skipped}, Failed: ${failed}.`,
    });

    // Generate downloadable CSV report
    const reportCsv = this.generateReportCsv(items);

    return {
      totalProcessed: items.length,
      successfullyCreated,
      successfullyUpdated,
      skipped,
      failed,
      duplicateRecords,
      items,
      reportCsv,
    };
  }

  /**
   * Generates a downloadable CSV string representing the complete import report.
   */
  generateReportCsv(items: BulkImportReportItem[]): string {
    const headers = [
      'Row Number',
      'College Name',
      'City',
      'State',
      'Import Status',
      'College ID',
      'Details / Message',
    ];
    const rows = items.map((it) => [
      it.row,
      `"${(it.name || '').replace(/"/g, '""')}"`,
      `"${(it.city || '').replace(/"/g, '""')}"`,
      `"${(it.state || '').replace(/"/g, '""')}"`,
      it.status,
      it.collegeId || '',
      `"${(it.message || '').replace(/"/g, '""')}"`,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }
}
