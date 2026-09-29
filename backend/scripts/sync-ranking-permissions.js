const { PrismaClient } = require('@prisma/client');
const { SYSTEM_PERMISSIONS } = require('../dist/src/roles/seed-permissions');

const prisma = new PrismaClient();

async function main() {
  console.log(`📦 Syncing ${SYSTEM_PERMISSIONS.length} system permissions...`);
  let count = 0;
  for (const perm of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        module: perm.module,
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
        category: perm.category,
        group: perm.group,
      },
      create: {
        code: perm.code,
        module: perm.module,
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
        category: perm.category,
        group: perm.group,
      },
    });
    count++;
  }
  console.log(`✅ Successfully synced ${count} permissions including ranking permissions.`);
}

main()
  .catch((e) => {
    console.error('Error syncing permissions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
