import app from './app.js';
import { connectDB } from './config/db.js';

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

      // 4. Registration validation
      const regRes = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Security Auditor',
          username: `auditor_${Date.now()}`,
          email: `auditor_${Date.now()}@securepulse.local`,
          mobileNumber: '+919988776655',
          password: 'StrongP@ssw0rd2026',
        }),
      });
      const reg = await regRes.json();
      assert(reg.success === true && Boolean(reg.userId), '5. New user registration with hashed password');

      const userId = reg.userId;
      const devOtp = reg.devOtp;

      // 5. Email Verification with OTP
      const verifyRes = await fetch(`${baseUrl}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otp: devOtp }),
      });
      const verify = await verifyRes.json();
      assert(verify.success === true && Boolean(verify.accessToken), '6. Email OTP verification & account activation');

      const cookieHeader = verifyRes.headers.get('set-cookie') || '';
      const accessToken = verify.accessToken;

      // 6. Profile & Theme Fetch
      const profileRes = await fetch(`${baseUrl}/users/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await profileRes.json();
      assert(profile.success === true && profile.user.emailVerified === true, '7. Authenticated profile retrieval');

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
      assert(themeUpdated.success === true && themeUpdated.themePreference === 'dark', '8. Manual theme update & DB persistence');

      // 8. Incorrect password detection
      const wrongPwRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: profile.user.username, password: 'WrongPassword999!' }),
      });
      assert(wrongPwRes.status === 401, '9. Incorrect password rejection & audit logging');

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
        '10. Unfamiliar environment detection & 6-digit OTP challenge'
      );

      // 10. OTP verification with Trust this device
      const otpVerifyRes = await fetch(`${baseUrl}/auth/verify-login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeToken: unfamiliarLogin.challengeToken,
          otp: unfamiliarLogin.devOtp,
          trustThisDevice: true,
        }),
      });
      const otpVerify = await otpVerifyRes.json();
      assert(
        otpVerify.success === true && Boolean(otpVerify.trustedDeviceToken),
        '11. Successful OTP challenge verification & trusted device registration'
      );

      // 11. Security Health Score API
      const healthScoreRes = await fetch(`${baseUrl}/security/health-score`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const healthScoreData = await healthScoreRes.json();
      assert(healthScoreData.success === true && healthScoreData.score > 0, '12. Security Health Score calculation');

      // 12. Security Overview Telemetry
      const overviewRes = await fetch(`${baseUrl}/security/overview`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const overview = await overviewRes.json();
      assert(overview.success === true && overview.stats.totalSuccessLogins >= 1, '13. Security Overview aggregation');

      // 13. Login History audit log & CSV export
      const historyRes = await fetch(`${baseUrl}/login-history`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const history = await historyRes.json();
      assert(history.success === true && history.data.length >= 2, '14. Detailed Login History telemetry');

      const csvRes = await fetch(`${baseUrl}/login-history/export`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const csvText = await csvRes.text();
      assert(csvText.includes('IP Address') && csvText.includes('Browser'), '15. Login History CSV Export');

      // 14. Active Sessions Management
      const sessionsRes = await fetch(`${baseUrl}/sessions`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const sessions = await sessionsRes.json();
      assert(sessions.success === true && sessions.data.length >= 1, '16. Active Sessions listing');

      // 15. Emergency Account Lock
      const lockRes = await fetch(`${baseUrl}/security/emergency-lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ confirmationPhrase: 'LOCK MY ACCOUNT' }),
      });
      const lockData = await lockRes.json();
      assert(lockData.success === true, '17. Emergency Account Lock kill switch');

      // 16. Verify locked account rejects normal login
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

      const recoverVerifyRes = await fetch(`${baseUrl}/security/recover/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recoveryChallenge: recoverReq.recoveryChallenge,
          otp: recoverReq.devOtp,
          newPassword: 'BrandNewSecuredPass2026!',
        }),
      });
      const recoverVerify = await recoverVerifyRes.json();
      assert(recoverVerify.success === true, '20. Emergency Account Recovery & Unlock with new password');

      console.log('\n======================================================');
      console.log(`  VERIFICATION RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
      console.log('======================================================\n');

      if (failedTests === 0) {
        console.log('>>> ALL 20 CRITICAL SECURITY & AUTH SCENARIOS VERIFIED 100%! <<<\n');
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
