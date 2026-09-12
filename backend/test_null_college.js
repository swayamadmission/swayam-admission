const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const appsWithNullCollege = await prisma.application.findMany({
    where: { collegeId: null },
    include: { course: true }
  });
  console.log(`Found ${appsWithNullCollege.length} applications with null collegeId`);
  for (const a of appsWithNullCollege) {
    console.log(`App ${a.id}: courseId=${a.courseId}, courseName="${a.course?.name}", courseCollegeId=${a.course?.collegeId}`);
  }
}

run().finally(() => prisma.$disconnect());
