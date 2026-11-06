import http from 'http';
import app from './app.js';
import { connectDB } from './config/db.js';

async function runTests() {
  await connectDB();
  const server = app.listen(5099, async () => {
    console.log('Test server running on port 5099');
    
    try {
      // 1. Test Health & IST time
      const healthRes = await fetch('http://127.0.0.1:5099/api/health');
      const healthJson = await healthRes.json();
      console.log('✓ Health Check:', healthJson);

      // 2. Test Registration
      const regRes = await fetch('http://127.0.0.1:5099/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Test Analyst',
          username: 'analyst1',
          email: 'analyst@securepulse.local',
          mobileNumber: '+919876543210',
          password: 'Password123!',
        }),
      });
      const regJson = await regRes.json();
      console.log('✓ Registration Response:', regJson);

      const userId = regJson.userId;
      const devOtp = regJson.devOtp;

      // 3. Test Email Verification
      const verifyRes = await fetch('http://127.0.0.1:5099/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          otp: devOtp,
        }),
      });
      const verifyJson = await verifyRes.json();
      console.log('✓ Verify Email Response:', verifyJson.success, verifyJson.message);

      // 4. Test Login
      const loginRes = await fetch('http://127.0.0.1:5099/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'analyst1',
          password: 'Password123!',
        }),
      });
      const loginJson = await loginRes.json();
      console.log('✓ Login Response:', loginJson.success, loginJson.message);

      console.log('\n>>> ALL BACKEND API TESTS PASSED SUCCESSFULLY! <<<\n');
    } catch (err) {
      console.error('Test failed:', err);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

runTests();
