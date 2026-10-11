const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Migrating & Seeding Department Contacts ---');

  const count = await prisma.departmentContact.count();
  console.log('Current DepartmentContact count:', count);

  if (count === 0) {
    const departments = [
      {
        name: 'Admissions & Counselling',
        badge: 'Primary Helpline',
        description: 'Dedicated counselor desk for NEET, JEE, CUET, Management, and state counseling. Get college recommendations, eligibility checks, and seat availability.',
        phone: '6284308664',
        whatsapp: '6284308664',
        email: 'getadmission@swayamadmission.com',
        officeHours: 'Mon – Sat: 9:30 AM – 6:30 PM',
        workingDays: 'Monday to Saturday',
        address: 'New Delhi, India',
        ctaText: 'Call Now',
        ctaAction: 'CALL',
        ctaUrl: 'tel:6284308664',
        sortOrder: 1,
        isActive: true,
      },
      {
        name: 'General Enquiries',
        badge: 'Email & Desk',
        description: 'Parent queries, official institutional verifications, portal feedback, and general information regarding educational offerings and scholarships.',
        phone: '6284308664',
        whatsapp: '6284308664',
        email: 'swayamadmissions@gmail.com',
        officeHours: '24/7 (Replies within 2 to 4 business hours)',
        workingDays: 'Monday to Saturday',
        address: 'New Delhi, India',
        ctaText: 'Email Us',
        ctaAction: 'EMAIL',
        ctaUrl: 'mailto:swayamadmissions@gmail.com',
        sortOrder: 2,
        isActive: true,
      },
      {
        name: 'Student Application Support',
        badge: 'Form & Status Desk',
        description: 'Direct assistance for ongoing applications, document verification, application fee confirmation, and status tracking.',
        phone: '6399102731',
        whatsapp: '6399102731',
        email: 'swayamadmissions@gmail.com',
        officeHours: 'Mon – Sat: 9:30 AM – 6:30 PM',
        workingDays: 'Monday to Saturday',
        address: 'New Delhi, India',
        ctaText: 'Call Support',
        ctaAction: 'CALL',
        ctaUrl: 'tel:6399102731',
        sortOrder: 3,
        isActive: true,
      },
      {
        name: 'College Partnerships & Institutional Relations',
        badge: 'Partnership Desk',
        description: 'University collaborations, college listing verifications, institutional onboarding, and official educational alliances across India.',
        phone: '6284308664',
        whatsapp: '6284308664',
        email: 'swayamadmissions@gmail.com',
        officeHours: 'Mon – Fri: 10:00 AM – 6:00 PM',
        workingDays: 'Monday to Friday',
        address: 'New Delhi, India',
        ctaText: 'Partner With Us',
        ctaAction: 'EMAIL',
        ctaUrl: 'mailto:swayamadmissions@gmail.com',
        sortOrder: 4,
        isActive: true,
      },
      {
        name: 'Technical & Portal Support',
        badge: 'Platform & IT',
        description: 'Assistance with login problems, OTP verification, document upload glitches, or password recovery on the Swayam Admission portal.',
        phone: '6399102731',
        whatsapp: '6399102731',
        email: 'swayamadmissions@gmail.com',
        officeHours: 'Mon – Sat: 10:00 AM – 7:00 PM',
        workingDays: 'Monday to Saturday',
        address: 'New Delhi, India',
        ctaText: 'Report Issue',
        ctaAction: 'EMAIL',
        ctaUrl: 'mailto:swayamadmissions@gmail.com',
        sortOrder: 5,
        isActive: true,
      },
      {
        name: 'Swayam Admission Central Office',
        badge: 'Headquarters',
        description: 'Central administrative headquarters overseeing counseling centers and partner networks nationwide.',
        phone: '6284308664',
        whatsapp: '6284308664',
        email: 'swayamadmissions@gmail.com',
        officeHours: 'Mon – Sat: 9:30 AM – 6:30 PM',
        workingDays: 'Monday to Saturday',
        address: 'New Delhi, India',
        ctaText: 'Get Directions',
        ctaAction: 'URL',
        ctaUrl: 'https://maps.google.com/?q=New+Delhi+India',
        sortOrder: 6,
        isActive: true,
      },
    ];

    for (const dept of departments) {
      await prisma.departmentContact.create({ data: dept });
    }
    console.log('Seeded 6 real department contacts.');
  }

  // Seed ContactPageSetting if not present
  const pageSetting = await prisma.contactPageSetting.findUnique({
    where: { id: 'default_contact_page_setting' },
  });

  if (!pageSetting) {
    await prisma.contactPageSetting.create({
      data: {
        id: 'default_contact_page_setting',
        pageHeading: 'Contact Swayam Admission',
        pageSubheading: 'India Ka Mission Swayam Admission — Your Trusted Education Partner. Get help with college admissions, courses, applications and counselling.',
        helpdeskBadge: 'Official Swayam Admission Helpdesk',
        officeHours: 'Monday – Saturday: 9:30 AM – 6:30 PM',
        workingDays: 'Monday to Saturday',
        holidayNotice: 'Closed on Sundays & National Holidays',
        expectedResponseTime: 'Within 2 to 4 business hours',
        address: 'New Delhi, India',
        googleMapsUrl: '',
        instagramUrl: 'https://www.instagram.com/swayamadmission',
        facebookUrl: 'https://www.facebook.com/swayamadmission',
        youtubeUrl: 'https://www.youtube.com/@swayamadmission',
        linkedinUrl: 'https://www.linkedin.com/company/swayamadmission',
        xUrl: 'https://x.com/swayamadmission',
        githubUrl: 'https://github.com/swayamadmission',
        redditUrl: 'https://www.reddit.com/user/swayamadmission/',
        telegramUrl: 'https://t.me/swayamadmission',
        discordUrl: '',
      },
    });
    console.log('Created default contact page settings.');
  }

  const allDepts = await prisma.departmentContact.findMany({ orderBy: { sortOrder: 'asc' } });
  console.log('All department contacts:', allDepts.map(d => ({ id: d.id, name: d.name, sortOrder: d.sortOrder, isActive: d.isActive })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
