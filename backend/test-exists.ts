import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const user = await prisma.user.findFirst({ where: { email: '1234567@gmail.com' } });
  console.log('User with 1234567@gmail.com:', user);
  const user2 = await prisma.user.findFirst({ where: { mobile: '9876543210' } });
  console.log('User with 9876543210:', user2);
  await prisma.$disconnect();
}
run();
