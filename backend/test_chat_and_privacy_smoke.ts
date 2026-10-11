import { PrismaClient } from '@prisma/client';
import { ChatService } from './src/chat/chat.service';
import { BlogService } from './src/blog/blog.service';
import { ApplicationService } from './src/application/application.service';

const prisma = new PrismaClient();

// Mock LiveSyncGateway
const mockLiveSyncGateway = {
  emitUserEvent: (userId: string, event: string, payload: any) => {
    // console.log(`[MockLiveSync] to ${userId}: ${event}`);
  },
  emitAdminEvent: () => {},
} as any;

// Mock NotificationsService
const mockNotificationsService = {
  createNotification: async (dto: any) => {
    // console.log(`[MockNotification] to ${dto.receiverId}: ${dto.title}`);
    return { id: 'mock-notif-id' };
  },
} as any;

async function runChatAndPrivacySmokeTests() {
  console.log('===========================================================');
  console.log('🧪 SWAYAM ADMISSION — ASSIGNED COUNSELOR CHAT & PRIVACY TEST');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  const chatService = new ChatService(
    prisma as any,
    mockLiveSyncGateway,
    mockNotificationsService,
  );

  const blogService = new BlogService(
    prisma as any,
    mockLiveSyncGateway as any,
  );

  // 1. Identify test student and counselor
  const student = await prisma.user.findFirst({
    where: { role: 'STUDENT', assignedCounselorId: { not: null } },
  });
  if (!student) {
    throw new Error('No test student with assigned counselor found in DB');
  }

  const counselor = await prisma.user.findUnique({
    where: { id: student.assignedCounselorId! },
  });
  if (!counselor) {
    throw new Error('Assigned counselor not found in DB');
  }

  // Find another counselor who is NOT assigned to this student
  const otherCounselor = await prisma.user.findFirst({
    where: {
      role: 'COUNSELOR',
      id: { not: counselor.id },
    },
  });
  if (!otherCounselor) {
    throw new Error('No second counselor found in DB for IDOR testing');
  }

  // Find another student for cross-student IDOR testing
  const otherStudent = await prisma.user.findFirst({
    where: {
      role: 'STUDENT',
      id: { not: student.id },
    },
  });
  if (!otherStudent) {
    throw new Error('No second student found for IDOR testing');
  }

  console.log(`[Test Context]`);
  console.log(`- Student A: ${student.fullName} (${student.id})`);
  console.log(`- Assigned Counselor X: ${counselor.fullName} (${counselor.id})`);
  console.log(`- Unauthorized Counselor Y: ${otherCounselor.fullName} (${otherCounselor.id})`);
  console.log(`- Student B: ${otherStudent.fullName} (${otherStudent.id})\n`);

  const studentActor: any = {
    id: student.id,
    role: 'STUDENT',
    email: student.email,
  };

  const counselorActor: any = {
    id: counselor.id,
    role: 'COUNSELOR',
    email: counselor.email,
  };

  const otherStudentActor: any = {
    id: otherStudent.id,
    role: 'STUDENT',
    email: otherStudent.email,
  };

  const otherCounselorActor: any = {
    id: otherCounselor.id,
    role: 'COUNSELOR',
    email: otherCounselor.email,
  };

  // TEST 1: GET Assigned Counselor (Staff Privacy)
  console.log('--- TEST GROUP 1: Staff Privacy in Assigned Counselor API ---');
  const assignedRes = await chatService.getAssignedCounselor(student.id);
  assert(assignedRes.hasCounselor === true, 'Assigned counselor is resolved for student');
  assert(!!assignedRes.counselor, 'Counselor object is returned');
  assert(assignedRes.counselor?.fullName === counselor.fullName, 'Counselor name matches assigned counselor');
  assert(
    (assignedRes.counselor as any).email === undefined,
    'Counselor personal EMAIL is stripped from response (NEVER exposed to student)',
  );
  assert(
    (assignedRes.counselor as any).mobile === undefined,
    'Counselor personal PHONE is stripped from response (NEVER exposed to student)',
  );
  assert(
    (assignedRes.counselor as any).password === undefined,
    'Internal auth credentials not exposed',
  );

  // TEST 2: Staff Privacy in BlogService getCounselorGuidance
  console.log('\n--- TEST GROUP 2: Staff Privacy in Career & Admission Guides ---');
  const guideRes = await blogService.getCounselorGuidance(student.id);
  assert(guideRes.hasCounselor === true, 'getCounselorGuidance returns hasCounselor=true');
  assert(
    (guideRes.counselor as any)?.email === undefined,
    'Career & Admission Guides API stripped personal staff email',
  );
  assert(
    (guideRes.counselor as any)?.mobile === undefined,
    'Career & Admission Guides API stripped personal staff mobile',
  );

  // TEST 3: Get or Create Conversation (Get-or-Create Semantics & Duplicate Protection)
  console.log('\n--- TEST GROUP 3: Conversation Initialization & Duplicate Protection ---');
  const conv1 = await chatService.getOrCreateConversation(studentActor, {});
  assert(conv1.hasConversation === true, 'Conversation initialized successfully');
  assert(!!conv1.conversation.id, 'Conversation ID generated/retrieved');
  assert(conv1.conversation.studentId === student.id, 'Conversation belongs to Student A');
  assert(conv1.conversation.counselorId === counselor.id, 'Conversation belongs to Counselor X');
  assert(!!conv1.disclaimer, 'Student disclaimer is present');
  assert(
    conv1.disclaimer.includes('career and admission guidance') &&
      conv1.disclaimer.includes('passwords') &&
      conv1.disclaimer.includes('bank details'),
    'Disclaimer contains mandatory policy warning against sharing passwords/bank details',
  );

  // Repeat call: must return the SAME conversation (no duplicate conversation)
  const conv2 = await chatService.getOrCreateConversation(studentActor, {});
  assert(conv1.conversation.id === conv2.conversation.id, 'Simultaneous/subsequent requests return existing conversation (duplicate protection)');

  // TEST 4: Sending Messages & Text-Only Enforcement
  console.log('\n--- TEST GROUP 4: Sending Messages & Text-Only Enforcement ---');
  const testMessageText = `Hello Counselor! Need guidance regarding admission timeline ${Date.now()}`;
  const sentMsg = await chatService.sendMessage(studentActor, conv1.conversation.id, {
    text: testMessageText,
    idempotencyKey: `test-idem-${Date.now()}`,
  });

  assert(!!sentMsg.id, 'Student message successfully created in database');
  assert(sentMsg.text === testMessageText, 'Message text stored correctly');
  assert(sentMsg.messageType === 'TEXT', 'Message type is TEXT only');
  assert(sentMsg.senderUserId === student.id, 'Message sender is Student A');

  // Empty message rejection
  let emptyRejected = false;
  try {
    await chatService.sendMessage(studentActor, conv1.conversation.id, { text: '   ' });
  } catch (err: any) {
    emptyRejected = err.status === 400 || err.message?.includes('cannot be empty');
  }
  assert(emptyRejected, 'Empty/whitespace-only message rejected by server');

  // HTML sanitization
  const scriptAttempt = '<script>alert("xss")</script>Hello <b>Safe Text</b>';
  const sanitizedMsg = await chatService.sendMessage(studentActor, conv1.conversation.id, {
    text: scriptAttempt,
  });
  assert(
    !sanitizedMsg.text.includes('<script>') && !sanitizedMsg.text.includes('alert'),
    'HTML/script tags stripped to prevent XSS attacks',
  );

  // Duplicate message protection: idempotency key
  const idemKey = `idem-${Date.now()}`;
  const firstSend = await chatService.sendMessage(studentActor, conv1.conversation.id, {
    text: 'Important guidance question',
    idempotencyKey: idemKey,
  });
  const duplicateSend = await chatService.sendMessage(studentActor, conv1.conversation.id, {
    text: 'Important guidance question',
    idempotencyKey: idemKey,
  });
  assert(firstSend.id === duplicateSend.id, 'Double-click/retry with same idempotency key returns identical message without duplicate');

  // Counselor replies
  const counselorReplyText = `Welcome! I am reviewing your application right now. ${Date.now()}`;
  const counselorReply = await chatService.sendMessage(counselorActor, conv1.conversation.id, {
    text: counselorReplyText,
  });
  assert(!!counselorReply.id, 'Counselor reply successfully created in database');
  assert(counselorReply.senderUserId === counselor.id, 'Reply sender is Counselor X');

  // TEST 5: History Persistence & Order
  console.log('\n--- TEST GROUP 5: Chat History Persistence & Ordering ---');
  const historyRes = await chatService.getConversationMessages(studentActor, conv1.conversation.id);
  assert(Array.isArray(historyRes.messages), 'History is returned as an array');
  assert(historyRes.messages.length >= 2, 'All previously sent messages persist in DB');

  // Verify chronological ordering (oldest to newest)
  let properlyOrdered = true;
  for (let i = 1; i < historyRes.messages.length; i++) {
    if (new Date(historyRes.messages[i].sentAt) < new Date(historyRes.messages[i - 1].sentAt)) {
      properlyOrdered = false;
      break;
    }
  }
  assert(properlyOrdered, 'Messages are strictly ordered from oldest to newest');

  // TEST 6: Authorization & IDOR/BOLA Protection
  console.log('\n--- TEST GROUP 6: IDOR / BOLA Security Checks ---');

  // 6a. Student A tries to force conversation with unauthorized Counselor Y
  let studentToOtherCounselorBlocked = false;
  try {
    await chatService.getOrCreateConversation(studentActor, {
      counselorId: otherCounselor.id,
    });
  } catch (err: any) {
    studentToOtherCounselorBlocked = err.status === 403;
  }
  assert(studentToOtherCounselorBlocked, 'IDOR Denied: Student cannot chat with unauthorized Counselor Y');

  // 6b. Student B tries to access Student A\'s conversation
  let studentCrossAccessBlocked = false;
  try {
    await chatService.getConversationMessages(otherStudentActor, conv1.conversation.id);
  } catch (err: any) {
    studentCrossAccessBlocked = err.status === 403;
  }
  assert(studentCrossAccessBlocked, 'IDOR Denied: Student B cannot view Student A\'s conversation');

  // 6c. Student B tries to POST a message into Student A\'s conversation
  let studentCrossSendBlocked = false;
  try {
    await chatService.sendMessage(otherStudentActor, conv1.conversation.id, {
      text: 'Hacking message',
    });
  } catch (err: any) {
    studentCrossSendBlocked = err.status === 403;
  }
  assert(studentCrossSendBlocked, 'IDOR Denied: Student B cannot inject messages into Student A\'s conversation');

  // 6d. Unassigned Counselor Y tries to access Student A\'s conversation
  let counselorCrossAccessBlocked = false;
  try {
    await chatService.getConversationMessages(otherCounselorActor, conv1.conversation.id);
  } catch (err: any) {
    counselorCrossAccessBlocked = err.status === 403;
  }
  assert(counselorCrossAccessBlocked, 'IDOR Denied: Unassigned Counselor Y cannot access Student A\'s conversation');

  // TEST 7: Unread Count and Mark-Read
  console.log('\n--- TEST GROUP 7: Unread Count and Read Receipts ---');
  // Send fresh counselor message
  const freshMsg = await chatService.sendMessage(counselorActor, conv1.conversation.id, {
    text: `Fresh unread message from counselor ${Date.now()}`,
  });
  // Student unread count should be >= 1
  const unreadBefore = await chatService.getUnreadCount(studentActor);
  assert(unreadBefore.unreadCount >= 1, `Student has unread counselor messages (${unreadBefore.unreadCount})`);

  // Student marks conversation read
  await chatService.markAsRead(studentActor, conv1.conversation.id);
  const unreadAfter = await chatService.getUnreadCount(studentActor);
  assert(unreadAfter.unreadCount === 0, 'Mark-read successfully clears unread count');

  console.log('\n===========================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runChatAndPrivacySmokeTests()
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
