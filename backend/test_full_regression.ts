import { PrismaClient } from '@prisma/client';

async function runFullAuthAndCampaignRegression() {
  console.log('====================================================');
  console.log('1. VERIFYING DATABASE ACCOUNT RECORD');
  console.log('====================================================');
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({
    where: { email: 'admin@swayamadmission.com' },
  });

  if (!user) {
    throw new Error('FAILED: admin@swayamadmission.com does not exist in DB');
  }
  console.log('Account Found:', {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isApproved: user.isApproved,
    lockedAt: user.lockedAt,
  });

  if (user.role !== 'SUPER_ADMIN') {
    throw new Error('FAILED: Role is not SUPER_ADMIN');
  }

  console.log('\n====================================================');
  console.log('2. TESTING WRONG CREDENTIALS REJECTION (HTTP 401)');
  console.log('====================================================');
  const wrongRes = await fetch('http://localhost:3000/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@swayamadmission.com',
      password: 'WrongPassword123!',
    }),
  });
  console.log('Wrong Password Status Code:', wrongRes.status);
  const wrongJson = await wrongRes.json();
  console.log('Wrong Password Response:', wrongJson);
  if (wrongRes.status !== 401) {
    throw new Error('FAILED: Wrong password was not rejected with HTTP 401');
  }

  console.log('\n====================================================');
  console.log('3. TESTING OFFICIAL ADMIN LOGIN (admin@swayamadmission.com / Admin@123)');
  console.log('====================================================');
  const loginRes = await fetch('http://localhost:3000/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@swayamadmission.com',
      password: 'Admin@123',
    }),
  });
  console.log('Login Status Code:', loginRes.status);
  const loginData = await loginRes.json();
  if (loginRes.status !== 200 || !loginData.access_token) {
    throw new Error('FAILED: Admin login failed');
  }
  console.log('Login Message:', loginData.message);
  console.log('Token Received (truncated):', loginData.access_token.substring(0, 30) + '...');
  console.log('User Role in Response:', loginData.user.role);
  console.log('User isSuperAdmin:', loginData.user.isSuperAdmin);
  console.log('Permissions Count:', loginData.user.effectivePermissions?.length);

  console.log('\n====================================================');
  console.log('4. TESTING /users/me PROFILE ENDPOINT');
  console.log('====================================================');
  const meRes = await fetch('http://localhost:3000/v1/users/me', {
    headers: { Authorization: 'Bearer ' + loginData.access_token },
  });
  console.log('Me Status Code:', meRes.status);
  const meData = await meRes.json();
  console.log('Me Email:', meData.email);
  console.log('Me Role:', meData.role);
  console.log('Me Status:', meData.status);
  if (meData.email !== 'admin@swayamadmission.com' || meData.role !== 'SUPER_ADMIN') {
    throw new Error('FAILED: /users/me returned invalid email or role');
  }

  console.log('\n====================================================');
  console.log('5. TESTING CAMPAIGN WIZARD SENTINEL VALUES CREATION');
  console.log('====================================================');
  const sentinelCampaignPayload = {
    campaignName: 'AAA_CAMPAIGN',
    name: 'AAA_CAMPAIGN',
    type: 'PROMOTIONAL',
    channels: ['IN_APP', 'EMAIL', 'SMS'],
    targetEntity: 'STUDENT',
    title: 'BBB_TITLE',
    messageTitle: 'BBB_TITLE',
    subject: 'CCC_SUBJECT',
    emailSubject: 'CCC_SUBJECT',
    message: 'DDD_BODY',
    messageBody: 'DDD_BODY',
    smsBody: 'EEE_SMS',
    audienceFilter: {
      targetEntity: 'STUDENT',
      conditions: [],
      exclusions: [],
      collegeRelationship: 'ANY',
    },
  };

  const campaignRes = await fetch('http://localhost:3000/v1/notifications/campaigns', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + loginData.access_token,
    },
    body: JSON.stringify(sentinelCampaignPayload),
  });

  console.log('Campaign Creation Status Code:', campaignRes.status);
  const campaignData = await campaignRes.json();
  console.log('Campaign Response:', campaignData);
  if (campaignRes.status !== 201 && campaignRes.status !== 200) {
    throw new Error('FAILED: Campaign creation failed: ' + JSON.stringify(campaignData));
  }

  if (
    campaignData.name !== 'AAA_CAMPAIGN' ||
    campaignData.title !== 'BBB_TITLE' ||
    campaignData.subject !== 'CCC_SUBJECT' ||
    campaignData.message !== 'DDD_BODY' ||
    campaignData.smsBody !== 'EEE_SMS'
  ) {
    throw new Error('FAILED: Sentinel fields corrupted during persistence');
  }

  console.log('\n====================================================');
  console.log('6. VERIFYING CAMPAIGN IN CAMPAIGN LIST');
  console.log('====================================================');
  const listRes = await fetch('http://localhost:3000/v1/notifications/campaigns', {
    headers: { Authorization: 'Bearer ' + loginData.access_token },
  });
  const listData = await listRes.json();
  console.log('Raw listData:', JSON.stringify(listData).substring(0, 200));
  const campaignsList = Array.isArray(listData) ? listData : (listData.data || listData.campaigns || []);
  const created = campaignsList.find((c: any) => c.name === 'AAA_CAMPAIGN');
  console.log('Found Campaign in List:', {
    id: created?.id,
    name: created?.name,
    title: created?.title,
    subject: created?.subject,
    status: created?.status,
    channels: created?.channels,
  });

  if (!created || created.name !== 'AAA_CAMPAIGN' || created.title !== 'BBB_TITLE') {
    throw new Error('FAILED: Campaign not found in list with correct sentinel values');
  }

  console.log('\n====================================================');
  console.log('7. TESTING AUDIENCE PREVIEW WITH CLASS-VALIDATOR DTO');
  console.log('====================================================');
  const audiencePreviewRes = await fetch('http://localhost:3000/v1/notifications/audience/preview', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + loginData.access_token,
    },
    body: JSON.stringify({
      filter: {
        targetEntity: 'STUDENT',
        conditions: [],
        exclusions: [],
        collegeRelationship: 'ANY',
      },
      channels: ['IN_APP', 'EMAIL', 'SMS'],
    }),
  });
  console.log('Audience Preview Status Code:', audiencePreviewRes.status);
  const previewData = await audiencePreviewRes.json();
  console.log('Audience Preview Result:', {
    totalAudience: previewData.totalAudience,
    eligibleCount: previewData.eligibleCount,
    excludedConsentCount: previewData.excludedConsentCount,
  });

  console.log('\n✅ ALL CRITICAL ACCEPTANCE CRITERIA PASSED CLEANLY!');
  await prisma.$disconnect();
}

runFullAuthAndCampaignRegression().catch((err) => {
  console.error(err);
  process.exit(1);
});
