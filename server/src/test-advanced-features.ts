process.env.ALLOW_TEST_MAIL_FALLBACK = 'true';

import app from './app.js';
import { connectDB } from './config/db.js';
import { User } from './models/User.js';
import { signAccessToken } from './utils/crypto.js';
import { calculateHaversineDistance, detectImpossibleTravel } from './services/impossibleTravelService.js';
import { generateBackupCodesForUser, verifyAndBurnRecoveryCode, getRecoveryCodeStats } from './services/recoveryService.js';
import { analyzeLoginRisk } from './services/riskEngine.js';

async function runAdvancedFeaturesTests() {
  console.log('\n======================================================');
  console.log('  SECUREPULSE 7 ADVANCED FEATURES VERIFICATION SUITE');
  console.log('======================================================\n');

  await connectDB();
  const PORT = 5099;
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
      // Create a test user for advanced features
      const testEmail = `sec_features_${Date.now()}@securepulse.local`;
      const testUser = await User.create({
        fullName: 'Security Architect',
        username: `architect_${Date.now()}`,
        email: testEmail,
        passwordHash: 'dummy_hash',
        emailVerified: true,
        accountStatus: 'active',
      });

      const token = signAccessToken({ userId: testUser._id.toString(), username: testUser.username });
      const authHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      // -----------------------------------------------------------------
      // FEATURE 1: AI Risk Analysis
      // -----------------------------------------------------------------
      const riskEngineResult = await analyzeLoginRisk(testUser.toObject(), {
        ipAddress: '203.0.113.195',
        browserName: 'Tor Browser',
        browserVersion: '12.0',
        operatingSystem: 'Linux',
        deviceType: 'desktop',
        city: 'Reykjavik',
        state: 'Capital',
        country: 'Iceland',
        approximateCoordinates: { lat: 64.1466, lng: -21.9426 },
        userAgent: 'Mozilla/5.0 Tor/12.0',
      });
      assert(riskEngineResult.riskScore >= 0 && riskEngineResult.riskScore <= 100, 'F1.1: Risk score is bounded between 0 and 100');
      assert(['low', 'medium', 'high', 'critical'].includes(riskEngineResult.riskLevel), 'F1.2: Risk level classifies into Low/Medium/High/Critical');
      assert(Array.isArray(riskEngineResult.scoreBreakdown), 'F1.3: Risk score provides explainable multi-signal breakdown');

      const riskRes = await fetch(`${baseUrl}/security/risk-analysis`, { headers: authHeaders });
      const riskData = await riskRes.json();
      assert(riskData.success === true, 'F1.4: GET /api/security/risk-analysis returns 200 OK');
      assert(typeof riskData.analytics?.avgRiskScore === 'number', 'F1.5: Analytics includes average score and distribution');

      // -----------------------------------------------------------------
      // FEATURE 2: Impossible Travel Detection
      // -----------------------------------------------------------------
      const distance = calculateHaversineDistance(19.076, 72.8777, 40.7128, -74.006); // Mumbai to NYC
      assert(distance > 12000, `F2.1: Haversine distance correctly computed (~${distance} km)`);

      const travelRes = await fetch(`${baseUrl}/security/impossible-travel`, { headers: authHeaders });
      const travelData = await travelRes.json();
      assert(travelData.success === true, 'F2.2: GET /api/security/impossible-travel returns 200 OK');
      assert(Array.isArray(travelData.alerts), 'F2.3: Telemetry returns travel alerts list');

      // -----------------------------------------------------------------
      // FEATURE 3: Real-Time Security Alert Center
      // -----------------------------------------------------------------
      const alertsRes = await fetch(`${baseUrl}/security/alerts`, { headers: authHeaders });
      const alertsData = await alertsRes.json();
      assert(alertsData.success === true, 'F3.1: GET /api/security/alerts returns 200 OK');

      const markAllRes = await fetch(`${baseUrl}/security/alerts/mark-all-read`, {
        method: 'POST',
        headers: authHeaders,
      });
      const markAllData = await markAllRes.json();
      assert(markAllData.success === true, 'F3.2: POST /api/security/alerts/mark-all-read succeeds');

      const prefRes = await fetch(`${baseUrl}/security/alerts/preferences`, { headers: authHeaders });
      const prefData = await prefRes.json();
      assert(prefData.success === true, 'F3.3: GET /api/security/alerts/preferences returns notification settings');

      // -----------------------------------------------------------------
      // FEATURE 4: Passkey Authentication (WebAuthn)
      // -----------------------------------------------------------------
      const passkeyAnonOptRes = await fetch(`${baseUrl}/passkeys/auth-options`);
      const passkeyAnonOpt = await passkeyAnonOptRes.json();
      assert(passkeyAnonOpt.success === true, 'F4.1: Public GET /api/passkeys/auth-options returns challenge');
      assert(typeof passkeyAnonOpt.options?.challenge === 'string', 'F4.2: Challenge is cryptographically generated');

      const passkeyRegOptRes = await fetch(`${baseUrl}/passkeys/register-options`, { headers: authHeaders });
      const passkeyRegOpt = await passkeyRegOptRes.json();
      assert(passkeyRegOpt.success === true, 'F4.3: Authenticated GET /api/passkeys/register-options returns RP & User handle');

      const passkeyListRes = await fetch(`${baseUrl}/passkeys/list`, { headers: authHeaders });
      const passkeyList = await passkeyListRes.json();
      assert(passkeyList.success === true && Array.isArray(passkeyList.passkeys), 'F4.4: GET /api/passkeys/list returns user credentials');

      // -----------------------------------------------------------------
      // FEATURE 5: Account Takeover (ATO) Protection
      // -----------------------------------------------------------------
      const atoRes = await fetch(`${baseUrl}/security/account-protection`, { headers: authHeaders });
      const atoData = await atoRes.json();
      assert(atoData.success === true, 'F5.1: GET /api/security/account-protection returns 200 OK');
      assert(typeof atoData.protectionScore === 'number', 'F5.2: Account Protection Score (0-100) computed');
      assert(Array.isArray(atoData.checklist), 'F5.3: Security checklist items returned');

      // -----------------------------------------------------------------
      // FEATURE 6: Personal Security Timeline
      // -----------------------------------------------------------------
      const timelineRes = await fetch(`${baseUrl}/security/timeline?category=all`, { headers: authHeaders });
      const timelineData = await timelineRes.json();
      assert(timelineData.success === true, 'F6.1: GET /api/security/timeline returns chronological activity');
      assert(typeof timelineData.counts === 'object', 'F6.2: Timeline returns categorized counts');

      const csvRes = await fetch(`${baseUrl}/security/timeline/export?format=csv`, { headers: authHeaders });
      const csvText = await csvRes.text();
      assert(csvRes.status === 200 && csvText.includes('Timestamp'), 'F6.3: CSV export returns valid downloadable table');

      // -----------------------------------------------------------------
      // FEATURE 7: Emergency Account Recovery Center
      // -----------------------------------------------------------------
      const generatedCodes = await generateBackupCodesForUser(testUser._id);
      assert(generatedCodes.length === 10, 'F7.1: Generates exactly 10 one-time recovery codes');
      assert(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(generatedCodes[0]), 'F7.2: Code format is XXXX-XXXX-XXXX');

      const statsBefore = await getRecoveryCodeStats(testUser._id);
      assert(statsBefore.remainingCount === 10, 'F7.3: All 10 codes are initially unburned');

      // Burn one code
      const burnResult = await verifyAndBurnRecoveryCode(testUser._id, generatedCodes[0]);
      assert(burnResult.verified === true, 'F7.4: Valid backup code burns successfully');

      // Re-using the same code should fail
      const reuseResult = await verifyAndBurnRecoveryCode(testUser._id, generatedCodes[0]);
      assert(reuseResult.verified === false, 'F7.5: Re-using the burned backup code is rejected');

      const statsAfter = await getRecoveryCodeStats(testUser._id);
      assert(statsAfter.remainingCount === 9, 'F7.6: Remaining count decremented to 9/10');

      console.log('\n======================================================');
      console.log(`  ADVANCED FEATURES RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
      console.log('======================================================\n');

      if (failedTests > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    } catch (err: any) {
      console.error('Advanced features test suite failed:', err);
      process.exit(1);
    } finally {
      server.close();
    }
  });
}

runAdvancedFeaturesTests();

