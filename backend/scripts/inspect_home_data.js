const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const cols = await prisma.$queryRawUnsafe("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'State'");
    console.log('State columns:', cols.filter(c => c.column_name === 'featured' || c.column_name === 'status' || c.column_name === 'name'));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
check();
