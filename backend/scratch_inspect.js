const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const apps = await prisma.application.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { user: true, college: true, course: true }
  });
  console.log('Total applications found:', apps.length);
  for (const a of apps) {
    console.log({
      id: a.id,
      applicationId: a.applicationId,
      applicationNumber: a.applicationNumber,
      userId: a.userId,
      userEmail: a.user?.email,
      userName: a.user?.fullName,
      status: a.status,
      college: a.college?.name,
      course: a.course?.name,
      createdAt: a.createdAt,
    });
  }

  // Also check leads created recently
  const leads = await prisma.lead.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
  });
  console.log('\nRecent leads:', leads.length);
  for (const l of leads) {
    console.log({
      id: l.id,
      name: l.fullName,
      email: l.email,
      mobile: l.mobile,
      preferredCollege: l.preferredCollege,
      createdAt: l.createdAt,
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
