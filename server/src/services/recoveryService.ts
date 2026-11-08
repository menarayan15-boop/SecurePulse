import crypto from 'crypto';
import { Types } from 'mongoose';
import { RecoveryCode } from '../models/RecoveryCode.js';
import { User } from '../models/User.js';
import { ActiveSession } from '../models/ActiveSession.js';
import { TrustedDevice } from '../models/TrustedDevice.js';
import { createInAppAlert, logSecurityAudit, sendSecurityAlertEmail } from './notificationService.js';

/**
 * Generate 10 cryptographically secure backup recovery codes
 * Format: 4 chars - 4 chars - 4 chars (e.g., A3F9-2K81-9MZ4)
 */
export function generateRawRecoveryCodes(count: number = 10): string[] {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous chars (0, O, 1, I)
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(12);
    let str = '';
    for (let b = 0; b < 12; b++) {
      str += chars[bytes[b] % chars.length];
    }
    const formatted = `${str.slice(0, 4)}-${str.slice(4, 8)}-${str.slice(8, 12)}`;
    codes.push(formatted);
  }

  return codes;
}

export function hashRecoveryCode(code: string): string {
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Generate and store a fresh set of 10 backup codes for a user.
 * Invalidate any previous codes.
 */
export async function generateBackupCodesForUser(userId: Types.ObjectId): Promise<string[]> {
  const rawCodes = generateRawRecoveryCodes(10);

  // Invalidate previous unused codes
  await RecoveryCode.deleteMany({ userId });

  // Store hashed codes
  const codeDocs = rawCodes.map((code) => ({
    userId,
    codeHash: hashRecoveryCode(code),
    used: false,
    createdAt: new Date(),
  }));

  for (const doc of codeDocs) {
    await RecoveryCode.create(doc);
  }

  await logSecurityAudit({
    userId,
    action: 'New Backup Recovery Codes Generated',
    eventType: 'security',
    relevantMetadata: { count: rawCodes.length },
  });

  await createInAppAlert({
    userId,
    alertType: 'recovery_codes_generated',
    severity: 'high',
    title: 'Backup Recovery Codes Generated',
    description: 'A new batch of 10 one-time emergency recovery codes was generated. Older codes have been invalidated.',
  });

  return rawCodes;
}

/**
 * Get count of remaining unused recovery codes
 */
export async function getRecoveryCodeStats(userId: Types.ObjectId) {
  const [total, used] = await Promise.all([
    RecoveryCode.countDocuments({ userId }),
    RecoveryCode.countDocuments({ userId, used: true }),
  ]);

  return {
    hasGeneratedCodes: total > 0,
    totalCount: total,
    usedCount: used,
    remainingCount: Math.max(0, total - used),
  };
}

/**
 * Verify a single-use backup recovery code
 */
export async function verifyAndBurnRecoveryCode(
  userId: Types.ObjectId,
  rawCode: string
): Promise<{ verified: boolean; message: string }> {
  const codeHash = hashRecoveryCode(rawCode);

  const matched = await RecoveryCode.findOne({
    userId,
    codeHash,
    used: false,
  });

  if (!matched) {
    return {
      verified: false,
      message: 'Invalid or previously used recovery code. Please check and try again.',
    };
  }

  // Burn the code
  matched.used = true;
  matched.usedAt = new Date();
  await matched.save();

  // Unlock user account if locked
  const user = await User.findById(userId);
  if (user) {
    user.accountStatus = 'active';
    user.lockedAt = undefined;
    user.lockReason = undefined;
    await user.save();
  }

  // Revoke all existing sessions and trusted devices for security
  await Promise.all([
    ActiveSession.updateMany(
      { userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    ),
    TrustedDevice.updateMany(
      { userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    ),
  ]);

  await logSecurityAudit({
    userId,
    action: 'Account Recovered via Emergency Backup Code',
    eventType: 'lock',
    relevantMetadata: { burnedCodeHash: codeHash.slice(0, 10) + '...' },
  });

  await createInAppAlert({
    userId,
    alertType: 'account_recovered',
    severity: 'critical',
    title: 'Emergency Account Recovery Successful',
    description: 'Your account was unlocked using a one-time backup recovery code. All previous sessions were revoked for your safety.',
  });

  if (user && user.securitySettings?.allowEmailAlerts) {
    sendSecurityAlertEmail(
      user.email,
      user.fullName,
      'Emergency Account Recovery Executed',
      'Your SecurePulse account was successfully accessed and unlocked via a single-use backup recovery code. All active sessions have been terminated.',
      'Emergency Recovery Center (One-Time Backup Key)'
    ).catch(() => {});
  }

  return {
    verified: true,
    message: 'Recovery code verified. Your account is unlocked and active sessions have been reset.',
  };
}
