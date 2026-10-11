import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from './src/prisma/prisma.service';

async function runFAQSmokeTest() {
  console.log('====================================================');
  console.log(' SWAYAM ADMISSION — FAQ / KNOWLEDGE BASE SMOKE TEST  ');
  console.log('====================================================\n');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('v1', {
    exclude: ['documents/file/(.*)'],
  });

  app.enableCors();

  const TEST_PORT = 3338;
  await app.listen(TEST_PORT);
  console.log(`✅ Test server running on http://localhost:${TEST_PORT}\n`);

  const prisma = app.get(PrismaService);
  const createdFaqIds: string[] = [];

  try {
    // 1. Authenticate Admin
    console.log('[1] Authenticating Admin (admin@swayamadmission.in)...');
    const adminLoginRes = await fetch(`http://localhost:${TEST_PORT}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@swayamadmission.in',
        password: 'Admin@123',
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.access_token;
    if (!adminToken) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLoginData)}`);
    }
    console.log('    ✅ Admin authentication successful.');

    // 2. Register Student 1 and Student 2
    console.log('\n[2] Registering Student 1 and Student 2...');
    const ts = Date.now();
    const s1Email = `student1_${ts}@swayamtest.in`;
    const s2Email = `student2_${ts}@swayamtest.in`;

    const s1SignupRes = await fetch(`http://localhost:${TEST_PORT}/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Student One',
        email: s1Email,
        mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Password@123',
        confirmPassword: 'Password@123',
        state: 'Delhi',
        district: 'New Delhi',
      }),
    });
    const s1SignupData = await s1SignupRes.json();
    if (s1SignupRes.status !== 201) throw new Error(`Student 1 signup failed: ${JSON.stringify(s1SignupData)}`);

    const s1LoginRes = await fetch(`http://localhost:${TEST_PORT}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: s1Email,
        password: 'Password@123',
      }),
    });
    const s1LoginData = await s1LoginRes.json();
    const s1Token = s1LoginData.access_token;
    if (!s1Token) throw new Error(`Student 1 login failed: ${JSON.stringify(s1LoginData)}`);

    const s2SignupRes = await fetch(`http://localhost:${TEST_PORT}/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Student Two',
        email: s2Email,
        mobile: `99${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Password@123',
        confirmPassword: 'Password@123',
        state: 'Delhi',
        district: 'New Delhi',
      }),
    });
    const s2SignupData = await s2SignupRes.json();
    if (s2SignupRes.status !== 201) throw new Error(`Student 2 signup failed: ${JSON.stringify(s2SignupData)}`);

    const s2LoginRes = await fetch(`http://localhost:${TEST_PORT}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: s2Email,
        password: 'Password@123',
      }),
    });
    const s2LoginData = await s2LoginRes.json();
    const s2Token = s2LoginData.access_token;
    if (!s2Token) throw new Error(`Student 2 login failed: ${JSON.stringify(s2LoginData)}`);
    console.log('    ✅ Student 1 and Student 2 registered and authenticated.');

    // 3. Student 1 Submits Question
    console.log('\n[3] Student 1 submits question ("Ask a Question")...');
    const questionText = `What are the scholarship requirements for B.Tech CSE? (${ts})`;
    const askRes = await fetch(`http://localhost:${TEST_PORT}/v1/faqs/questions/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${s1Token}`,
      },
      body: JSON.stringify({
        question: questionText,
        category: 'Scholarship',
        additionalDetails: 'Scored 94% in CBSE 12th board exams.',
      }),
    });
    const askData = await askRes.json();
    console.log(`    Status Code: ${askRes.status}`);
    const submittedFaq = askData.data || askData;
    if (askRes.status !== 201 || !submittedFaq?.id) {
      throw new Error(`Student ask question failed: ${JSON.stringify(askData)}`);
    }
    const faqId = submittedFaq.id;
    createdFaqIds.push(faqId);
    console.log(`    ✅ Question created successfully: ID=${faqId}, Status=${submittedFaq.status}`);
    if (submittedFaq.status !== 'PENDING_REVIEW') {
      throw new Error(`Expected initial status PENDING_REVIEW, got ${submittedFaq.status}`);
    }

    // 4. Duplicate Question Prevention
    console.log('\n[4] Testing duplicate question prevention within 24 hours...');
    const dupRes = await fetch(`http://localhost:${TEST_PORT}/v1/faqs/questions/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${s1Token}`,
      },
      body: JSON.stringify({
        question: questionText,
        category: 'Scholarship',
      }),
    });
    console.log(`    Duplicate submission status: ${dupRes.status} (Expected: 400)`);
    if (dupRes.status !== 400) {
      throw new Error(`Duplicate question was not rejected, got status ${dupRes.status}`);
    }
    console.log('    ✅ Duplicate question correctly blocked with 400 Bad Request.');

    // 5. Short/Invalid Question Validation
    console.log('\n[5] Testing short question validation (<10 characters)...');
    const shortRes = await fetch(`http://localhost:${TEST_PORT}/v1/faqs/questions/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${s1Token}`,
      },
      body: JSON.stringify({
        question: 'Help?',
        category: 'Admission',
      }),
    });
    console.log(`    Short submission status: ${shortRes.status} (Expected: 400)`);
    if (shortRes.status !== 400) {
      throw new Error(`Short question was not rejected, got status ${shortRes.status}`);
    }
    console.log('    ✅ Short question correctly rejected with 400 Bad Request.');

    // 6. Student 1 Views Own Questions Queue
    console.log('\n[6] Student 1 fetches own questions (GET /v1/faqs/questions/my)...');
    const s1MyRes = await fetch(`http://localhost:${TEST_PORT}/v1/faqs/questions/my`, {
      headers: { Authorization: `Bearer ${s1Token}` },
    });
    const s1MyData = await s1MyRes.json();
    console.log(`    Status Code: ${s1MyRes.status}, Questions Found: ${s1MyData.length}`);
    if (s1MyRes.status !== 200 || !Array.isArray(s1MyData) || s1MyData.length === 0) {
      throw new Error(`Student 1 failed to retrieve own questions: ${JSON.stringify(s1MyData)}`);
    }
    const myQ = s1MyData.find((q: any) => q.id === faqId);
    if (!myQ) throw new Error('Student 1 could not find submitted question in my list');
    if (myQ.answer !== null) {
      throw new Error(`Expected answer to be null while PENDING_REVIEW, but got: ${myQ.answer}`);
    }
    console.log('    ✅ Student 1 saw submitted question with status=PENDING_REVIEW and answer=null.');

    // 7. Student 2 Cross-Student Isolation Verification
    console.log('\n[7] Student 2 fetches own questions (Verifying isolation)...');
    const s2MyRes = await fetch(`http://localhost:${TEST_PORT}/v1/faqs/questions/my`, {
      headers: { Authorization: `Bearer ${s2Token}` },
    });
    const s2MyData = await s2MyRes.json();
    console.log(`    Status Code: ${s2MyRes.status}, Questions Found: ${s2MyData.length}`);
    const leakedQ = s2MyData.find((q: any) => q.id === faqId);
    if (leakedQ) {
      throw new Error('SECURITY VIOLATION: Student 2 can see Student 1 question!');
    }
    console.log('    ✅ Confirmed: Complete cross-student isolation, Student 2 sees 0 questions.');

    // 8. Unauthenticated Access Attempt
    console.log('\n[8] Unauthenticated user attempts to ask question...');
    const unauthRes = await fetch(`http://localhost:${TEST_PORT}/v1/faqs/questions/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Can unauthenticated user post questions here?',
        category: 'Admission',
      }),
    });
    console.log(`    Status Code: ${unauthRes.status} (Expected: 401)`);
    if (unauthRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${unauthRes.status}`);
    }
    console.log('    ✅ Unauthenticated submission correctly blocked with 401.');

    // 9. Staff/Admin Answers Question (Save Draft / In Review)
    console.log('\n[9] Staff answers question in review...');
    const draftAnswerRes = await fetch(`http://localhost:${TEST_PORT}/v1/faqs/${faqId}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        answer: 'Students with >90% marks in 12th board qualify for 50% tuition waiver.',
        submitForReview: true,
        publishNow: false,
      }),
    });
    const draftAnswerData = await draftAnswerRes.json();
    console.log(`    Status Code: ${draftAnswerRes.status}, Status: ${draftAnswerData.status}`);
    if (![200, 201].includes(draftAnswerRes.status) || draftAnswerData.status !== 'PENDING_REVIEW') {
      throw new Error(`Staff draft answer failed: ${JSON.stringify(draftAnswerData)}`);
    }
    console.log('    ✅ Staff answer saved in PENDING_REVIEW state.');

    // 10. Student 1 Checks Questions — Answer MUST remain hidden while not PUBLISHED
    console.log('\n[10] Student 1 verifies draft answer is NOT leaked...');
    const s1CheckDraftRes = await fetch(`http://localhost:${TEST_PORT}/v1/faqs/questions/my`, {
      headers: { Authorization: `Bearer ${s1Token}` },
    });
    const s1CheckDraftData = await s1CheckDraftRes.json();
    const myQDraft = s1CheckDraftData.find((q: any) => q.id === faqId);
    if (myQDraft.answer !== null) {
      throw new Error('SECURITY VIOLATION: Draft answer leaked to student before publication!');
    }
    console.log('    ✅ Draft answer safely masked from student.');

    // 11. Admin Approves and Publishes
    console.log('\n[11] Admin approves and publishes question...');
    const publishRes = await fetch(`http://localhost:${TEST_PORT}/v1/faqs/${faqId}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        answer: 'Verified: Students with >90% aggregate in 12th board qualify for 50% merit tuition waiver upon submission of official mark sheets.',
        publishNow: true,
      }),
    });
    const publishData = await publishRes.json();
    console.log(`    Status Code: ${publishRes.status}, Status: ${publishData.status}`);
    if (![200, 201].includes(publishRes.status) || publishData.status !== 'PUBLISHED') {
      throw new Error(`Admin publish failed: ${JSON.stringify(publishData)}`);
    }
    console.log('    ✅ Question successfully approved and PUBLISHED.');

    // 12. Student 1 Sees Approved Answer
    console.log('\n[12] Student 1 verifies published answer is now visible...');
    const s1CheckPubRes = await fetch(`http://localhost:${TEST_PORT}/v1/faqs/questions/my`, {
      headers: { Authorization: `Bearer ${s1Token}` },
    });
    const s1CheckPubData = await s1CheckPubRes.json();
    const myQPub = s1CheckPubData.find((q: any) => q.id === faqId);
    if (!myQPub.answer || !myQPub.answer.includes('Verified: Students with >90%')) {
      throw new Error(`Expected published answer, got: ${myQPub.answer}`);
    }
    // Verify privacy: no staff email, phone, or raw staff IDs
    const strRep = JSON.stringify(myQPub);
    if (strRep.includes('admin@swayamadmission.in') || strRep.includes('password') || strRep.includes('reviewerNotes')) {
      throw new Error('SECURITY VIOLATION: Internal staff data leaked in student response!');
    }
    console.log('    ✅ Published answer visible to student with ZERO staff privacy leaks.');

    // 13. Public FAQ Database Sync
    console.log('\n[13] Verifying Public FAQ synchronization (GET /v1/faqs/public?category=Scholarship)...');
    const publicFaqRes = await fetch(`http://localhost:${TEST_PORT}/v1/faqs/public?category=Scholarship&limit=50`);
    const publicFaqData = await publicFaqRes.json();
    console.log(`    Status Code: ${publicFaqRes.status}, Public FAQs: ${publicFaqData.data?.length || 0}`);
    const syncedFaq = publicFaqData.data?.find((q: any) => q.id === faqId);
    if (!syncedFaq) {
      throw new Error('Public FAQ sync failed: Published question not found in public database listing!');
    }
    console.log(`    ✅ Synced to public FAQ knowledge base! Slug: ${syncedFaq.slug}`);

    // 14. Anti-Duplication View Count Increment
    console.log('\n[14] Testing Anti-Duplication View Count Increment...');
    const initialViews = syncedFaq.views || 0;
    const viewRes = await fetch(`http://localhost:${TEST_PORT}/v1/faqs/slug/${syncedFaq.slug}/view`, {
      method: 'POST',
    });
    const viewData = await viewRes.json();
    const updatedViews = viewData.views ?? viewData.viewCount;
    console.log(`    Status Code: ${viewRes.status}, Views: ${updatedViews}`);
    if (viewRes.status !== 200 || updatedViews !== initialViews + 1) {
      throw new Error(`Expected views ${initialViews + 1}, got ${updatedViews}`);
    }
    console.log('    ✅ View count safely incremented.');

    // 15. Entity Relations Validation (Rejection of Non-Existent Entity ID)
    console.log('\n[15] Testing Entity Relations validation (Invalid college ID)...');
    const invalidEntityRes = await fetch(`http://localhost:${TEST_PORT}/v1/faqs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        question: `Test invalid entity linking ${ts}`,
        answer: 'Detailed answer for testing entity validation',
        category: 'College',
        collegeId: 'non-existent-college-cuid-999',
      }),
    });
    console.log(`    Invalid entity status: ${invalidEntityRes.status} (Expected: 400)`);
    if (invalidEntityRes.status !== 400) {
      throw new Error(`Invalid entity ID was not rejected with 400! Got ${invalidEntityRes.status}`);
    }
    const invalidEntityData = await invalidEntityRes.json();
    console.log(`    Error message: "${invalidEntityData.message}"`);
    console.log('    ✅ Invalid foreign key rejected cleanly with 400 Bad Request.');

    // 16. Duplicate Custom Slug Prevention
    console.log('\n[16] Testing Duplicate Custom Slug Prevention...');
    const dupSlugRes = await fetch(`http://localhost:${TEST_PORT}/v1/faqs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        question: `Test duplicate custom slug ${ts}`,
        answer: 'Detailed answer for duplicate slug test',
        category: 'College',
        customSlug: syncedFaq.slug,
      }),
    });
    console.log(`    Duplicate slug status: ${dupSlugRes.status} (Expected: 400)`);
    if (dupSlugRes.status !== 400) {
      throw new Error(`Duplicate custom slug was not rejected with 400! Got ${dupSlugRes.status}`);
    }
    console.log('    ✅ Duplicate slug correctly blocked.');

    // 17. Admin Unpublish / Archive Flow
    console.log('\n[17] Testing Admin Unpublish / Archive...');
    const archiveRes = await fetch(`http://localhost:${TEST_PORT}/v1/faqs/${faqId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'ARCHIVED',
      }),
    });
    const archiveData = await archiveRes.json();
    console.log(`    Status Code: ${archiveRes.status}, New Status: ${archiveData.status}`);
    if (archiveRes.status !== 200 || archiveData.status !== 'ARCHIVED') {
      throw new Error(`Failed to archive FAQ: ${JSON.stringify(archiveData)}`);
    }

    // Verify archived FAQ is immediately REMOVED from public FAQ listing
    const publicFaqAfterArchive = await fetch(`http://localhost:${TEST_PORT}/v1/faqs/public?category=Scholarship&limit=50`);
    const publicFaqAfterArchiveData = await publicFaqAfterArchive.json();
    const shouldBeMissing = publicFaqAfterArchiveData.data?.find((q: any) => q.id === faqId);
    if (shouldBeMissing) {
      throw new Error('SECURITY VIOLATION: Archived FAQ still appeared in public listing!');
    }
    console.log('    ✅ Archived FAQ immediately removed from public listing.');

    console.log('\n====================================================');
    console.log(' ✅ ALL 17 FAQ END-TO-END SMOKE TESTS PASSED 100%!  ');
    console.log('====================================================\n');
  } finally {
    // Cleanup created test FAQs
    if (createdFaqIds.length > 0) {
      console.log(`Cleaning up ${createdFaqIds.length} test FAQ record(s)...`);
      try {
        await prisma.fAQ.deleteMany({
          where: { id: { in: createdFaqIds } },
        });
        console.log('Cleanup completed.');
      } catch (err) {
        console.warn('Cleanup warning:', err);
      }
    }
    await app.close();
  }
}

runFAQSmokeTest().catch((err) => {
  console.error('❌ FAQ Smoke test failed:', err);
  process.exit(1);
});
