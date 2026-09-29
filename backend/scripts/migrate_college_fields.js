const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Applying database schema additions for complete college sections...');
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "College" 
      ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION DEFAULT 4.2,
      ADD COLUMN IF NOT EXISTS "contactPerson" TEXT,
      ADD COLUMN IF NOT EXISTS "boysHostelAvailable" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "girlsHostelAvailable" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "hostelFee" TEXT,
      ADD COLUMN IF NOT EXISTS "hostelFacilities" TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS "messInfo" TEXT,
      ADD COLUMN IF NOT EXISTS "otherFacilities" TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS "medianPackage" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "placementCompanies" TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS "placementInfo" TEXT,
      ADD COLUMN IF NOT EXISTS "placementYear" TEXT,
      ADD COLUMN IF NOT EXISTS "seoKeywords" TEXT[] DEFAULT '{}';
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "CollegeGallery"
      ADD COLUMN IF NOT EXISTS "isCover" BOOLEAN DEFAULT false;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Course"
      ADD COLUMN IF NOT EXISTS "applicationFee" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "scholarshipInfo" TEXT,
      ADD COLUMN IF NOT EXISTS "specialization" TEXT;
  `);

  console.log('✅ Database migration applied successfully!');
}

run()
  .catch((err) => {
    console.error('Migration error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
