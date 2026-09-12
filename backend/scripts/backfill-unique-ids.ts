import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function backfill() {
  console.log('--- STARTING SAFE UNIQUE ID BACKFILL ---');

  // 1. Backfill Students
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true, fullName: true, studentId: true, registrationNumber: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${students.length} student records.`);

  let studentIdx = 1;
  for (const student of students) {
    const year = student.createdAt ? new Date(student.createdAt).getFullYear() : 2026;
    let studentId = student.studentId;
    let registrationNumber = student.registrationNumber;

    let needsUpdate = false;
    if (!studentId) {
      const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
      studentId = `SWY-STU-${hex}`;
      needsUpdate = true;
    }

    if (!registrationNumber) {
      registrationNumber = `SA-REG-${year}-${String(studentIdx).padStart(6, '0')}`;
      needsUpdate = true;
      studentIdx++;
    }

    if (needsUpdate) {
      await prisma.user.update({
        where: { id: student.id },
        data: {
          studentId,
          registrationNumber,
        },
      });
      console.log(`Updated Student: ${student.fullName} -> ID: ${studentId}, Reg: ${registrationNumber}`);
    }
  }

  // 2. Backfill Applications
  const applications = await prisma.application.findMany({
    select: { id: true, applicationId: true, applicationNumber: true, applicationDate: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${applications.length} application records.`);

  let appIdx = 1;
  for (const app of applications) {
    const year = app.createdAt ? new Date(app.createdAt).getFullYear() : 2026;
    let appId = app.applicationId;
    let needsUpdate = false;

    // If applicationId is missing or looks like a cuid, format to standard canonical SWY-APP-YYYY-XXXXXX
    if (!appId || !appId.startsWith('SWY-APP-')) {
      appId = `SWY-APP-${year}-${String(appIdx).padStart(6, '0')}`;
      needsUpdate = true;
      appIdx++;
    }

    if (needsUpdate) {
      await prisma.application.update({
        where: { id: app.id },
        data: {
          applicationId: appId,
          applicationNumber: app.applicationNumber || appId,
        },
      });
      console.log(`Updated Application ${app.id} -> Application ID: ${appId}`);
    }
  }

  console.log('--- SAFE UNIQUE ID BACKFILL COMPLETED SUCCESSFULLY ---');
}

backfill()
  .catch((e) => {
    console.error('Backfill error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
