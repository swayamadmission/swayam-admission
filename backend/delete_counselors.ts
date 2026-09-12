import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.deleteMany({
    where: {
      fullName: {
        contains: 'Test Counselor',
        mode: 'insensitive'
      }
    }
  });
  console.log(`Deleted ${result.count} test counselors.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
