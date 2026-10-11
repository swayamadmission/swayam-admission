const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  const system = await prisma.systemSetting.findFirst();
  console.log("Current SystemSetting:", JSON.stringify(system, null, 2));
  const branding = await prisma.brandingSetting.findFirst();
  console.log("Current BrandingSetting:", JSON.stringify(branding, null, 2));
}

inspect().catch(console.error).finally(() => prisma.$disconnect());
