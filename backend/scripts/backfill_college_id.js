const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfill() {
  const apps = await prisma.application.findMany({
    where: { collegeId: null },
    include: { course: true }
  });

  console.log(`Found ${apps.length} applications with collegeId = null`);
  for (const app of apps) {
    if (app.course?.collegeId) {
      await prisma.application.update({
        where: { id: app.id },
        data: { collegeId: app.course.collegeId }
      });
      console.log(`Updated application ${app.id} (${app.applicationNumber}) with collegeId: ${app.course.collegeId}`);
    } else {
      console.log(`Application ${app.id} course has no collegeId`);
    }
  }
}

backfill()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
