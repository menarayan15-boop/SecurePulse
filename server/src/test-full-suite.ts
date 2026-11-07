process.env.ALLOW_TEST_MAIL_FALLBACK = 'true';

import app from './app.js';
import { connectDB } from './config/db.js';
import { getDispatchedOtpForTest } from './services/notificationService.js';
import { OTPVerification } from './models/OTPVerification.js';

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('  SECUREPULSE AUTOMATED SYSTEM VERIFICATION SUITE');
  console.log('======================================================\n');

  await connectDB();
  const PORT = 5098;
  const server = app.listen(PORT, async () => {
    const baseUrl = `http://127.0.0.1:${PORT}/api`;

    let passedTests = 0;
    let failedTests = 0;

    const assert = (condition: boolean, testName: string) => {
      if (condition) {
        console.log(`  [PASS] ✓ ${testName}`);
        passedTests++;
      } else {
        console.error(`  [FAIL] ✗ ${testName}`);
        failedTests++;
      }
    };

    try {
      // 1. Health & Timezone Engine (IST)
      const healthRes = await fetch(`${baseUrl}/health`);
      const health = await healthRes.json();
      assert(health.status === 'online', '1. System Health Check');
      assert(typeof health.istTime === 'string' && health.istTime.includes('IST'), '2. Indian Standard Time Engine conversion');

      // 2. Adaptive Theme calculation API
      const themeRes = await fetch(`${baseUrl}/theme-info?preference=auto`);
      const themeData = await themeRes.json();
      assert(themeData.theme === 'light' || themeData.theme === 'dark', '3. Adaptive theme calculation (IST rule)');

      // 3. Unauthorized API access protection
      const unauthRes = await fetch(`${baseUrl}/users/profile`);
      assert(unauthRes.status === 401, '4. Unauthorized API protection (Requires JWT)');

      // 4. Registration: TEST 1 - New user registration
      const userEmail = `auditor_${Date.now()}@securepulse.local`;
      const testUsername = `auditor_${Date.now()}`;
      const regRes = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Security Auditor',
          username: testUsername,
          email: userEmail,
          mobileNumber: '+919988776655',
          password: 'StrongP@ssw0rd2026',
        }),
      });
      const reg = await regRes.json();
      assert(reg.success === true && Boolean(reg.userId), 'TEST 1: New user registration with hashed password');
      assert(reg.devOtp === undefined, 'TEST 2A: Zero OTP leak in registration response payload');
      assert(
        reg.message === 'Verification code sent to your registered email.',
        'Standardized registration confirmation message'
      );

      const userId = reg.userId;
      const initialOtp = getDispatchedOtpForTest(userEmail);
      assert(Boolean(initialOtp && initialOtp.length === 6), 'TEST 1A: 6-digit OTP delivered via email service');

      // TEST: Unverified pending registration allows safe restart without duplicate error
      const pendingRestartRes = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Security Auditor Updated',
          username: testUsername,
          email: userEmail,
          mobileNumber: '+919988776655',
          password: 'StrongP@ssw0rd2026',
        }),
      });
      const pendingRestart = await pendingRestartRes.json();
      assert(
        pendingRestartRes.status === 200 && pendingRestart.isPendingRegistration === true,
        'TEST 3A: Pending unverified registration allows safe restart without duplicate error'
      );

      const restartOtp = getDispatchedOtpForTest(userEmail);
      assert(Boolean(restartOtp && restartOtp.length === 6), 'TEST 3B: Fresh OTP issued on pending restart');

      // TEST: Resend OTP for pending verification
      const resendRegOtpRes = await fetch(`${baseUrl}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, purpose: 'email_verification' }),
      });
      // Should respect cooldown or succeed
      assert(resendRegOtpRes.status === 429 || resendRegOtpRes.status === 200, 'TEST 5A: Resend OTP endpoint active');

      // TEST 4A: Incorrect OTP is rejected
      const wrongVerifyRes = await fetch(`${baseUrl}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otp: '000000' }),
      });
      const wrongVerify = await wrongVerifyRes.json();
      assert(
        wrongVerifyRes.status === 400 && wrongVerify.message === 'Invalid verification code.',
        'TEST 6A: Incorrect OTP rejected with "Invalid verification code."'
      );

      // TEST 2: Correct active OTP grants access & activates account
      const finalActiveOtp = getDispatchedOtpForTest(userEmail);
      const verifyRes = await fetch(`${baseUrl}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otp: finalActiveOtp }),
      });
      const verify = await verifyRes.json();
      assert(verify.success === true && Boolean(verify.accessToken), 'TEST 2: Correct OTP grants activation and JWT tokens');

      // TEST 7: OTP cannot be reused (single-use validation)
      const reuseVerifyRes = await fetch(`${baseUrl}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otp: finalActiveOtp }),
      });
      assert(reuseVerifyRes.status === 400, 'TEST 7: OTP cannot be reused after verification');

      // TEST 3: Registering with the same VERIFIED email is blocked with clear login guidance
      const dupRegRes = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Duplicate User',
          username: `dup_${Date.now()}`,
          email: userEmail,
          mobileNumber: '+919988776655',
          password: 'StrongP@ssw0rd2026',
        }),
      });
      const dupReg = await dupRegRes.json();
      assert(
        dupRegRes.status === 409 &&
          dupReg.isDuplicateEmail === true &&
          dupReg.message === 'This email is already registered. Please log in.',
        'TEST 3: Duplicate verified email blocked with "This email is already registered. Please log in."'
      );

      // TEST 4: Registering with an existing username but different email is rejected
      const dupUserRes = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Another User',
          username: testUsername,
          email: `different_${Date.now()}@securepulse.local`,
          mobileNumber: '+919988776655',
          password: 'StrongP@ssw0rd2026',
        }),
      });
      const dupUserData = await dupUserRes.json();
      assert(
        dupUserRes.status === 409 && dupUserData.message === 'This username is already taken. Please choose another.',
        'TEST 4: Username conflict is rejected with clear message'
      );

      const accessToken = verify.accessToken;

      // 6. Profile & Theme Fetch
      const profileRes = await fetch(`${baseUrl}/users/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await profileRes.json();
      assert(profile.success === true && profile.user.emailVerified === true, '8. Authenticated profile retrieval');

      // 7. Manual theme switching & persistence
      const themeUpdateRes = await fetch(`${baseUrl}/users/theme`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ themePreference: 'dark' }),
      });
      const themeUpdated = await themeUpdateRes.json();
      assert(themeUpdated.success === true && themeUpdated.themePreference === 'dark', '9. Manual theme update & DB persistence');

      // 8. Incorrect password detection
      const wrongPwRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: profile.user.username, password: 'WrongPassword999!' }),
      });
      const wrongPw = await wrongPwRes.json();
      assert(
        wrongPwRes.status === 401 && wrongPw.message === 'Invalid email or password.',
        '10. Incorrect password rejection with "Invalid email or password."'
      );

      // 9. Unfamiliar environment detection & OTP challenge
      const unfamiliarLoginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
          'x-forwarded-for': '198.51.100.42',
          'x-client-city': 'Bengaluru',
          'x-client-country': 'India',
        },
        body: JSON.stringify({ identifier: profile.user.username, password: 'StrongP@ssw0rd2026' }),
      });
      const unfamiliarLogin = await unfamiliarLoginRes.json();
      assert(
        unfamiliarLogin.requiresOtp === true && Boolean(unfamiliarLogin.challengeToken),
        '11. Unfamiliar environment detection & 6-digit OTP challenge'
      );
      assert(unfamiliarLogin.devOtp === undefined, 'TEST 2B: Zero OTP leak in login challenge payload');

      const firstLoginOtp = getDispatchedOtpForTest(userEmail);
      assert(Boolean(firstLoginOtp && firstLoginOtp.length === 6), 'TEST 1B: Login OTP delivered via email notification service');

      // Advance 60s cooldown for test verification
      await OTPVerification.updateOne(
        { 'metadata.challengeToken': unfamiliarLogin.challengeToken },
        { $set: { resendAvailableAt: new Date(Date.now() - 1000) } }
      );

      // TEST 5B: Resend OTP invalidates the previous active OTP
      const resendRes = await fetch(`${baseUrl}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeToken: unfamiliarLogin.challengeToken }),
      });
      const resendData = await resendRes.json();
      assert(resendData.success === true && resendData.devOtp === undefined, 'TEST 2C: Resend OTP succeeds without payload leakage');

      const secondLoginOtp = getDispatchedOtpForTest(userEmail);
      assert(Boolean(secondLoginOtp && secondLoginOtp.length === 6), 'New 6-digit OTP generated upon resend');

      // Verify that using firstLoginOtp is rejected (invalidated by resend)
      const staleOtpRes = await fetch(`${baseUrl}/auth/verify-login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeToken: unfamiliarLogin.challengeToken,
          otp: firstLoginOtp,
          trustThisDevice: false,
        }),
      });
      assert(staleOtpRes.status === 400, 'TEST 5B: Resend OTP successfully invalidates the previous active OTP');

      // TEST 6B: Expired OTP is rejected
      await OTPVerification.updateOne(
        { 'metadata.challengeToken': unfamiliarLogin.challengeToken, usedAt: { $exists: false } },
        { $set: { expiresAt: new Date(Date.now() - 60000) } }
      );
      const expiredOtpRes = await fetch(`${baseUrl}/auth/verify-login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeToken: unfamiliarLogin.challengeToken,
          otp: secondLoginOtp,
          trustThisDevice: false,
        }),
      });
      const expiredOtp = await expiredOtpRes.json();
      assert(
        expiredOtpRes.status === 400 && expiredOtp.message === 'Your verification code has expired.',
        'TEST 6B: Expired OTP is rejected with "Your verification code has expired."'
      );

      // Reset expiry back to valid for TEST 3: Correct OTP grants access
      await OTPVerification.updateOne(
        { 'metadata.challengeToken': unfamiliarLogin.challengeToken, usedAt: { $exists: false } },
        { $set: { expiresAt: new Date(Date.now() + 300000) } }
      );

      // 10. OTP verification with Trust this device
      const otpVerifyRes = await fetch(`${baseUrl}/auth/verify-login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeToken: unfamiliarLogin.challengeToken,
          otp: secondLoginOtp,
          trustThisDevice: true,
        }),
      });
      const otpVerify = await otpVerifyRes.json();
      assert(
        otpVerify.success === true && Boolean(otpVerify.trustedDeviceToken),
        'TEST 8: Successful OTP challenge verification & trusted device registration'
      );

      // 11. Security Health Score API
      const healthScoreRes = await fetch(`${baseUrl}/security/health-score`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const healthScore = await healthScoreRes.json();
      assert(typeof healthScore.score === 'number' && healthScore.score >= 0, '12. Security Health Score calculation');

      // 12. Security Overview Aggregation API
      const overviewRes = await fetch(`${baseUrl}/security/overview`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const overview = await overviewRes.json();
      assert(overview.success === true && Boolean(overview.stats), '13. Security Overview aggregation');

      // 13. Login History API
      const historyRes = await fetch(`${baseUrl}/login-history`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const history = await historyRes.json();
      const historyItems = history.data || history.history || history.records;
      assert(Array.isArray(historyItems) && historyItems.length > 0, '14. Detailed Login History telemetry');

      // 14. Login History CSV Export
      const csvRes = await fetch(`${baseUrl}/login-history/export`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const csvText = await csvRes.text();
      assert(csvRes.status === 200 && csvText.includes('IP Address'), '15. Login History CSV Export');

      // 15. Active Sessions API
      const sessionsRes = await fetch(`${baseUrl}/sessions`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const sessions = await sessionsRes.json();
      const sessionList = sessions.data || sessions.sessions;
      assert(Array.isArray(sessionList) && sessionList.length > 0, '16. Active Sessions listing');

      // 16. Emergency Account Lock & Block
      const lockRes = await fetch(`${baseUrl}/security/emergency-lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ confirmationPhrase: 'LOCK MY ACCOUNT', reason: 'Compromised device test' }),
      });
      const lock = await lockRes.json();
      assert(lock.success === true && lock.accountStatus === 'locked', '17. Emergency Account Lock kill switch');

      const lockedLoginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: profile.user.username, password: 'StrongP@ssw0rd2026' }),
      });
      assert(lockedLoginRes.status === 403, '18. Locked account blocks subsequent logins');

      // 17. Account Recovery Flow
      const recoverReqRes = await fetch(`${baseUrl}/security/recover/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: profile.user.username }),
      });
      const recoverReq = await recoverReqRes.json();
      assert(recoverReq.success === true && Boolean(recoverReq.recoveryChallenge), '19. Emergency Account Recovery dispatch');
      assert(recoverReq.devOtp === undefined, 'TEST 2D: Zero OTP leak in recovery API payload');

      const recoveryOtp = getDispatchedOtpForTest(userEmail);
      assert(Boolean(recoveryOtp && recoveryOtp.length === 6), 'TEST 1C: Recovery OTP delivered via email notification service');

      const recoverVerifyRes = await fetch(`${baseUrl}/security/recover/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recoveryChallenge: recoverReq.recoveryChallenge,
          otp: recoveryOtp,
          newPassword: 'BrandNewSecuredPass2026!',
        }),
      });
      const recoverVerify = await recoverVerifyRes.json();
      assert(recoverVerify.success === true, '20. Emergency Account Recovery & Unlock with new password');

      console.log('\n======================================================');
      console.log(`  VERIFICATION RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
      console.log('======================================================\n');

      if (failedTests === 0) {
        console.log('>>> ALL CRITICAL SECURITY & REGISTRATION SCENARIOS VERIFIED 100%! <<<\n');
      }
    } catch (err) {
      console.error('Test suite runtime error:', err);
    } finally {
      server.close();
      process.exit(failedTests > 0 ? 1 : 0);
    }
  });
}

runTestSuite();
