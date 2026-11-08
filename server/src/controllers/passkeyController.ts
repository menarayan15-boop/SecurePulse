import { Response, Request } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { User } from '../models/User.js';
import { PasskeyCredential } from '../models/PasskeyCredential.js';
import {
  generateRegistrationOptions,
  verifyPasskeyRegistration,
  generateAuthenticationOptions,
  verifyPasskeyAuthentication,
  getRpId,
} from '../services/passkeyService.js';
import {
  signAccessToken,
  signRefreshToken,
  generateRandomToken,
  hashToken,
} from '../utils/crypto.js';
import { ActiveSession } from '../models/ActiveSession.js';
import { extractEnvironmentInfo } from '../services/environmentDetection.js';
import { logAccountProtectionEvent } from '../services/accountProtectionService.js';

const isProduction = process.env.NODE_ENV === 'production';
const COOKIE_BASE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
};

/**
 * 1. Get Passkey Registration Options (WebAuthn Creation Challenge)
 */
export async function getPasskeyRegistrationOptions(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const rpId = getRpId(req.hostname || req.headers.host);
    const options = await generateRegistrationOptions(user, rpId);

    res.status(200).json({ success: true, options });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to generate passkey options.' });
  }
}

/**
 * 2. Verify Passkey Registration Response
 */
export async function completePasskeyRegistration(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const { response, name } = req.body;
    if (!response) {
      res.status(400).json({ success: false, message: 'Missing passkey registration response.' });
      return;
    }

    const credential = await verifyPasskeyRegistration(user, response, name);

    await logAccountProtectionEvent({
      userId: user._id,
      eventType: 'passkey_added',
      riskLevel: 'medium',
      title: 'Passkey Credential Added',
      description: `New passkey "${credential.name}" successfully registered.`,
      env: req.envInfo,
    });

    res.status(201).json({
      success: true,
      message: 'Passkey registered successfully! You can now use biometric authentication.',
      credential: {
        id: credential._id,
        credentialId: credential.credentialId,
        name: credential.name,
        createdAt: credential.createdAt,
      },
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Passkey registration failed.' });
  }
}

/**
 * 3. Get Passkey Authentication Options (For login challenge)
 */
export async function getPasskeyAuthOptions(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { email } = req.query;
    let targetUser: any = null;

    if (email) {
      targetUser = await User.findOne({ email: String(email).trim().toLowerCase() });
    }

    const rpId = getRpId(req.hostname || req.headers.host);
    const options = await generateAuthenticationOptions(targetUser || undefined, rpId);

    res.status(200).json({ success: true, options });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to prepare passkey login challenge.' });
  }
}

/**
 * 4. Verify Passkey Authentication Response and Issue Session
 */
export async function verifyPasskeyAuth(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { response } = req.body;
    if (!response) {
      res.status(400).json({ success: false, message: 'Missing passkey authentication response.' });
      return;
    }

    const credential = await verifyPasskeyAuthentication(response);
    const user = await User.findById(credential.userId);

    if (!user || user.accountStatus === 'locked') {
      res.status(403).json({
        success: false,
        message: user ? 'Account is temporarily locked. Please complete recovery.' : 'User not found.',
      });
      return;
    }

    const envInfo = extractEnvironmentInfo(req);

    // Create active session
    const sessionToken = generateRandomToken(32);
    const sessionTokenHash = hashToken(sessionToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Issue tokens
    const accessToken = signAccessToken({ userId: user._id.toString(), username: user.username });
    const refreshToken = signRefreshToken({ userId: user._id.toString(), sessionId: sessionToken });

    await ActiveSession.create({
      userId: user._id,
      sessionTokenHash,
      ipAddress: envInfo.ipAddress,
      browser: envInfo.browserName,
      browserVersion: envInfo.browserVersion,
      operatingSystem: envInfo.operatingSystem,
      deviceType: envInfo.deviceType,
      city: envInfo.city,
      state: envInfo.state,
      country: envInfo.country,
      approximateCoordinates: envInfo.approximateCoordinates,
      expiresAt,
    });

    res.cookie('accessToken', accessToken, {
      ...COOKIE_BASE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      ...COOKIE_BASE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: 'Passkey verified! Welcome to SecurePulse.',
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        themePreference: user.themePreference,
      },
      accessToken,
    });
  } catch (err: any) {
    res.status(401).json({ success: false, message: err.message || 'Passkey authentication failed.' });
  }
}

/**
 * 5. List User Passkeys
 */
export async function listUserPasskeys(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const creds = await PasskeyCredential.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = creds.map((c: any) => ({
      id: c._id,
      credentialId: c.credentialId,
      name: c.name,
      counter: c.counter,
      transports: c.transports,
      lastUsedAt: c.lastUsedAt,
      createdAt: c.createdAt,
    }));

    res.status(200).json({ success: true, passkeys: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve passkeys.' });
  }
}

/**
 * 6. Rename Passkey
 */
export async function renamePasskey(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Passkey name cannot be blank.' });
      return;
    }

    const cred = await PasskeyCredential.findOne({ _id: id, userId: req.userId });
    if (!cred) {
      res.status(404).json({ success: false, message: 'Passkey not found.' });
      return;
    }

    cred.name = name.trim();
    await cred.save();

    res.status(200).json({ success: true, message: 'Passkey renamed successfully.', passkey: cred });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to rename passkey.' });
  }
}

/**
 * 7. Revoke/Delete Passkey
 */
export async function deletePasskey(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const cred = await PasskeyCredential.findOne({ _id: id, userId: req.userId });

    if (!cred) {
      res.status(404).json({ success: false, message: 'Passkey not found.' });
      return;
    }

    const passkeyName = cred.name;
    await PasskeyCredential.deleteOne({ _id: id, userId: req.userId });

    await logAccountProtectionEvent({
      userId: req.userId as any,
      eventType: 'passkey_removed',
      riskLevel: 'medium',
      title: 'Passkey Removed',
      description: `Passkey "${passkeyName}" was revoked from your account.`,
      env: req.envInfo,
    });

    res.status(200).json({ success: true, message: 'Passkey removed successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to remove passkey.' });
  }
}
