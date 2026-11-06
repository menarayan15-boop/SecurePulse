import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { User } from '../models/User.js';
import { calculateThemeForIST } from '../utils/themeEngine.js';
import { logSecurityAudit, createInAppAlert } from '../services/notificationService.js';
import { comparePassword } from '../utils/crypto.js';

export async function getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const themeCalc = calculateThemeForIST(user.themePreference);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        mobileNumber: user.mobileNumber,
        emailVerified: user.emailVerified,
        mobileVerified: user.mobileVerified,
        profileImage: user.profileImage,
        themePreference: user.themePreference,
        calculatedTheme: themeCalc.theme,
        istTimeString: themeCalc.istTimeString,
        securitySettings: user.securitySettings,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { fullName, mobileNumber, profileImage } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    if (fullName && fullName.trim().length > 0) {
      user.fullName = fullName.trim();
    }

    if (mobileNumber !== undefined) {
      user.mobileNumber = mobileNumber.trim();
    }

    if (profileImage !== undefined) {
      user.profileImage = profileImage;
    }

    await user.save();

    await logSecurityAudit({
      userId: user._id,
      action: 'Profile Updated',
      eventType: 'profile',
      ipAddress: req.envInfo?.ipAddress,
      browser: req.envInfo?.browserName,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        mobileNumber: user.mobileNumber,
        profileImage: user.profileImage,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
}

export async function updateTheme(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { themePreference } = req.body;

    if (!['auto', 'light', 'dark'].includes(themePreference)) {
      res.status(400).json({
        success: false,
        message: 'Invalid theme selection. Must be "auto", "light", or "dark".',
      });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    user.themePreference = themePreference;
    user.themeOverride = themePreference !== 'auto';
    await user.save();

    const themeCalc = calculateThemeForIST(themePreference);

    res.status(200).json({
      success: true,
      message: `Theme set to ${themePreference.toUpperCase()} mode.`,
      themePreference: user.themePreference,
      calculatedTheme: themeCalc.theme,
      istTimeString: themeCalc.istTimeString,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update theme.' });
  }
}

export async function updateSecuritySettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const {
      trustedDeviceDurationDays,
      allowEmailAlerts,
      allowSmsAlerts,
      highRiskOtpEnforced,
      unfamiliarDeviceOtpEnforced,
    } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    if (trustedDeviceDurationDays !== undefined) {
      const days = Number(trustedDeviceDurationDays);
      if (days >= 1 && days <= 365) {
        user.securitySettings.trustedDeviceDurationDays = days;
      }
    }

    if (allowEmailAlerts !== undefined) {
      user.securitySettings.allowEmailAlerts = Boolean(allowEmailAlerts);
    }

    if (allowSmsAlerts !== undefined) {
      user.securitySettings.allowSmsAlerts = Boolean(allowSmsAlerts);
    }

    if (highRiskOtpEnforced !== undefined) {
      user.securitySettings.highRiskOtpEnforced = Boolean(highRiskOtpEnforced);
    }

    if (unfamiliarDeviceOtpEnforced !== undefined) {
      user.securitySettings.unfamiliarDeviceOtpEnforced = Boolean(unfamiliarDeviceOtpEnforced);
    }

    await user.save();

    await logSecurityAudit({
      userId: user._id,
      action: 'Security Settings Updated',
      eventType: 'security',
      ipAddress: req.envInfo?.ipAddress,
      browser: req.envInfo?.browserName,
      relevantMetadata: user.securitySettings,
    });

    res.status(200).json({
      success: true,
      message: 'Security settings updated successfully.',
      securitySettings: user.securitySettings,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update security settings.' });
  }
}

export async function deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ success: false, message: 'Password confirmation is required to delete your account.' });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ success: false, message: 'Incorrect password entered.' });
      return;
    }

    // Invalidate user
    user.accountStatus = 'suspended';
    await user.save();

    await logSecurityAudit({
      userId: user._id,
      action: 'Account Deletion Requested',
      eventType: 'profile',
      ipAddress: req.envInfo?.ipAddress,
      browser: req.envInfo?.browserName,
    });

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('sessionId');

    res.status(200).json({
      success: true,
      message: 'Your account has been deactivated and scheduled for permanent purge.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to process account deletion.' });
  }
}
