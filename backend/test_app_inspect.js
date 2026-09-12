const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const app = await prisma.application.findUnique({
    where: { id: 'cmtrnodmx016nq080etz0kf27' },
    include: { college: true, course: true }
  });
  console.log('App cmtrnodmx016nq080etz0kf27:', {
    id: app.id,
    collegeId: app.collegeId,
    courseId: app.courseId,
    courseCollegeId: app.course?.collegeId,
    courseStatus: app.course?.status,
    counselorId: app.counselorId
  });
  if (app.course?.collegeId) {
    const courseCol = await prisma.college.findUnique({ where: { id: app.course.collegeId } });
    console.log('Course College:', courseCol);
  }
}
run().finally(() => prisma.$disconnect());
