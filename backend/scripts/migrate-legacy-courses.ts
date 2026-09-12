import {
  PrismaClient,
  CollegeStatus,
  CourseCategory,
  CourseLevel,
  CourseDurationType,
  CourseMode,
  CourseBranch,
} from '@prisma/client';
import { PROGRAM_FAMILIES_SEED } from './seed-courses';

const prisma = new PrismaClient();

interface MigrationMapEntry {
  legacySlug: string;
  classification: 'FLATTENED_BRANCH_VARIANT' | 'OBSOLETE_DUPLICATE' | 'STANDALONE_VARIANT';
  targetCourseSlug: string;
  targetBranchSlug?: string;
  entryRoute?: string;
}

// Explicit, auditable migration mapping
const EXPLICIT_MIGRATION_MAP: MigrationMapEntry[] = [
  // ── 1. B.Tech Flattened Variants ──
  {
    legacySlug: 'btech-computer-science-engineering-cse',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'btech-bachelor-of-technology',
    targetBranchSlug: 'btech-cse',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'btech-artificial-intelligence-machine-learning',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'btech-bachelor-of-technology',
    targetBranchSlug: 'btech-aiml',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'btech-data-science',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'btech-bachelor-of-technology',
    targetBranchSlug: 'btech-ds',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'btech-civil-engineering',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'btech-bachelor-of-technology',
    targetBranchSlug: 'btech-civil',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'btech-mechanical-engineering',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'btech-bachelor-of-technology',
    targetBranchSlug: 'btech-mech',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'btech-electronics-communication-engineering',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'btech-bachelor-of-technology',
    targetBranchSlug: 'btech-ece',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'btech-biotechnology',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'btech-bachelor-of-technology',
    targetBranchSlug: 'btech-biotech',
    entryRoute: 'DIRECT',
  },
  // B.Tech Lateral Entry Variants
  {
    legacySlug: 'btech-lateral-entry-cse',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'btech-bachelor-of-technology',
    targetBranchSlug: 'btech-cse',
    entryRoute: 'LATERAL',
  },
  {
    legacySlug: 'btech-lateral-entry-civil',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'btech-bachelor-of-technology',
    targetBranchSlug: 'btech-civil',
    entryRoute: 'LATERAL',
  },
  {
    legacySlug: 'btech-lateral-entry-mechanical',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'btech-bachelor-of-technology',
    targetBranchSlug: 'btech-mech',
    entryRoute: 'LATERAL',
  },
  {
    legacySlug: 'btech-lateral-entry-electrical',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'btech-bachelor-of-technology',
    targetBranchSlug: 'btech-ee',
    entryRoute: 'LATERAL',
  },

  // ── 2. Polytechnic Diploma Flattened Variants ──
  {
    legacySlug: 'polytechnic-diploma-computer-science-engineering',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'polytechnic-diploma-in-engineering',
    targetBranchSlug: 'poly-cse',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'polytechnic-diploma-mechanical-engineering',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'polytechnic-diploma-in-engineering',
    targetBranchSlug: 'poly-mech',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'polytechnic-diploma-civil-engineering',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'polytechnic-diploma-in-engineering',
    targetBranchSlug: 'poly-civil',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'polytechnic-diploma-electrical-engineering',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'polytechnic-diploma-in-engineering',
    targetBranchSlug: 'poly-ee',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'polytechnic-diploma-electronics-communication',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'polytechnic-diploma-in-engineering',
    targetBranchSlug: 'poly-ece',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'polytechnic-diploma-automobile-engineering',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'polytechnic-diploma-in-engineering',
    targetBranchSlug: 'poly-auto',
    entryRoute: 'DIRECT',
  },

  // ── 3. B.Sc Flattened Variants ──
  {
    legacySlug: 'bsc-pcm-general',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'bsc-bachelor-of-science',
    targetBranchSlug: 'bsc-pcm',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'bsc-computer-science',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'bsc-bachelor-of-science',
    targetBranchSlug: 'bsc-cs',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'bsc-information-technology',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'bsc-bachelor-of-science',
    targetBranchSlug: 'bsc-it',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'bsc-biotechnology',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'bsc-bachelor-of-science',
    targetBranchSlug: 'bsc-biotech',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'bsc-agriculture-honours',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'bsc-bachelor-of-science',
    targetBranchSlug: 'bsc-agri',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'bsc-nursing',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'bsc-bachelor-of-science',
    targetBranchSlug: 'bsc-nursing',
    entryRoute: 'DIRECT',
  },

  // ── 4. B.Com Flattened Variants ──
  {
    legacySlug: 'bcom-general-financial-accounting',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'bcom-bachelor-of-commerce',
    targetBranchSlug: 'bcom-general',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'bcom-honours-fintech',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'bcom-bachelor-of-commerce',
    targetBranchSlug: 'bcom-fintech',
    entryRoute: 'DIRECT',
  },

  // ── 5. BBA / BMS Variants ──
  {
    legacySlug: 'bba-bachelor-business-administration',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'bba-bachelor-of-business-administration',
    targetBranchSlug: 'bba-general',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'bms-management-studies',
    classification: 'STANDALONE_VARIANT',
    targetCourseSlug: 'bba-bachelor-of-business-administration',
    targetBranchSlug: 'bba-general',
    entryRoute: 'DIRECT',
  },

  // ── 6. MBA Flattened Variants ──
  {
    legacySlug: 'mba-finance-marketing-hr',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'mba-master-of-business-administration',
    targetBranchSlug: 'mba-core',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'mba-business-analytics',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'mba-master-of-business-administration',
    targetBranchSlug: 'mba-analytics',
    entryRoute: 'DIRECT',
  },

  // ── 7. M.Tech Flattened Variants ──
  {
    legacySlug: 'mtech-computer-science-engineering',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'mtech-master-of-technology',
    targetBranchSlug: 'mtech-cse',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'mtech-vlsi-embedded-systems',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'mtech-master-of-technology',
    targetBranchSlug: 'mtech-vlsi',
    entryRoute: 'DIRECT',
  },

  // ── 8. M.Sc Flattened Variants ──
  {
    legacySlug: 'msc-data-science-ai',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'msc-master-of-science',
    targetBranchSlug: 'msc-ds-ai',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'msc-biotechnology-microbiology',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'msc-master-of-science',
    targetBranchSlug: 'msc-biotech',
    entryRoute: 'DIRECT',
  },

  // ── 9. B.A. / Humanities Variants ──
  {
    legacySlug: 'ba-honours-humanities',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'ba-bachelor-of-arts',
    targetBranchSlug: 'ba-hons',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'ba-journalism-mass-communication-bjmc',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'ba-bachelor-of-arts',
    targetBranchSlug: 'ba-bjmc',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'ba-psychology',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'ba-bachelor-of-arts',
    targetBranchSlug: 'ba-psych',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'ma-postgraduate-humanities',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'ma-master-of-arts',
    entryRoute: 'DIRECT',
  },

  // ── 10. Ph.D Flattened Variants ──
  {
    legacySlug: 'phd-computer-science-engineering',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'phd-doctor-of-philosophy',
    targetBranchSlug: 'phd-cse',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'phd-management-studies',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'phd-doctor-of-philosophy',
    targetBranchSlug: 'phd-mgmt',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'phd-pharmaceutical-sciences',
    classification: 'FLATTENED_BRANCH_VARIANT',
    targetCourseSlug: 'phd-doctor-of-philosophy',
    targetBranchSlug: 'phd-pharm',
    entryRoute: 'DIRECT',
  },

  // ── 11. Duplicate Standalone Courses ──
  {
    legacySlug: 'bca-bachelor-computer-applications',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'bca-bachelor-of-computer-applications',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'mca-master-computer-applications',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'mca-master-of-computer-applications',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'mbbs-medicine-surgery',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'mbbs-bachelor-of-medicine-bachelor-of-surgery',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'bds-dental-surgery',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'bds-bachelor-of-dental-surgery',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'bams-ayurvedic-medicine-surgery',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'bams-bachelor-of-ayurvedic-medicine-surgery',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'bhms-homeopathic-medicine-surgery',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'bhms-bachelor-of-homeopathic-medicine-surgery',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'bpt-physiotherapy',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'bpt-bachelor-of-physiotherapy',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'bpharm-bachelor-pharmacy',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'bpharm-bachelor-of-pharmacy',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'bpharm-lateral-entry',
    classification: 'STANDALONE_VARIANT',
    targetCourseSlug: 'bpharm-bachelor-of-pharmacy',
    entryRoute: 'LATERAL',
  },
  {
    legacySlug: 'dpharm-diploma-pharmacy',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'dpharm-diploma-in-pharmacy',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'barch-bachelor-architecture',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'barch-bachelor-of-architecture',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'bdes-bachelor-design',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'bdes-bachelor-of-design',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'bhm-bachelor-hotel-management',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'bhm-bachelor-of-hotel-management',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'diploma-hotel-management-catering-technology',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'diploma-hotel-management-catering',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'diploma-medical-laboratory-technology-dmlt',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'diploma-medical-laboratory-technology',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'llb-3-years-professional-law',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'llb-bachelor-of-laws-3-years',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'llm-master-laws',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'llm-master-of-laws',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'bed-bachelor-education',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'bed-bachelor-of-education',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'beled-bachelor-elementary-education',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'beled-bachelor-of-elementary-education',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'mpharm-pharmacy-postgraduate',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'mpharm-master-of-pharmacy',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'mcom-master-commerce',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'mcom-master-of-commerce',
    entryRoute: 'DIRECT',
  },
  {
    legacySlug: 'iti-industrial-training-electrician-fitter',
    classification: 'OBSOLETE_DUPLICATE',
    targetCourseSlug: 'iti-electrician-fitter',
    entryRoute: 'DIRECT',
  },
];

interface PerRecordLog {
  oldCourseName: string;
  oldCourseSlug: string;
  newCourseName: string;
  newCourseSlug: string;
  newBranchName: string;
  newBranchCode: string;
  affectedLeads: number;
  affectedApplications: number;
  status: 'SUCCESS' | 'MIGRATION_REVIEW_REQUIRED' | 'ALREADY_NORMALIZED' | 'FAILED';
  note?: string;
}

export async function runCourseMigration() {
  console.log('====================================================');
  console.log('🔄 STARTING SAFE COURSE & BRANCH MIGRATION');
  console.log('====================================================\n');

  // Step 1: Ensure Anchor College exists
  let anchorCollege = await prisma.college.findFirst({
    where: { status: CollegeStatus.PUBLISHED },
  });
  if (!anchorCollege) {
    anchorCollege = await prisma.college.findFirst();
  }
  if (!anchorCollege) {
    throw new Error('Cannot run migration: No college exists in database');
  }

  // Step 2: Idempotently upsert all 37 canonical program families and branches
  console.log('Step 1: Upserting Normalized Program Families, Branches & Eligibility Rules...');
  let totalFamilies = 0;
  let totalBranches = 0;
  let totalRules = 0;

  for (const prog of PROGRAM_FAMILIES_SEED) {
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
    totalFamilies++;

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
  console.log(`✅ ${totalFamilies} Normalized Program Families verified/seeded`);
  console.log(`✅ ${totalBranches} Child Branches verified/seeded`);
  console.log(`✅ ${totalRules} Eligibility Rules verified/seeded\n`);

  // Step 3: Execute explicit, transactional migration for legacy courses
  console.log('Step 2: Migrating legacy courses according to explicit migration map...');
  const seedSlugSet = new Set(PROGRAM_FAMILIES_SEED.map((p) => p.slug));
  const logs: PerRecordLog[] = [];

  let migratedLeadsCount = 0;
  let migratedAppsCount = 0;
  let archivedLegacyCoursesCount = 0;
  let alreadyNormalizedCount = 0;
  let ambiguousCount = 0;
  let failuresCount = 0;

  for (const entry of EXPLICIT_MIGRATION_MAP) {
    try {
      const legacyCourse = await prisma.course.findUnique({
        where: { slug: entry.legacySlug },
        include: {
          leads: true,
          applications: true,
        },
      });

      if (!legacyCourse) {
        // Record was already migrated / not found
        continue;
      }

      // Find target normalized parent course
      const targetCourse = await prisma.course.findUnique({
        where: { slug: entry.targetCourseSlug },
      });

      if (!targetCourse) {
        console.warn(`Target course slug "${entry.targetCourseSlug}" not found for legacy slug "${entry.legacySlug}"`);
        failuresCount++;
        logs.push({
          oldCourseName: legacyCourse.name,
          oldCourseSlug: legacyCourse.slug,
          newCourseName: 'NOT_FOUND',
          newCourseSlug: entry.targetCourseSlug,
          newBranchName: 'NONE',
          newBranchCode: 'NONE',
          affectedLeads: 0,
          affectedApplications: 0,
          status: 'FAILED',
          note: `Target course ${entry.targetCourseSlug} does not exist`,
        });
        continue;
      }

      // Find target branch if applicable
      let targetBranch: CourseBranch | null = null;
      if (entry.targetBranchSlug) {
        targetBranch = await prisma.courseBranch.findUnique({
          where: {
            courseId_slug: {
              courseId: targetCourse.id,
              slug: entry.targetBranchSlug,
            },
          },
        });
      }

      // Transactional Migration for this record
      await prisma.$transaction(async (tx) => {
        // 1. Migrate Leads pointing to legacy course
        if (legacyCourse.leads.length > 0) {
          for (const lead of legacyCourse.leads) {
            await tx.lead.update({
              where: { id: lead.id },
              data: {
                courseId: targetCourse.id,
                branchId: targetBranch ? targetBranch.id : lead.branchId,
                // Preserve original text fields if present
                preferredCourse: lead.preferredCourse || legacyCourse.name,
              },
            });
            migratedLeadsCount++;
          }
        }

        // 2. Migrate Applications pointing to legacy course
        if (legacyCourse.applications.length > 0) {
          for (const app of legacyCourse.applications) {
            await tx.application.update({
              where: { id: app.id },
              data: {
                courseId: targetCourse.id,
                branchId: targetBranch ? targetBranch.id : app.branchId,
                branchName: targetBranch ? targetBranch.name : app.branchName,
              },
            });
            migratedAppsCount++;
          }
        }

        // 3. Set Legacy Course status to ARCHIVED (non-destructive)
        await tx.course.update({
          where: { id: legacyCourse.id },
          data: {
            status: CollegeStatus.ARCHIVED,
          },
        });
        archivedLegacyCoursesCount++;
      });

      logs.push({
        oldCourseName: legacyCourse.name,
        oldCourseSlug: legacyCourse.slug,
        newCourseName: targetCourse.name,
        newCourseSlug: targetCourse.slug,
        newBranchName: targetBranch ? targetBranch.name : 'N/A (Branchless)',
        newBranchCode: targetBranch ? (targetBranch.code || 'NO_CODE') : 'N/A',
        affectedLeads: legacyCourse.leads.length,
        affectedApplications: legacyCourse.applications.length,
        status: 'SUCCESS',
      });
    } catch (err: any) {
      console.error(`Error migrating legacy course "${entry.legacySlug}":`, err);
      failuresCount++;
      logs.push({
        oldCourseName: entry.legacySlug,
        oldCourseSlug: entry.legacySlug,
        newCourseName: entry.targetCourseSlug,
        newCourseSlug: entry.targetCourseSlug,
        newBranchName: entry.targetBranchSlug || 'NONE',
        newBranchCode: 'NONE',
        affectedLeads: 0,
        affectedApplications: 0,
        status: 'FAILED',
        note: err?.message,
      });
    }
  }

  // Step 4: Check for Ambiguous or Unmapped records
  console.log('Step 3: Checking for ambiguous/unmapped courses...');
  const allDbCourses = await prisma.course.findMany({
    where: { status: { not: CollegeStatus.ARCHIVED } },
    include: { _count: { select: { leads: true, applications: true } } },
  });

  for (const c of allDbCourses) {
    if (seedSlugSet.has(c.slug)) {
      alreadyNormalizedCount++;
    } else {
      ambiguousCount++;
      logs.push({
        oldCourseName: c.name,
        oldCourseSlug: c.slug,
        newCourseName: 'RETAINED_IN_PLACE',
        newCourseSlug: c.slug,
        newBranchName: 'NONE',
        newBranchCode: 'NONE',
        affectedLeads: c._count.leads,
        affectedApplications: c._count.applications,
        status: 'MIGRATION_REVIEW_REQUIRED',
        note: 'Ambiguous custom record not in seed catalog. Retained as-is without auto-migration.',
      });
    }
  }

  // ── Print Final Migration Report ──
  console.log('\n====================================================');
  console.log('📊 MIGRATION EXECUTION REPORT');
  console.log('====================================================\n');

  console.log('### SUMMARY');
  console.log(`Normalized Program Families: ${totalFamilies}`);
  console.log(`Child Branches Seeded/Active: ${totalBranches}`);
  console.log(`Migrated Leads: ${migratedLeadsCount}`);
  console.log(`Migrated Applications: ${migratedAppsCount}`);
  console.log(`Archived Legacy Courses: ${archivedLegacyCoursesCount}`);
  console.log(`Active Normalized Courses in DB: ${alreadyNormalizedCount}`);
  console.log(`Ambiguous / Review Required: ${ambiguousCount}`);
  console.log(`Failures: ${failuresCount}\n`);

  console.log('### PER-RECORD MIGRATION LOG');
  console.log('--------------------------------------------------------------------------------');
  for (const l of logs) {
    console.log(`[${l.status}] "${l.oldCourseName}" (${l.oldCourseSlug})`);
    console.log(`  → Target: "${l.newCourseName}" (${l.newCourseSlug})`);
    console.log(`  → Branch: "${l.newBranchName}" [Code: ${l.newBranchCode}]`);
    console.log(`  → Affected Leads: ${l.affectedLeads} | Affected Apps: ${l.affectedApplications}`);
    if (l.note) console.log(`  → Note: ${l.note}`);
    console.log('--------------------------------------------------------------------------------');
  }

  console.log('====================================================');
  console.log('✅ COURSE & BRANCH MIGRATION COMPLETED');
  console.log('====================================================');
}

if (require.main === module) {
  runCourseMigration()
    .catch((err) => {
      console.error('❌ Migration failed with fatal error:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
