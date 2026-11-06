import { Types } from 'mongoose';
import { LoginHistory } from '../models/LoginHistory.js';
import { TrustedDevice } from '../models/TrustedDevice.js';
import { ILoginEnvironment, IRiskAnalysis, IUser } from '../types/index.js';
import { hashToken } from '../utils/crypto.js';

export async function analyzeLoginRisk(
  user: IUser,
  currentEnv: ILoginEnvironment,
  trustedDeviceToken?: string
): Promise<IRiskAnalysis> {
  const userId = user._id;

  // 1. Check if device is trusted with valid unexpired token
  let hasValidTrustedDevice = false;
  if (trustedDeviceToken) {
    const hashed = hashToken(trustedDeviceToken);
    const trustedRecord = await TrustedDevice.findOne({
      userId,
      deviceTokenHash: hashed,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });

    if (trustedRecord) {
      hasValidTrustedDevice = true;
      // Update lastUsedAt
      trustedRecord.lastUsedAt = new Date();
      trustedRecord.ipAddress = currentEnv.ipAddress;
      await trustedRecord.save().catch(() => {});
    }
  }

  // 2. Query user's past successful logins
  const pastSuccessfulLogins = await LoginHistory.find({
    userId,
    loginStatus: 'success',
  })
    .sort({ loginTimestamp: -1 })
    .limit(30)
    .lean();

  // If this is the user's first ever login, risk is minimal baseline (or 0)
  if (pastSuccessfulLogins.length === 0) {
    return {
      riskScore: 0,
      riskLevel: 'low',
      factors: ['First login for newly registered account'],
      isNewBrowser: true,
      isNewDevice: true,
      isNewIp: true,
      isNewLocation: true,
      isSuspicious: false,
      requiresOtp: false, // User already verified email during registration
    };
  }

  let riskScore = 0;
  const factors: string[] = [];

  // 3. Check for recent failed attempts within last 15 minutes
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const recentFailures = await LoginHistory.countDocuments({
    userId,
    loginStatus: 'failed',
    loginTimestamp: { $gte: fifteenMinutesAgo },
  });

  if (recentFailures >= 3) {
    riskScore += 40;
    factors.push(`${recentFailures} recent failed login attempts detected`);
  }

  // 4. Compare Browser
  const knownBrowsers = new Set(pastSuccessfulLogins.map((l: any) => l.browserName.toLowerCase()));
  const isNewBrowser = !knownBrowsers.has(currentEnv.browserName.toLowerCase());
  if (isNewBrowser) {
    riskScore += 20;
    factors.push(`Unrecognized browser (${currentEnv.browserName})`);
  }

  // 5. Compare Device Type / OS
  const knownDevices = new Set(
    pastSuccessfulLogins.map((l: any) => `${l.deviceType}-${l.operatingSystem}`.toLowerCase())
  );
  const currentDeviceSig = `${currentEnv.deviceType}-${currentEnv.operatingSystem}`.toLowerCase();
  const isNewDevice = !knownDevices.has(currentDeviceSig);
  if (isNewDevice) {
    riskScore += 25;
    factors.push(`Unfamiliar device (${currentEnv.deviceType} running ${currentEnv.operatingSystem})`);
  }

  // 6. Compare Public IP
  const knownIps = new Set(pastSuccessfulLogins.map((l: any) => l.ipAddress));
  const isNewIp = !knownIps.has(currentEnv.ipAddress);
  if (isNewIp) {
    riskScore += 15;
    factors.push(`New network/IP address (${currentEnv.ipAddress})`);
  }

  // 7. Compare Location (City / State)
  const knownLocations = new Set(
    pastSuccessfulLogins.map((l: any) => `${l.city}, ${l.state}`.toLowerCase())
  );
  const currentLocationSig = `${currentEnv.city}, ${currentEnv.state}`.toLowerCase();
  const isNewLocation = !knownLocations.has(currentLocationSig);
  if (isNewLocation) {
    riskScore += 25;
    factors.push(`New geographical location (${currentEnv.city}, ${currentEnv.country})`);
  }

  // Cap score at 100
  riskScore = Math.min(100, riskScore);

  // Classify Risk
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (riskScore >= 75) {
    riskLevel = 'critical';
  } else if (riskScore >= 50) {
    riskLevel = 'high';
  } else if (riskScore >= 25) {
    riskLevel = 'medium';
  }

  // Evaluate if OTP challenge is required:
  // Trusted device reduces risk for ordinary changes (e.g. IP change while traveling)
  let requiresOtp = false;

  if (hasValidTrustedDevice) {
    // If device is trusted, only trigger OTP if risk is high/critical or multiple failed attempts
    if (riskScore >= 50 || recentFailures >= 3) {
      requiresOtp = true;
      factors.push('Trusted device bypassed normal challenge, but elevated risk threshold triggered verification');
    }
  } else {
    // Untrusted device: require OTP if risk >= 25 (e.g. new browser, new device, or new city)
    // or if user enforces unfamiliar device OTP
    if (riskScore >= 25 || user.securitySettings?.unfamiliarDeviceOtpEnforced) {
      requiresOtp = true;
    }
  }

  const isSuspicious = riskScore >= 50;

  return {
    riskScore,
    riskLevel,
    factors,
    isNewBrowser,
    isNewDevice,
    isNewIp,
    isNewLocation,
    isSuspicious,
    requiresOtp,
  };
}
