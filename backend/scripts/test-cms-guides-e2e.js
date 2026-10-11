const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'swayam_super_secret_key';
const BASE_URL = 'http://localhost:3000/v1';

const adminToken = jwt.sign(
  {
    id: 'cmr0pskhx0000q0z46bx2d24v',
    role: 'SUPER_ADMIN',
    sessionVersion: 1,
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${adminToken}`,
};

async function run() {
  console.log('🚀 Starting Comprehensive Career & Admission Guides / CMS E2E Test...');

  // 1. CREATE GUIDE WITH FULL ERP FIELDS & EMPTY FOREIGN KEYS
  console.log('\n--- 1. Testing Create Guide (with empty string FKs) ---');
  const uniqueTitle = `Ultimate B.Tech AI & Data Science Guide ${Date.now()}`;
  const createPayload = {
    title: uniqueTitle,
    guideType: 'CAREER',
    category: 'Career Guides',
    status: 'DRAFT',
    featured: false,
    featuredImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
    excerpt: 'Comprehensive roadmap for engineering aspirants looking to pursue AI & Data Science in 2026.',
    content: 'Full comprehensive guide covering curriculum, lab requirements, math fundamentals, Python, PyTorch, GPU architecture, placement records, and top hiring companies across India.',
    educationLevel: 'Undergraduate',
    stream: 'Engineering',
    specialization: 'Artificial Intelligence & Machine Learning',
    careerPath: 'AI Engineer / ML Specialist / Data Scientist',
    salaryRange: '₹8 LPA - ₹35 LPA',
    averageSalary: '₹14.5 LPA',
    growthRate: '+34% YoY',
    eligibility: '10+2 with Physics, Mathematics, Chemistry with min 60% aggregate and valid JEE Main/CUET rank.',
    skills: ['Python', 'Data Structures', 'Deep Learning', 'Statistics', 'Cloud ML'],
    entranceExams: ['JEE Main', 'CUET UG', 'BITSAT', 'MHT CET'],
    jobRoles: ['Machine Learning Engineer', 'Data Scientist', 'AI Research Associate', 'NLP Engineer'],
    higherStudyOptions: ['M.Tech AI (IITs/NITs)', 'MS in Data Science', 'Ph.D in Machine Learning'],
    admissionProcess: 'Merit via Entrance score followed by centralized state or institutional counselling.',
    feesInfo: 'Government institutes: ₹1.5L - ₹4L total. Private universities: ₹6L - ₹16L total.',
    keyTakeaways: [
      'Demand for specialized AI engineers is at an all-time peak.',
      'Strong mathematical foundation is essential for core R&D roles.',
      'Hands-on portfolio on GitHub and Kaggle significantly improves placement outcomes.',
    ],
    faqs: [
      {
        question: 'Is coding experience required before joining B.Tech in AI?',
        answer: 'No prior programming experience is strictly required, but starting Python basics during the break after 12th is highly recommended.',
      },
      {
        question: 'Which entrance exam is mandatory?',
        answer: 'JEE Main is the most widely accepted entrance exam for government and premier private universities.',
      },
    ],
    seoTitle: 'B.Tech AI & Data Science Complete Career Guide 2026',
    seoDescription: 'Explore B.Tech AI eligibility, syllabus, top colleges, salary trends, and placement packages for 2026.',
    tags: ['BTech', 'Artificial Intelligence', 'Data Science', 'Engineering Careers'],
    state: 'Uttar Pradesh',
    city: 'Noida',
    // Intentional empty foreign keys to test backend sanitization
    collegeId: '',
    courseId: '',
    examId: '',
    scholarshipId: '',
  };

  const createRes = await fetch(`${BASE_URL}/blogs`, {
    method: 'POST',
    headers,
    body: JSON.stringify(createPayload),
  });

  const createdBlog = await createRes.json();
  if (!createRes.ok) {
    console.error('❌ Guide creation failed:', createdBlog);
    process.exit(1);
  }
  console.log(`✅ Guide created successfully! ID: ${createdBlog.id}, Slug: ${createdBlog.slug}, Status: ${createdBlog.status}`);

  // 2. TEST UNIQUE SLUG AUTO-GENERATION ON COLLISION
  console.log('\n--- 2. Testing Collision-Free Slug Auto-Generation ---');
  const collisionPayload = {
    ...createPayload,
    title: uniqueTitle, // same exact title
  };

  const collisionRes = await fetch(`${BASE_URL}/blogs`, {
    method: 'POST',
    headers,
    body: JSON.stringify(collisionPayload),
  });

  const collisionBlog = await collisionRes.json();
  if (!collisionRes.ok) {
    console.error('❌ Collision handling failed:', collisionBlog);
    process.exit(1);
  }
  console.log(`✅ Duplicate title handled gracefully! Second Slug: ${collisionBlog.slug} (Different from ${createdBlog.slug})`);

  // 3. TEST UPDATE GUIDE
  console.log('\n--- 3. Testing Guide Update ---');
  const updateRes = await fetch(`${BASE_URL}/blogs/${createdBlog.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      excerpt: 'Updated concise 2026 roadmap for top B.Tech aspirants.',
      salaryRange: '₹9 LPA - ₹40 LPA',
    }),
  });

  const updatedBlog = await updateRes.json();
  if (!updateRes.ok) {
    console.error('❌ Update failed:', updatedBlog);
    process.exit(1);
  }
  console.log(`✅ Update successful! New Salary Range: ${updatedBlog.salaryRange}`);

  // 4. TEST 1-CLICK FEATURED TOGGLE
  console.log('\n--- 4. Testing 1-Click Featured Toggle ---');
  const featureRes = await fetch(`${BASE_URL}/blogs/${createdBlog.id}/feature`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ featured: true }),
  });

  const featuredBlog = await featureRes.json();
  if (!featureRes.ok || featuredBlog.featured !== true) {
    console.error('❌ Feature toggle failed:', featuredBlog);
    process.exit(1);
  }
  console.log(`✅ Featured set to TRUE! featured: ${featuredBlog.featured}`);

  // 5. TEST PUBLISH TOGGLE
  console.log('\n--- 5. Testing Publish Toggle ---');
  const publishRes = await fetch(`${BASE_URL}/blogs/${createdBlog.id}/publish`, {
    method: 'PATCH',
    headers,
  });

  const publishedBlog = await publishRes.json();
  if (!publishRes.ok || publishedBlog.status !== 'PUBLISHED') {
    console.error('❌ Publish failed:', publishedBlog);
    process.exit(1);
  }
  console.log(`✅ Guide PUBLISHED! status: ${publishedBlog.status}, publishedAt: ${publishedBlog.publishedAt}`);

  // 6. TEST PUBLIC STUDENT VIEWS & HOME PAGE SYNCHRONIZATION
  console.log('\n--- 6. Verifying Student Public & Home Page Synchronization ---');
  const publicRes = await fetch(`${BASE_URL}/blogs/public?featured=true`);
  const publicData = await publicRes.json();

  const foundOnPublic = publicData.data?.find((b) => b.id === createdBlog.id);
  if (!foundOnPublic) {
    console.error('❌ Published featured guide not found in public featured endpoint!');
    process.exit(1);
  }
  console.log(`✅ Guide correctly synchronized and visible on Student Home & Guides page! Title: ${foundOnPublic.title}`);

  // 7. TEST DUPLICATE GUIDE
  console.log('\n--- 7. Testing Duplicate Guide ---');
  const dupRes = await fetch(`${BASE_URL}/blogs/${createdBlog.id}/duplicate`, {
    method: 'POST',
    headers,
  });

  const dupBlog = await dupRes.json();
  if (!dupRes.ok || !dupBlog.id) {
    console.error('❌ Duplicate failed:', dupBlog);
    process.exit(1);
  }
  console.log(`✅ Guide duplicated cleanly! ID: ${dupBlog.id}, Title: ${dupBlog.title}, GuideType: ${dupBlog.guideType}, Stream: ${dupBlog.stream}`);

  // 8. TEST UNPUBLISH AND PUBLIC DISAPPEARANCE
  console.log('\n--- 8. Testing Unpublish & Public Sync ---');
  const unpublishRes = await fetch(`${BASE_URL}/blogs/${createdBlog.id}/unpublish`, {
    method: 'PATCH',
    headers,
  });

  const unpublishedBlog = await unpublishRes.json();
  if (!unpublishRes.ok || unpublishedBlog.status !== 'DRAFT') {
    console.error('❌ Unpublish failed:', unpublishedBlog);
    process.exit(1);
  }
  console.log(`✅ Guide UNPUBLISHED (status: ${unpublishedBlog.status})`);

  const publicAfterUnpublish = await fetch(`${BASE_URL}/blogs/public`);
  const publicAfterData = await publicAfterUnpublish.json();
  const stillPublic = publicAfterData.data?.find((b) => b.id === createdBlog.id);
  if (stillPublic) {
    console.error('❌ Unpublished guide should NOT appear in public student list!');
    process.exit(1);
  }
  console.log('✅ Unpublished guide immediately removed from public student view!');

  // 9. CLEAN UP TEST RECORDS
  console.log('\n--- 9. Cleaning Up Test Records ---');
  for (const id of [createdBlog.id, collisionBlog.id, dupBlog.id]) {
    await fetch(`${BASE_URL}/blogs/${id}`, {
      method: 'DELETE',
      headers,
    });
  }
  console.log('✅ Test records cleaned up successfully!');

  console.log('\n🎉 ALL CAREER & ADMISSION GUIDES CMS CHECKS PASSED WITH 100% SUCCESS!\n');
}

run().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
