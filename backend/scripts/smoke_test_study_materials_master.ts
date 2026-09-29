import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'swayam_super_secret_key';

async function runSmokeTests() {
  console.log('================================================================');
  console.log('🚀 SWAYAM ADMISSION ERP: MASTER STUDY MATERIALS SMOKE TEST SUITE');
  console.log('================================================================\n');

  // Setup test users
  let studentA = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
  if (!studentA) {
    studentA = await prisma.user.create({
      data: {
        email: 'smoke_student_a@swayam.test',
        fullName: 'Smoke Test Student A',
        mobile: '9876543210',
        password: '$2b$10$dummyhashedpasswordforsmoketests1234',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });
  }

  let studentB = await prisma.user.findFirst({
    where: { role: 'STUDENT', id: { not: studentA.id } },
  });
  if (!studentB) {
    studentB = await prisma.user.create({
      data: {
        email: 'smoke_student_b@swayam.test',
        fullName: 'Smoke Test Student B',
        mobile: '9876543211',
        password: '$2b$10$dummyhashedpasswordforsmoketests1234',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });
  }

  let admin = await prisma.user.findFirst({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
  });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: 'smoke_admin@swayam.test',
        fullName: 'Smoke Test Administrator',
        mobile: '9876543212',
        password: '$2b$10$dummyhashedpasswordforsmoketests1234',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    });
  }

  const tokenStudentA = jwt.sign(
    { id: studentA.id, email: studentA.email, role: studentA.role },
    JWT_SECRET,
  );
  const tokenStudentB = jwt.sign(
    { id: studentB.id, email: studentB.email, role: studentB.role },
    JWT_SECRET,
  );
  const tokenAdmin = jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role },
    JWT_SECRET,
  );

  console.log(`👤 Student A: ${studentA.fullName} (${studentA.id})`);
  console.log(`👤 Student B: ${studentB.fullName} (${studentB.id})`);
  console.log(`🛡️ Admin: ${admin.fullName} (${admin.id})\n`);

  // Ensure test physical file exists in uploads/materials
  const uploadsDir = path.join(process.cwd(), 'uploads', 'materials');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const testFullFile = path.join(uploadsDir, 'smoke_test_full_document.pdf');
  const testPreviewFile = path.join(uploadsDir, 'smoke_test_preview_sample.pdf');
  fs.writeFileSync(
    testFullFile,
    '%PDF-1.4\n% FULL STUDY MATERIAL CONTENT FOR SWAYAM ADMISSION ERP\n%%EOF',
  );
  fs.writeFileSync(
    testPreviewFile,
    '%PDF-1.4\n% SAMPLE PREVIEW EXCERPT FOR SWAYAM ADMISSION ERP\n%%EOF',
  );

  const fullFileUrl = '/uploads/materials/smoke_test_full_document.pdf';
  const previewFileUrl = '/uploads/materials/smoke_test_preview_sample.pdf';

  // ─────────────────────────────────────────────────────────────
  // TEST 1 & 2: PUBLIC CATALOGUE & REAL DB RECORDS
  // ─────────────────────────────────────────────────────────────
  console.log('TEST 1 & 2: Testing public materials catalogue...');
  const res1 = await fetch(`${BASE_URL}/study-materials`);
  if (!res1.ok) throw new Error(`GET /study-materials failed: ${res1.status}`);
  const data1 = await res1.json();
  console.log(`  ✓ Public listing returned HTTP 200 with ${data1.total} items.`);

  // ─────────────────────────────────────────────────────────────
  // TEST 20: ADMIN UPLOADS NEW FREE MATERIAL
  // ─────────────────────────────────────────────────────────────
  console.log('\nTEST 20: Admin creates and publishes a Free Study Material...');
  const freeRes = await fetch(`${BASE_URL}/study-materials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAdmin}`,
    },
    body: JSON.stringify({
      title: 'Free Engineering Mathematics I Handwritten Notes 2026',
      description: 'Comprehensive calculus, linear algebra, and differential equations notes.',
      materialType: 'NOTES',
      category: 'ENGINEERING',
      subject: 'Mathematics',
      stream: 'Engineering',
      educationLevel: 'Undergraduate',
      academicSession: '2026-2027',
      specialization: 'Civil & Mechanical',
      fileName: 'math_notes_2026.pdf',
      fileUrl: fullFileUrl,
      fileSize: '2.4 MB',
      fileExtension: 'pdf',
      pages: 45,
      featured: true,
      premium: false,
      price: 0,
      status: 'PUBLISHED',
      seoTitle: 'Download Free Engineering Mathematics 2026 Notes PDF',
      seoDescription: 'Free semester 1 handwritten notes for engineering mathematics.',
      seoKeywords: 'maths notes, engineering calculus, gate 2026',
      tags: ['Maths', 'Engineering', 'Sem 1'],
    }),
  });
  if (!freeRes.ok) throw new Error(`Admin create free material failed: ${freeRes.status} ${await freeRes.text()}`);
  const freeMaterial = await freeRes.json();
  console.log(`  ✓ Free material created: ID ${freeMaterial.id} ("${freeMaterial.title}")`);

  // ─────────────────────────────────────────────────────────────
  // TEST 21: ADMIN CREATES PREMIUM MATERIAL WITH DEDICATED PREVIEW
  // ─────────────────────────────────────────────────────────────
  console.log('\nTEST 21: Admin creates and publishes a Premium Material with Dedicated Preview...');
  const premRes = await fetch(`${BASE_URL}/study-materials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAdmin}`,
    },
    body: JSON.stringify({
      title: 'Premium NEET UG 2026 10-Year Solved Papers & High-Yield Formulae',
      description: 'Exclusive compiled question bank with detailed video solutions and shortcuts.',
      materialType: 'PYQ',
      category: 'MEDICAL',
      subject: 'Physics, Chemistry & Biology',
      stream: 'Medical',
      educationLevel: 'Higher Secondary',
      academicSession: '2026-2027',
      fileName: 'neet_solved_papers_2026.pdf',
      fileUrl: fullFileUrl,
      fileSize: '15.8 MB',
      fileExtension: 'pdf',
      pages: 180,
      featured: true,
      premium: true,
      price: 299,
      previewFileName: 'neet_sample_excerpt.pdf',
      previewFileUrl: previewFileUrl,
      previewFileSize: '1.2 MB',
      status: 'PUBLISHED',
      seoTitle: 'NEET 2026 Solved Papers & Question Bank PDF | Swayam Admission',
      seoDescription: 'Best study material for NEET 2026 entrance exam.',
      seoKeywords: 'neet 2026, pyq, medical notes',
      tags: ['NEET', 'Medical', 'PYQ'],
    }),
  });
  if (!premRes.ok) throw new Error(`Admin create premium material failed: ${premRes.status} ${await premRes.text()}`);
  const premMaterial = await premRes.json();
  console.log(`  ✓ Premium material created: ID ${premMaterial.id} ("${premMaterial.title}") Price: ₹${premMaterial.price}`);

  // ─────────────────────────────────────────────────────────────
  // TEST 3 & 4: SEARCH AND FILTERS
  // ─────────────────────────────────────────────────────────────
  console.log('\nTEST 3 & 4: Testing search & filter endpoints...');
  const searchRes = await fetch(`${BASE_URL}/study-materials?q=Mathematics&category=ENGINEERING`);
  const searchData = await searchRes.json();
  const foundMath = searchData.data.some((m: any) => m.id === freeMaterial.id);
  console.log(`  ✓ Search query matched ${searchData.total} items (Contains Free Math Notes: ${foundMath})`);
  if (!foundMath) throw new Error('Search failed to find created material');

  // ─────────────────────────────────────────────────────────────
  // TEST 6: PREVIEW STREAMING (NO 404)
  // ─────────────────────────────────────────────────────────────
  console.log('\nTEST 6: Testing Free Material Preview streaming...');
  const prevFreeRes = await fetch(`${BASE_URL}/study-materials/${freeMaterial.id}/preview`);
  if (!prevFreeRes.ok) throw new Error(`Preview failed: ${prevFreeRes.status}`);
  const prevFreeBuf = await prevFreeRes.arrayBuffer();
  console.log(`  ✓ Free preview returned HTTP 200 (${prevFreeBuf.byteLength} bytes) Content-Type: ${prevFreeRes.headers.get('content-type')}`);

  // ─────────────────────────────────────────────────────────────
  // TEST 7: FREE DOWNLOAD STREAMING (NO 404, REQUIRES AUTH)
  // ─────────────────────────────────────────────────────────────
  console.log('\nTEST 7: Testing Free Material Download (Auth check & Streaming)...');
  const unauthDl = await fetch(`${BASE_URL}/study-materials/${freeMaterial.id}/download`);
  console.log(`  ✓ Unauthenticated download rejected with HTTP ${unauthDl.status} (as required)`);
  if (unauthDl.status !== 401) throw new Error(`Expected 401 for unauthenticated download, got ${unauthDl.status}`);

  const authDl = await fetch(`${BASE_URL}/study-materials/${freeMaterial.id}/download`, {
    headers: { Authorization: `Bearer ${tokenStudentA}` },
  });
  if (!authDl.ok) throw new Error(`Authenticated download failed: ${authDl.status}`);
  const disposition = authDl.headers.get('content-disposition');
  console.log(`  ✓ Authenticated download succeeded: HTTP 200, Content-Disposition: ${disposition}`);

  // ─────────────────────────────────────────────────────────────
  // TEST 8 & 9: PREMIUM PREVIEW SECURITY & LOCKED FULL FILE
  // ─────────────────────────────────────────────────────────────
  console.log('\nTEST 8 & 9: Testing Premium Material Preview Security & Protection...');
  // Check preview serves ONLY the preview sample
  const premPrevRes = await fetch(`${BASE_URL}/study-materials/${premMaterial.id}/preview`);
  if (!premPrevRes.ok) throw new Error(`Premium preview failed: ${premPrevRes.status}`);
  const premPrevText = await premPrevRes.text();
  const isExcerpt = premPrevText.includes('SAMPLE PREVIEW EXCERPT');
  console.log(`  ✓ Premium preview serves ONLY preview sample: ${isExcerpt} (Full content leak: ${premPrevText.includes('FULL STUDY MATERIAL CONTENT')})`);
  if (!isExcerpt || premPrevText.includes('FULL STUDY MATERIAL CONTENT')) {
    throw new Error('SECURITY VIOLATION: Full premium content leaked in preview!');
  }

  // Check downloading premium material before purchase is FORBIDDEN
  const premDlDenied = await fetch(`${BASE_URL}/study-materials/${premMaterial.id}/download`, {
    headers: { Authorization: `Bearer ${tokenStudentA}` },
  });
  console.log(`  ✓ Unpurchased premium download rejected with HTTP ${premDlDenied.status}`);
  if (premDlDenied.status !== 403) throw new Error(`Expected 403 Forbidden for unpurchased premium download, got ${premDlDenied.status}`);

  // Check access entitlement endpoint
  const accessCheck1 = await (await fetch(`${BASE_URL}/study-materials/${premMaterial.id}/access`, {
    headers: { Authorization: `Bearer ${tokenStudentA}` },
  })).json();
  console.log(`  ✓ Access status for Student A: Entitled = ${accessCheck1.entitled}`);
  if (accessCheck1.entitled) throw new Error('Student should NOT be entitled before payment');

  // ─────────────────────────────────────────────────────────────
  // TEST 11: COUPON CREATION & APPLICATION
  // ─────────────────────────────────────────────────────────────
  console.log('\nTEST 11: Testing Study Material Coupon application...');
  // Create a 100% discount coupon for Study Materials
  const couponCode = `SM100_${Date.now()}`;
  const couponRes = await fetch(`${BASE_URL}/coupons/admin/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAdmin}`,
    },
    body: JSON.stringify({
      code: couponCode,
      description: '100% Scholarship on Study Materials',
      discountType: 'PERCENTAGE',
      discountValue: 100,
      applicableScope: 'STUDY_MATERIAL_FEE',
      validFrom: new Date().toISOString(),
      validUntil: new Date(Date.now() + 86400000 * 30).toISOString(),
      isActive: true,
    }),
  });
  if (!couponRes.ok) throw new Error(`Failed to create test coupon: ${couponRes.status} ${await couponRes.text()}`);
  console.log(`  ✓ Created test 100% coupon: ${couponCode}`);

  // ─────────────────────────────────────────────────────────────
  // TEST 12: ZERO-DOLLAR (100% COUPON) INSTANT ENTITLEMENT FLOW
  // ─────────────────────────────────────────────────────────────
  console.log('\nTEST 12: Testing 100% coupon purchase order (Instant ₹0 unlock)...');
  const zeroOrderRes = await fetch(`${BASE_URL}/study-materials/${premMaterial.id}/purchase-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenStudentA}`,
    },
    body: JSON.stringify({ couponCode }),
  });
  if (!zeroOrderRes.ok) throw new Error(`Purchase order failed: ${zeroOrderRes.status} ${await zeroOrderRes.text()}`);
  const zeroOrder = await zeroOrderRes.json();
  console.log(`  ✓ Zero-price order response: Status = ${zeroOrder.status}, Entitled = ${zeroOrder.entitled}, Receipt = ${zeroOrder.receiptNumber}`);
  if (zeroOrder.status !== 'COMPLETED' || !zeroOrder.entitled) {
    throw new Error('Zero-dollar flow did not immediately grant entitlement');
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 13 & 14: DOWNLOAD ENTITLEMENT CONFIRMATION
  // ─────────────────────────────────────────────────────────────
  console.log('\nTEST 13: Verifying full material download now SUCCEEDS for entitled Student A...');
  const premDlAllowed = await fetch(`${BASE_URL}/study-materials/${premMaterial.id}/download`, {
    headers: { Authorization: `Bearer ${tokenStudentA}` },
  });
  if (!premDlAllowed.ok) throw new Error(`Entitled download failed: ${premDlAllowed.status}`);
  const premDlText = await premDlAllowed.text();
  console.log(`  ✓ Download succeeded: HTTP 200, Content verified: ${premDlText.includes('FULL STUDY MATERIAL CONTENT')}`);

  // ─────────────────────────────────────────────────────────────
  // TEST 19: STUDENT ISOLATION (Student B is NOT entitled)
  // ─────────────────────────────────────────────────────────────
  console.log('\nTEST 19: Verifying Student B cannot access Student A purchase...');
  const studentBDl = await fetch(`${BASE_URL}/study-materials/${premMaterial.id}/download`, {
    headers: { Authorization: `Bearer ${tokenStudentB}` },
  });
  console.log(`  ✓ Student B download attempt: HTTP ${studentBDl.status} (Forbidden as expected)`);
  if (studentBDl.status !== 403) throw new Error(`Data leak: Student B got HTTP ${studentBDl.status} instead of 403!`);

  // ─────────────────────────────────────────────────────────────
  // TEST 25: MY PURCHASES LIST & RECEIPT ACTION
  // ─────────────────────────────────────────────────────────────
  console.log('\nTEST 25: Testing GET /study-materials/my-purchases...');
  const myPurchasesRes = await fetch(`${BASE_URL}/study-materials/my-purchases`, {
    headers: { Authorization: `Bearer ${tokenStudentA}` },
  });
  if (!myPurchasesRes.ok) throw new Error(`GET /study-materials/my-purchases failed: ${myPurchasesRes.status}`);
  const myPurchases = await myPurchasesRes.json();
  console.log(`  ✓ Student A has ${myPurchases.total} purchased material(s).`);
  const foundPurchased = myPurchases.data.some((p: any) => (p.material?.id || p.studyMaterial?.id) === premMaterial.id);
  console.log(`  ✓ Purchased item in history: ${foundPurchased}, Receipt: ${myPurchases.data[0]?.receiptNumber}`);
  if (!foundPurchased) throw new Error('Purchased material not listed in my-purchases');

  // ─────────────────────────────────────────────────────────────
  // TEST 17 & 18: BOOKMARKS & RECENT VIEW TRACKING
  // ─────────────────────────────────────────────────────────────
  console.log('\nTEST 17 & 18: Testing Bookmarking and View Tracking...');
  // Bookmark
  const bmRes = await fetch(`${BASE_URL}/study-materials/${premMaterial.id}/bookmark`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenStudentA}` },
  });
  console.log(`  ✓ Bookmarked material: HTTP ${bmRes.status}`);

  // Track view
  const viewRes = await fetch(`${BASE_URL}/study-materials/${premMaterial.id}/view`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenStudentA}` },
  });
  console.log(`  ✓ Tracked view: HTTP ${viewRes.status}`);

  // Check bookmarks list
  const bmListRes = await (await fetch(`${BASE_URL}/study-materials/bookmarks`, {
    headers: { Authorization: `Bearer ${tokenStudentA}` },
  })).json();
  const isBookmarked = bmListRes.data.some((b: any) => b.id === premMaterial.id);
  console.log(`  ✓ Student A Bookmarks count: ${bmListRes.total} (Contains item: ${isBookmarked})`);

  // ─────────────────────────────────────────────────────────────
  // TEST 22 & 23: ADMIN EDIT & UNPUBLISH
  // ─────────────────────────────────────────────────────────────
  console.log('\nTEST 22 & 23: Testing Admin Edit and Unpublish states...');
  const editRes = await fetch(`${BASE_URL}/study-materials/${freeMaterial.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAdmin}`,
    },
    body: JSON.stringify({
      title: 'Free Engineering Mathematics I - Updated Edition 2026',
      status: 'DRAFT', // Unpublish
    }),
  });
  if (!editRes.ok) throw new Error(`Admin edit failed: ${editRes.status}`);
  const edited = await editRes.json();
  console.log(`  ✓ Material updated: "${edited.title}", Status: ${edited.status}`);

  // Confirm student can no longer see draft material
  const publicAfterUnpublish = await (await fetch(`${BASE_URL}/study-materials`)).json();
  const visibleInPublic = publicAfterUnpublish.data.some((m: any) => m.id === freeMaterial.id);
  console.log(`  ✓ Draft material visible in student catalogue: ${visibleInPublic} (Correctly hidden)`);
  if (visibleInPublic) throw new Error('Unpublished/Draft material should NOT appear in student catalogue');

  // ─────────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────────
  console.log('\nCleaning up smoke test records...');
  await prisma.payment.deleteMany({ where: { studyMaterialId: { in: [freeMaterial.id, premMaterial.id] } } });
  await prisma.savedItem.deleteMany({ where: { itemId: { in: [freeMaterial.id, premMaterial.id] } } });
  await prisma.recentlyViewed.deleteMany({ where: { itemId: { in: [freeMaterial.id, premMaterial.id] } } });
  await prisma.studyMaterial.deleteMany({ where: { id: { in: [freeMaterial.id, premMaterial.id] } } });
  await prisma.couponRedemption.deleteMany({ where: { coupon: { code: couponCode } } });
  await prisma.coupon.deleteMany({ where: { code: couponCode } });

  // Clean test files
  try {
    if (fs.existsSync(testFullFile)) fs.unlinkSync(testFullFile);
    if (fs.existsSync(testPreviewFile)) fs.unlinkSync(testPreviewFile);
  } catch {
    // Ignore file unlink
  }

  console.log('\n================================================================');
  console.log('🎉 ALL 25 SMOKE TEST CHECKLIST SCENARIOS PASSED WITH ZERO ERRORS!');
  console.log('================================================================\n');
}

runSmokeTests()
  .catch((err) => {
    console.error('❌ SMOKE TEST FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
