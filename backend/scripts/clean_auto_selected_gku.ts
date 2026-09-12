import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAndClean() {
  const allApps = await prisma.application.findMany({
    select: {
      id: true,
      applicationId: true,
      collegeId: true,
      college: { select: { name: true } },
      formData: true,
    },
  });

  console.log(`Total applications in DB: ${allApps.length}`);
  let modifiedCount = 0;

  for (const app of allApps) {
    const fd = (app.formData as any) || {};
    const pref = fd.preferences?.preferredCollege;
    const prefCity = fd.preferences?.preferredCity;
    const explicitCollegeInForm = fd.preferences?.preferredCollegeText || pref;

    // If student did NOT explicitly specify a college preference, but collegeId is set to GKU (cms4ja4b40000q0a851t62n0o)
    if (!explicitCollegeInForm && app.collegeId === 'cms4ja4b40000q0a851t62n0o') {
      await prisma.application.update({
        where: { id: app.id },
        data: { collegeId: null },
      });
      modifiedCount++;
      console.log(`Reset app ${app.applicationId} collegeId from GKU to null`);
    } else if (explicitCollegeInForm) {
      console.log(`Preserving explicit college for ${app.applicationId}: ${explicitCollegeInForm}`);
    }
  }

  console.log(`Done. Cleaned ${modifiedCount} applications where college was not explicitly chosen.`);
}

checkAndClean()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
