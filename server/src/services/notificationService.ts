import nodemailer from 'nodemailer';
import { SecurityAlert } from '../models/SecurityAlert.js';
import { SecurityAuditLog } from '../models/SecurityAuditLog.js';
import { Types } from 'mongoose';

// Email transporter setup
let transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development fallback: creates mock or ethereal transporter
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'mock.securepulse@ethereal.email',
        pass: 'mockpassword',
      },
    });
  }
  return transporter;
}

const BRAND_HEADER = `
  <div style="background-color: #0a0f1d; padding: 24px; text-align: center; border-radius: 8px 8px 0 0; border-bottom: 2px solid #10b981;">
    <h1 style="color: #ffffff; margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 26px; letter-spacing: 0.5px;">
      <span style="color: #10b981;">Secure</span>Pulse
    </h1>
    <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px;">
      Intelligent Access • Personalized Experience • Stronger Security
    </p>
  </div>
`;

const BRAND_FOOTER = `
  <div style="background-color: #0f172a; padding: 18px 24px; text-align: center; border-radius: 0 0 8px 8px; color: #64748b; font-size: 12px; line-height: 1.5;">
    <p style="margin: 0;">This is an automated security transmission from the SecurePulse Adaptive Security Engine.</p>
    <p style="margin: 4px 0 0 0;">If you did not authorize this action, please lock your account immediately from your Security Dashboard.</p>
  </div>
`;

export async function sendOtpEmail(to: string, otp: string, purposeText: string, fullName: string): Promise<void> {
  const html = `
    <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-family: 'Segoe UI', Arial, sans-serif;">
      ${BRAND_HEADER}
      <div style="padding: 32px 28px; color: #1e293b;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Security Verification Code</h2>
        <p style="font-size: 15px; color: #475569;">Hello <strong>${fullName}</strong>,</p>
        <p style="font-size: 15px; color: #475569;">
          Use the 6-digit one-time passcode (OTP) below to complete your <strong>${purposeText}</strong>.
        </p>
        
        <div style="margin: 28px 0; text-align: center;">
          <div style="display: inline-block; background-color: #f0fdf4; border: 2px dashed #10b981; border-radius: 8px; padding: 14px 32px; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #047857; font-family: monospace;">
            ${otp}
          </div>
          <p style="color: #64748b; font-size: 13px; margin-top: 10px;">
            This code expires in <strong>5 minutes</strong>. Do not share it with anyone.
          </p>
        </div>

        <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #334155;">
          <strong>Security Notice:</strong> SecurePulse representatives will never ask for your verification code.
        </div>
      </div>
      ${BRAND_FOOTER}
    </div>
  `;

  console.log(`\n==================================================`);
  console.log(`[EMAIL OTP TRANSMISSION] To: ${to}`);
  console.log(`[PURPOSE] ${purposeText}`);
  console.log(`[PASSCODE] >>> ${otp} <<< (Expires in 5 minutes)`);
  console.log(`==================================================\n`);

  try {
    const t = await getTransporter();
    await t.sendMail({
      from: process.env.SMTP_FROM || '"SecurePulse Security" <security@securepulse.local>',
      to,
      subject: `[SecurePulse] Your Verification Passcode: ${otp}`,
      html,
    });
  } catch (err) {
    // In dev mode, we already logged the code to the console for frictionless developer experience
    console.warn('[NotificationService] Email delivery warning (OTP is logged in console):', (err as any).message);
  }
}

export async function sendSecurityAlertEmail(
  to: string,
  fullName: string,
  alertTitle: string,
  details: string,
  locationInfo?: string
): Promise<void> {
  const html = `
    <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-family: 'Segoe UI', Arial, sans-serif;">
      ${BRAND_HEADER}
      <div style="padding: 32px 28px; color: #1e293b;">
        <h2 style="color: #dc2626; font-size: 20px; margin-top: 0;">Security Alert: ${alertTitle}</h2>
        <p style="font-size: 15px; color: #475569;">Hello <strong>${fullName}</strong>,</p>
        <p style="font-size: 15px; color: #475569;">
          We detected an important event on your SecurePulse account:
        </p>

        <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; color: #991b1b; font-weight: 600; font-size: 15px;">${alertTitle}</p>
          <p style="margin: 8px 0 0 0; color: #7f1d1d; font-size: 14px;">${details}</p>
          ${locationInfo ? `<p style="margin: 8px 0 0 0; color: #57534e; font-size: 13px;"><strong>Details:</strong> ${locationInfo}</p>` : ''}
        </div>

        <p style="font-size: 13px; color: #64748b;">
          If this was you, you can safely ignore this alert. If you do not recognize this activity, please access your dashboard and trigger an <strong>Emergency Account Lock</strong> immediately.
        </p>
      </div>
      ${BRAND_FOOTER}
    </div>
  `;

  console.log(`\n[SECURITY ALERT EMAIL] To: ${to} | Title: ${alertTitle} | Details: ${details}\n`);

  try {
    const t = await getTransporter();
    await t.sendMail({
      from: process.env.SMTP_FROM || '"SecurePulse Security" <security@securepulse.local>',
      to,
      subject: `[ALERT] SecurePulse Security Notice: ${alertTitle}`,
      html,
    });
  } catch (err) {
    console.warn('[NotificationService] Alert email delivery warning:', (err as any).message);
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
