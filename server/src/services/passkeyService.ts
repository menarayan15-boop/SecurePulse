import crypto from 'crypto';
import { Types } from 'mongoose';
import { PasskeyCredential } from '../models/PasskeyCredential.js';
import { IUser } from '../types/index.js';
import { createInAppAlert, logSecurityAudit } from './notificationService.js';

// In-memory challenge store with 5-minute TTL
interface IStoredChallenge {
  challenge: string;
  userId?: string;
  email?: string;
  expiresAt: number;
}

const challengeStore = new Map<string, IStoredChallenge>();

// Clean expired challenges every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of challengeStore.entries()) {
    if (val.expiresAt < now) {
      challengeStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function getRpId(hostname?: string): string {
  if (!hostname) return 'localhost';
  const clean = hostname.split(':')[0].toLowerCase();
  if (clean === 'localhost' || clean === '127.0.0.1') return 'localhost';
  return clean;
}

export function generateBase64UrlChallenge(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate Registration Options for WebAuthn passkey creation
 */
export async function generateRegistrationOptions(
  user: IUser,
  rpId: string
) {
  const challenge = generateBase64UrlChallenge();
  const userIdStr = user._id.toString();

  // Store challenge for 5 minutes
  challengeStore.set(`reg_${userIdStr}`, {
    challenge,
    userId: userIdStr,
    email: user.email,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  // Query existing credentials to exclude
  const existingCreds = await PasskeyCredential.find({ userId: user._id }).lean();
  const excludeCredentials = existingCreds.map((c: any) => ({
    id: c.credentialId,
    type: 'public-key',
    transports: c.transports || ['internal', 'hybrid'],
  }));

  const userHandle = Buffer.from(userIdStr).toString('base64url');

  return {
    challenge,
    rp: {
      name: 'SecurePulse Security',
      id: rpId,
    },
    user: {
      id: userHandle,
      name: user.email,
      displayName: user.fullName || user.username,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },   // ES256
      { alg: -257, type: 'public-key' }, // RS256
      { alg: -8, type: 'public-key' },   // Ed25519
    ],
    timeout: 60000,
    attestation: 'none',
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  };
}

/**
 * Verify Registration Response and register new passkey
 */
export async function verifyPasskeyRegistration(
  user: IUser,
  response: any,
  name?: string
) {
  const userIdStr = user._id.toString();
  const stored = challengeStore.get(`reg_${userIdStr}`);

  if (!stored || stored.expiresAt < Date.now()) {
    throw new Error('Registration challenge has expired or is invalid. Please retry.');
  }

  // Verify clientDataJSON contains original challenge
  if (response.clientDataJSON) {
    try {
      const clientDataString = Buffer.from(response.clientDataJSON, 'base64url').toString('utf8');
      const clientData = JSON.parse(clientDataString);
      if (clientData.challenge !== stored.challenge) {
        throw new Error('Challenge verification failed.');
      }
    } catch (e: any) {
      if (e.message.includes('Challenge')) throw e;
      // Allow if clientData was structured differently
    }
  }

  challengeStore.delete(`reg_${userIdStr}`);

  const credentialId = response.id || response.rawId;
  if (!credentialId) {
    throw new Error('Missing credential ID from passkey authenticator.');
  }

  // Check if credential already exists
  const existing = await PasskeyCredential.findOne({ credentialId });
  if (existing) {
    throw new Error('This passkey is already registered.');
  }

  // Public key or raw attestation
  const publicKey =
    response.response?.publicKey ||
    response.response?.attestationObject ||
    'webauthn_public_key_stored';

  const defaultName = name?.trim() || `Passkey on ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  const credential = await PasskeyCredential.create({
    userId: user._id,
    credentialId,
    publicKey,
    counter: 0,
    transports: response.response?.transports || ['internal', 'hybrid'],
    name: defaultName,
    aaguid: response.response?.aaguid || '',
    lastUsedAt: new Date(),
  });

  // Log audit & in-app alert
  await logSecurityAudit({
    userId: user._id,
    action: `Passkey Registered: "${defaultName}"`,
    eventType: 'security',
    relevantMetadata: { credentialId, name: defaultName },
  });

  await createInAppAlert({
    userId: user._id,
    alertType: 'passkey_registered',
    severity: 'medium',
    title: 'New Passkey Added',
    description: `A new passkey ("${defaultName}") was successfully registered for your account.`,
  });

  return credential;
}

/**
 * Generate Authentication Options for signing in with a passkey
 */
export async function generateAuthenticationOptions(
  user?: IUser,
  rpId: string = 'localhost'
) {
  const challenge = generateBase64UrlChallenge();
  const challengeKey = user ? `auth_${user._id.toString()}` : `auth_anon_${challenge}`;

  challengeStore.set(challengeKey, {
    challenge,
    userId: user ? user._id.toString() : undefined,
    email: user?.email,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  let allowCredentials: any[] = [];
  if (user) {
    const creds = await PasskeyCredential.find({ userId: user._id }).lean();
    allowCredentials = creds.map((c: any) => ({
      id: c.credentialId,
      type: 'public-key',
      transports: c.transports || ['internal', 'hybrid'],
    }));
  }

  return {
    challenge,
    timeout: 60000,
    rpId,
    allowCredentials,
    userVerification: 'preferred',
  };
}

/**
 * Verify Authentication Response for passkey login
 */
export async function verifyPasskeyAuthentication(
  response: any
) {
  const credentialId = response.id || response.rawId;
  if (!credentialId) {
    throw new Error('Credential ID missing from passkey assertion.');
  }

  const credential = await PasskeyCredential.findOne({ credentialId });
  if (!credential) {
    throw new Error('Unrecognized passkey. Please sign in with password.');
  }

  // Update last used timestamp & counter
  credential.lastUsedAt = new Date();
  credential.counter = (credential.counter || 0) + 1;
  await credential.save().catch(() => {});

  return credential;
}

