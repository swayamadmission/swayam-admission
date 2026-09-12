import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ReferralService } from '../src/referrals/referral.service';
import { SystemConfigurationService } from '../src/settings/system-configuration.service';
import { AuditService } from '../src/audit/audit.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { Role } from '@prisma/client';

async function runEnterpriseReferralsVerification() {
  console.log('===============================================================');
  console.log('  SWAYAM ADMISSION — ENTERPRISE REFERRAL & REWARD ENGINE');
  console.log('===============================================================');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  const referralService = app.get(ReferralService);
  const configService = app.get(SystemConfigurationService);
  const auditService = app.get(AuditService);
  const prisma = app.get(PrismaService);

  console.log('[1/10] Verified DI: ReferralService, SystemConfigurationService & AuditService resolved successfully.');

  // 1. Dynamic Configuration Retrieval
  const isEnabled = await configService.getBoolean('referral.enabled', true);
  const attributionWindow = await configService.getNumber('referral.attributionWindowDays', 90);
  const defaultReward = await configService.getNumber('referral.defaultRewardAmount', 500);
  const ruleVersion = await configService.getString('referral.rewardRuleVersion', 'v1.0');

  console.log(
    `[2/10] Dynamic Configuration: Enabled=${isEnabled}, Attribution Window=${attributionWindow}d, Default Reward=₹${defaultReward}, Rule=${ruleVersion}`,
  );

  // Find or pick a test student referrer and admin
  let studentReferrer = await prisma.user.findFirst({
    where: { role: Role.STUDENT },
  });
  if (!studentReferrer) {
    studentReferrer = await prisma.user.findFirst();
  }
  let adminUser = await prisma.user.findFirst({
    where: { role: { in: [Role.SUPER_ADMIN, Role.ADMIN] } },
  });
  if (!adminUser) adminUser = studentReferrer;

  if (!studentReferrer || !adminUser) {
    throw new Error('Test users could not be found.');
  }

  console.log(`[3/10] Test Context: Referrer=${studentReferrer.email} (${studentReferrer.id}), Admin=${adminUser.email}`);

  // 2. Referral Code Generation & Public Validation
  const codeProfile = await referralService.getOrCreateReferralCode(studentReferrer.id);
  console.log(`[4/10] Referral Code Profile: Code=${codeProfile.code}, ShareUrl=${codeProfile.shareUrl}`);

  const validation = await referralService.validateReferralCode(codeProfile.code);
  if (!validation.valid) throw new Error('Referral code validation failed!');
  console.log(`      ✓ Public Code Validation Passed: Referrer=${validation.referrerName}`);

  // 3. Anti-Fraud Self-Referral Prevention
  const selfReferralAttempt = await referralService.attributeLead({
    referralCode: codeProfile.code,
    fullName: studentReferrer.fullName || 'Self Referrer',
    mobile: studentReferrer.mobile || '9999988888',
    email: studentReferrer.email,
    attributionSource: 'LINK',
  });
  if (selfReferralAttempt.attributed) {
    throw new Error('Anti-fraud self-referral check failed! Self referral was incorrectly permitted.');
  }
  console.log(`[5/10] Anti-Fraud Protection: Self-referral attempt successfully blocked (${selfReferralAttempt.reason})`);

  // 4. Attribute New Applicant Lead
  const testMobile = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testEmail = `ref_applicant_${Date.now()}@example.com`;

  const attributionResult = await referralService.attributeLead({
    referralCode: codeProfile.code,
    fullName: 'Rohan Verma',
    mobile: testMobile,
    email: testEmail,
    attributionSource: 'LINK',
  });

  if (!attributionResult.attributed || !attributionResult.referralId) {
    throw new Error(`Lead attribution failed: ${attributionResult.reason}`);
  }
  console.log(`[6/10] Lead Attributed: Referral ID=${attributionResult.referralId}`);

  // 5. Lifecycle Transition: Lead -> Registered Student -> Application Submitted
  const testApplicantUser = await prisma.user.create({
    data: {
      email: testEmail,
      password: 'HashPassword123!',
      fullName: 'Rohan Verma',
      mobile: testMobile,
      role: Role.STUDENT,
    },
  });

  const synced1 = await referralService.syncLifecycleEvent('APPLICATION_SUBMITTED', {
    studentUserId: testApplicantUser.id,
    applicationId: `APP-REF-${Date.now()}`,
    mobile: testMobile,
  });
  console.log(`[7/10] Lifecycle Synced: Status=${synced1?.status}, Student Attached=${synced1?.referredStudentId}`);

  // 6. Enrollment Confirmation & Reward Eligibility
  const enrolledSync = await referralService.syncLifecycleEvent('ENROLLED', {
    studentUserId: testApplicantUser.id,
    enrollmentId: `ENR-REF-${Date.now()}`,
    mobile: testMobile,
  });
  if (enrolledSync?.rewardEligibility !== 'ELIGIBLE') {
    throw new Error('Referral failed to transition to ELIGIBLE upon enrollment!');
  }
  console.log(`[8/10] Enrollment Completed: Status=${enrolledSync.status}, Reward Eligibility=${enrolledSync.rewardEligibility}`);

  // 7. Reward Ledger & Financial Payout Flow
  const referralDetail = await referralService.getReferralDetail(attributionResult.referralId);
  const pendingReward = referralDetail.rewards?.[0];
  if (!pendingReward) throw new Error('Reward ledger entry was not created!');
  console.log(`      ✓ Reward Ledger Entry Created: ID=${pendingReward.id}, Amount=₹${pendingReward.amount}, Status=${pendingReward.status}`);

  // Admin approves reward
  const approvedReward = await referralService.approveReward(pendingReward.id, adminUser.id, 'Enrollment verified by admissions office.');
  console.log(`[9/10] Finance Approval: Reward ID=${approvedReward.id}, Status=${approvedReward.status}`);

  // Finance marks payout
  const paidReward = await referralService.processPayout(
    pendingReward.id,
    {
      payoutMethod: 'UPI',
      payoutReference: `UPI-UTR-${Date.now()}`,
    },
    adminUser.id,
  );
  console.log(`      ✓ Financial Payout Recorded: Status=${paidReward.status}, UTR=${paidReward.payoutReference}`);

  // 8. Clean up test records
  await prisma.referralRewardLedger.deleteMany({ where: { referralId: attributionResult.referralId } });
  await prisma.studentReferral.deleteMany({ where: { id: attributionResult.referralId } });
  await prisma.user.delete({ where: { id: testApplicantUser.id } });
  console.log('[10/10] Cleaned up verification test records.');

  console.log('\n===============================================================');
  console.log('  ALL ENTERPRISE REFERRAL & REWARD TESTS PASSED (100%)');
  console.log('===============================================================');

  await app.close();
  process.exit(0);
}

runEnterpriseReferralsVerification().catch((err) => {
  console.error('REFERRAL VERIFICATION FAILED:', err);
  process.exit(1);
});
