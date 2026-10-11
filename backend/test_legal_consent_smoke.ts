import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from './src/prisma/prisma.service';
import { LegalPolicyService } from './src/legal/legal-policy.service';
import { ConsentService } from './src/legal/consent.service';
import { GrievanceService } from './src/legal/grievance.service';

async function runLegalConsentSmokeTest() {
  console.log('================================================================');
  console.log(' SWAYAM ADMISSION — LEGAL & POLICIES + ACTION CONSENT SMOKE SUITE');
  console.log('================================================================\n');

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

  const TEST_PORT = 3336;
  await app.listen(TEST_PORT);
  console.log(`✅ Test server running on http://localhost:${TEST_PORT}\n`);

  const prisma = app.get(PrismaService);
  const legalPolicyService = app.get(LegalPolicyService);
  const consentService = app.get(ConsentService);
  const grievanceService = app.get(GrievanceService);

  let passedTests = 0;
  let totalTests = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAIL: [${testName}] ${detail || ''}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
    console.log(`  ✅ PASS: [${testName}] ${detail || ''}`);
    passedTests++;
  };

  try {
    // -------------------------------------------------------------
    // TEST 1: Database Seeding & 16 Published Policy Verification
    // -------------------------------------------------------------
    console.log('\n[1] Verifying 16 Published Authoritative Swayam Admission Policies...');
    const pubPoliciesRes = await fetch(`http://localhost:${TEST_PORT}/v1/legal-policies`);
    assert(pubPoliciesRes.status === 200, 'GET /v1/legal-policies status 200');
    const pubData = await pubPoliciesRes.json();
    assert(pubData.success === true, 'Response success flag is true');
    assert(Array.isArray(pubData.data), 'Policies data is array');
    assert(pubData.data.length >= 16, `Found ${pubData.data.length} published policies (expected >= 16)`);

    // Verify key policy slugs exist
    const slugs = pubData.data.map((p: any) => p.slug);
    const requiredSlugs = [
      'terms-and-conditions',
      'privacy-policy',
      'refund-cancellation-policy',
      'admission-counselling-disclaimer',
      'student-application-terms',
      'data-document-processing-consent',
      'payment-terms',
      'cookie-policy',
      'ai-counselor-terms-disclaimer',
      'referral-rewards-terms',
      'study-material-terms',
      'college-partner-terms',
      'intellectual-property-policy',
      'grievance-redressal-policy',
      'contact-legal-information',
      'document-deletion-data-removal-terms',
    ];

    for (const slug of requiredSlugs) {
      assert(slugs.includes(slug), `Policy slug exists: ${slug}`);
    }

    // -------------------------------------------------------------
    // TEST 2: Single Policy By Slug & Version History
    // -------------------------------------------------------------
    console.log('\n[2] Testing Public Policy Retrieval by Slug & Version History...');
    const singleRes = await fetch(`http://localhost:${TEST_PORT}/v1/legal-policies/terms-and-conditions`);
    assert(singleRes.status === 200, 'GET /v1/legal-policies/terms-and-conditions status 200');
    const singleData = await singleRes.json();
    assert(singleData.data.title.includes('Terms & Conditions'), 'Policy title correct');
    assert(singleData.data.version.includes('1.0'), 'Initial version is 1.0 or v1.0');
    assert(singleData.data.content.includes('Swayam Admission'), 'Brand name Swayam Admission in content');

    const versionsRes = await fetch(`http://localhost:${TEST_PORT}/v1/legal-policies/terms-and-conditions/versions`);
    assert(versionsRes.status === 200, 'GET /v1/legal-policies/:slug/versions status 200');
    const versionsData = await versionsRes.json();
    assert(Array.isArray(versionsData.data) && versionsData.data.length >= 1, 'Version history contains items');

    // -------------------------------------------------------------
    // TEST 3: Action Requirements Lookup API (All 10 Protected Actions)
    // -------------------------------------------------------------
    console.log('\n[3] Testing Action Requirements API across 10 Protected Action Contexts...');
    const testActions = [
      { action: 'REGISTRATION', minPolicies: 2, mustInclude: 'TERMS_AND_CONDITIONS' },
      { action: 'APPLICATION_SUBMISSION', minPolicies: 2, mustInclude: 'STUDENT_APPLICATION_TERMS' },
      { action: 'DOCUMENT_UPLOAD', minPolicies: 1, mustInclude: 'DATA_DOCUMENT_PROCESSING_CONSENT' },
      { action: 'DOCUMENT_DELETION_REQUEST', minPolicies: 1, mustInclude: 'DOCUMENT_DELETION_DATA_REMOVAL_TERMS' },
      { action: 'PAYMENT', minPolicies: 2, mustInclude: 'PAYMENT_TERMS' },
      { action: 'STUDY_MATERIAL_PURCHASE', minPolicies: 2, mustInclude: 'STUDY_MATERIAL_TERMS' },
      { action: 'AI_COUNSELOR', minPolicies: 1, mustInclude: 'AI_COUNSELOR_TERMS_DISCLAIMER' },
      { action: 'REFERRAL', minPolicies: 1, mustInclude: 'REFERRAL_REWARDS_TERMS' },
      { action: 'COLLEGE_PARTNER_ACTION', minPolicies: 1, mustInclude: 'COLLEGE_PARTNER_TERMS' },
      { action: 'GRIEVANCE_DATA_REQUEST', minPolicies: 1, mustInclude: 'GRIEVANCE_REDRESSAL_POLICY' },
    ];

    for (const testAct of testActions) {
      const actRes = await fetch(`http://localhost:${TEST_PORT}/v1/legal-policies/action-requirements/${testAct.action}`);
      assert(actRes.status === 200, `Action requirement query for ${testAct.action} status 200`);
      const actData = await actRes.json();
      assert(actData.success === true, `Success true for ${testAct.action}`);
      assert(actData.data.policies.length >= testAct.minPolicies, `${testAct.action} returns >= ${testAct.minPolicies} policies`);
      const types = actData.data.policies.map((p: any) => p.policyType);
      assert(types.includes(testAct.mustInclude), `${testAct.action} includes required type ${testAct.mustInclude}`);
    }

    // -------------------------------------------------------------
    // TEST 4: Cookie Declaration Registry
    // -------------------------------------------------------------
    console.log('\n[4] Testing Public Cookie Registry Endpoint...');
    const cookieRes = await fetch(`http://localhost:${TEST_PORT}/v1/legal-policies/cookies`);
    assert(cookieRes.status === 200, 'GET /v1/legal-policies/cookies status 200');
    const cookieData = await cookieRes.json();
    assert(Array.isArray(cookieData.data), 'Cookie data is array');
    assert(cookieData.data.length >= 3, `Found ${cookieData.data.length} active cookies declared`);

    // -------------------------------------------------------------
    // TEST 5: Versioning & Immutability Engine
    // -------------------------------------------------------------
    console.log('\n[5] Testing Policy Lifecycle: DRAFT -> PUBLISH -> NEW VERSION -> ARCHIVE...');
    // Create draft policy
    const draftPolicy = await legalPolicyService.createPolicy(
      {
        policyType: 'CUSTOM_TEST_POLICY',
        slug: 'custom-test-policy',
        title: 'Custom Test Policy for Swayam Admission',
        content: '<p>Initial draft content for Swayam Admission legal testing.</p>',
        version: '1.0',
        effectiveDate: '2026-10-07',
        changeSummary: 'Initial test draft creation',
      },
      { id: 'system_smoke_test', fullName: 'System Smoke Test' } as any,
    );
    assert(draftPolicy.status === 'DRAFT', 'Created policy starts in DRAFT status');
    assert(draftPolicy.version === '1.0', 'Initial draft version is 1.0');

    // Publish draft policy
    const publishedV1 = await legalPolicyService.publishPolicy(draftPolicy.id, { id: 'system_smoke_test', fullName: 'System Smoke Test' } as any);
    assert(publishedV1.status === 'PUBLISHED', 'Published policy has PUBLISHED status');
    assert(publishedV1.publishedAt !== null, 'publishedAt timestamp recorded');

    // Create new version 1.1
    const newVersionDraft = await legalPolicyService.createNewVersion(
      publishedV1.id,
      {
        version: '1.1',
        content: '<p>Updated revision 1.1 content for Swayam Admission.</p>',
        changeSummary: 'Annual revision and terms update',
        effectiveDate: '2026-11-01',
      },
      { id: 'system_smoke_test', fullName: 'System Smoke Test' } as any,
    );
    assert(newVersionDraft.status === 'DRAFT', 'New version starts in DRAFT status');
    assert(newVersionDraft.version === '1.1', 'New version incremented to 1.1');
    assert(newVersionDraft.versionNumber === 2, 'versionNumber integer incremented to 2');

    // Verify v1.0 remains immutable and PUBLISHED while v1.1 is in DRAFT
    const v1Check = await prisma.legalPolicy.findUnique({ where: { id: publishedV1.id } });
    assert(v1Check?.status === 'PUBLISHED', 'v1.0 is still PUBLISHED while v1.1 is DRAFT');

    // Publish v1.1 -> v1.0 must be ARCHIVED automatically
    const publishedV1_1 = await legalPolicyService.publishPolicy(newVersionDraft.id, { id: 'system_smoke_test', fullName: 'System Smoke Test' } as any);
    assert(publishedV1_1.status === 'PUBLISHED', 'v1.1 is now PUBLISHED');

    const v1Archived = await prisma.legalPolicy.findUnique({ where: { id: publishedV1.id } });
    assert(v1Archived?.status === 'ARCHIVED', 'Previous version v1.0 transitioned to ARCHIVED');
    assert(v1Archived?.archivedAt !== null, 'v1.0 archivedAt timestamp recorded');

    // Clean up test policy records
    await prisma.legalPolicy.deleteMany({ where: { policyType: 'CUSTOM_TEST_POLICY' } });
    console.log('  ✅ Version lifecycle immutability verified and test records cleaned up.');

    // -------------------------------------------------------------
    // TEST 6: Authoritative Consent Validation & Persistence
    // -------------------------------------------------------------
    console.log('\n[6] Testing Authoritative Action Consent Validation & Database Recording...');
    // A. Validation failure on missing mandatory policies
    const invalidValidation = await consentService.validateActionConsent('REGISTRATION', [
      { policyType: 'TERMS_AND_CONDITIONS', policyVersion: '1.0' },
      // Privacy Policy omitted
    ]);
    assert(invalidValidation.isValid === false, 'Consent validation fails when mandatory policy is missing');
    assert(invalidValidation.missingPolicies.some((p: string) => p.toLowerCase().includes('privacy')), 'Missing Privacy Policy identified');

    // B. Validation success when all mandatory policies supplied
    const regReqs = await consentService.getActionRequirements('REGISTRATION');
    const validPolicies = regReqs.policies.map((p) => ({
      policyId: p.id,
      policyType: p.policyType,
      policyVersion: p.version,
    }));

    const validValidation = await consentService.validateActionConsent('REGISTRATION', validPolicies);
    assert(validValidation.isValid === true, 'Consent validation succeeds when all required policies provided');
    assert(validValidation.missingPolicies.length === 0, 'No missing policies reported');

    // C. Persist Consent Record
    const sampleUser = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
    if (sampleUser) {
      const recordResult = await consentService.recordConsent(
        sampleUser.id,
        {
          actionContext: 'REGISTRATION',
          acceptedPolicies: validPolicies,
        },
        { ipAddress: '127.0.0.1', userAgent: 'SmokeTest/1.0' },
      );
      assert(recordResult.count >= validPolicies.length, `Recorded ${recordResult.count} immutable acceptance records`);

      // Query records
      const auditQuery = await consentService.getConsentRecords({
        userId: sampleUser.id,
        actionContext: 'REGISTRATION',
      });
      assert(auditQuery.total >= validPolicies.length, 'Consent query returns persisted audit records');
      if (auditQuery.items.length > 0) {
        assert(auditQuery.items[0].ipAddress === '127.0.0.1', 'Audit query includes IP address');
      }
    }

    // -------------------------------------------------------------
    // TEST 7: Statutory Grievance Redressal Flow
    // -------------------------------------------------------------
    console.log('\n[7] Testing Grievance Redressal Lifecycle (Complaint ID GRV-YYYY-XXXX)...');
    const grievance = await grievanceService.submitGrievance({
      category: 'ADMISSION_COUNSELLING',
      subject: 'Inquiry regarding counseling allotment',
      description: 'Requesting clarification on quota allotment under Swayam Admission guidelines.',
      fullName: 'Smoke Test Candidate',
      email: 'candidate@example.com',
      mobile: '9876543210',
    });

    assert(grievance.complaintId.startsWith('GRV-'), `Generated complaint ID format verified: ${grievance.complaintId}`);
    assert(grievance.status === 'SUBMITTED', 'Initial status is SUBMITTED');

    // Admin updates status to UNDER_REVIEW
    const underReview = await grievanceService.updateGrievance(
      grievance.id,
      {
        status: 'UNDER_REVIEW',
        response: 'Assigned to Senior Admission Officer for document verification',
      },
      { id: 'admin_smoke_test', fullName: 'Smoke Test Admin' },
    );
    assert(underReview.status === 'UNDER_REVIEW', 'Status updated to UNDER_REVIEW');

    // Admin resolves grievance
    const resolved = await grievanceService.updateGrievance(
      grievance.id,
      {
        status: 'RESOLVED',
        resolution: 'Document verification completed and verified against statutory criteria.',
        response: 'Official resolution issued.',
      },
      { id: 'admin_smoke_test', fullName: 'Smoke Test Admin' },
    );
    assert(resolved.status === 'RESOLVED', 'Status updated to RESOLVED');
    assert(resolved.resolvedAt !== null, 'resolvedAt timestamp recorded');
    assert(Boolean(resolved.resolution?.includes('Document verification completed')), 'Resolution response text stored');

    // Clean up test grievance
    await prisma.grievance.delete({ where: { id: grievance.id } });
    console.log('  ✅ Grievance redressal lifecycle verified and cleaned up.');

    // -------------------------------------------------------------
    // TEST 8: Audit Logging Verification
    // -------------------------------------------------------------
    console.log('\n[8] Verifying Audit Trail Logs for Legal Actions...');
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: {
          in: [
            'POLICY_CREATED',
            'POLICY_PUBLISHED',
            'POLICY_ARCHIVED',
            'CONSENT_RECORDED',
            'GRIEVANCE_SUBMITTED',
            'GRIEVANCE_UPDATED',
          ],
        },
      },
      take: 10,
    });
    assert(auditLogs.length > 0, `Found ${auditLogs.length} audit log records for legal operations`);

    console.log('\n================================================================');
    console.log(` ALL SMOKE TESTS PASSED SUCCESSFULLY! (${passedTests}/${totalTests} Passed)`);
    console.log('================================================================\n');
  } finally {
    await app.close();
  }
}

runLegalConsentSmokeTest().catch((err) => {
  console.error('\n❌ Smoke Test Suite Terminated with Error:\n', err);
  process.exit(1);
});
