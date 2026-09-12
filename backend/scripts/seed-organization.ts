import { PrismaClient } from '@prisma/client';
import { COMPLETE_INDIAN_GEOGRAPHY } from '../src/organization/india-geography.data';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Authoritative Indian Geographic States & Districts and Standard Enterprise Departments...');

  let statesCount = 0;
  let districtsCount = 0;

  for (const st of COMPLETE_INDIAN_GEOGRAPHY) {
    const state = await prisma.state.upsert({
      where: { code: st.code },
      update: { name: st.name, type: st.type },
      create: {
        name: st.name,
        code: st.code,
        type: st.type,
        status: 'ACTIVE',
      },
    });
    statesCount++;

    for (const distName of st.districts) {
      await prisma.district.upsert({
        where: { stateId_name: { stateId: state.id, name: distName } },
        update: {},
        create: {
          name: distName,
          stateId: state.id,
          status: 'ACTIVE',
        },
      });
      districtsCount++;
    }
  }
  console.log(`✅ Seeded ${statesCount} States/UTs and ${districtsCount} Districts`);

  // Standard Corporate Departments
  const DEPARTMENTS = [
    { name: 'Counseling & Admissions', slug: 'counseling-admissions', code: 'COUNSEL', description: 'Career guidance, course advisory, and application intake' },
    { name: 'Finance & Accounts', slug: 'finance-accounts', code: 'FINANCE', description: 'Payment processing, receipts, refunds, and financial governance' },
    { name: 'Academic Partnerships', slug: 'academic-partnerships', code: 'ACADEMIC', description: 'College liaison, quotas, course listings, and scholarship allocation' },
    { name: 'Marketing & Growth', slug: 'marketing-growth', code: 'MARKETING', description: 'Campaigns, lead acquisition, brand visibility, and outreach' },
    { name: 'Operations & Verification', slug: 'operations-verification', code: 'OPERATIONS', description: 'Document verification, KYC, and application fulfillment' },
    { name: 'Technology & Product', slug: 'technology-product', code: 'TECH', description: 'System administration, portal engineering, IAM, and infrastructure' },
  ];

  for (const dep of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { slug: dep.slug },
      update: { description: dep.description },
      create: {
        name: dep.name,
        slug: dep.slug,
        code: dep.code,
        description: dep.description,
        status: 'ACTIVE',
      },
    });
  }
  console.log(`✅ Seeded ${DEPARTMENTS.length} Corporate Departments`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
