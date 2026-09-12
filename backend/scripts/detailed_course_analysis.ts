import { PrismaClient } from '@prisma/client';
import { PROGRAM_FAMILIES_SEED } from './seed-courses';

const prisma = new PrismaClient();

async function classifyAllCourses() {
  const allCourses = await prisma.course.findMany({
    include: {
      branches: true,
      eligibilities: true,
      _count: { select: { leads: true, applications: true } },
      leads: { select: { id: true, fullName: true, mobile: true } },
      applications: { select: { id: true, applicationId: true } },
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  const seedMap = new Map(PROGRAM_FAMILIES_SEED.map((p) => [p.slug, p]));

  console.log(`Total Courses in DB: ${allCourses.length}\n`);

  for (const c of allCourses) {
    const isSeed = seedMap.has(c.slug);
    console.log(`Course ID: ${c.id}`);
    console.log(`  Name: "${c.name}" | Slug: "${c.slug}" | Category: ${c.category} | Level: ${c.level} | Status: ${c.status}`);
    console.log(`  Is in Program Families Seed: ${isSeed}`);
    console.log(`  Branches in DB: ${c.branches.length} | Eligibilities in DB: ${c.eligibilities.length}`);
    console.log(`  Leads Count: ${c._count.leads} | Apps Count: ${c._count.applications}`);
    if (c.leads.length > 0) {
      console.log(`  Linked Leads: ${c.leads.map((l) => `${l.fullName} (${l.id})`).join(', ')}`);
    }
    if (c.applications.length > 0) {
      console.log(`  Linked Apps: ${c.applications.map((a) => `${a.applicationId} (${a.id})`).join(', ')}`);
    }
    console.log('--------------------------------------------------------------------------------');
  }
}

classifyAllCourses()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
