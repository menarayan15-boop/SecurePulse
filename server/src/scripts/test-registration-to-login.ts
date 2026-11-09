import { User } from '../models/User.js';
import { OTPVerification } from '../models/OTPVerification.js';
import { hashPassword, comparePassword, hashToken } from '../utils/crypto.js';

async function run() {
  console.log('=== REGISTRATION TO LOGIN FLOW DIAGNOSTIC ===');

  const testEmail = 'reg_flow_test_' + Date.now() + '@example.com';
  const testUsername = 'testuser_' + Date.now().toString(36).slice(-6);
  const testPassword = 'Password123!Secure';

  console.log(`1. Creating pending registration for ${testEmail}...`);
  const passwordHash = await hashPassword(testPassword);
  console.log(`Password hash generated (length ${passwordHash.length}): ${passwordHash.slice(0, 15)}...`);

  // Verify compare immediately
  const directMatch = await comparePassword(testPassword, passwordHash);
  console.log(`Direct bcrypt compare immediately after hashing: ${directMatch}`);

  const user = await User.create({
    fullName: 'Registration Flow Test',
    username: testUsername,
    email: testEmail,
    mobileNumber: '+919876543210',
    passwordHash,
    emailVerified: false,
    accountStatus: 'active',
  });

  console.log(`2. User created. User ID: ${user._id}, emailVerified: ${user.emailVerified}`);

  // Try finding the user
  const foundUser1 = await User.findOne({ email: testEmail });
  console.log(`Found user before verification: ${Boolean(foundUser1)}, emailVerified: ${foundUser1?.emailVerified}`);

  // Create OTP
  const rawOtp = '123456';
  const otpHash = hashToken(rawOtp);
  await OTPVerification.create({
    userId: user._id,
    otpHash,
    deliveryMethod: 'email',
    purpose: 'email_verification',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  // Verify OTP & mark user verified
  console.log(`3. Verifying OTP and activating user...`);
  const verification = await OTPVerification.findOne({
    userId: user._id,
    purpose: 'email_verification',
    usedAt: { $exists: false },
  });

  if (!verification || verification.otpHash !== otpHash) {
    throw new Error('OTP mismatch');
  }

  verification.usedAt = new Date();
  await verification.save();

  // Activate user
  const userToActivate = await User.findById(user._id);
  userToActivate.emailVerified = true;
  await userToActivate.save();

  // Try finding the user again after save
  console.log(`4. Re-fetching user after activation...`);
  const foundUser2 = await User.findOne({ email: testEmail });
  console.log(`Found user after verification: ${Boolean(foundUser2)}, emailVerified: ${foundUser2?.emailVerified}`);

  // Try login query
  console.log(`5. Simulating login query...`);
  const cleanIdentifier = testEmail.trim().toLowerCase();
  const identifierRegex = new RegExp(`^${cleanIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

  const loginUser = await User.findOne({
    $or: [{ email: identifierRegex }, { username: identifierRegex }],
  });

  console.log(`Login query found user: ${Boolean(loginUser)}`);
  if (!loginUser) {
    console.error('FAILED: User not found during login query!');
    return;
  }

  console.log(`Stored passwordHash: ${loginUser.passwordHash?.slice(0, 15)}...`);
  const isMatch = await comparePassword(testPassword, loginUser.passwordHash);
  console.log(`Password comparison in login: ${isMatch}`);

  if (!isMatch) {
    console.error('FAILED: Password mismatch during login!');
  } else {
    console.log('SUCCESS: Registration -> OTP Verify -> Login succeeded locally!');
  }
}

run().catch(console.error);

