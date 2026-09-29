import * as fs from 'fs';
import * as path from 'path';

async function runFloatingButtonsSmokeTest() {
  console.log('================================================================');
  console.log('🚀 SMOKE TEST: SWAYAM AI COUNSELOR FLOATING BUTTON POSITIONING');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  const rootPath = path.resolve(__dirname, '../../frontend/user/src/app/components/Root.tsx');
  const floatingAiPath = path.resolve(__dirname, '../../frontend/user/src/app/components/FloatingAICounselor.tsx');

  assert(fs.existsSync(rootPath), 'Root.tsx exists');
  assert(fs.existsSync(floatingAiPath), 'FloatingAICounselor.tsx exists');

  const rootContent = fs.readFileSync(rootPath, 'utf8');
  const floatingAiContent = fs.readFileSync(floatingAiPath, 'utf8');

  // 1. Verify WhatsApp button exists in Root.tsx with original positioning
  console.log('\n--- 1. WhatsApp Button Verification ---');
  assert(rootContent.includes('href="https://wa.me/'), 'WhatsApp floating anchor exists');
  assert(rootContent.includes('fixed bottom-24 right-4 sm:bottom-8 sm:right-6 z-40'), 'WhatsApp button positioning unchanged');
  assert(rootContent.includes('bg-[#25D366]'), 'WhatsApp brand color #25D366 preserved');
  assert(rootContent.includes('w-14 h-14') && rootContent.includes('rounded-full'), 'WhatsApp dimensions w-14 h-14 and circular shape preserved');

  // 2. Verify Floating AI Counselor button positioning
  console.log('\n--- 2. Floating AI Counselor Button Positioning ---');
  assert(
    floatingAiContent.includes('fixed bottom-[168px] sm:bottom-[104px] right-4 sm:right-6 z-40'),
    'Floating AI button positioned above WhatsApp with fixed z-40'
  );
  assert(floatingAiContent.includes('w-14 h-14') && floatingAiContent.includes('rounded-full'), 'AI button dimensions match WhatsApp (w-14 h-14)');
  assert(floatingAiContent.includes('from-[#4A7B5B] to-[#2d5e3f]'), 'Swayam brand gradient preserved (#4A7B5B to #2d5e3f)');
  assert(floatingAiContent.includes('Ask Swayam AI Counselor'), 'Desktop hover tooltip text preserved');

  // 3. Geometry & Breakpoint calculations
  console.log('\n--- 3. Responsive Geometry & Clearance Checks ---');

  // Mobile: < sm (< 640px)
  // WhatsApp: bottom: 96px (bottom-24), height: 56px. Top = 152px.
  // AI Button: bottom: 168px (bottom-[168px]), height: 56px.
  const mobileWhatsAppBottom = 96;
  const buttonHeight = 56;
  const mobileWhatsAppTop = mobileWhatsAppBottom + buttonHeight; // 152px
  const mobileAiBottom = 168;
  const mobileGap = mobileAiBottom - mobileWhatsAppTop; // 16px

  assert(mobileGap > 0, `Mobile gap is positive (${mobileGap}px) -> No overlap`);
  assert(mobileGap === 16, `Mobile vertical gap is exactly 16px (1rem consistent separation)`);
  assert(mobileAiBottom > mobileWhatsAppTop, 'AI Counselor is strictly ABOVE WhatsApp on mobile');

  // Desktop / Tablet: >= sm (>= 640px)
  // WhatsApp: bottom: 32px (sm:bottom-8), height: 56px. Top = 88px.
  // AI Button: bottom: 104px (sm:bottom-[104px]), height: 56px.
  const desktopWhatsAppBottom = 32;
  const desktopWhatsAppTop = desktopWhatsAppBottom + buttonHeight; // 88px
  const desktopAiBottom = 104;
  const desktopGap = desktopAiBottom - desktopWhatsAppTop; // 16px

  assert(desktopGap > 0, `Desktop gap is positive (${desktopGap}px) -> No overlap`);
  assert(desktopGap === 16, `Desktop vertical gap is exactly 16px (1rem consistent separation)`);
  assert(desktopAiBottom > desktopWhatsAppTop, 'AI Counselor is strictly ABOVE WhatsApp on desktop/tablet');

  // Horizontal Alignment
  assert(
    rootContent.includes('right-4') &&
    rootContent.includes('sm:right-6') &&
    floatingAiContent.includes('right-4') &&
    floatingAiContent.includes('sm:right-6'),
    'Both buttons share identical horizontal alignment (right-4 on mobile, sm:right-6 on desktop/tablet)'
  );

  // 4. Modal Drawer Positioning
  console.log('\n--- 4. Chat Modal Overlay & Stability ---');
  assert(floatingAiContent.includes('z-50'), 'Expanded chat drawer has higher z-index (z-50) than launcher (z-40)');
  assert(floatingAiContent.includes('fixed inset-x-4 bottom-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[420px]'), 'Chat window responsive positioning preserved');

  console.log('\n================================================================');
  console.log(`🏁 SMOKE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

void runFloatingButtonsSmokeTest();
