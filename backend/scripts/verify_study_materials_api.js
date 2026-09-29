const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'swayam_super_secret_key';

async function main() {
  console.log('===========================================================');
  console.log('🌐 TESTING STUDY MATERIALS HTTP API ENDPOINTS');
  console.log('===========================================================\n');

  // 1. Fetch Users
  const studentA = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
  const studentB = await prisma.user.findFirst({ where: { role: 'STUDENT', id: { not: studentA?.id } } });
  const admin = await prisma.user.findFirst({ where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } } });

  if (!studentA || !admin) {
    throw new Error('Required test users (student / admin) not found');
  }

  const tokenStudentA = jwt.sign({ id: studentA.id, email: studentA.email, role: studentA.role }, JWT_SECRET);
  const tokenStudentB = studentB ? jwt.sign({ id: studentB.id, email: studentB.email, role: studentB.role }, JWT_SECRET) : null;
  const tokenAdmin = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, JWT_SECRET);

  console.log(`👤 Student A: ${studentA.fullName || studentA.email} (${studentA.id})`);
  if (studentB) console.log(`👤 Student B: ${studentB.fullName || studentB.email} (${studentB.id})`);
  console.log(`🛡️ Admin: ${admin.fullName || admin.email} (${admin.id})\n`);

  // 2. Test GET /study-materials (Public)
  console.log('Step 1: Testing GET /study-materials (Public listing)...');
  const res1 = await fetch(`${BASE_URL}/study-materials`);
  if (!res1.ok) throw new Error(`Failed GET /study-materials: ${res1.status} ${await res1.text()}`);
  const list1 = await res1.json();
  console.log(`✓ Status: ${res1.status}. Total materials: ${list1.total}`);

  // 3. Test GET /study-materials/recommended
  console.log('\nStep 2: Testing GET /study-materials/recommended...');
  const resRec = await fetch(`${BASE_URL}/study-materials/recommended`, {
    headers: { Authorization: `Bearer ${tokenStudentA}` }
  });
  if (!resRec.ok) throw new Error(`Failed GET /study-materials/recommended: ${resRec.status}`);
  const recData = await resRec.json();
  console.log(`✓ Status: ${resRec.status}. Recommended items: ${recData.data ? recData.data.length : (Array.isArray(recData) ? recData.length : 0)}`);

  // 4. Test File Upload POST /study-materials/upload (Admin)
  console.log('\nStep 3: Testing POST /study-materials/upload (Multipart upload)...');
  const formData = new FormData();
  const blob = new Blob(['%PDF-1.4 Data Structures and Algorithms Lecture Notes 2026'], { type: 'application/pdf' });
  formData.append('file', blob, 'dsa_notes_2026.pdf');

  const resUpload = await fetch(`${BASE_URL}/study-materials/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdmin}` },
    body: formData,
  });
  if (!resUpload.ok) throw new Error(`Failed upload: ${resUpload.status} ${await resUpload.text()}`);
  const uploadInfo = await resUpload.json();
  console.log(`✓ File uploaded: ${uploadInfo.fileUrl} (${uploadInfo.fileName}, ${uploadInfo.fileSize})`);

  // 5. Test Admin Create POST /study-materials
  console.log('\nStep 4: Testing POST /study-materials (Admin create)...');
  const createPayload = {
    title: 'Advanced Data Structures & Algorithms Guide 2026',
    description: 'Master trees, graphs, dynamic programming, and complexity analysis.',
    materialType: 'NOTES',
    category: 'ENGINEERING',
    subject: 'Computer Science & Engineering',
    stream: 'Engineering',
    fileUrl: uploadInfo.fileUrl,
    fileName: uploadInfo.fileName,
    fileSize: uploadInfo.fileSize,
    fileExtension: uploadInfo.fileExtension,
    tags: ['DSA', 'Algorithms', 'GATE', 'Engineering'],
    featured: true,
    status: 'PUBLISHED',
  };

  const resCreate = await fetch(`${BASE_URL}/study-materials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAdmin}`,
    },
    body: JSON.stringify(createPayload),
  });
  if (!resCreate.ok) throw new Error(`Failed create: ${resCreate.status} ${await resCreate.text()}`);
  const createdMaterial = await resCreate.json();
  console.log(`✓ Created material ID: ${createdMaterial.id} - ${createdMaterial.title} (${createdMaterial.status})`);

  // 6. Test GET /study-materials/:id
  console.log('\nStep 5: Testing GET /study-materials/:id (Details)...');
  const resDetail = await fetch(`${BASE_URL}/study-materials/${createdMaterial.id}`);
  if (!resDetail.ok) throw new Error(`Failed detail: ${resDetail.status}`);
  const detail = await resDetail.json();
  console.log(`✓ Fetched details: ${detail.title}, views: ${detail.viewCount}, downloads: ${detail.downloadCount}`);

  // 7. Test Search & Filter
  console.log('\nStep 6: Testing search and category filtering...');
  const resSearch = await fetch(`${BASE_URL}/study-materials?q=Algorithms&category=ENGINEERING`);
  const searchJson = await resSearch.json();
  console.log(`✓ Found ${searchJson.total} item(s) matching query "Algorithms"`);
  if (!searchJson.data.some(m => m.id === createdMaterial.id)) {
    throw new Error('Created material not found in search results');
  }

  // 8. Test View Tracking POST /study-materials/:id/view
  console.log('\nStep 7: Testing POST /study-materials/:id/view (Student view tracking)...');
  const resView = await fetch(`${BASE_URL}/study-materials/${createdMaterial.id}/view`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenStudentA}` },
  });
  if (!resView.ok) throw new Error(`Failed view tracking: ${resView.status}`);
  const viewResult = await resView.json();
  console.log(`✓ View recorded. New viewCount: ${viewResult.viewCount}`);

  // Check History
  const resHist = await fetch(`${BASE_URL}/study-materials/history`, {
    headers: { Authorization: `Bearer ${tokenStudentA}` },
  });
  const histJson = await resHist.json();
  console.log(`✓ Student A history count: ${histJson.total}`);
  const foundInHist = histJson.data.some(h => (h.id || h.material?.id) === createdMaterial.id);
  console.log(`✓ Material in Student A history: ${foundInHist}`);

  // 9. Test Download Tracking POST /study-materials/:id/download
  console.log('\nStep 8: Testing POST /study-materials/:id/download (Student download tracking)...');
  const resDown = await fetch(`${BASE_URL}/study-materials/${createdMaterial.id}/download`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenStudentA}` },
  });
  if (!resDown.ok) throw new Error(`Failed download tracking: ${resDown.status}`);
  const downResult = await resDown.json();
  console.log(`✓ Download recorded. New downloadCount: ${downResult.downloadCount}`);

  // 10. Test Bookmarking POST /study-materials/:id/bookmark
  console.log('\nStep 9: Testing POST /study-materials/:id/bookmark (Bookmark persistence)...');
  const resBm = await fetch(`${BASE_URL}/study-materials/${createdMaterial.id}/bookmark`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenStudentA}` },
  });
  if (!resBm.ok) throw new Error(`Failed bookmark: ${resBm.status}`);
  console.log(`✓ Bookmarked successfully`);

  const resBmList = await fetch(`${BASE_URL}/study-materials/bookmarks`, {
    headers: { Authorization: `Bearer ${tokenStudentA}` },
  });
  const bmListJson = await resBmList.json();
  console.log(`✓ Student A bookmark count: ${bmListJson.total}`);
  const foundInBookmarks = bmListJson.data.some(b => b.id === createdMaterial.id);
  console.log(`✓ Material in Student A bookmarks: ${foundInBookmarks}`);
  if (!foundInBookmarks) throw new Error('Material not found in Student A bookmarks');

  // 11. Test Data Isolation with Student B
  if (tokenStudentB) {
    console.log('\nStep 10: Verifying Data Isolation with Student B...');
    const resB_bm = await fetch(`${BASE_URL}/study-materials/bookmarks`, {
      headers: { Authorization: `Bearer ${tokenStudentB}` },
    });
    const bmB = await resB_bm.json();
    const hasBm = bmB.data.some(b => b.id === createdMaterial.id);
    console.log(`✓ Student B bookmarks count: ${bmB.total} (Student A material present: ${hasBm})`);
    if (hasBm) throw new Error('DATA LEAK: Student B can see Student A bookmark!');

    const resB_hist = await fetch(`${BASE_URL}/study-materials/history`, {
      headers: { Authorization: `Bearer ${tokenStudentB}` },
    });
    const histB = await resB_hist.json();
    const hasHist = histB.data.some(h => (h.id || h.material?.id) === createdMaterial.id);
    console.log(`✓ Student B history count: ${histB.total} (Student A history present: ${hasHist})`);
    if (hasHist) throw new Error('DATA LEAK: Student B can see Student A history!');
  }

  // 12. Test Unbookmark DELETE /study-materials/:id/bookmark
  console.log('\nStep 11: Testing DELETE /study-materials/:id/bookmark...');
  const resUnbm = await fetch(`${BASE_URL}/study-materials/${createdMaterial.id}/bookmark`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenStudentA}` },
  });
  if (!resUnbm.ok) throw new Error(`Failed unbookmark: ${resUnbm.status}`);
  const resBmAfter = await fetch(`${BASE_URL}/study-materials/bookmarks`, {
    headers: { Authorization: `Bearer ${tokenStudentA}` },
  });
  const bmAfterJson = await resBmAfter.json();
  const stillInBm = bmAfterJson.data.some(b => b.id === createdMaterial.id);
  console.log(`✓ Material still in bookmarks after removal: ${stillInBm}`);
  if (stillInBm) throw new Error('Material should not be in bookmarks');

  // 13. Test Admin Archive / Soft Delete DELETE /study-materials/:id
  console.log('\nStep 12: Testing Admin Archive DELETE /study-materials/:id...');
  const resDel = await fetch(`${BASE_URL}/study-materials/${createdMaterial.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenAdmin}` },
  });
  if (!resDel.ok) throw new Error(`Failed archive: ${resDel.status}`);
  const listAfterArchive = await (await fetch(`${BASE_URL}/study-materials`)).json();
  const visibleToPublic = listAfterArchive.data.some(m => m.id === createdMaterial.id);
  console.log(`✓ Archived material visible in public listing: ${visibleToPublic}`);
  if (visibleToPublic) throw new Error('Archived material should be hidden from public listing');

  // 14. Test Admin Restore POST /study-materials/:id/restore
  console.log('\nStep 13: Testing Admin Restore POST /study-materials/:id/restore...');
  const resRestore = await fetch(`${BASE_URL}/study-materials/${createdMaterial.id}/restore`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdmin}` },
  });
  if (!resRestore.ok) throw new Error(`Failed restore: ${resRestore.status}`);
  const listAfterRestore = await (await fetch(`${BASE_URL}/study-materials`)).json();
  const visibleAfterRestore = listAfterRestore.data.some(m => m.id === createdMaterial.id);
  console.log(`✓ Restored material visible in public listing: ${visibleAfterRestore}`);
  if (!visibleAfterRestore) throw new Error('Restored material should be visible in public listing');

  // 15. Cleanup
  console.log('\nStep 14: Cleaning up test data from database...');
  await prisma.recentlyViewed.deleteMany({ where: { itemType: 'STUDY_MATERIAL', itemId: createdMaterial.id } });
  await prisma.savedItem.deleteMany({ where: { itemType: 'STUDY_MATERIAL', itemId: createdMaterial.id } });
  await prisma.studyMaterial.delete({ where: { id: createdMaterial.id } });
  console.log(`✓ Test record deleted permanently.`);

  console.log('\n===========================================================');
  console.log('🎉 ALL STUDY MATERIALS HTTP API TESTS PASSED SUCCESSFULLY!');
  console.log('===========================================================');
}

main()
  .catch(err => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
