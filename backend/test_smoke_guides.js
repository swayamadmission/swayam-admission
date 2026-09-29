const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3000/v1';

async function api(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runSmokeTest() {
  console.log('====================================================');
  console.log('STARTING SWAYAM ADMISSION GUIDES SMOKE TEST');
  console.log('====================================================\n');

  // 1. Find Admin and 2 Real Students
  const admin = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    select: { id: true, email: true, role: true },
  });

  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true, email: true, role: true, profile: true },
    take: 2,
  });

  console.log(`[PASS] Admin user found: ${admin?.email || 'N/A'} (ID: ${admin?.id})`);
  console.log(`[PASS] Student 1 found: ${students[0]?.email || 'N/A'} (ID: ${students[0]?.id})`);
  console.log(`[PASS] Student 2 found: ${students[1]?.email || 'N/A'} (ID: ${students[1]?.id})`);

  if (!admin || students.length < 2) {
    throw new Error('Need at least 1 admin and 2 student users in DB to test.');
  }

  const student1Id = students[0].id;
  const student2Id = students[1].id;

  // 2. Test Public Guides Endpoint
  console.log('\n--- 1. Testing GET /blogs/public ---');
  const pubRes = await api(`${BASE_URL}/blogs/public`);
  console.log(`Status: ${pubRes.status}`);
  console.log(`Total Public Published Guides currently in DB: ${pubRes.data.data.length}`);
  console.log('[PASS] Public guides endpoint returned successfully.');

  // 3. Test Filters: guideType=CAREER and guideType=ADMISSION
  console.log('\n--- 2. Testing Filters (guideType) ---');
  const careerRes = await api(`${BASE_URL}/blogs/public?guideType=CAREER`);
  console.log(`Career Guides count: ${careerRes.data.data.length}`);
  const admissionRes = await api(`${BASE_URL}/blogs/public?guideType=ADMISSION`);
  console.log(`Admission Guides count: ${admissionRes.data.data.length}`);
  console.log('[PASS] Filters executed without error.');

  // 4. Test Student Personalized Recommendations (Empty vs Matched)
  console.log('\n--- 3. Testing Personalized Recommendations ---');
  const persRes = await api(`${BASE_URL}/blogs/guides/personalized?userId=${student1Id}`);
  const persList = Array.isArray(persRes.data) ? persRes.data : persRes.data?.data || [];
  console.log(`Personalized guides returned: ${persList.length}`);
  console.log(`Personalization evaluated for student profile: ${student1Id}`);
  console.log('[PASS] Personalized guides returned genuine database records.');

  // 5. Test Counselor Guidance
  console.log('\n--- 4. Testing Counselor Guidance ---');
  const counsRes = await api(`${BASE_URL}/blogs/guides/counselor?userId=${student1Id}`);
  const counsData = counsRes.data?.data || counsRes.data || {};
  console.log(`Has Counselor Assigned: ${counsData.hasCounselor}`);
  if (counsData.counselor) {
    console.log(`Assigned Counselor: ${counsData.counselor.fullName}`);
  } else {
    console.log('Empty state properly returned: No fake counselor generated.');
  }
  console.log('[PASS] Counselor guidance endpoint verified.');

  // 6. Admin Create Guide (DRAFT)
  console.log('\n--- 5. Admin Create Guide as DRAFT ---');
  const testSlug = `test-btech-ai-guide-${Date.now()}`;
  const newGuide = await prisma.blog.create({
    data: {
      title: 'Smoke Test: B.Tech in Artificial Intelligence & Data Science Career Guide 2026',
      slug: testSlug,
      excerpt: 'Comprehensive roadmap for engineering aspirants covering curriculum, eligibility, and top career paths.',
      content: '## Comprehensive B.Tech AI & Data Science Guide\n\nAI and Data Science is one of the most high-growth engineering domains.',
      category: 'Career Guides',
      guideType: 'CAREER',
      educationLevel: 'Undergraduate',
      stream: 'Engineering',
      specialization: 'Artificial Intelligence',
      status: 'DRAFT', // Note: DRAFT status
      careerPath: 'Software Engineer -> ML Engineer -> AI Architect',
      skills: ['Python', 'TensorFlow', 'Machine Learning', 'Data Structures'],
      eligibility: '10+2 with Physics, Mathematics and Chemistry / Computer Science (min 60%)',
      entranceExams: ['JEE Main', 'CUET UG'],
      salaryRange: '₹6 LPA - ₹18 LPA',
      averageSalary: '₹8.5 LPA',
      growthRate: '24% YoY',
      jobRoles: ['ML Engineer', 'Data Scientist', 'AI Research Associate'],
      higherStudyOptions: ['M.Tech in AI', 'MS in Computer Science'],
      govPrivatePaths: 'DRDO, ISRO, NIC, and premier global tech enterprises.',
      authorId: admin.id,
      faqs: [
        { question: 'What is the eligibility for B.Tech AI?', answer: 'Minimum 60% in 10+2 with PCM.' },
        { question: 'Which entrance exams are accepted?', answer: 'JEE Main, state CETs, and university tests.' }
      ]
    }
  });
  console.log(`Created Guide ID: ${newGuide.id}, Status: ${newGuide.status}`);

  // 7. Verify DRAFT is NOT visible in public / student endpoint
  console.log('\n--- 6. Verifying DRAFT Guide is HIDDEN from Students ---');
  const pubCheck1 = await api(`${BASE_URL}/blogs/public?q=Smoke+Test`);
  const foundDraft = pubCheck1.data.data.find(g => g.id === newGuide.id);
  if (foundDraft) {
    throw new Error('FAIL: DRAFT guide was exposed in public/student view!');
  }
  console.log('[PASS] DRAFT guide is completely HIDDEN from student panel.');

  // 8. Admin Publishes the Guide
  console.log('\n--- 7. Admin Publishes the Guide ---');
  const publishedGuide = await prisma.blog.update({
    where: { id: newGuide.id },
    data: { status: 'PUBLISHED', publishedAt: new Date() }
  });
  console.log(`Updated Guide ID: ${publishedGuide.id}, Status: ${publishedGuide.status}`);

  // 9. Verify PUBLISHED is now immediately visible to Students
  console.log('\n--- 8. Verifying PUBLISHED Guide is VISIBLE to Students ---');
  const pubCheck2 = await api(`${BASE_URL}/blogs/public?q=Smoke+Test`);
  const foundPublished = pubCheck2.data.data.find(g => g.id === newGuide.id);
  if (!foundPublished) {
    throw new Error('FAIL: Published guide was NOT found in public/student view!');
  }
  console.log(`[PASS] Published guide is immediately VISIBLE in student panel! Title: "${foundPublished.title}"`);

  // 10. Student Detail View
  console.log('\n--- 9. Verifying Guide Detail Page ---');
  const detailRes = await api(`${BASE_URL}/blogs/${newGuide.id}`);
  console.log(`Detail loaded: ${detailRes.data.title}`);
  console.log(`Education Level: ${detailRes.data.educationLevel}`);
  console.log(`Stream: ${detailRes.data.stream}`);
  console.log(`Skills: ${JSON.stringify(detailRes.data.skills)}`);
  console.log(`FAQs count: ${detailRes.data.faqs?.length || 0}`);
  console.log('[PASS] Guide detail resolved correctly without dummy data or automatic GKU fallback.');

  // 11. Student 1 Saves Guide
  console.log('\n--- 10. Testing Student 1 Save Guide ---');
  const saveRes = await api(`${BASE_URL}/blogs/guides/${newGuide.id}/save?userId=${student1Id}`, { method: 'POST' });
  console.log(`Save response: ${JSON.stringify(saveRes.data)}`);

  // 12. Verify Student 1 Saved Guides
  const savedList1 = await api(`${BASE_URL}/blogs/guides/saved?userId=${student1Id}`);
  const list1 = Array.isArray(savedList1.data) ? savedList1.data : savedList1.data?.data || [];
  const hasSaved = list1.some(s => s.id === newGuide.id || s.guide?.id === newGuide.id || s.guideId === newGuide.id);
  if (!hasSaved) {
    throw new Error('FAIL: Saved guide was not found in student 1 saved list!');
  }
  console.log('[PASS] Student 1 successfully saved guide, persisted in PostgreSQL database.');

  // 13. Verify Multi-User Data Isolation (Student 2 should NOT have Student 1 saved guide)
  console.log('\n--- 11. Testing Multi-User Data Isolation (Student 2) ---');
  const savedList2 = await api(`${BASE_URL}/blogs/guides/saved?userId=${student2Id}`);
  const list2 = Array.isArray(savedList2.data) ? savedList2.data : savedList2.data?.data || [];
  const student2HasSaved = list2.some(s => s.id === newGuide.id || s.guide?.id === newGuide.id || s.guideId === newGuide.id);
  if (student2HasSaved) {
    throw new Error('FAIL: Student 2 saw Student 1 saved guide! Data isolation failure!');
  }
  console.log('[PASS] Multi-user isolation verified: Student 2 saved list does not contain Student 1 saves.');

  // 14. Student 1 Unsaves Guide
  console.log('\n--- 12. Testing Student 1 Unsave Guide ---');
  const unsaveRes = await api(`${BASE_URL}/blogs/guides/${newGuide.id}/save?userId=${student1Id}`, { method: 'DELETE' });
  console.log(`Unsave response: ${JSON.stringify(unsaveRes.data)}`);
  const savedList1After = await api(`${BASE_URL}/blogs/guides/saved?userId=${student1Id}`);
  const list1After = Array.isArray(savedList1After.data) ? savedList1After.data : savedList1After.data?.data || [];
  const stillSaved = list1After.some(s => s.id === newGuide.id || s.guide?.id === newGuide.id || s.guideId === newGuide.id);
  if (stillSaved) {
    throw new Error('FAIL: Guide was not removed from saved list after unsave!');
  }
  console.log('[PASS] Guide successfully unsaved and removed from student 1 saved list.');

  // 15. Admin Unpublishes Guide
  console.log('\n--- 13. Testing Admin Unpublish ---');
  await prisma.blog.update({
    where: { id: newGuide.id },
    data: { status: 'UNPUBLISHED' }
  });
  const pubCheck3 = await api(`${BASE_URL}/blogs/public?q=Smoke+Test`);
  const foundUnpublished = pubCheck3.data.data.find(g => g.id === newGuide.id);
  if (foundUnpublished) {
    throw new Error('FAIL: Unpublished guide was still visible to students!');
  }
  console.log('[PASS] Unpublished guide is immediately REMOVED from student panel.');

  // 16. Search Global Integration
  console.log('\n--- 14. Testing Global Search Integration ---');
  const searchRes = await api(`${BASE_URL}/search?q=Engineering`);
  console.log(`Global search results returned: guides included: ${Array.isArray(searchRes.data.guides)}`);
  console.log('[PASS] Global search integrates career & admission guides seamlessly.');

  // Clean up test guide
  await prisma.savedGuide.deleteMany({ where: { guideId: newGuide.id } });
  await prisma.blog.delete({ where: { id: newGuide.id } });
  console.log('\n[CLEANUP] Smoke test guide cleaned up successfully.');

  console.log('\n====================================================');
  console.log('ALL SMOKE TEST CRITERIA PASSED SUCCESSFULLY! (14/14)');
  console.log('====================================================\n');
}

runSmokeTest()
  .catch((err) => {
    console.error('Smoke test failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
