import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const courses = await prisma.course.findMany({
    select: { id: true, name: true, category: true, level: true, slug: true },
    orderBy: { name: 'asc' },
  });
  console.log(`Total Courses in DB: ${courses.length}`);
  console.log('Course list:');
  for (const c of courses) {
    console.log(` - [${c.id}] ${c.name} (${c.level})`);
  }

  const leads = await prisma.lead.findMany({
    select: { id: true, fullName: true, preferredCourse: true, courseId: true },
  });
  console.log(`\nTotal Leads in DB: ${leads.length}`);
  for (const l of leads) {
    console.log(` - Lead ${l.id}: "${l.fullName}" | courseId: ${l.courseId} | preferredCourse: "${l.preferredCourse}"`);
  }

  const apps = await prisma.application.findMany({
    select: { id: true, courseId: true, remarks: true },
  });
  console.log(`\nTotal Applications in DB: ${apps.length}`);
  for (const a of apps) {
    console.log(` - App ${a.id}: courseId: "${a.courseId}"`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
