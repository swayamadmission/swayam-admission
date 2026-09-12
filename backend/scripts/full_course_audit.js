const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fullCourseBranchAudit() {
  const allCourses = await prisma.course.findMany({
    include: {
      branches: {
        orderBy: { order: 'asc' }
      },
      eligibilities: true,
      college: { select: { id: true, name: true, slug: true } }
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }]
  });

  console.log(`=== FULL AUDIT OF ALL ${allCourses.length} COURSES ===\n`);

  for (const c of allCourses) {
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`Course: "${c.name}"`);
    console.log(`  ID: ${c.id}`);
    console.log(`  Slug: ${c.slug}`);
    console.log(`  Category: ${c.category} | Level: ${c.level} | Status: ${c.status}`);
    console.log(`  AllowOtherBranch: ${c.allowOtherBranch}`);
    console.log(`  EligibleLevels: [${c.eligibleLevels.join(', ')}] | EligibleStreams: [${c.eligibleStreams.join(', ')}]`);
    console.log(`  Eligibilities in DB: ${c.eligibilities.length}`);
    for (const e of c.eligibilities) {
      console.log(`    -> level: ${e.educationLevel}, stream: ${e.stream || 'ANY'}, entry: ${e.entryType}, lateral: ${e.lateralEntry}`);
    }
    console.log(`  Branches count: ${c.branches.length}`);
    for (const b of c.branches) {
      console.log(`    -> [${b.status}] ${b.name} (${b.code || 'NO_CODE'}) | slug: ${b.slug} | type: ${b.type} | id: ${b.id}`);
    }
  }
}

fullCourseBranchAudit()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
