import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const res = await prisma.$queryRaw`SELECT event_object_table, trigger_name FROM information_schema.triggers;`;
  console.log('Triggers:', res);
  await prisma.$disconnect();
}
run();
