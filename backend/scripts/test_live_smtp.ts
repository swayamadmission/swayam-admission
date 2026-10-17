import * as dotenv from 'dotenv';
dotenv.config();

import * as nodemailer from 'nodemailer';
import { buildOtpEmailHtml } from '../src/notifications/email-templates';

async function testLiveSmtp() {
  console.log('====================================================');
  console.log(' SWAYAM ADMISSION — LIVE GMAIL SMTP DISPATCH TEST  ');
  console.log('====================================================\n');

  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = (process.env.SMTP_USER || '').trim();
  const rawPass = (process.env.SMTP_PASSWORD || '').trim();
  const pass = rawPass.replace(/\s+/g, ''); // Google App Password works cleanest with stripped spaces
  const fromName = process.env.SMTP_FROM_NAME || 'Swayam Admission';
  const fromEmail = process.env.SMTP_FROM_EMAIL || user;

  console.log(`[Config Detected]`);
  console.log(`  SMTP Host: ${host}`);
  console.log(`  SMTP Port: ${port}`);
  console.log(`  SMTP User: ${user}`);
  console.log(`  SMTP Pass Length: ${pass.length} chars (Sanitized unspaced)`);
  console.log(`  Sender: "${fromName}" <${fromEmail}>\n`);

  if (!user || !pass) {
    console.error('❌ ERROR: SMTP_USER or SMTP_PASSWORD is not set in backend/.env');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // Port 587 uses STARTTLS
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  console.log('[Step 1] Verifying SMTP Connection to Gmail servers...');
  try {
    await transporter.verify();
    console.log('✅ Google SMTP Server Connection VERIFIED Successfully!\n');
  } catch (verifyErr: any) {
    console.error('❌ SMTP Handshake/Authentication Failed:');
    console.error(`   ${verifyErr.message}\n`);
    process.exit(1);
  }

  console.log('[Step 2] Sending Live Verification OTP Email to recipient...');
  const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const recipient = user; // Send directly to the configured email so the user can see it in inbox!

  const htmlContent = buildOtpEmailHtml({
    otp: testOtp,
    title: 'Swayam Admission Live Email Test',
    greetingName: 'Admin / Student',
    purpose: 'live system verification of Nodemailer OTP delivery',
    expiryMinutes: 10,
  });

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipient,
      subject: `Swayam Admission Live Test OTP: ${testOtp}`,
      text: `Your Swayam Admission test OTP is: ${testOtp}. This confirms live Nodemailer integration!`,
      html: htmlContent,
    });

    console.log('====================================================');
    console.log('🎉 LIVE EMAIL DELIVERED SUCCESSFULLY!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Recipient:  ${recipient}`);
    console.log(`   OTP Sent:   ${testOtp}`);
    console.log(`   Response:   ${info.response}`);
    console.log('====================================================\n');
  } catch (sendErr: any) {
    console.error('❌ Failed to send email:');
    console.error(`   ${sendErr.message}\n`);
    process.exit(1);
  }
}

testLiveSmtp();
