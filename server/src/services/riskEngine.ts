import { Types } from 'mongoose';
import { LoginHistory } from '../models/LoginHistory.js';
import { TrustedDevice } from '../models/TrustedDevice.js';
import {
  ILoginEnvironment,
  IRiskAnalysis,
  IRiskScoreFactor,
  IUser,
} from '../types/index.js';
import { hashToken } from '../utils/crypto.js';
import { detectImpossibleTravel } from './impossibleTravelService.js';

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

  let riskScore = 0;
  const factors: string[] = [];
  const scoreBreakdown: IRiskScoreFactor[] = [];

  // Baseline for first login
  if (pastSuccessfulLogins.length === 0) {
    factors.push('Initial Login Verification: First-time authentication profile initialization');
    scoreBreakdown.push({
      factor: 'New Account Baseline',
      weight: 15,
      score: 15,
      description: 'First sign-in requires primary identity verification.',
    });
    riskScore += 15;
  }

  // 3. Check for impossible travel anomaly
  let impossibleTravelData: any = undefined;
  if (pastSuccessfulLogins.length > 0) {
    const travelCheck = await detectImpossibleTravel(userId, currentEnv);
    if (travelCheck.detected) {
      riskScore += 40;
      factors.push(`Impossible Travel Anomaly: ${travelCheck.rationale}`);
      scoreBreakdown.push({
        factor: 'Impossible Travel Velocity',
        weight: 40,
        score: 40,
        description: travelCheck.rationale,
      });
      impossibleTravelData = {
        detected: true,
        distanceKm: travelCheck.distanceKm,
        speedKmPerHour: travelCheck.speedKmPerHour,
        timeDeltaMinutes: travelCheck.timeDeltaMinutes,
        fromLocation: travelCheck.fromLocation,
        toLocation: travelCheck.toLocation,
      };
    }
  }

  // 4. Check for recent failed attempts within last 15 minutes
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const recentFailures = await LoginHistory.countDocuments({
    userId,
    loginStatus: 'failed',
    loginTimestamp: { $gte: fifteenMinutesAgo },
  });

  if (recentFailures >= 5) {
    riskScore += 35;
    factors.push(`High failed attempt velocity: ${recentFailures} failed logins in past 15 minutes`);
    scoreBreakdown.push({
      factor: 'Authentication Velocity',
      weight: 35,
      score: 35,
      description: `${recentFailures} failed attempts detected recently.`,
    });
  } else if (recentFailures >= 2) {
    riskScore += 20;
    factors.push(`Recent failed attempt: ${recentFailures} failed login attempts recorded`);
    scoreBreakdown.push({
      factor: 'Authentication Velocity',
      weight: 20,
      score: 20,
      description: `${recentFailures} recent failed attempts recorded.`,
    });
  }

  // 5. Compare Browser signature
  const knownBrowsers = new Set(
    pastSuccessfulLogins.map((l: any) => (l.browserName || '').toLowerCase())
  );
  const isNewBrowser =
    pastSuccessfulLogins.length > 0 &&
    !knownBrowsers.has((currentEnv.browserName || '').toLowerCase());
  if (isNewBrowser) {
    riskScore += 15;
    factors.push(`Unrecognized browser signature: ${currentEnv.browserName}`);
    scoreBreakdown.push({
      factor: 'Browser Fingerprint',
      weight: 15,
      score: 15,
      description: `Browser ${currentEnv.browserName} has not been used previously.`,
    });
  }

  // 6. Compare Device Type / Operating System
  const knownDevices = new Set(
    pastSuccessfulLogins.map((l: any) => `${l.deviceType}-${l.operatingSystem}`.toLowerCase())
  );
  const currentDeviceSig = `${currentEnv.deviceType}-${currentEnv.operatingSystem}`.toLowerCase();
  const isNewDevice =
    pastSuccessfulLogins.length > 0 && !knownDevices.has(currentDeviceSig);
  if (isNewDevice) {
    riskScore += 20;
    factors.push(
      `Unfamiliar device profile: ${currentEnv.deviceType} running ${currentEnv.operatingSystem}`
    );
    scoreBreakdown.push({
      factor: 'Device Environment',
      weight: 20,
      score: 20,
      description: `Device profile (${currentEnv.deviceType} on ${currentEnv.operatingSystem}) is new.`,
    });
  }

  // 7. Compare Public IP
  const knownIps = new Set(pastSuccessfulLogins.map((l: any) => l.ipAddress));
  const isNewIp = pastSuccessfulLogins.length > 0 && !knownIps.has(currentEnv.ipAddress);
  if (isNewIp) {
    riskScore += 10;
    factors.push(`Unrecognized network IP address: ${currentEnv.ipAddress}`);
    scoreBreakdown.push({
      factor: 'Network Origin',
      weight: 10,
      score: 10,
      description: `Access from IP address ${currentEnv.ipAddress}.`,
    });
  }

  // 8. Compare Location (City / Country)
  const knownLocations = new Set(
    pastSuccessfulLogins.map((l: any) => `${l.city}, ${l.country}`.toLowerCase())
  );
  const currentLocationSig = `${currentEnv.city}, ${currentEnv.country}`.toLowerCase();
  const isNewLocation =
    pastSuccessfulLogins.length > 0 && !knownLocations.has(currentLocationSig);
  if (isNewLocation) {
    riskScore += 15;
    factors.push(`New geographic region: ${currentEnv.city}, ${currentEnv.country}`);
    scoreBreakdown.push({
      factor: 'Geographical Location',
      weight: 15,
      score: 15,
      description: `Login originated from a new region: ${currentEnv.city}, ${currentEnv.country}.`,
    });
  }

  // 9. Time of day anomaly (IST hours: 1:00 AM - 5:00 AM)
  const currentHourIST = (new Date().getUTCHours() + 5.5) % 24;
  if (currentHourIST >= 1 && currentHourIST < 5) {
    riskScore += 10;
    factors.push('Off-hours authentication pattern: Login initiated during late night (01:00 - 05:00 IST)');
    scoreBreakdown.push({
      factor: 'Temporal Pattern',
      weight: 10,
      score: 10,
      description: 'Authentication attempted during atypical late-night hours.',
    });
  }

  // 10. Trusted device positive credit
  if (hasValidTrustedDevice) {
    const deduction = Math.min(25, riskScore);
    riskScore -= deduction;
    factors.push('Verified trusted device signature recognized (-25 risk offset applied)');
    scoreBreakdown.push({
      factor: 'Trusted Device Verification',
      weight: -25,
      score: -deduction,
      description: 'Device hardware token verified and within active validity window.',
    });
  }

  // Clamp score strictly between 0 and 100
  riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));

  // Classify into exact Prompt levels:
  // 0–30: Low risk
  // 31–60: Medium risk
  // 61–80: High risk
  // 81–100: Critical risk
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let action: 'allow' | 'challenge_otp' | 'challenge_high_risk' | 'block_critical' = 'allow';

  if (riskScore >= 81) {
    riskLevel = 'critical';
    action = 'block_critical';
  } else if (riskScore >= 61) {
    riskLevel = 'high';
    action = 'challenge_high_risk';
  } else if (riskScore >= 31) {
    riskLevel = 'medium';
    action = 'challenge_otp';
  } else {
    riskLevel = 'low';
    action = hasValidTrustedDevice ? 'allow' : 'challenge_otp';
  }

  // Evaluate OTP requirement
  let requiresOtp = true;
  if (hasValidTrustedDevice && riskScore <= 30 && recentFailures < 2) {
    requiresOtp = false;
  } else {
    requiresOtp = true;
  }

  const isSuspicious = riskScore >= 50;

  return {
    riskScore,
    riskLevel,
    factors,
    scoreBreakdown,
    isNewBrowser,
    isNewDevice,
    isNewIp,
    isNewLocation,
    isSuspicious,
    requiresOtp,
    action,
    impossibleTravel: impossibleTravelData,
  };
}
