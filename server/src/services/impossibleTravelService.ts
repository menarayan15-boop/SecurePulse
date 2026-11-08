import { Types } from 'mongoose';
import { ILoginEnvironment } from '../types/index.js';
import { LoginHistory } from '../models/LoginHistory.js';
import { ImpossibleTravelAlert } from '../models/ImpossibleTravelAlert.js';
import { createInAppAlert, sendSecurityAlertEmail } from './notificationService.js';
import { User } from '../models/User.js';

/**
 * Calculates great-circle distance between two coordinates using the Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === 0 && lon1 === 0 && lat2 === 0 && lon2 === 0) {
    return 0;
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export interface IImpossibleTravelCheckResult {
  detected: boolean;
  distanceKm: number;
  speedKmPerHour: number;
  timeDeltaMinutes: number;
  fromLocation: string;
  toLocation: string;
  fromCoordinates: { lat: number; lng: number };
  toCoordinates: { lat: number; lng: number };
  rationale: string;
}

/**
 * Inspects a user's recent successful login to check for impossible travel velocity
 */
export async function detectImpossibleTravel(
  userId: Types.ObjectId,
  currentEnv: ILoginEnvironment,
  currentTimestamp: Date = new Date()
): Promise<IImpossibleTravelCheckResult> {
  const result: IImpossibleTravelCheckResult = {
    detected: false,
    distanceKm: 0,
    speedKmPerHour: 0,
    timeDeltaMinutes: 0,
    fromLocation: 'Unknown',
    toLocation: `${currentEnv.city || 'Unknown City'}, ${currentEnv.country || 'Unknown Country'}`,
    fromCoordinates: { lat: 0, lng: 0 },
    toCoordinates: currentEnv.approximateCoordinates || { lat: 0, lng: 0 },
    rationale: 'No previous location comparison available.',
  };

  // Find most recent successful login for this user
  const lastLogin = await LoginHistory.findOne({
    userId,
    loginStatus: 'success',
  })
    .sort({ loginTimestamp: -1 })
    .lean();

  if (!lastLogin) {
    return result;
  }

  const lastTime = new Date(lastLogin.loginTimestamp).getTime();
  const currentTime = currentTimestamp.getTime();
  const timeDeltaMs = currentTime - lastTime;

  if (timeDeltaMs <= 0) {
    return result;
  }

  const timeDeltaMinutes = Math.round(timeDeltaMs / 60000);
  const timeDeltaHours = timeDeltaMs / 3600000;

  const lat1 = lastLogin.approximateCoordinates?.lat || 0;
  const lon1 = lastLogin.approximateCoordinates?.lng || 0;
  const lat2 = currentEnv.approximateCoordinates?.lat || 0;
  const lon2 = currentEnv.approximateCoordinates?.lng || 0;

  result.fromCoordinates = { lat: lat1, lng: lon1 };
  result.fromLocation = `${lastLogin.city || 'Unknown'}, ${lastLogin.country || 'Unknown'}`;
  result.timeDeltaMinutes = timeDeltaMinutes;

  // If coordinates are 0 (unknown local network or simulated), calculate distance if countries differ
  let distanceKm = 0;
  if (lat1 !== 0 && lon1 !== 0 && lat2 !== 0 && lon2 !== 0) {
    distanceKm = calculateHaversineDistance(lat1, lon1, lat2, lon2);
  } else if (
    lastLogin.country &&
    currentEnv.country &&
    lastLogin.country.toLowerCase() !== currentEnv.country.toLowerCase() &&
    lastLogin.country !== 'Unknown Country' &&
    currentEnv.country !== 'Unknown Country'
  ) {
    // Cross-continental jump without precise GPS (minimum 2500 km estimate)
    distanceKm = 2500;
  }

  result.distanceKm = distanceKm;

  if (distanceKm === 0) {
    return result;
  }

  // Calculate speed in km/h
  const speedKmPerHour = Math.round(distanceKm / Math.max(0.016, timeDeltaHours));
  result.speedKmPerHour = speedKmPerHour;

  // Thresholds:
  // Commercial airplane cruise speed is approx 800-900 km/h.
  // If travel speed > 800 km/h and distance > 150 km, physically impossible without supersonic transport
  const isImpossible =
    (speedKmPerHour > 800 && distanceKm > 150) ||
    (distanceKm > 2000 && timeDeltaMinutes < 120);

  if (isImpossible) {
    result.detected = true;
    result.rationale = `Physical travel between ${result.fromLocation} and ${result.toLocation} (${distanceKm} km in ${timeDeltaMinutes} mins, required speed ~${speedKmPerHour} km/h) is physically implausible.`;

    // Record in ImpossibleTravelAlert collection
    try {
      const alert = await ImpossibleTravelAlert.create({
        userId,
        fromCity: lastLogin.city || 'Unknown',
        fromCountry: lastLogin.country || 'Unknown',
        fromCoordinates: result.fromCoordinates,
        toCity: currentEnv.city || 'Unknown',
        toCountry: currentEnv.country || 'Unknown',
        toCoordinates: result.toCoordinates,
        distanceKm,
        timeDeltaMinutes,
        speedKmPerHour,
        status: 'pending',
      });

      // Create high-severity in-app notification
      await createInAppAlert({
        userId,
        alertType: 'impossible_travel',
        severity: 'critical',
        title: 'Impossible Travel Alert Detected',
        description: `Unusual login detected from ${result.toLocation} only ${timeDeltaMinutes}m after login from ${result.fromLocation} (${distanceKm} km apart at ~${speedKmPerHour} km/h).`,
        metadata: {
          alertId: alert._id,
          distanceKm,
          speedKmPerHour,
          timeDeltaMinutes,
          fromLocation: result.fromLocation,
          toLocation: result.toLocation,
        },
      });

      // Dispatch security alert email to user
      const user = await User.findById(userId).lean();
      if (user && user.securitySettings?.allowEmailAlerts) {
        sendSecurityAlertEmail(
          user.email,
          user.fullName,
          'Impossible Travel Velocity Anomaly Detected',
          result.rationale,
          `${result.toLocation} (IP: ${currentEnv.ipAddress}, Device: ${currentEnv.browserName})`
        ).catch(() => {});
      }
    } catch (err: any) {
      console.error('[IMPOSSIBLE_TRAVEL] Failed to record alert:', err.message);
    }
  }

  return result;
}
