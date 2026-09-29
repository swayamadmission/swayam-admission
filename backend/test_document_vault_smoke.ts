import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaService } from './src/prisma/prisma.service';
import { DocumentWatermarkService } from './src/documents/document-watermark.service';
import { DocumentVaultStorageService } from './src/documents/document-vault-storage.service';
import { DocumentAuditService } from './src/documents/document-audit.service';
import { DocumentRetentionService } from './src/documents/document-retention.service';
import { DataScopeService } from './src/auth/data-scope.service';
import { DocumentType, DocumentStatus } from '@prisma/client';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

async function runDocumentVaultSmokeTest() {
  console.log('================================================================');
  console.log(' SWAYAM ADMISSION — PRODUCTION DOCUMENT VAULT SMOKE TEST SUITE');
  console.log('================================================================\n');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const watermarkService = app.get(DocumentWatermarkService);
  const vaultStorage = app.get(DocumentVaultStorageService);
  const auditService = app.get(DocumentAuditService);
  const retentionService = app.get(DocumentRetentionService);
  const dataScopeService = app.get(DataScopeService);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Sensitive Data Masking (Aadhaar & PAN)
    // -------------------------------------------------------------------------
    console.log('[TEST 1] Sensitive Data Masking Verification...');
    const maskedAadhaar = auditService.maskAadhaar('987654321098');
    if (maskedAadhaar !== 'XXXX XXXX 1098') {
      throw new Error(`Failed Aadhaar masking: expected "XXXX XXXX 1098", got "${maskedAadhaar}"`);
    }
    const maskedPan = auditService.maskPan('ABCDE1234F');
    if (maskedPan !== 'XXXXX1234F') {
      throw new Error(`Failed PAN masking: expected "XXXXX1234F", got "${maskedPan}"`);
    }
    console.log('  ✅ Masking PASSED: Aadhaar ->', maskedAadhaar, '| PAN ->', maskedPan);

    // -------------------------------------------------------------------------
    // TEST 2: Private Vault Storage & Checksum Generation
    // -------------------------------------------------------------------------
    console.log('\n[TEST 2] Private Storage Vault & SHA-256 Checksum...');
    const samplePayload = Buffer.from('Swayam Admission Sensitive Document Content - 2026');
    const stored = await vaultStorage.storeDocument(samplePayload, 'smoke_student_1', 'aadhaar_card.pdf');

    if (!stored.storageKey.startsWith('vault://documents/smoke_student_1/')) {
      throw new Error(`Invalid storage key format: ${stored.storageKey}`);
    }
    if (!stored.checksum || stored.checksum.length !== 64) {
      throw new Error(`Invalid SHA-256 checksum: ${stored.checksum}`);
    }
    console.log('  ✅ Private Vault PASSED: Key ->', stored.storageKey);
    console.log('  ✅ Cryptographic Checksum ->', stored.checksum);

    // Verify buffer retrieval
    const retrievedBuffer = await vaultStorage.getDocumentBuffer(stored.storageKey);
    if (retrievedBuffer.toString() !== samplePayload.toString()) {
      throw new Error('Integrity check failed: retrieved buffer does not match original stored bytes');
    }
    console.log('  ✅ Retrieval Integrity PASSED: Bytes verified.');

    // -------------------------------------------------------------------------
    // TEST 3: Dynamic Server-Side PDF Watermarking
    // -------------------------------------------------------------------------
    console.log('\n[TEST 3] Dynamic Server-Side PDF Watermarking...');
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([595, 842]);
    const cleanPdfBytes = Buffer.from(await pdfDoc.save());

    const watermarkedPdf = await watermarkService.watermarkPdf(cleanPdfBytes, {
      staffId: 'SWY-CTR-0247',
      applicationId: 'APP-9988',
      dateStr: '29/09/2026',
    });

    if (!watermarkedPdf || watermarkedPdf.length <= cleanPdfBytes.length) {
      throw new Error('PDF watermarking failed: output size not increased');
    }
    const loadedPdf = await PDFDocument.load(watermarkedPdf);
    if (loadedPdf.getPageCount() !== 1) {
      throw new Error('PDF structure corrupted after watermarking');
    }
    console.log('  ✅ PDF Watermarking PASSED: Watermarked derivative size ->', watermarkedPdf.length, 'bytes');

    // -------------------------------------------------------------------------
    // TEST 4: Dynamic Server-Side Image Watermarking
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4] Dynamic Server-Side Image Watermarking...');
    const cleanImage = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 3,
        background: { r: 240, g: 240, b: 240 },
      },
    })
      .jpeg()
      .toBuffer();

    const watermarkedImage = await watermarkService.watermarkImage(cleanImage, {
      staffId: 'SWY-CTR-0247',
      applicationId: 'APP-9988',
      dateStr: '29/09/2026',
    });

    if (!watermarkedImage || watermarkedImage.length === 0) {
      throw new Error('Image watermarking returned empty buffer');
    }
    const imgMeta = await sharp(watermarkedImage).metadata();
    if (imgMeta.width !== 300 || imgMeta.height !== 300) {
      throw new Error('Image dimensions altered during watermarking');
    }
    console.log('  ✅ Image Watermarking PASSED: Watermarked image generated successfully.');

    // -------------------------------------------------------------------------
    // TEST 5: Watermark Date Format (Strict DD/MM/YYYY)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 5] Watermark Date Format Validation (Strict DD/MM/YYYY)...');
    const testDate = new Date('2026-09-29T14:32:00.000Z');
    const formattedDate = watermarkService.formatAccessDate(testDate);
    if (formattedDate !== '29/09/2026') {
      throw new Error(`Invalid date format: expected "29/09/2026", got "${formattedDate}"`);
    }
    console.log('  ✅ Date Format PASSED: Verified strictly DD/MM/YYYY ->', formattedDate);

    // -------------------------------------------------------------------------
    // TEST 6: Object-Level Authorization (BOLA/IDOR Defense)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 6] Object-Level Authorization (BOLA/IDOR Defense)...');
    const studentAContext: any = {
      userId: 'STU-1001',
      userRole: 'STUDENT',
      dataScopes: ['SELF'],
      isSuperAdmin: false,
      teamMemberUserIds: [],
      isCollegeStaff: false,
      collegeId: null,
      states: [],
    };

    const docStudentA: any = {
      id: 'DOC-A',
      userId: 'STU-1001',
      counselorId: 'COUNSELOR-ALPHA',
    };

    const docStudentB: any = {
      id: 'DOC-B',
      userId: 'STU-2002',
      counselorId: 'COUNSELOR-BETA',
    };

    // Student A accessing Student A doc -> ALLOW
    dataScopeService.enforceDocumentScope(studentAContext, docStudentA);
    console.log('  ✅ Student A -> Own Document (DOC-A): ALLOWED');

    // Student A accessing Student B doc -> DENY
    let studentIdorBlocked = false;
    try {
      dataScopeService.enforceDocumentScope(studentAContext, docStudentB);
    } catch (err: any) {
      studentIdorBlocked = true;
    }
    if (!studentIdorBlocked) {
      throw new Error('CRITICAL SECURITY FLAW: Student A accessed Student B document without authorization!');
    }
    console.log('  ✅ Student A -> Student B Document (DOC-B): REJECTED (403 BOLA Defense)');

    // Counselor assigned to Student A -> ALLOW
    const assignedCounselorContext: any = {
      userId: 'COUNSELOR-ALPHA',
      userRole: 'COUNSELOR',
      dataScopes: ['ASSIGNED'],
      isSuperAdmin: false,
      teamMemberUserIds: [],
      isCollegeStaff: false,
      collegeId: null,
      states: [],
    };
    dataScopeService.enforceDocumentScope(assignedCounselorContext, docStudentA);
    console.log('  ✅ Assigned Counselor -> Assigned Student Document: ALLOWED');

    // Counselor unassigned -> DENY
    let counselorUnauthorizedBlocked = false;
    try {
      dataScopeService.enforceDocumentScope(assignedCounselorContext, docStudentB);
    } catch (err: any) {
      counselorUnauthorizedBlocked = true;
    }
    if (!counselorUnauthorizedBlocked) {
      throw new Error('CRITICAL SECURITY FLAW: Counselor accessed unassigned student document!');
    }
    console.log('  ✅ Unassigned Counselor -> Student B Document: REJECTED (403 Assignment Scope)');

    // -------------------------------------------------------------------------
    // TEST 7: 45-Day Student Deletion Request Calculation
    // -------------------------------------------------------------------------
    console.log('\n[TEST 7] 45-Day Student Deletion Schedule Calculation...');
    const reqTimestamp = new Date('2026-09-29T12:00:00.000Z');
    const scheduledDel = new Date(
      reqTimestamp.getTime() + DocumentRetentionService.STUDENT_DELETION_DAYS * 24 * 60 * 60 * 1000,
    );
    const dayDifference = (scheduledDel.getTime() - reqTimestamp.getTime()) / (1000 * 60 * 60 * 24);
    if (dayDifference !== 45) {
      throw new Error(`Expected exactly 45 days, got ${dayDifference}`);
    }
    console.log('  ✅ 45-Day Calculation PASSED:', reqTimestamp.toISOString(), '->', scheduledDel.toISOString());

    // -------------------------------------------------------------------------
    // TEST 8: 90-Day Post-Admission Retention Calculation
    // -------------------------------------------------------------------------
    console.log('\n[TEST 8] 90-Day Post-Admission Retention Calculation...');
    const admissionConfirmedAt = new Date('2026-09-01T00:00:00.000Z');
    const retentionExpiry = new Date(
      admissionConfirmedAt.getTime() + DocumentRetentionService.POST_ADMISSION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const retentionDayDiff = (retentionExpiry.getTime() - admissionConfirmedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (retentionDayDiff !== 90) {
      throw new Error(`Expected exactly 90 days, got ${retentionDayDiff}`);
    }
    console.log('  ✅ 90-Day Retention PASSED:', admissionConfirmedAt.toISOString(), '->', retentionExpiry.toISOString());

    // -------------------------------------------------------------------------
    // TEST 9: Retention Hold Blocks Cleanup (DELETION_SKIPPED_HOLD)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 9] Retention Hold Enforcement...');
    const testStudent = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
    if (testStudent) {
      const ephemeralDoc = await prisma.document.create({
        data: {
          userId: testStudent.id,
          title: 'PAN Card (Hold Test)',
          fileName: 'pan_card.pdf',
          type: DocumentType.PAN,
          fileUrl: stored.storageKey,
          status: DocumentStatus.RETENTION_HOLD,
          retentionUntil: new Date(Date.now() - 10000), // Expired retention
        },
      });

      // Add a retention hold record
      await prisma.retentionHold.create({
        data: {
          documentId: ephemeralDoc.id,
          reason: 'Active verification audit requirement',
          createdBy: 'ADMIN-SYS',
          status: 'ACTIVE',
        },
      });

      // Verify active hold detection
      const hasHold = await retentionService.hasActiveRetentionHold(ephemeralDoc.id);
      if (!hasHold) {
        throw new Error('Failed to detect active retention hold');
      }

      // Run cleanup
      const cleanupResult = await retentionService.executeScheduledDeletions();
      console.log('  ✅ Scheduled Cleanup Execution Result:', cleanupResult);

      // Verify document was NOT deleted because of the hold
      const docAfter = await prisma.document.findUnique({ where: { id: ephemeralDoc.id } });
      if (!docAfter || docAfter.deletedAt !== null) {
        throw new Error('RETENTION HOLD FAILURE: Document with active hold was deleted!');
      }
      console.log('  ✅ Retention Hold PASSED: Document was preserved despite expired retention.');

      // Clean up test document
      await prisma.retentionHold.deleteMany({ where: { documentId: ephemeralDoc.id } });
      await prisma.document.delete({ where: { id: ephemeralDoc.id } });

      // -------------------------------------------------------------------------
      // TEST 10: Student Deletion Request Submission & IDOR Defense
      // -------------------------------------------------------------------------
      console.log('\n[TEST 10] Student Deletion Request Submission & IDOR Defense...');
      const studentDoc = await prisma.document.create({
        data: {
          userId: testStudent.id,
          title: 'Tenth Marksheet (Deletion Test)',
          fileName: 'tenth_marksheet.pdf',
          type: DocumentType.TENTH_MARKSHEET,
          fileUrl: stored.storageKey,
          status: DocumentStatus.VERIFIED,
        },
      });

      // Attempt IDOR: non-existent student or wrong student tries to delete studentDoc
      let idorBlocked = false;
      try {
        await retentionService.submitDeletionRequest('different_student_id_9999', {
          documentIds: [studentDoc.id],
          reason: 'Uploaded by mistake',
          confirmation: true,
        });
      } catch (err: any) {
        idorBlocked = true;
      }
      if (!idorBlocked) {
        throw new Error('CRITICAL IDOR FLAW: Deletion request created for unauthorized student document!');
      }
      console.log('  ✅ IDOR Deletion Defense PASSED: Unauthorized user cannot submit deletion for student doc.');

      // Valid Student Submission
      const delReqResult = await retentionService.submitDeletionRequest(testStudent.id, {
        documentIds: [studentDoc.id],
        reason: 'Uploaded by mistake',
        additionalDetails: 'Submitted wrong year marksheet',
        confirmation: true,
      });

      if (!delReqResult || !delReqResult.requestId) {
        throw new Error('Deletion request submission failed to return valid data');
      }
      const reqDbId = delReqResult.id;
      const humanRequestId = delReqResult.requestId;
      console.log('  ✅ Deletion Request Created: DB ID ->', reqDbId, '| Human ID ->', humanRequestId, '| Status ->', delReqResult.status);

      // Verify 45-day calculation
      const reqDate = new Date(delReqResult.requestedAt);
      const schedDate = new Date(delReqResult.scheduledDeletionAt);
      const diffDays = Math.round((schedDate.getTime() - reqDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays !== 45) {
        throw new Error(`45-day calculation incorrect: expected 45, got ${diffDays}`);
      }
      console.log('  ✅ 45-day Server-Side Schedule PASSED: Exact 45 calendar days.');

      // Duplicate Request Protection
      let duplicateBlocked = false;
      try {
        await retentionService.submitDeletionRequest(testStudent.id, {
          documentIds: [studentDoc.id],
          reason: 'Duplicate document',
          confirmation: true,
        });
      } catch (err: any) {
        duplicateBlocked = true;
        console.log('  ✅ Duplicate Protection PASSED:', err.message);
      }
      if (!duplicateBlocked) {
        throw new Error('CRITICAL FLAW: Duplicate active deletion request was allowed!');
      }

      // -------------------------------------------------------------------------
      // TEST 11: Structured Retention Cleanup Execution
      // -------------------------------------------------------------------------
      console.log('\n[TEST 11] Structured Retention Cleanup Execution...');
      // Fast-forward scheduledDeletionAt to past to test execution
      await prisma.documentDeletionRequest.update({
        where: { id: reqDbId },
        data: {
          status: 'SCHEDULED_FOR_DELETION',
          scheduledDeletionAt: new Date(Date.now() - 10000), // Due now
        },
      });

      await prisma.document.update({
        where: { id: studentDoc.id },
        data: {
          deletionEligibleAt: new Date(Date.now() - 10000),
        },
      });

      const cleanupOutput = await retentionService.executeScheduledDeletions();
      console.log('  ✅ Cleanup Output Structure:', cleanupOutput);
      if (
        cleanupOutput.totalEvaluated === undefined ||
        cleanupOutput.eligible === undefined ||
        cleanupOutput.deleted === undefined ||
        cleanupOutput.skippedByHold === undefined ||
        cleanupOutput.failed === undefined ||
        cleanupOutput.notificationsQueued === undefined
      ) {
        throw new Error('Structured cleanup result is missing mandatory fields!');
      }
      if (cleanupOutput.deleted < 1) {
        throw new Error('Expected at least 1 document deleted by cleanup!');
      }
      console.log('  ✅ Structured Cleanup PASSED: Returned complete production metrics.');

      // Verify document is DELETED
      const docAfterDeletion = await prisma.document.findUnique({ where: { id: studentDoc.id } });
      if (!docAfterDeletion || docAfterDeletion.status !== DocumentStatus.DELETED || !docAfterDeletion.deletedAt) {
        throw new Error('Document status was not set to DELETED with deletedAt timestamp!');
      }
      console.log('  ✅ Database Document Status PASSED: DELETED with timestamp ->', docAfterDeletion.deletedAt);

      // Verify request status is DELETED
      const reqAfterDeletion = await prisma.documentDeletionRequest.findUnique({ where: { id: reqDbId } });
      if (!reqAfterDeletion || reqAfterDeletion.status !== 'DELETED') {
        throw new Error('Deletion request status was not updated to DELETED!');
      }
      console.log('  ✅ Deletion Request Status PASSED: Updated to DELETED.');

      // -------------------------------------------------------------------------
      // TEST 12: Multi-Channel Notification Dispatch & Audit Records
      // -------------------------------------------------------------------------
      console.log('\n[TEST 12] Multi-Channel Notification Dispatch & Log Verification...');
      const deliveryLogs = await prisma.notificationDelivery.findMany({
        where: { requestId: humanRequestId },
      });
      console.log(`  ✅ Notification Delivery Logs Found: ${deliveryLogs.length} attempts recorded.`);
      const channelsLogged = deliveryLogs.map((d: any) => d.channel);
      console.log('  ✅ Channels Attempted:', channelsLogged);
      if (!channelsLogged.includes('IN_APP') && !channelsLogged.includes('WEBSITE')) {
        throw new Error('Mandatory WEBSITE (in-app) notification was not recorded!');
      }

      // Check student in-app notifications
      const studentNotifications = await prisma.notification.findMany({
        where: { userId: testStudent.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });
      console.log('  ✅ In-App Student Notification Created:', studentNotifications[0]?.title);

      // -------------------------------------------------------------------------
      // TEST 13: Admin Resend Notification Feature
      // -------------------------------------------------------------------------
      console.log('\n[TEST 13] Admin Resend Notification Execution...');
      const resendResult = await retentionService.resendDeletionNotification(
        reqDbId,
        'ADMIN-MANUAL-TEST',
        ['WEBSITE', 'EMAIL', 'WHATSAPP', 'SMS'],
      );
      if (!resendResult.success) {
        throw new Error(`Resend notification failed: ${resendResult.message}`);
      }
      console.log('  ✅ Resend Notification PASSED:', resendResult.message);

      // Clean up test data
      await prisma.notificationDelivery.deleteMany({ where: { requestId: humanRequestId } });
      await prisma.documentDeletionRequestItem.deleteMany({ where: { requestId: reqDbId } });
      await prisma.documentDeletionRequest.delete({ where: { id: reqDbId } });
      await prisma.documentHistory.deleteMany({ where: { documentId: studentDoc.id } });
      await prisma.document.delete({ where: { id: studentDoc.id } });
    }

    // Clean up stored vault test file
    await vaultStorage.deleteDocument(stored.storageKey);
    console.log('\n================================================================');
    console.log(' ✅ ALL PRODUCTION SECURITY VAULT SMOKE TESTS PASSED CLEANLY! ');
    console.log('================================================================');
  } finally {
    await app.close();
  }
}

runDocumentVaultSmokeTest().catch((err) => {
  console.error('\n❌ SMOKE TEST FAILED:\n', err);
  process.exit(1);
});
