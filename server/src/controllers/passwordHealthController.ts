import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { PasskeyCredential } from '../models/PasskeyCredential.js';

/**
 * GET /api/password-health/account-summary
 * Returns password age and authentication hygiene metadata for the authenticated user.
 * ZERO PLAINTEXT PASSWORDS OR PASSWORD HASHES ARE TRANSMITTED.
 */
export async function getAccountPasswordSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    // Days since last account password update
    const lastUpdated = user.updatedAt ? new Date(user.updatedAt) : new Date(user.createdAt);
    const now = new Date();
    const daysSinceLastUpdate = Math.max(0, Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)));

    // Registered passkeys count
    const passkeysCount = await PasskeyCredential.countDocuments
      ? await PasskeyCredential.countDocuments({ userId: user._id })
      : 0;

    res.status(200).json({
      success: true,
      summary: {
        daysSinceLastUpdate,
        preferredAuthMethod: user.preferredAuthMethod || 'password',
        hasPasskeys: passkeysCount > 0,
        passkeysCount,
        hasEmailVerified: user.emailVerified,
        securityScoreBonus: (user.emailVerified ? 20 : 0) + (passkeysCount > 0 ? 30 : 0),
        recommendations: [
          daysSinceLastUpdate > 90
            ? 'Your password has not been rotated in over 90 days. Consider updating it with a modern passphrase.'
            : 'Password age is within standard healthy bounds.',
          passkeysCount === 0
            ? 'Add a biometric passkey (Windows Hello, Touch ID) for 100% phishing-resistant logins.'
            : 'Passkey security is active on your profile.',
          'Always use a unique password for each online service.',
          'Never reuse your SecurePulse master password on other sites.',
        ],
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve password health summary.' });
  }
}

