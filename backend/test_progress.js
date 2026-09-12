const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const app = await prisma.application.findUnique({
    where: { id: 'cmtrnodmx016nq080etz0kf27' },
    include: {
      college: true,
      course: { include: { branches: true } },
      branch: true,
      user: { include: { profile: true, studentPreference: true } },
      documents: true,
    },
  });

  let course = app.course;
  const isCollegeActive = !!(app.college && app.college.status !== 'ARCHIVED');
  const isCourseActive = !!course;
  const isBranchActive =
    !app.branchId || !app.branch || (app.branch.status !== 'DISABLED' && app.branch.status !== 'ARCHIVED');
  const isOfferingActive = !!(isCollegeActive && isCourseActive && isBranchActive);

  console.log({
    appId: app.id,
    collegeId: app.collegeId,
    college: app.college,
    courseId: app.courseId,
    courseName: course?.name,
    courseStatus: course?.status,
    courseCollegeId: course?.collegeId,
    isCollegeActive,
    isCourseActive,
    isBranchActive,
    isOfferingActive,
  });
}

run().finally(() => prisma.$disconnect());
