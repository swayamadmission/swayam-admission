const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const states = await prisma.state.findMany({ select: { id: true, name: true, code: true, _count: { select: { districts: true } } } });
    console.log('Total States in DB:', states.length);
    console.log('States:', states.map(s => `${s.name} (${s.code}): ${s._count.districts} districts`));

    const totalDistricts = await prisma.district.count();
    console.log('Total Districts in DB:', totalDistricts);

    const colleges = await prisma.college.findMany({ select: { id: true, name: true, city: true, state: true, status: true, _count: { select: { courses: true } } } });
    console.log('Total Colleges in DB:', colleges.length);
    console.log('Colleges:', colleges);

    const courses = await prisma.course.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        level: true,
        status: true,
        eligibility: true,
        college: { select: { name: true } },
      }
    });
    console.log('Total Courses in DB:', courses.length);
    console.log('Courses:', courses);

    const leads = await prisma.lead.count();
    console.log('Total Leads in DB:', leads);

    const apps = await prisma.application.count();
    console.log('Total Applications in DB:', apps);
  } catch (err) {
    console.error('Error checking DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
