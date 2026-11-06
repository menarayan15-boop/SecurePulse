import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { TrustedDevice } from '../models/TrustedDevice.js';
import { generateRandomToken, hashToken } from '../utils/crypto.js';
import { logSecurityAudit, createInAppAlert } from '../services/notificationService.js';
import { User } from '../models/User.js';

export async function getTrustedDevices(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const currentToken = req.cookies?.trustedDeviceToken || (req.headers['x-trusted-device-token'] as string);
    const currentTokenHash = currentToken ? hashToken(currentToken) : null;

    const devices = await TrustedDevice.find({
      userId,
      revokedAt: { $exists: false },
    })
      .sort({ lastUsedAt: -1 })
      .lean();

    const formatted = devices.map((d: any) => ({
      id: d._id,
      deviceName: d.deviceName,
      browser: d.browser,
      operatingSystem: d.operatingSystem,
      deviceType: d.deviceType,
      ipAddress: d.ipAddress,
      city: d.city,
      state: d.state,
      country: d.country,
      firstTrustedAt: d.firstTrustedAt,
      lastUsedAt: d.lastUsedAt,
      expiresAt: d.expiresAt,
      isCurrent: currentTokenHash ? d.deviceTokenHash === currentTokenHash : false,
      isExpired: new Date() > new Date(d.expiresAt),
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve trusted devices.' });
  }
}

export async function trustCurrentDevice(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const envInfo = req.envInfo;
    const user = await User.findById(userId);

    if (!user || !envInfo) {
      res.status(400).json({ success: false, message: 'Invalid request context.' });
      return;
    }

    const durationDays = user.securitySettings?.trustedDeviceDurationDays || 30;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const token = generateRandomToken(48);
    const deviceTokenHash = hashToken(token);

    const device = await TrustedDevice.create({
      userId,
      deviceTokenHash,
      deviceName: `${envInfo.browserName} on ${envInfo.operatingSystem}`,
      browser: envInfo.browserName,
      operatingSystem: envInfo.operatingSystem,
      deviceType: envInfo.deviceType,
      ipAddress: envInfo.ipAddress,
      city: envInfo.city,
      state: envInfo.state,
      country: envInfo.country,
      firstTrustedAt: new Date(),
      lastUsedAt: new Date(),
      expiresAt,
    });

    res.cookie('trustedDeviceToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: durationDays * 24 * 60 * 60 * 1000,
    });

    await createInAppAlert({
      userId,
      alertType: 'device_trusted',
      severity: 'low',
      title: 'Device Registered as Trusted',
      description: `Added '${device.deviceName}' to your trusted devices.`,
    });

    await logSecurityAudit({
      userId,
      action: 'Trusted Device Registered',
      eventType: 'device',
      ipAddress: envInfo.ipAddress,
      browser: envInfo.browserName,
      relevantMetadata: { deviceId: device._id },
    });

    res.status(201).json({
      success: true,
      message: 'This device is now trusted for 30 days.',
      device: {
        id: device._id,
        deviceName: device.deviceName,
        expiresAt: device.expiresAt,
      },
      trustedDeviceToken: token,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to trust device.' });
  }
}

export async function removeTrustedDevice(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const device = await TrustedDevice.findOne({ _id: id, userId });
    if (!device) {
      res.status(404).json({ success: false, message: 'Trusted device record not found.' });
      return;
    }

    device.revokedAt = new Date();
    await device.save();

    await createInAppAlert({
      userId,
      alertType: 'device_revoked',
      severity: 'medium',
      title: 'Trusted Device Removed',
      description: `Trust for '${device.deviceName}' was revoked. Future logins from this device will require verification.`,
    });

    await logSecurityAudit({
      userId,
      action: 'Trusted Device Revoked',
      eventType: 'device',
      ipAddress: req.envInfo?.ipAddress,
      browser: req.envInfo?.browserName,
      relevantMetadata: { deviceId: id, deviceName: device.deviceName },
    });

    res.status(200).json({ success: true, message: 'Device trust has been revoked successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to remove trusted device.' });
  }
}

export async function removeAllTrustedDevices(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    await TrustedDevice.updateMany(
      { userId, revokedAt: { $exists: false } },
      { revokedAt: new Date() }
    );

    res.clearCookie('trustedDeviceToken');

    await createInAppAlert({
      userId,
      alertType: 'device_revoked',
      severity: 'high',
      title: 'All Trusted Devices Revoked',
      description: 'All registered trusted devices were revoked by account owner.',
    });

    await logSecurityAudit({
      userId,
      action: 'All Trusted Devices Revoked',
      eventType: 'device',
      ipAddress: req.envInfo?.ipAddress,
      browser: req.envInfo?.browserName,
    });

    res.status(200).json({ success: true, message: 'All trusted devices have been revoked.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to revoke trusted devices.' });
  }
}
