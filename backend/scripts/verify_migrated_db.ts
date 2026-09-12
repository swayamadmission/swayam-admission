import { PrismaClient, CollegeStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMigratedDb() {
  console.log('=== POST-MIGRATION DATABASE VERIFICATION ===\n');

  // 1. Published Courses
  const publishedCourses = await prisma.course.findMany({
    where: { status: CollegeStatus.PUBLISHED },
    include: {
      branches: { where: { status: 'ACTIVE' }, orderBy: { order: 'asc' } },
      eligibilities: { where: { status: 'ACTIVE' } },
      _count: { select: { leads: true, applications: true } },
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  console.log(`1. Total PUBLISHED Courses in DB: ${publishedCourses.length}`);
  const coursesWithBranches = publishedCourses.filter((c) => c.branches.length > 0);
  const branchlessCourses = publishedCourses.filter((c) => c.branches.length === 0);

  console.log(`   - Courses with Active Branches: ${coursesWithBranches.length}`);
  for (const c of coursesWithBranches) {
    console.log(`     • ${c.name} (${c.branches.length} branches: ${c.branches.map((b) => b.code || b.name).join(', ')})`);
  }

  console.log(`   - Branchless Programs: ${branchlessCourses.length}`);
  for (const c of branchlessCourses) {
    console.log(`     • ${c.name}`);
  }

  // 2. Archived Courses
  const archivedCount = await prisma.course.count({
    where: { status: CollegeStatus.ARCHIVED },
  });
  console.log(`\n2. Total ARCHIVED Legacy Courses: ${archivedCount}`);

  // 3. Branches Integrity
  const totalBranches = await prisma.courseBranch.count();
  const activeBranches = await prisma.courseBranch.count({ where: { status: 'ACTIVE' } });
  console.log(`\n3. Total Branches in DB: ${totalBranches} (Active: ${activeBranches})`);

  // 4. Orphan Branches Check
  const allBranches = await prisma.courseBranch.findMany({
    select: { id: true, name: true, courseId: true },
  });
  const allCourseIds = new Set((await prisma.course.findMany({ select: { id: true } })).map((c) => c.id));
  const orphanBranches = allBranches.filter((b) => !allCourseIds.has(b.courseId));
  console.log(`   - Orphan Branches: ${orphanBranches.length}`);

  // 5. Leads Relational Integrity
  const allLeads = await prisma.lead.findMany({
    include: {
      courseRel: { select: { id: true, name: true, status: true } },
      branchRel: { select: { id: true, name: true, code: true, status: true } },
    },
  });
  console.log(`\n4. Leads Integrity (${allLeads.length} total leads):`);
  let brokenLeadRelations = 0;
  for (const l of allLeads) {
    if (l.courseId && !l.courseRel) {
      console.error(`   ❌ Broken course relation on Lead ${l.id} (${l.fullName})`);
      brokenLeadRelations++;
    }
    if (l.branchId && !l.branchRel) {
      console.error(`   ❌ Broken branch relation on Lead ${l.id} (${l.fullName})`);
      brokenLeadRelations++;
    }
    if (l.courseId) {
      console.log(`   ✔ Lead "${l.fullName}": Course="${l.courseRel?.name}" (${l.courseRel?.status}), Branch="${l.branchRel?.name || 'NONE'}" (${l.branchRel?.status || 'N/A'})`);
    }
  }
  console.log(`   - Total Broken Lead Relations: ${brokenLeadRelations}`);

  // 6. Applications Relational Integrity
  const allApps = await prisma.application.findMany({
    include: {
      course: { select: { id: true, name: true, status: true } },
      branch: { select: { id: true, name: true, code: true, status: true } },
    },
  });
  console.log(`\n5. Applications Integrity (${allApps.length} total apps):`);
  let brokenAppRelations = 0;
  for (const a of allApps) {
    if (a.courseId && !a.course) {
      console.error(`   ❌ Broken course relation on App ${a.id} (${a.applicationId})`);
      brokenAppRelations++;
    }
    if (a.branchId && !a.branch) {
      console.error(`   ❌ Broken branch relation on App ${a.id} (${a.applicationId})`);
      brokenAppRelations++;
    }
    console.log(`   ✔ App "${a.applicationId}": Course="${a.course?.name}" (${a.course?.status}), Branch="${a.branch?.name || a.branchName || 'NONE'}"`);
  }
  console.log(`   - Total Broken App Relations: ${brokenAppRelations}`);

  console.log('\n====================================================');
  if (brokenLeadRelations === 0 && brokenAppRelations === 0 && orphanBranches.length === 0) {
    console.log('🎉 ALL DATABASE INTEGRITY CHECKS PASSED WITH 100% SUCCESS!');
  } else {
    console.error('❌ INTEGRITY CHECK FAILURES FOUND');
  }
  console.log('====================================================');
}

verifyMigratedDb()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
