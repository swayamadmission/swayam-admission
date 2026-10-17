const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, phone: true, name: true, role: true }
  });
  console.log('Users in DB:');
  console.table(users);
  const otps = await prisma.otpVerification.findMany({
    take: 8,
    orderBy: { createdAt: 'desc' },
    select: { id: true, phone: true, email: true, type: true, expiresAt: true, verified: true, attempts: true }
  });
  console.log('Recent OTPs:');
  console.table(otps);
}
main().finally(async () => {
  await prisma.$disconnect();
});
