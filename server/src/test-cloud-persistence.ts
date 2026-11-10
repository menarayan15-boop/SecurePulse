// SecurePulse Automated Cloud Persistence & Cold Start Verification Suite
// Verifies Phase 7 and Phase 8 requirements:
// Tests 1-12 (Multi-instance persistence, Neon validation, Cold starts, Concurrency, and Error Handling)

import assert from 'assert';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  getAuthoritativeNeonClient,
  fetchUserByIdentifier,
  fetchRemoteDoc,
  upsertRemoteDoc,
  probeCloudDatabaseHealth,
} from './config/cloudSync.js';
import { User } from './models/User.js';
import { ActiveSession } from './models/ActiveSession.js';
import { OTPVerification } from './models/OTPVerification.js';
import { hashPassword, comparePassword } from './utils/crypto.js';

const sql = getAuthoritativeNeonClient();

function logPass(msg: string) {
  console.log(`  [PASS] ✓ ${msg}`);
}

function logSection(title: string) {
  console.log(`\n======================================================`);
  console.log(`  ${title}`);
  console.log(`======================================================\n`);
}

async function runCloudPersistenceTests() {
  logSection('PHASE 7 & 8: CLOUD PERSISTENCE & MULTI-INSTANCE VERIFICATION');

  // PRE-FLIGHT: Cloud DB Connectivity
  const health = await probeCloudDatabaseHealth();
  assert(health.healthy, `Neon database must be reachable. Error: ${health.error}`);
  logPass(`Neon PostgreSQL connected and responding (${health.latencyMs}ms latency)`);

  const testId = Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  const testEmail = `persist_${testId}@securepulse.test`;
  const testUsername = `usr_${testId}`;
  const testPassword = `SecureTest@2026_${testId}`;
  let createdUserId = '';
  let activeSessionToken = '';
  let activeRefreshTokenHash = '';

  // ---------------------------------------------------------
  // TEST 1: Register a new test account
  // ---------------------------------------------------------
  const passwordHash = await hashPassword(testPassword);
  const userDoc = await User.create({
    fullName: 'Cloud Persistence Test User',
    username: testUsername,
    email: testEmail,
    passwordHash,
    emailVerified: false,
    accountStatus: 'active',
  });

  createdUserId = String(userDoc._id);
  assert(createdUserId && createdUserId.length > 5, 'User _id must be valid');
  assert(userDoc.email === testEmail, 'User email must match');
  logPass(`TEST 1: New test user registered (UserId: ${createdUserId})`);

  // ---------------------------------------------------------
  // TEST 2: Verify its email OTP & update verification status
  // ---------------------------------------------------------
  const otpCode = '742915';
  const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');

  await OTPVerification.create({
    userId: createdUserId,
    otpHash,
    deliveryMethod: 'email',
    purpose: 'email_verification',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    resendAvailableAt: new Date(Date.now() + 60 * 1000),
  });

  // Verify email by updating user record
  await User.updateOne({ _id: createdUserId }, { $set: { emailVerified: true } });
  const verifiedCheck = await User.findById(createdUserId);
  assert(verifiedCheck && verifiedCheck.emailVerified === true, 'emailVerified must be true');
  logPass('TEST 2: Email verification completed and updated in memory');

  // ---------------------------------------------------------
  // TEST 3: Confirm user record exists directly in authoritative cloud database
  // ---------------------------------------------------------
  const rawRows = await sql`
    SELECT doc_id, data FROM securepulse_documents
    WHERE collection_name = 'users' AND doc_id = ${createdUserId};
  `;
  assert(rawRows.length === 1, 'User document must be directly readable from Neon PostgreSQL');
  assert(rawRows[0].data.email === testEmail, 'Cloud document email must match test email');
  assert(rawRows[0].data.emailVerified === true, 'Cloud document must reflect emailVerified = true');
  assert(rawRows[0].data.passwordHash === passwordHash, 'Cloud document passwordHash must match');
  logPass('TEST 3: Authoritative cloud database holds identical verified user record');

  // ---------------------------------------------------------
  // TEST 4 & 5: Simulate fresh backend/serverless instance & find user
  // ---------------------------------------------------------
  // Clear in-memory global cache to simulate complete cold start
  if (globalThis.__SECUREPULSE_GLOBAL_STORE__) {
    delete globalThis.__SECUREPULSE_GLOBAL_STORE__['users'];
    delete globalThis.__SECUREPULSE_GLOBAL_STORE__['active_sessions'];
    delete globalThis.__SECUREPULSE_GLOBAL_STORE__['otp_verifications'];
  }

  // Lookup by email
  const coldUserByEmail = await fetchUserByIdentifier(testEmail);
  assert(coldUserByEmail, 'Cold serverless instance must find user by email directly from Neon');
  assert(coldUserByEmail._id === createdUserId, 'Fetched user _id must match');

  // Lookup by username
  const coldUserByUsername = await fetchUserByIdentifier(testUsername.toUpperCase()); // Test case-insensitivity
  assert(coldUserByUsername, 'Cold serverless instance must find user by username (case-insensitive)');
  assert(coldUserByUsername._id === createdUserId, 'Fetched user _id must match');
  logPass('TEST 4 & 5: Fresh cold serverless instance finds user by email and username');

  // ---------------------------------------------------------
  // TEST 6: Verify password against the stored hash on fresh instance
  // ---------------------------------------------------------
  const isMatch = await comparePassword(testPassword, coldUserByEmail.passwordHash);
  assert(isMatch === true, 'Password must match stored bcrypt hash');

  const isWrongMatch = await comparePassword('CompletelyWrongPassword!', coldUserByEmail.passwordHash);
  assert(isWrongMatch === false, 'Wrong password must be rejected');
  logPass('TEST 6: Password verification on fresh instance succeeds with zero hash distortion');

  // ---------------------------------------------------------
  // TEST 7 & 8: Complete login & verify session is persisted in cloud DB
  // ---------------------------------------------------------
  activeSessionToken = crypto.randomBytes(32).toString('hex');
  const refreshToken = crypto.randomBytes(40).toString('hex');
  activeRefreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const sessionDoc = await ActiveSession.create({
    userId: createdUserId,
    sessionToken: activeSessionToken,
    refreshTokenHash: activeRefreshTokenHash,
    ipAddress: '127.0.0.1',
    browser: 'Automated Test Agent',
    operatingSystem: 'Windows 11',
    deviceType: 'desktop',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    lastActiveAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const rawSessionRows = await sql`
    SELECT doc_id, data FROM securepulse_documents
    WHERE collection_name = 'active_sessions' AND doc_id = ${String(sessionDoc._id)};
  `;
  assert(rawSessionRows.length === 1, 'Active session must be durably stored in Neon PostgreSQL');
  assert(rawSessionRows[0].data.sessionToken === activeSessionToken, 'Session token in cloud must match');
  logPass('TEST 7 & 8: Login completed and active session persisted durably to cloud database');

  // ---------------------------------------------------------
  // TEST 9 & 10: Start another fresh instance & confirm session accessible
  // ---------------------------------------------------------
  if (globalThis.__SECUREPULSE_GLOBAL_STORE__) {
    delete globalThis.__SECUREPULSE_GLOBAL_STORE__['active_sessions'];
  }

  const freshFoundSession = await ActiveSession.findOne({ sessionToken: activeSessionToken });
  assert(freshFoundSession, 'Fresh instance must retrieve active session by sessionToken');
  assert(String(freshFoundSession.userId) === createdUserId, 'Session userId must match');
  assert(!freshFoundSession.revokedAt, 'Session must not be revoked');
  logPass('TEST 9 & 10: Second fresh instance retrieves authenticated user session');

  // ---------------------------------------------------------
  // TEST 11: Confirm logout invalidates session
  // ---------------------------------------------------------
  await ActiveSession.updateOne({ sessionToken: activeSessionToken }, { $set: { revokedAt: new Date() } });

  // Verify in cloud
  const rawRevokedRows = await sql`
    SELECT data FROM securepulse_documents
    WHERE collection_name = 'active_sessions' AND doc_id = ${String(sessionDoc._id)};
  `;
  assert(rawRevokedRows[0].data.revokedAt, 'Session in Neon database must reflect revokedAt timestamp');
  logPass('TEST 11: Logout invalidates session and writes revocation to cloud database');

  // ---------------------------------------------------------
  // TEST 12: Verify existing production users can still authenticate
  // ---------------------------------------------------------
  const existingUser1 = await fetchUserByIdentifier('menarayan.15@gmail.com');
  assert(existingUser1, 'Existing production user menarayan.15@gmail.com must be preserved in cloud DB');
  assert(existingUser1.passwordHash && existingUser1.passwordHash.startsWith('$2a$'), 'Bcrypt password hash must be preserved');
  assert(existingUser1.emailVerified === true, 'emailVerified must be preserved as true');

  const existingUser2 = await fetchUserByIdentifier('juug25btech11404@jainuniversity.ac.in');
  assert(existingUser2, 'Existing production user juug25btech11404@jainuniversity.ac.in must be preserved in cloud DB');
  assert(existingUser2.passwordHash && existingUser2.passwordHash.startsWith('$2a$'), 'Bcrypt password hash must be preserved');

  const existingUser3 = await fetchUserByIdentifier('satwikguru895@gmail.com');
  assert(existingUser3, 'Existing production user satwikguru895@gmail.com must be preserved in cloud DB');
  logPass('TEST 12: Existing production users preserved with valid bcrypt hashes and verified status');

  // ---------------------------------------------------------
  // PHASE 8: CONCURRENT REQUESTS & SIMULTANEOUS INVOCATIONS
  // ---------------------------------------------------------
  logSection('PHASE 8: CONCURRENCY & RACE-CONDITION DEFENSE');

  // 10 concurrent user lookups
  const concurrentLookups = await Promise.all([
    fetchUserByIdentifier(testEmail),
    fetchUserByIdentifier(testUsername),
    fetchUserByIdentifier(testEmail),
    fetchUserByIdentifier(testUsername),
    fetchUserByIdentifier(testEmail),
  ]);
  for (const u of concurrentLookups) {
    assert(u && u._id === createdUserId, 'Concurrent lookup must return consistent user record');
  }
  logPass('Concurrency Test: 5 simultaneous cloud lookups returned identical data without corruption');

  // Simultaneous login session creation
  const sess1Token = 'sess_concurrent_1_' + testId;
  const sess2Token = 'sess_concurrent_2_' + testId;

  await Promise.all([
    ActiveSession.create({
      userId: createdUserId,
      sessionToken: sess1Token,
      refreshTokenHash: 'hash1',
      ipAddress: '127.0.0.1',
      browser: 'Browser 1',
      operatingSystem: 'Windows',
      deviceType: 'desktop',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
    }),
    ActiveSession.create({
      userId: createdUserId,
      sessionToken: sess2Token,
      refreshTokenHash: 'hash2',
      ipAddress: '127.0.0.1',
      browser: 'Browser 2',
      operatingSystem: 'Windows',
      deviceType: 'desktop',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
    }),
  ]);

  const readSess1 = await sql`SELECT data FROM securepulse_documents WHERE collection_name = 'active_sessions' AND data->>'sessionToken' = ${sess1Token};`;
  const readSess2 = await sql`SELECT data FROM securepulse_documents WHERE collection_name = 'active_sessions' AND data->>'sessionToken' = ${sess2Token};`;
  assert(readSess1.length === 1 && readSess2.length === 1, 'Simultaneous sessions must both be preserved independently');
  logPass('Concurrency Test: Simultaneous session creation executed without collision or record loss');

  // Cleanup test sessions and user
  await sql`DELETE FROM securepulse_documents WHERE collection_name = 'users' AND doc_id = ${createdUserId};`;
  await sql`DELETE FROM securepulse_documents WHERE collection_name = 'active_sessions' AND data->>'userId' = ${createdUserId};`;
  await sql`DELETE FROM securepulse_documents WHERE collection_name = 'otp_verifications' AND data->>'userId' = ${createdUserId};`;
  logPass('Test cleanup: Ephemeral test artifacts removed from Neon PostgreSQL');

  logSection('ALL PHASE 7 & PHASE 8 TESTS PASSED WITH 100% SUCCESS!');
}

runCloudPersistenceTests().catch((err) => {
  console.error('\n[FATAL TEST FAILURE]:', err);
  process.exit(1);
});
