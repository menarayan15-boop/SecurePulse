import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { SecurityAlert } from '../models/SecurityAlert.js';
import { SecurityAuditLog } from '../models/SecurityAuditLog.js';
import { Types } from 'mongoose';

let cachedTransporter: nodemailer.Transporter | null = null;
let resendClient: Resend | null = null;

// Custom structured error for email operations
export class EmailDeliveryError extends Error {
  public code: string;
  public smtpCode?: number | string;
  public smtpResponse?: string;
  public operation: string;
  public userMessage: string;

  constructor(params: {
    message: string;
    code: string;
    userMessage: string;
    operation: string;
    smtpCode?: number | string;
    smtpResponse?: string;
  }) {
    super(params.message);
    this.name = 'EmailDeliveryError';
    this.code = params.code;
    this.userMessage = params.userMessage;
    this.operation = params.operation;
    this.smtpCode = params.smtpCode;
    this.smtpResponse = params.smtpResponse;
  }
}

// In-memory test store used solely by automated test suites to verify email delivery without exposing OTPs to APIs
const lastSentOtpsForTesting = new Map<string, string>();

export function getDispatchedOtpForTest(email: string): string | undefined {
  return lastSentOtpsForTesting.get(email.toLowerCase());
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'unknown';
  return email.replace(/(^.{2})(.*)(?=@)/, (_: string, a: string, b: string) => a + '*'.repeat(Math.max(1, b.length)));
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendClient && apiKey) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

// Standardized Gmail SMTP Environment Variable Keys
export const REQUIRED_SMTP_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'] as const;

export interface EmailConfigValidationResult {
  valid: boolean;
  provider: 'smtp' | 'resend' | 'none';
  missingKeys: string[];
  invalidKeys: { key: string; reason: string }[];
  sanitizedConfig: {
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    hasSmtpUser: boolean;
    smtpUserMasked: string;
    hasSmtpPass: boolean;
    smtpPassLength: number;
    smtpPassIs16Chars: boolean;
    hasEmailFrom: boolean;
    emailFromMasked: string;
    hasResendApiKey: boolean;
  };
  error?: string;
  userMessage?: string;
}

export function validateEmailConfig(): EmailConfigValidationResult {
  const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const portRaw = process.env.SMTP_PORT?.trim() || '465';
  const port = Number(portRaw);
  const secure = process.env.SMTP_SECURE === 'false' ? false : (port === 465 || process.env.SMTP_SECURE === 'true' || true);
  const user = process.env.SMTP_USER?.trim() || '';
  const rawPass = process.env.SMTP_PASS || '';
  const cleanPass = rawPass.replace(/\s+/g, '');
  const emailFrom = process.env.EMAIL_FROM?.trim() || process.env.SMTP_FROM?.trim() || '';
  const resendApiKey = process.env.RESEND_API_KEY?.trim() || '';

  const missingKeys: string[] = [];
  const invalidKeys: { key: string; reason: string }[] = [];

  // Check Resend first if explicitly configured
  const resendValid = Boolean(resendApiKey && resendApiKey.length > 5 && !resendApiKey.includes('your_api_key'));
  if (resendValid) {
    return {
      valid: true,
      provider: 'resend',
      missingKeys: [],
      invalidKeys: [],
      sanitizedConfig: {
        smtpHost: host,
        smtpPort: port || 465,
        smtpSecure: secure,
        hasSmtpUser: Boolean(user),
        smtpUserMasked: user ? maskEmail(user) : 'N/A',
        hasSmtpPass: Boolean(rawPass),
        smtpPassLength: rawPass.length,
        smtpPassIs16Chars: cleanPass.length === 16,
        hasEmailFrom: Boolean(emailFrom),
        emailFromMasked: emailFrom ? maskEmail(emailFrom) : 'N/A',
        hasResendApiKey: true,
      },
    };
  }

  // 1. Validate SMTP_USER
  if (!user) {
    missingKeys.push('SMTP_USER');
  } else if (
    user.includes('your-gmail-address') ||
    user.includes('your_email@gmail.com') ||
    user === 'Your Gmail address'
  ) {
    invalidKeys.push({ key: 'SMTP_USER', reason: 'Contains placeholder text instead of real Gmail address.' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)) {
    invalidKeys.push({ key: 'SMTP_USER', reason: 'Invalid email address syntax.' });
  }

  // 2. Validate SMTP_PASS
  if (!rawPass) {
    missingKeys.push('SMTP_PASS');
  } else if (
    cleanPass.includes('your-gmail-app-password') ||
    cleanPass.includes('xxxx') ||
    cleanPass === 'YourGmailAppPassword' ||
    cleanPass.includes('apppassword')
  ) {
    invalidKeys.push({ key: 'SMTP_PASS', reason: 'Contains placeholder text instead of real 16-character Google App Password.' });
  } else if (cleanPass.length < 8) {
    invalidKeys.push({ key: 'SMTP_PASS', reason: 'Password length is too short for a Gmail App Password (must be 16 characters).' });
  }

  // 3. Validate SMTP_HOST
  if (!host) {
    missingKeys.push('SMTP_HOST');
  }

  // 4. Validate SMTP_PORT
  if (!portRaw || isNaN(port) || port <= 0 || port > 65535) {
    invalidKeys.push({ key: 'SMTP_PORT', reason: `Invalid port "${portRaw}". Expected 465 (SSL).` });
  }

  const valid = missingKeys.length === 0 && invalidKeys.length === 0;
  const provider = valid ? 'smtp' : 'none';

  let error: string | undefined = undefined;
  if (!valid) {
    const errorParts: string[] = [];
    if (missingKeys.length > 0) errorParts.push(`Missing keys: [${missingKeys.join(', ')}]`);
    if (invalidKeys.length > 0) errorParts.push(`Invalid keys: [${invalidKeys.map(k => `${k.key}: ${k.reason}`).join('; ')}]`);
    error = `Email service configuration is incomplete. ${errorParts.join('. ')}. Set these in Vercel Environment Variables or server/.env.`;
  }

  return {
    valid,
    provider,
    missingKeys,
    invalidKeys,
    sanitizedConfig: {
      smtpHost: host,
      smtpPort: port || 465,
      smtpSecure: secure,
      hasSmtpUser: Boolean(user),
      smtpUserMasked: user ? maskEmail(user) : 'NOT_CONFIGURED',
      hasSmtpPass: Boolean(rawPass),
      smtpPassLength: rawPass.length,
      smtpPassIs16Chars: cleanPass.length === 16,
      hasEmailFrom: Boolean(emailFrom || user),
      emailFromMasked: emailFrom ? maskEmail(emailFrom) : (user ? maskEmail(user) : 'NOT_CONFIGURED'),
      hasResendApiKey: false,
    },
    error,
    userMessage: 'Email service configuration is incomplete.',
  };
}

function isResendConfigured(): boolean {
  const key = process.env.RESEND_API_KEY?.trim();
  return Boolean(key && key.length > 5 && !key.includes('your_api_key'));
}

function isSmtpConfigured(): boolean {
  return validateEmailConfig().valid;
}

export function getActiveEmailProvider(): 'resend' | 'smtp' | 'none' {
  const validation = validateEmailConfig();
  return validation.provider;
}

export function inspectEmailDiagnostics(): {
  provider: 'resend' | 'smtp' | 'none';
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  hasSmtpUser: boolean;
  smtpUserMasked: string;
  hasSmtpPass: boolean;
  smtpPassLength: number;
  smtpPassIs16Chars: boolean;
  smtpPassHasSpaces: boolean;
  hasEmailFrom: boolean;
  emailFrom: string;
  hasResendApiKey: boolean;
  nodeEnv: string;
  isVercel: boolean;
  validation: EmailConfigValidationResult;
} {
  const validation = validateEmailConfig();
  const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE === 'false' ? false : (port === 465 || process.env.SMTP_SECURE === 'true' || true);
  const user = process.env.SMTP_USER?.trim() || '';
  const rawPass = process.env.SMTP_PASS || '';
  const cleanPass = rawPass.replace(/\s+/g, '');
  const from = process.env.EMAIL_FROM?.trim() || process.env.SMTP_FROM?.trim() || '';
  const resend = process.env.RESEND_API_KEY?.trim() || '';

  return {
    provider: validation.provider,
    smtpHost: host,
    smtpPort: port,
    smtpSecure: secure,
    hasSmtpUser: Boolean(user),
    smtpUserMasked: user ? maskEmail(user) : 'NOT_CONFIGURED',
    hasSmtpPass: Boolean(rawPass),
    smtpPassLength: rawPass.length,
    smtpPassIs16Chars: cleanPass.length === 16,
    smtpPassHasSpaces: rawPass.includes(' '),
    hasEmailFrom: Boolean(from),
    emailFrom: from ? maskEmail(from) : (user ? maskEmail(user) : 'NOT_CONFIGURED'),
    hasResendApiKey: Boolean(resend),
    nodeEnv: process.env.NODE_ENV || 'development',
    isVercel: Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
    validation,
  };
}

function getSenderAddress(provider: 'resend' | 'smtp' | 'none'): string {
  const configuredFrom = process.env.EMAIL_FROM?.trim() || process.env.SMTP_FROM?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();

  if (provider === 'smtp') {
    // In Gmail SMTP, the 'from' address must match the authenticated account
    if (configuredFrom) {
      if (configuredFrom.includes('<') && configuredFrom.includes('>')) {
        return configuredFrom;
      }
      if (configuredFrom.includes('@')) {
        return `"SecurePulse" <${configuredFrom}>`;
      }
      if (smtpUser && smtpUser.includes('@')) {
        return `"${configuredFrom.replace(/"/g, '')}" <${smtpUser}>`;
      }
    }
    if (smtpUser && smtpUser.includes('@')) {
      return `"SecurePulse" <${smtpUser}>`;
    }
    return '"SecurePulse" <security@securepulse.com>';
  }

  if (provider === 'resend') {
    if (configuredFrom && !configuredFrom.includes('.local') && !configuredFrom.includes('example.com') && !configuredFrom.includes('securepulse.com')) {
      return configuredFrom;
    }
    return '"SecurePulse" <onboarding@resend.dev>';
  }

  return configuredFrom || '"SecurePulse" <security@securepulse.com>';
}

export async function getSmtpTransporter(correlationId?: string): Promise<nodemailer.Transporter> {
  const reqId = correlationId || 'smtp_' + Date.now().toString(36);
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const user = process.env.SMTP_USER?.trim() || '';
  // Strip whitespace from Google App Password in case user entered "abcd efgh ijkl mnop"
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, '').trim() || '';
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE === 'false' ? false : (port === 465 || process.env.SMTP_SECURE === 'true' || true);

  console.log(
    `[AUTH_PIPELINE] [SMTP_INIT] [CorrelationId: ${reqId}] Initializing Gmail SMTP transporter on ${host}:${port} (SSL: ${secure})`
  );

  const validation = validateEmailConfig();
  if (!validation.valid && validation.provider !== 'resend') {
    const errorMsg = validation.error || 'SMTP_USER and SMTP_PASS are required in backend environment variables.';
    console.error(
      `[AUTH_PIPELINE] [FAILURE_DIAGNOSTIC] [CorrelationId: ${reqId}] Op='smtp.config' Name='ConfigError' Code='MISSING_CREDENTIALS' SmtpCode='N/A' SmtpMsg='${errorMsg}'`
    );
    throw new EmailDeliveryError({
      message: errorMsg,
      code: 'MISSING_CREDENTIALS',
      userMessage: 'Email service configuration is incomplete.',
      operation: 'smtp.config',
    });
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });

  try {
    await transporter.verify();
    console.log(
      `[AUTH_PIPELINE] [SMTP_AUTH_SUCCESS] [CorrelationId: ${reqId}] Connected and verified Gmail SMTP server (${host}:${port}, User: ${maskEmail(user)})`
    );
    cachedTransporter = transporter;
  } catch (verifyErr: any) {
    cachedTransporter = null;
    let errCode = verifyErr.code || 'UNKNOWN';
    let smtpCode: any = verifyErr.responseCode || (verifyErr.message?.includes('535') ? 535 : undefined);
    let userMessage = 'Unable to connect to the email service.';
    const op = 'smtp.verify';

    if (
      errCode === 'EAUTH' ||
      smtpCode === 535 ||
      verifyErr.message?.includes('535') ||
      verifyErr.message?.includes('BadCredentials') ||
      verifyErr.message?.includes('Username and Password not accepted')
    ) {
      errCode = 'EAUTH';
      smtpCode = 535;
      userMessage = 'Email service authentication failed.';
    } else if (errCode === 'ECONNECTION' || errCode === 'ECONNREFUSED') {
      errCode = 'ECONNECTION';
      userMessage = 'Unable to connect to the email service.';
    } else if (errCode === 'ETIMEDOUT') {
      errCode = 'ETIMEDOUT';
      userMessage = 'Unable to connect to the email service.';
    } else if (errCode === 'ENOTFOUND') {
      errCode = 'ENOTFOUND';
      userMessage = 'Unable to connect to the email service.';
    }

    console.error(
      `[AUTH_PIPELINE] [FAILURE_DIAGNOSTIC] [CorrelationId: ${reqId}] Op='${op}' Name='${verifyErr.name || 'Error'}' Code='${errCode}' SmtpCode='${smtpCode || 'N/A'}' SmtpMsg='${verifyErr.response || verifyErr.message}'`
    );

    throw new EmailDeliveryError({
      message: `SMTP verification failed (${errCode}): ${verifyErr.message}`,
      code: errCode,
      userMessage,
      operation: op,
      smtpCode,
      smtpResponse: verifyErr.response || verifyErr.message,
    });
  }

  return cachedTransporter;
}

export async function verifyEmailServiceStatus(): Promise<{
  configured: boolean;
  provider: 'resend' | 'smtp' | 'none';
  sender: string;
  smtpHost?: string;
  smtpPort?: number;
  verified?: boolean;
  missingKeys?: string[];
  invalidKeys?: { key: string; reason: string }[];
  error?: string;
}> {
  const validation = validateEmailConfig();
  const sender = getSenderAddress(validation.provider);

  if (!validation.valid) {
    return {
      configured: false,
      provider: validation.provider,
      sender,
      smtpHost: validation.sanitizedConfig.smtpHost,
      smtpPort: validation.sanitizedConfig.smtpPort,
      verified: false,
      missingKeys: validation.missingKeys,
      invalidKeys: validation.invalidKeys,
      error: validation.error || 'Email service configuration is incomplete.',
    };
  }

  if (validation.provider === 'resend') {
    return {
      configured: true,
      provider: 'resend',
      sender,
      verified: true,
    };
  }

  try {
    await getSmtpTransporter();
    return {
      configured: true,
      provider: 'smtp',
      sender,
      smtpHost: validation.sanitizedConfig.smtpHost,
      smtpPort: validation.sanitizedConfig.smtpPort,
      verified: true,
    };
  } catch (err: any) {
    return {
      configured: true,
      provider: 'smtp',
      sender,
      smtpHost: validation.sanitizedConfig.smtpHost,
      smtpPort: validation.sanitizedConfig.smtpPort,
      verified: false,
      error: err.message,
    };
  }
}

// Brand email header and styling
const EMAIL_STYLES = `
  body {
    margin: 0;
    padding: 0;
    background-color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
  }
  .wrapper {
    max-width: 560px;
    margin: 32px auto;
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
  .header {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    padding: 32px 24px;
    text-align: center;
    border-bottom: 3px solid #10b981;
  }
  .header-logo {
    font-size: 24px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -0.5px;
    margin: 0;
  }
  .header-logo span {
    color: #10b981;
  }
  .header-tagline {
    color: #94a3b8;
    font-size: 12px;
    margin-top: 6px;
    font-weight: 500;
  }
  .body {
    padding: 36px 32px;
  }
  .greeting {
    font-size: 16px;
    font-weight: 600;
    color: #0f172a;
    margin-bottom: 12px;
  }
  .message {
    font-size: 14px;
    line-height: 1.6;
    color: #475569;
    margin-bottom: 24px;
  }
  .otp-container {
    background: #f0fdf4;
    border: 2px dashed #10b981;
    border-radius: 12px;
    padding: 24px;
    text-align: center;
    margin: 24px 0;
  }
  .otp-code {
    font-family: 'SF Mono', Consolas, Monaco, monospace;
    font-size: 36px;
    font-weight: 800;
    letter-spacing: 8px;
    color: #065f46;
  }
  .otp-expiry {
    font-size: 12px;
    font-weight: 600;
    color: #047857;
    margin-top: 8px;
  }
  .warning-box {
    background-color: #f8fafc;
    border-left: 4px solid #0ea5e9;
    border-radius: 6px;
    padding: 14px 16px;
    font-size: 12px;
    line-height: 1.5;
    color: #334155;
    margin: 24px 0;
  }
  .ignore-notice {
    font-size: 12px;
    color: #64748b;
    line-height: 1.5;
    margin-top: 20px;
  }
  .footer {
    background-color: #f1f5f9;
    padding: 20px 24px;
    text-align: center;
    font-size: 11px;
    color: #64748b;
    border-top: 1px solid #e2e8f0;
    line-height: 1.5;
  }
`;

export async function sendOtpEmail(
  to: string,
  otp: string,
  purpose: 'login' | 'registration' | 'recovery' | 'reset',
  fullName: string,
  correlationId?: string
): Promise<{ success: boolean; messageId?: string; provider: string }> {
  const reqId = correlationId || 'otp_' + Date.now().toString(36);

  if (!to || !to.includes('@')) {
    console.error(
      `[AUTH_PIPELINE] [FAILURE_DIAGNOSTIC] [CorrelationId: ${reqId}] Op='sendOtpEmail.validate' Name='InvalidRecipient' Code='INVALID_EMAIL' SmtpCode='N/A' SmtpMsg='Invalid recipient email'`
    );
    throw new EmailDeliveryError({
      message: `Invalid recipient email address: '${to}'`,
      code: 'INVALID_EMAIL',
      userMessage: 'Please enter a valid email address.',
      operation: 'sendOtpEmail.validate',
    });
  }

  // Safe diagnostic log: record generation event without logging sensitive OTP
  console.log(
    `[AUTH_PIPELINE] [OTP_GENERATED] [CorrelationId: ${reqId}] 6-digit OTP created for purpose='${purpose}', recipient='${maskEmail(to)}'. Expiration: 5 minutes.`
  );

  const validation = validateEmailConfig();

  // If no real email provider is configured
  if (!validation.valid && validation.provider !== 'resend') {
    console.error(
      `[AUTH_PIPELINE] [EMAIL_CONFIG_MISSING] [CorrelationId: ${reqId}] CRITICAL: Email service credentials invalid or missing. Missing keys: [${validation.missingKeys.join(
        ', '
      )}].`
    );
    console.error(
      `[AUTH_PIPELINE] [ACTION_REQUIRED] Set SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_PORT, EMAIL_FROM in Vercel Environment Variables or server/.env.`
    );

    // If explicit automated test fallback is permitted in offline unit test mode
    if (process.env.ALLOW_TEST_MAIL_FALLBACK === 'true') {
      console.log(`[AUTH_PIPELINE] [TEST_MODE] Mock mail recorded for automated test suite.`);
      lastSentOtpsForTesting.set(to.toLowerCase(), otp);
      return { success: true, messageId: `test-env-${Date.now()}`, provider: 'test-fallback' };
    }

    console.error(
      `[AUTH_PIPELINE] [FAILURE_DIAGNOSTIC] [CorrelationId: ${reqId}] Op='email.providerCheck' Name='ConfigError' Code='MISSING_CREDENTIALS' SmtpCode='N/A' SmtpMsg='${
        validation.error || 'Email service credentials missing'
      }'`
    );

    throw new EmailDeliveryError({
      message: `Email delivery failed: ${validation.error || 'Email service configuration is incomplete.'}`,
      code: 'MISSING_CREDENTIALS',
      userMessage: 'Email service configuration is incomplete.',
      operation: 'email.providerCheck',
    });
  }

  const provider = validation.provider;

  let subject = 'Your SecurePulse Login Verification Code';
  let purposeDescription = 'login verification request';

  if (purpose === 'registration') {
    subject = 'Your SecurePulse Email Verification Code';
    purposeDescription = 'account activation';
  } else if (purpose === 'recovery') {
    subject = 'Your SecurePulse Account Recovery Code';
    purposeDescription = 'emergency account recovery and unlock';
  } else if (purpose === 'reset') {
    subject = 'Your SecurePulse Password Reset Code';
    purposeDescription = 'password reset request';
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>${EMAIL_STYLES}</style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1 class="header-logo">Secure<span>Pulse</span></h1>
          <p class="header-tagline">Intelligent Access • Personalized Experience • Stronger Security</p>
        </div>
        <div class="body">
          <div class="greeting">Hello ${fullName || 'User'},</div>
          <p class="message">
            We received a <strong>${purposeDescription}</strong> for your SecurePulse account.
            Use the single-use verification code below to authenticate:
          </p>

          <div class="otp-container">
            <div class="otp-code">${otp}</div>
            <div class="otp-expiry">Valid for 5 minutes</div>
          </div>

          <div class="warning-box">
            <strong>Security Warning:</strong> Never share this verification code with anyone. SecurePulse team members will never ask you for this passcode.
          </div>

          <p class="ignore-notice">
            If you did not initiate this request, someone may be attempting to access your account. Please log in to your SecurePulse dashboard to trigger an <strong>Emergency Account Lock</strong> immediately.
          </p>
        </div>
        <div class="footer">
          <p style="margin: 0;">This is an automated transmission from SecurePulse Adaptive Security Engine.</p>
          <p style="margin: 4px 0 0 0;">&copy; ${new Date().getFullYear()} SecurePulse. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const sender = getSenderAddress(provider);

  // 1. Send via Resend API
  if (provider === 'resend') {
    console.log(`[AUTH_PIPELINE] [EMAIL_DISPATCH_START] [CorrelationId: ${reqId}] Dispatching via Resend API to recipient='${maskEmail(to)}' from sender='${sender}'...`);
    const resend = getResendClient();
    if (!resend) {
      throw new EmailDeliveryError({
        message: 'Resend client initialization failed.',
        code: 'RESEND_INIT_FAILED',
        userMessage: 'Email service configuration is incomplete.',
        operation: 'resend.init',
      });
    }

    try {
      const resendResult = await resend.emails.send({
        from: sender,
        to,
        subject,
        html,
      });

      if (resendResult.error) {
        console.error(`[AUTH_PIPELINE] [FAILURE_DIAGNOSTIC] [CorrelationId: ${reqId}] Op='resend.send' Name='ResendError' Code='RESEND_ERROR' SmtpCode='N/A' SmtpMsg='${resendResult.error.message}'`);
        throw new EmailDeliveryError({
          message: `Email provider error (Resend): ${resendResult.error.message}`,
          code: 'RESEND_ERROR',
          userMessage: 'Unable to connect to the email service.',
          operation: 'resend.send',
        });
      }

      console.log(
        `[AUTH_PIPELINE] [RECIPIENT_ACCEPTED] [CorrelationId: ${reqId}] Resend accepted email for '${maskEmail(to)}'.`
      );
      console.log(
        `[AUTH_PIPELINE] [SMTP_MSG_ID] [CorrelationId: ${reqId}] Provider Message ID: '${resendResult.data?.id}'`
      );
      console.log(
        `[AUTH_PIPELINE] [SMTP_SEND_COMPLETED] [CorrelationId: ${reqId}] Resend send operation completed.`
      );
      lastSentOtpsForTesting.set(to.toLowerCase(), otp);
      return { success: true, messageId: resendResult.data?.id, provider: 'resend' };
    } catch (err: any) {
      if (err instanceof EmailDeliveryError) throw err;
      console.error(`[AUTH_PIPELINE] [FAILURE_DIAGNOSTIC] [CorrelationId: ${reqId}] Op='resend.send' Name='${err.name}' Code='RESEND_FAILED' SmtpCode='N/A' SmtpMsg='${err.message}'`);
      throw new EmailDeliveryError({
        message: `Email delivery failed via Resend: ${err.message}`,
        code: 'RESEND_FAILED',
        userMessage: 'Unable to connect to the email service.',
        operation: 'resend.send',
      });
    }
  }

  // 2. Send via SMTP
  console.log(
    `[AUTH_PIPELINE] [SMTP_SEND_START] [CorrelationId: ${reqId}] Sending OTP to ${maskEmail(to)} via Gmail SMTP (${process.env.SMTP_HOST || 'smtp.gmail.com'}:${process.env.SMTP_PORT || 465})...`
  );

  try {
    const transporter = await getSmtpTransporter(reqId);
    const info = await transporter.sendMail({
      from: sender,
      to,
      subject,
      html,
      text: `Your SecurePulse verification code is: ${otp}. Valid for 5 minutes.`,
    });

    console.log(`[AUTH_PIPELINE] [SMTP_SEND_COMPLETED] [CorrelationId: ${reqId}] SMTP send operation completed.`);

    const accepted = Array.isArray(info.accepted) ? info.accepted.map(String) : [];
    const rejected = Array.isArray(info.rejected) ? info.rejected.map(String) : [];

    if (rejected.length > 0 || (accepted.length === 0 && !info.messageId)) {
      console.error(
        `[AUTH_PIPELINE] [RECIPIENT_REJECTED] [CorrelationId: ${reqId}] Recipient rejected: ${rejected.join(', ') || to}`
      );
      console.error(
        `[AUTH_PIPELINE] [FAILURE_DIAGNOSTIC] [CorrelationId: ${reqId}] Op='smtp.recipientCheck' Name='RecipientRejected' Code='RECIPIENT_REJECTED' SmtpCode='N/A' SmtpMsg='${info.response || 'Recipient rejected'}'`
      );
      throw new EmailDeliveryError({
        message: `Recipient rejected by Gmail SMTP server: ${rejected.join(', ') || to}`,
        code: 'RECIPIENT_REJECTED',
        userMessage: 'Recipient email was rejected by the email service.',
        operation: 'smtp.recipientCheck',
        smtpResponse: info.response,
      });
    }

    console.log(
      `[AUTH_PIPELINE] [RECIPIENT_ACCEPTED] [CorrelationId: ${reqId}] Recipient accepted: [${accepted.map(maskEmail).join(', ')}]`
    );
    console.log(
      `[AUTH_PIPELINE] [SMTP_MSG_ID] [CorrelationId: ${reqId}] SMTP message ID returned: '${info.messageId}'`
    );

    lastSentOtpsForTesting.set(to.toLowerCase(), otp);
    return { success: true, messageId: info.messageId, provider: 'smtp' };
  } catch (err: any) {
    if (err instanceof EmailDeliveryError) throw err;

    let errCode = err.code || 'SEND_FAILED';
    let smtpCode: any = err.responseCode || (err.message?.includes('535') ? 535 : undefined);
    let userMessage = "We couldn't send your verification code. Please try again.";

    if (
      errCode === 'EAUTH' ||
      smtpCode === 535 ||
      err.message?.includes('535') ||
      err.message?.includes('BadCredentials')
    ) {
      errCode = 'EAUTH';
      smtpCode = 535;
      userMessage = 'Email service authentication failed.';
    } else if (errCode === 'ECONNECTION' || errCode === 'ECONNREFUSED' || errCode === 'ETIMEDOUT' || errCode === 'ENOTFOUND') {
      userMessage = 'Unable to connect to the email service.';
    }

    console.error(
      `[AUTH_PIPELINE] [FAILURE_DIAGNOSTIC] [CorrelationId: ${reqId}] Op='smtp.sendMail' Name='${err.name || 'Error'}' Code='${errCode}' SmtpCode='${smtpCode || 'N/A'}' SmtpMsg='${err.response || err.message}'`
    );

    throw new EmailDeliveryError({
      message: `Email delivery failed via SMTP: ${err.message}`,
      code: errCode,
      userMessage,
      operation: 'smtp.sendMail',
      smtpCode,
      smtpResponse: err.response || err.message,
    });
  }
}

export async function testSmtpConnectionDiagnostic(correlationId = 'diag_' + Date.now().toString(36)): Promise<{
  success: boolean;
  diagnostics: ReturnType<typeof inspectEmailDiagnostics>;
  error?: {
    name: string;
    code: string;
    smtpCode?: number | string;
    smtpResponse?: string;
    message: string;
    userMessage: string;
  };
}> {
  const diag = inspectEmailDiagnostics();
  if (!diag.hasSmtpUser || !diag.hasSmtpPass) {
    return {
      success: false,
      diagnostics: diag,
      error: {
        name: 'ConfigError',
        code: 'MISSING_CREDENTIALS',
        message: 'SMTP_USER or SMTP_PASS environment variables are missing.',
        userMessage: 'Email service configuration is incomplete.',
      },
    };
  }

  try {
    await getSmtpTransporter(correlationId);
    return {
      success: true,
      diagnostics: diag,
    };
  } catch (err: any) {
    return {
      success: false,
      diagnostics: diag,
      error: {
        name: err.name || 'Error',
        code: err.code || 'UNKNOWN',
        smtpCode: err.smtpCode,
        smtpResponse: err.smtpResponse,
        message: err.message,
        userMessage: err.userMessage || 'Unable to connect to the email service.',
      },
    };
  }
}

export async function sendSecurityAlertEmail(
  to: string,
  fullName: string,
  alertTitle: string,
  details: string,
  locationInfo?: string
): Promise<void> {
  const provider = getActiveEmailProvider();
  if (provider === 'none') {
    console.warn(`[AUTH_PIPELINE] [ALERT_SKIPPED] Cannot send alert email: no email provider configured.`);
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SecurePulse Security Notice: ${alertTitle}</title>
      <style>${EMAIL_STYLES}</style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1 class="header-logo">Secure<span>Pulse</span></h1>
          <p class="header-tagline">Intelligent Access • Personalized Experience • Stronger Security</p>
        </div>
        <div class="body">
          <div class="greeting">Hello ${fullName || 'User'},</div>
          <p class="message">
            We detected an important event on your SecurePulse account:
          </p>

          <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b; font-weight: 700; font-size: 15px;">${alertTitle}</p>
            <p style="margin: 8px 0 0 0; color: #7f1d1d; font-size: 13px; line-height: 1.5;">${details}</p>
            ${locationInfo ? `<p style="margin: 8px 0 0 0; color: #57534e; font-size: 12px;"><strong>Telemetry:</strong> ${locationInfo}</p>` : ''}
          </div>

          <p class="ignore-notice">
            If this was you, you can safely ignore this notification. If you did not authorize this activity, please access your dashboard and trigger an <strong>Emergency Account Lock</strong> immediately.
          </p>
        </div>
        <div class="footer">
          <p style="margin: 0;">This is an automated transmission from SecurePulse Adaptive Security Engine.</p>
          <p style="margin: 4px 0 0 0;">&copy; ${new Date().getFullYear()} SecurePulse. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const sender = getSenderAddress(provider);
  const subject = `SecurePulse Security Notice: ${alertTitle}`;

  if (provider === 'resend') {
    try {
      const resend = getResendClient();
      if (resend) {
        await resend.emails.send({ from: sender, to, subject, html });
      }
    } catch (err: any) {
      console.warn('[NotificationService] Alert email delivery failure via Resend:', err.message);
    }
    return;
  }

  try {
    const transporter = await getSmtpTransporter();
    await transporter.sendMail({ from: sender, to, subject, html });
  } catch (err: any) {
    console.warn('[NotificationService] Alert email delivery failure via SMTP:', err.message);
  }
}

export async function createInAppAlert(params: {
  userId: Types.ObjectId | string;
  alertType: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  relatedLoginId?: Types.ObjectId;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await SecurityAlert.create({
      userId: params.userId,
      alertType: params.alertType,
      severity: params.severity,
      title: params.title,
      description: params.description,
      relatedLoginId: params.relatedLoginId,
      metadata: params.metadata || {},
    });
  } catch (err) {
    console.error('[NotificationService] Failed to create in-app alert:', err);
  }
}

export async function logSecurityAudit(params: {
  userId: Types.ObjectId | string;
  action: string;
  eventType: 'auth' | 'device' | 'session' | 'profile' | 'security' | 'lock';
  ipAddress?: string;
  browser?: string;
  relevantMetadata?: Record<string, any>;
}): Promise<void> {
  try {
    await SecurityAuditLog.create({
      userId: params.userId,
      action: params.action,
      eventType: params.eventType,
      ipAddress: params.ipAddress || '',
      browser: params.browser || '',
      relevantMetadata: params.relevantMetadata || {},
    });
  } catch (err) {
    console.error('[NotificationService] Failed to log security audit:', err);
  }
}
