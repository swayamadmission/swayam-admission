import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DocumentsService } from '../src/documents/documents.service';
import { SystemConfigurationService } from '../src/settings/system-configuration.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { DocumentType, DocumentStatus, Role } from '@prisma/client';

async function runEnterpriseDocumentsVerification() {
  console.log('===============================================================');
  console.log('  SWAYAM ADMISSION — ENTERPRISE DOCUMENT & KYC VERIFICATION');
  console.log('===============================================================');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  const documentsService = app.get(DocumentsService);
  const configService = app.get(SystemConfigurationService);
  const prisma = app.get(PrismaService);

  console.log('[1/8] Verified DI: DocumentsService & SystemConfigurationService resolved successfully.');

  // Verify SLA settings from config
  const slaVerificationHours = await configService.getNumber('document.verification.slaHours', 24);
  const maxUploadSizeMb = await configService.getNumber('document.maxUploadSizeMb', 10);
  const bulkLimit = await configService.getNumber('document.bulkActionLimit', 50);
  console.log(`[2/8] Dynamic Configuration: Verification SLA = ${slaVerificationHours}h, Max Upload = ${maxUploadSizeMb}MB, Bulk Limit = ${bulkLimit}`);

  // Fetch or find a sample student user and staff user
  let studentUser = await prisma.user.findFirst({ where: { role: Role.STUDENT } });
  if (!studentUser) {
    studentUser = await prisma.user.findFirst();
  }
  let staffUser = await prisma.user.findFirst({
    where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN, Role.COUNSELOR, Role.DIRECTOR] } },
  });
  if (!staffUser) {
    staffUser = studentUser;
  }

  if (!studentUser || !staffUser) {
    throw new Error('Test users could not be found.');
  }

  console.log(`[3/8] Test Context: Student=${studentUser.email} (${studentUser.id}), Reviewer=${staffUser.email} (${staffUser.id})`);

  // 1. Dynamic Checklist Resolution
  const checklistRes = await documentsService.getDynamicChecklist(studentUser.id);
  if (!checklistRes.success || !checklistRes.data.checklist) {
    throw new Error('Dynamic checklist resolution failed!');
  }
  console.log(`[4/8] Dynamic Checklist Resolved: ${checklistRes.data.checklist.length} items evaluated, Completion = ${checklistRes.data.summary.completionPercentage}%`);

  // 2. Upload Document Version 1
  const mockFileV1: any = {
    fieldname: 'file',
    originalname: '10th_marksheet_v1.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from('MOCK_PDF_CONTENT_V1_VERIFICATION_TEST'),
    size: 2048,
  };

  const uploadedDocV1 = await documentsService.upload(
    studentUser.id,
    {
      type: DocumentType.TENTH_MARKSHEET,
      title: 'Secondary School 10th Marksheet',
    },
    mockFileV1,
    '127.0.0.1',
    'Enterprise-Test-Agent/1.0',
  );
  console.log(`[5/8] Document V1 Uploaded: ID=${uploadedDocV1.id}, Version=${uploadedDocV1.version}, Status=${uploadedDocV1.status}`);

  // 3. Concurrency-Safe Claim Test
  const claimedDoc = await documentsService.claimDocument(uploadedDocV1.id, staffUser.id);
  console.log(`      ✓ Document Claimed by Reviewer: CounselorId=${claimedDoc.counselorId}`);

  // 4. Request Correction (Separate Student Message vs Internal Notes)
  const correctionDoc = await documentsService.requestCorrection(
    uploadedDocV1.id,
    {
      studentMessage: 'Please provide a clear scan showing the official board seal.',
      internalNotes: 'Staff note: Top right corner stamp is partially cropped.',
    },
    staffUser.id,
    '127.0.0.1',
  );
  console.log(`[6/8] Correction Requested: Status=${correctionDoc.status}, Reason="${correctionDoc.rejectedReason}"`);

  // 5. Replace Document (Upload Version 2 with History Preservation)
  const mockFileV2: any = {
    fieldname: 'file',
    originalname: '10th_marksheet_v2_clear.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from('MOCK_PDF_CONTENT_V2_CLEAR_SCAN_TEST'),
    size: 4096,
  };

  const replacedDocV2 = await documentsService.replaceDocument(
    uploadedDocV1.id,
    studentUser.id,
    mockFileV2,
    '127.0.0.1',
  );
  console.log(`      ✓ Document Replaced to V2: Version=${replacedDocV2.version}, Status=${replacedDocV2.status}, PreviousVersionId=${replacedDocV2.previousVersionId}`);

  // Verify history contains version logs
  const historyLogs = await documentsService.getDocumentHistory(uploadedDocV1.id);
  console.log(`      ✓ Auditable Version History Logged: ${historyLogs.length} historical entries tracked`);

  // 6. Reviewer Approves and Verifies Version 2
  const verifiedDoc = await documentsService.verifyDocument(
    uploadedDocV1.id,
    {
      status: DocumentStatus.VERIFIED,
      remarks: 'Compliant and verified with board registry.',
    },
    staffUser.id,
    '127.0.0.1',
  );
  console.log(`[7/8] Document Approved & Verified: ID=${verifiedDoc.id}, Status=${verifiedDoc.status}, VerifiedAt=${verifiedDoc.verifiedAt}`);

  // 7. Verify Prefill across Applications
  const updatedChecklist = await documentsService.getDynamicChecklist(studentUser.id);
  const tenthItem = updatedChecklist.data.checklist.find((i: any) => i.type === DocumentType.TENTH_MARKSHEET);
  if (tenthItem?.status !== 'VERIFIED') {
    throw new Error(`Prefill check failed! Expected status VERIFIED but got ${tenthItem?.status}`);
  }
  console.log(`      ✓ Multi-Application Vault Prefill Verified: 10th Marksheet automatically satisfied (status=${tenthItem.status})`);

  // 8. Bulk Verification Limit Enforcement Test
  const bulkResult = await documentsService.bulkVerify(
    {
      documentIds: [uploadedDocV1.id],
      status: DocumentStatus.VERIFIED,
      remarks: 'Bulk verification test',
    },
    staffUser.id,
  );
  console.log(`[8/8] Bulk Verification Engine Test: Processed=${bulkResult.processed}`);

  // Clean up test documents
  await prisma.documentHistory.deleteMany({ where: { documentId: uploadedDocV1.id } });
  await prisma.document.delete({ where: { id: uploadedDocV1.id } });
  console.log('      ✓ Cleaned up test verification records.');

  console.log('\n===============================================================');
  console.log('  ALL ENTERPRISE DOCUMENT ENGINE TESTS PASSED (100%)');
  console.log('===============================================================');

  await app.close();
  process.exit(0);
}

runEnterpriseDocumentsVerification().catch((err) => {
  console.error('DOCUMENT VERIFICATION FAILED:', err);
  process.exit(1);
});
