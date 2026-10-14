import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Reconciling Admin accounts...');
  
  const adminCom = await prisma.user.findFirst({
    where: { email: 'admin@swayamadmission.com' },
  });
  if (adminCom) {
    if (!adminCom.employeeId) {
      await prisma.user.update({
        where: { id: adminCom.id },
        data: { employeeId: 'SWY-EMP-2026-0001' },
      });
      console.log('Assigned SWY-EMP-2026-0001 to admin@swayamadmission.com');
    } else {
      console.log(`admin@swayamadmission.com already has employeeId: ${adminCom.employeeId}`);
    }
  } else {
    console.log('admin@swayamadmission.com not found');
  }

  const adminIn = await prisma.user.findFirst({
    where: { email: 'admin@swayamadmission.in' },
  });
  if (adminIn) {
    if (!adminIn.employeeId) {
      await prisma.user.update({
        where: { id: adminIn.id },
        data: { employeeId: 'SWY-EMP-2026-0002' },
      });
      console.log('Assigned SWY-EMP-2026-0002 to admin@swayamadmission.in');
    } else {
      console.log(`admin@swayamadmission.in already has employeeId: ${adminIn.employeeId}`);
    }
  } else {
    console.log('admin@swayamadmission.in not found');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
