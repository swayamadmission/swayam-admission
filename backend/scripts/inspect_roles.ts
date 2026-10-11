import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const roles = await prisma.roleEntity.findMany({
      select: { id: true, name: true, slug: true, status: true, deletedAt: true, isProtected: true, level: true },
      take: 20,
    });
    console.log('Existing roles in DB count:', roles.length);
    console.log(JSON.stringify(roles, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
