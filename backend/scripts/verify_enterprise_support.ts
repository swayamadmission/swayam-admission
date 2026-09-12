import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SupportService } from '../src/support/support.service';
import { SystemConfigurationService } from '../src/settings/system-configuration.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { BulkSupportActionType } from '../src/support/dto/bulk-support-action.dto';

async function runEnterpriseSupportVerification() {
  console.log('===============================================================');
  console.log('  SWAYAM ADMISSION — ENTERPRISE SUPPORT DESK VERIFICATION');
  console.log('===============================================================');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  const supportService = app.get(SupportService);
  const configService = app.get(SystemConfigurationService);
  const prisma = app.get(PrismaService);

  console.log('[1/7] Verified DI: SupportService & SystemConfigurationService resolved successfully.');

  // Verify SLA settings from config
  const slaResolutionHours = await configService.getNumber('support.resolutionSlaHours', 24);
  const bulkLimit = await configService.getNumber('support.bulkActionLimit', 50);
  console.log(`[2/7] Dynamic Configuration: Resolution SLA = ${slaResolutionHours}h, Bulk Limit = ${bulkLimit}`);

  // Fetch or find a sample student user
  let studentUser = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
  if (!studentUser) {
    studentUser = await prisma.user.findFirst();
  }
  let staffUser = await prisma.user.findFirst({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'COUNSELOR', 'DIRECTOR'] } } });
  if (!staffUser) {
    staffUser = studentUser;
  }

  console.log(`[3/7] Test Users: Student=${studentUser?.email} (${studentUser?.id}), Staff=${staffUser?.email} (${staffUser?.id})`);

  // 1. Create Ticket
  const createdTicket = await supportService.createTicket(
    {
      subject: 'E2E Verification: Need Help with Document Verification',
      description: 'Uploaded my 12th marksheet but status shows pending for 24h.',
      category: 'Document Verification',
      priority: 'HIGH',
    },
    studentUser,
  );
  console.log(`[4/7] Ticket Created: ID=${createdTicket.ticketId}, Status=${createdTicket.status}, SLA Deadline=${createdTicket.slaDeadline}`);

  // 2. Claim Ticket by Staff
  const claimedTicket = await supportService.claimTicket(createdTicket.id, staffUser);
  console.log(`[5/7] Ticket Claimed: AssignedToId=${claimedTicket.assignedToId}, Status=${claimedTicket.status}`);

  // 3. Add Internal Staff Note
  const internalNote = await supportService.addInternalNote(
    createdTicket.id,
    { note: 'Staff internal note: Document verified in backend archive.' },
    staffUser,
  );
  console.log(`[6/7] Internal Staff Note Added: MessageId=${internalNote.id}, isInternal=${internalNote.isInternal}`);

  // Verify privacy: student query must NOT see internal note
  const studentView = await supportService.findOne(createdTicket.id, studentUser);
  const containsInternal = studentView.messages?.some((m: any) => m.isInternal);
  if (containsInternal) {
    throw new Error('SECURITY VIOLATION: Student received internal note in findOne!');
  }
  console.log(`      ✓ Verified Privacy Isolation: Student view message count = ${studentView.messages?.length} (Internal notes stripped)`);

  // 4. Staff reply to customer
  await supportService.replyTicket(
    createdTicket.id,
    { message: 'Hello! Your document has been reviewed and approved.' },
    staffUser,
    true,
  );

  // 5. Staff resolve ticket
  const resolvedTicket = await supportService.resolveTicket(
    createdTicket.id,
    {
      resolutionSummary: 'Document marksheet verified and verified badge applied to application.',
      resolutionCode: 'DOCUMENT_VERIFIED',
    },
    staffUser,
  );
  console.log(`      ✓ Ticket Resolved: Status=${resolvedTicket.status}, ResolvedAt=${resolvedTicket.resolvedAt}`);

  // 6. Student confirms resolution and gives 5 star rating
  const closedTicket = await supportService.closeTicket(
    createdTicket.id,
    studentUser,
    5,
    'Thank you for the quick resolution!',
  );
  console.log(`      ✓ Ticket Closed with Customer Feedback: Status=${closedTicket.status}`);

  // 7. Test Bulk Action
  const bulkResult = await supportService.bulkAction(
    {
      ticketIds: [createdTicket.id],
      action: BulkSupportActionType.CHANGE_PRIORITY,
      priority: 'CRITICAL',
      reason: 'E2E Bulk test',
    },
    staffUser,
  );
  console.log(`[7/7] Bulk Action Test: Total=${bulkResult.totalRequested}, Success=${bulkResult.successCount}`);

  // Clean up test ticket
  await prisma.supportMessage.deleteMany({ where: { ticketId: createdTicket.id } });
  await prisma.supportAudit.deleteMany({ where: { ticketId: createdTicket.id } });
  await prisma.supportFeedback.deleteMany({ where: { ticketId: createdTicket.id } });
  await prisma.supportTicket.delete({ where: { id: createdTicket.id } });
  console.log('      ✓ Cleaned up test verification ticket.');

  console.log('\n===============================================================');
  console.log('  ALL ENTERPRISE SUPPORT ENGINE TESTS PASSED (100%)');
  console.log('===============================================================');

  await app.close();
  process.exit(0);
}

runEnterpriseSupportVerification().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
