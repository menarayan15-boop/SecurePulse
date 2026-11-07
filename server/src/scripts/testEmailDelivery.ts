import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

import { sendOtpEmail, verifyEmailServiceStatus, validateEmailConfig } from '../services/notificationService.js';

async function run() {
  const recipient = process.argv[2] || process.env.TEST_RECIPIENT_EMAIL;

  console.log('\n======================================================');
  console.log('  SECUREPULSE GMAIL SMTP PRODUCTION DIAGNOSTIC TOOL');
  console.log('======================================================\n');

  console.log('[1/3] Checking Email Service Configuration...');
  const validation = validateEmailConfig();
  const status = await verifyEmailServiceStatus();

  console.log('Provider Active:', status.provider.toUpperCase());
  console.log('Configured:', status.configured);
  console.log('Sender Address:', status.sender);
  console.log('SMTP Host:', validation.sanitizedConfig.smtpHost + ':' + validation.sanitizedConfig.smtpPort);
  console.log('SMTP User Configured:', validation.sanitizedConfig.hasSmtpUser, `(${validation.sanitizedConfig.smtpUserMasked})`);
  console.log('SMTP Pass Configured:', validation.sanitizedConfig.hasSmtpPass, `(Length: ${validation.sanitizedConfig.smtpPassLength}, 16-char format: ${validation.sanitizedConfig.smtpPassIs16Chars})`);

  if (validation.missingKeys.length > 0) {
    console.error('Missing Required Environment Keys:', validation.missingKeys.join(', '));
  }
  if (validation.invalidKeys.length > 0) {
    console.error('Invalid Configuration Keys:', validation.invalidKeys.map(k => `${k.key}: ${k.reason}`).join('; '));
  }
  if (status.error) {
    console.error('Diagnostic Status Error:', status.error);
  }

  if (!status.configured) {
    console.error('\n[FATAL] Gmail SMTP is not completely configured!');
    console.error('Standardized variables required in Vercel Environment Variables or server/.env:');
    console.error('  SMTP_HOST=smtp.gmail.com');
    console.error('  SMTP_PORT=465');
    console.error('  SMTP_SECURE=true');
    console.error('  SMTP_USER=your-actual-gmail@gmail.com');
    console.error('  SMTP_PASS=xxxx yyyy zzzz wwww   (16-char App Password from Google)');
    console.error('  EMAIL_FROM=your-actual-gmail@gmail.com\n');
    process.exit(1);
  }

  if (!recipient || !recipient.includes('@')) {
    console.log('\n[INFO] Configuration check passed!');
    console.log('To send a real test email with a live OTP code, run:');
    console.log('  npx tsx src/scripts/testEmailDelivery.ts your-real-email@gmail.com\n');
    process.exit(0);
  }

  console.log(`\n[2/3] Generating test 6-digit OTP and dispatching to '${recipient}'...`);
  const testOtp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const result = await sendOtpEmail(recipient, testOtp, 'login', 'Valued Administrator');
    console.log('\n[3/3] Email Dispatch Successful!');
    console.log('Provider Used:', result.provider);
    console.log('Message ID / Reference:', result.messageId);
    console.log(`\n>>> Please check the inbox and spam folder of '${recipient}'! <<<`);
    console.log('The email has been accepted by the email provider for delivery.\n');
  } catch (err: any) {
    console.error('\n[3/3] Email Dispatch Failed:');
    console.error(err.message);
    process.exit(1);
  }
}

run();

