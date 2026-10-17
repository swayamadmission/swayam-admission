import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const today = new Date();
  const vacancies = await prisma.jobVacancy.findMany({
    where: {
      status: 'PUBLISHED',
      AND: [
        {
          OR: [
            { applicationStartDate: null },
            { applicationStartDate: { lte: today } },
          ],
        },
        {
          OR: [
            { applicationEndDate: null },
            { applicationEndDate: { gte: today } },
          ],
        },
        {
          OR: [
            { applicationDeadline: null },
            { applicationDeadline: { gte: today } },
          ],
        },
      ],
    },
  });

  console.log('Published vacancies returned:', vacancies.length);
  for (const v of vacancies) {
    console.log(`- ${v.vacancyCode} | ${v.title} | ${v.department} | ${v.status}`);
  }

  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
