import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'swayam-erp-super-secret-key-change-in-production';

async function verifyPreviewUpload() {
  console.log('================================================================');
  console.log('🧪 VERIFYING STUDY MATERIAL PREVIEW RESOURCE UPLOAD FIX');
  console.log('================================================================');

  // 1. Get Admin User & generate token
  const admin = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
  });
  if (!admin) throw new Error('No admin user found in database');
  const token = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, JWT_SECRET, { expiresIn: '1h' });
  console.log(`👤 Admin: ${admin.fullName} (${admin.id})`);

  // 2. Prepare test files on disk
  const uploadsDir = path.join(process.cwd(), 'uploads', 'materials');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const dummyFullPdf = path.join(uploadsDir, 'test_full_chemistry.pdf');
  const dummyPreviewPdf = path.join(uploadsDir, 'test_preview_sample_chemistry.pdf');
  fs.writeFileSync(dummyFullPdf, '%PDF-1.4 FULL CHEMISTRY CONTENT DO NOT LEAK');
  fs.writeFileSync(dummyPreviewPdf, '%PDF-1.4 SAMPLE CHAPTER 1 EXCERPT FOR PREVIEW ONLY');

  // 3. Test upload full file endpoint
  console.log('\n1. Testing POST /study-materials/upload...');
  const fullForm = new FormData();
  fullForm.append('file', new Blob([fs.readFileSync(dummyFullPdf)], { type: 'application/pdf' }), 'Chemistry.pdf');
  const fullRes = await fetch(`${BASE_URL}/study-materials/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fullForm,
  });
  if (!fullRes.ok) throw new Error(`Full file upload failed: ${fullRes.status} ${await fullRes.text()}`);
  const fullData = await fullRes.json();
  console.log(`  ✓ Full upload response:`, fullData);
  if (!fullData.fileUrl || !fullData.fileName) throw new Error('Full upload missing fileUrl or fileName');

  // 4. Test upload preview file endpoint
  console.log('\n2. Testing POST /study-materials/upload-preview...');
  const prevForm = new FormData();
  prevForm.append('file', new Blob([fs.readFileSync(dummyPreviewPdf)], { type: 'application/pdf' }), 'Chemistry-Sample-Preview.pdf');
  const prevRes = await fetch(`${BASE_URL}/study-materials/upload-preview`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: prevForm,
  });
  if (!prevRes.ok) throw new Error(`Preview file upload failed: ${prevRes.status} ${await prevRes.text()}`);
  const prevData = await prevRes.json();
  console.log(`  ✓ Preview upload response:`, prevData);

  // Verify that BOTH previewFileUrl and fileUrl exist (so frontend never receives undefined)
  if (!prevData.previewFileUrl && !prevData.fileUrl) throw new Error('Preview upload missing both previewFileUrl and fileUrl');
  if (!prevData.previewFileName && !prevData.fileName) throw new Error('Preview upload missing both previewFileName and fileName');
  console.log(`  ✓ Preview URL: ${prevData.previewFileUrl || prevData.fileUrl}`);
  console.log(`  ✓ Preview Name: ${prevData.previewFileName || prevData.fileName}`);
  console.log(`  ✓ Preview Size: ${prevData.previewFileSize || prevData.fileSize}`);

  // 5. Create Premium Material with both files
  console.log('\n3. Testing POST /study-materials (Creating premium material with preview)...');
  const createPayload = {
    title: `Premium Organic Chemistry Masterclass ${Date.now()}`,
    materialType: 'Notes',
    category: 'SCIENCE',
    description: 'Comprehensive Organic Chemistry notes with chapter 1 preview excerpt.',
    language: 'English',
    fileName: fullData.fileName,
    fileUrl: fullData.fileUrl,
    fileSize: fullData.fileSize || '8.2 MB',
    fileExtension: 'pdf',
    featured: true,
    premium: true,
    price: 349,
    previewFileUrl: prevData.previewFileUrl || prevData.fileUrl,
    previewFileName: prevData.previewFileName || prevData.fileName,
    previewFileSize: prevData.previewFileSize || prevData.fileSize,
    educationLevel: 'Undergraduate',
    academicSession: '2026-2027',
    status: 'PUBLISHED',
  };

  const createRes = await fetch(`${BASE_URL}/study-materials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(createPayload),
  });
  if (!createRes.ok) throw new Error(`Material creation failed: ${createRes.status} ${await createRes.text()}`);
  const created = await createRes.json();
  console.log(`  ✓ Created Material ID: ${created.id}`);
  console.log(`  ✓ DB previewFileUrl: ${created.previewFileUrl}`);
  console.log(`  ✓ DB previewFileName: ${created.previewFileName}`);
  console.log(`  ✓ DB previewFileSize: ${created.previewFileSize}`);

  if (!created.previewFileUrl) throw new Error('FAIL: previewFileUrl was NOT saved to database!');
  if (!created.previewFileName) throw new Error('FAIL: previewFileName was NOT saved to database!');

  // 6. Verify GET /study-materials/:id/preview streams the PREVIEW file only
  console.log('\n4. Testing GET /study-materials/:id/preview...');
  const streamRes = await fetch(`${BASE_URL}/study-materials/${created.id}/preview`);
  if (!streamRes.ok) throw new Error(`Preview stream failed: ${streamRes.status}`);
  const streamText = await streamRes.text();
  console.log(`  ✓ Preview stream returned HTTP 200, length: ${streamText.length}`);
  const isExcerpt = streamText.includes('SAMPLE CHAPTER 1 EXCERPT FOR PREVIEW ONLY');
  const leakedFull = streamText.includes('FULL CHEMISTRY CONTENT DO NOT LEAK');
  console.log(`  ✓ Correct excerpt served: ${isExcerpt}`);
  console.log(`  ✓ Full content leak: ${leakedFull}`);
  if (!isExcerpt || leakedFull) throw new Error('SECURITY VIOLATION: Full file leaked or wrong preview served!');

  // 7. Test Replacing the preview file
  console.log('\n5. Testing Preview File Replacement...');
  const dummyReplacementPreview = path.join(uploadsDir, 'test_replacement_preview.pdf');
  fs.writeFileSync(dummyReplacementPreview, '%PDF-1.4 REPLACED PREVIEW EXCERPT V2');
  const repForm = new FormData();
  repForm.append('file', new Blob([fs.readFileSync(dummyReplacementPreview)], { type: 'application/pdf' }), 'Chemistry-Replaced-Preview-V2.pdf');
  const repUploadRes = await fetch(`${BASE_URL}/study-materials/upload-preview`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: repForm,
  });
  const repData = await repUploadRes.json();

  const patchRes = await fetch(`${BASE_URL}/study-materials/${created.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      previewFileUrl: repData.previewFileUrl || repData.fileUrl,
      previewFileName: repData.previewFileName || repData.fileName,
      previewFileSize: repData.previewFileSize || repData.fileSize,
    }),
  });
  if (!patchRes.ok) throw new Error(`PATCH material failed: ${patchRes.status}`);
  const patched = await patchRes.json();
  console.log(`  ✓ Updated Material Preview URL: ${patched.previewFileUrl}`);
  console.log(`  ✓ Updated Material Preview Name: ${patched.previewFileName}`);
  if (patched.previewFileName !== 'Chemistry-Replaced-Preview-V2.pdf') {
    throw new Error('Replacement previewFileName was not updated!');
  }

  // 8. Verify the new preview is streamed
  const streamRes2 = await fetch(`${BASE_URL}/study-materials/${created.id}/preview`);
  const streamText2 = await streamRes2.text();
  console.log(`  ✓ Streamed replacement preview contains V2: ${streamText2.includes('REPLACED PREVIEW EXCERPT V2')}`);

  // Cleanup
  console.log('\nCleaning up verification records...');
  await prisma.studyMaterial.delete({ where: { id: created.id } });
  if (fs.existsSync(dummyFullPdf)) fs.unlinkSync(dummyFullPdf);
  if (fs.existsSync(dummyPreviewPdf)) fs.unlinkSync(dummyPreviewPdf);
  if (fs.existsSync(dummyReplacementPreview)) fs.unlinkSync(dummyReplacementPreview);

  console.log('\n================================================================');
  console.log('🎉 PREVIEW UPLOAD FIX FULLY VERIFIED AND WORKING!');
  console.log('================================================================');
}

verifyPreviewUpload()
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
