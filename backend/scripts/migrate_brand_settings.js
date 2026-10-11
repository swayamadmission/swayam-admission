const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Adding columns to SystemSetting if not exists...');
  const statements = [
    `ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "brandPromise" text DEFAULT 'Your Trusted Education Partner'`,
    `ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "primaryAudience" text DEFAULT 'Students seeking admission guidance across India.'`,
    `ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "generalEmail" text DEFAULT 'swayamadmissions@gmail.com'`,
    `ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "admissionEmail" text DEFAULT 'getadmission@swayamadmission.com'`,
    `ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "contactNumber2" text DEFAULT '6399102731'`,
    `ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "instagramUrl" text DEFAULT 'https://www.instagram.com/swayamadmission'`,
    `ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "facebookUrl" text DEFAULT 'https://www.facebook.com/swayamadmission'`,
    `ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "youtubeUrl" text DEFAULT 'https://www.youtube.com/@swayamadmission'`,
    `ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "linkedinUrl" text DEFAULT 'https://www.linkedin.com/company/swayamadmission'`,
    `ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "xUrl" text DEFAULT 'https://x.com/swayamadmission'`,
    `ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "githubUrl" text DEFAULT 'https://github.com/swayamadmission'`,
    `ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "redditUrl" text DEFAULT 'https://www.reddit.com/user/swayamadmission/'`,
    `ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "telegramUrl" text DEFAULT 'https://t.me/swayamadmission'`,
    `ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "discordUrl" text DEFAULT ''`,
    `ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "socialHandle" text DEFAULT '@swayamadmission'`,
  ];

  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
  }

  console.log('Updating default SystemSetting with initial brand and contact values...');
  await prisma.$executeRawUnsafe(`
    UPDATE "SystemSetting" SET
      "platformName" = 'Swayam Admission',
      "tagline" = 'India Ka Mission Swayam Admission',
      "brandPromise" = 'Your Trusted Education Partner',
      "primaryAudience" = 'Students seeking admission guidance across India.',
      "websiteUrl" = 'https://www.swayamadmission.com/',
      "generalEmail" = 'swayamadmissions@gmail.com',
      "admissionEmail" = 'getadmission@swayamadmission.com',
      "supportEmail" = 'support@swayamadmision.com',
      "supportPhone" = '6284308664',
      "contactNumber2" = '6399102731',
      "whatsappPhone" = '6284308664',
      "instagramUrl" = 'https://www.instagram.com/swayamadmission',
      "facebookUrl" = 'https://www.facebook.com/swayamadmission',
      "youtubeUrl" = 'https://www.youtube.com/@swayamadmission',
      "linkedinUrl" = 'https://www.linkedin.com/company/swayamadmission',
      "xUrl" = 'https://x.com/swayamadmission',
      "githubUrl" = 'https://github.com/swayamadmission',
      "redditUrl" = 'https://www.reddit.com/user/swayamadmission/',
      "telegramUrl" = 'https://t.me/swayamadmission',
      "discordUrl" = '',
      "socialHandle" = '@swayamadmission',
      "updatedAt" = NOW()
    WHERE "id" = 'default_system_setting'
  `);

  console.log('Ensuring BrandingSetting colors match requested values...');
  await prisma.$executeRawUnsafe(`
    UPDATE "BrandingSetting" SET
      "primaryColor" = '#4A7B5B',
      "accentColor" = '#F0AE1A',
      "updatedAt" = NOW()
    WHERE "id" = 'default_branding_setting'
  `);

  console.log('Migration & seed completed successfully!');
}

run().catch(console.error).finally(() => prisma.$disconnect());
