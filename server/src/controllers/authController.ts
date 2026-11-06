import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { LoginHistory } from '../models/LoginHistory.js';
import { TrustedDevice } from '../models/TrustedDevice.js';
import { OTPVerification } from '../models/OTPVerification.js';
import { ActiveSession } from '../models/ActiveSession.js';
import {
  hashPassword,
  comparePassword,
  generateSecureOTP,
  hashToken,
  generateRandomToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/crypto.js';
import { extractEnvironmentInfo } from '../services/environmentDetection.js';
import { analyzeLoginRisk } from '../services/riskEngine.js';
import {
  sendOtpEmail,
  sendSecurityAlertEmail,
  createInAppAlert,
  logSecurityAudit,
} from '../services/notificationService.js';
import { calculateThemeForIST } from '../utils/themeEngine.js';

// Cookie options
const isProduction = process.env.NODE_ENV === 'production';
const COOKIE_BASE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
};

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { fullName, username, email, mobileNumber, password } = req.body;

    if (!fullName || !username || !email || !password) {
      res.status(400).json({ success: false, message: 'All required fields must be provided.' });
      return;
    }

    // Validation
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
      res.status(400).json({
        success: false,
        message: 'Username must be 3-30 characters long and contain only letters, numbers, and underscores.',
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
      return;
    }

    // Check duplicate username or email
    const existingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanUsername }],
    });

    if (existingUser) {
      if (existingUser.email === cleanEmail) {
        res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
        return;
      }
      res.status(409).json({ success: false, message: 'This username is already taken. Please choose another.' });
      return;
    }

    const passwordHash = await hashPassword(password);

    const newUser = await User.create({
      fullName: fullName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      mobileNumber: mobileNumber?.trim() || '',
      passwordHash,
      emailVerified: false,
      mobileVerified: false,
      themePreference: 'auto',
      securitySettings: {
        trustedDeviceDurationDays: 30,
        allowEmailAlerts: true,
        allowSmsAlerts: false,
        highRiskOtpEnforced: true,
        unfamiliarDeviceOtpEnforced: true,
      },
      accountStatus: 'active',
    });

    // Generate email verification OTP
    const otp = generateSecureOTP();
    const otpHash = hashToken(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const resendAvailableAt = new Date(Date.now() + 60 * 1000); // 60 seconds

    await OTPVerification.create({
      userId: newUser._id,
      otpHash,
      deliveryMethod: 'email',
      purpose: 'email_verification',
      expiresAt,
      resendAvailableAt,
    });

    await sendOtpEmail(cleanEmail, otp, 'account activation', newUser.fullName);

    await logSecurityAudit({
      userId: newUser._id,
      action: 'Account Registration Initiated',
      eventType: 'auth',
      ipAddress: extractEnvironmentInfo(req).ipAddress,
      browser: extractEnvironmentInfo(req).browserName,
    });

    res.status(201).json({
      success: true,
      message: 'Account created. Please verify your email with the 6-digit code sent to you.',
      userId: newUser._id,
      email: cleanEmail,
      // For instant dev preview without email client, also provide otp if DEV mode
      devOtp: !isProduction ? otp : undefined,
    });
  } catch (err: any) {
    console.error('[Register Error]:', err);
    res.status(500).json({ success: false, message: 'Server error during registration. Please try again.' });
  }
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      res.status(400).json({ success: false, message: 'User ID and verification code are required.' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'Account not found.' });
      return;
    }

    if (user.emailVerified) {
      res.status(200).json({ success: true, message: 'Email is already verified. You may log in.' });
      return;
    }

    const otpHash = hashToken(otp.trim());
    const verification = await OTPVerification.findOne({
      userId: user._id,
      purpose: 'email_verification',
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!verification) {
      res.status(400).json({
        success: false,
        message: 'Verification code is invalid or has expired. Please request a new code.',
      });
      return;
    }

    if (verification.attempts >= verification.maxAttempts) {
      res.status(429).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new code.',
      });
      return;
    }

    if (verification.otpHash !== otpHash) {
      verification.attempts += 1;
      await verification.save();
      res.status(400).json({
        success: false,
        message: `Incorrect code. ${verification.maxAttempts - verification.attempts} attempts remaining.`,
      });
      return;
    }

    // Mark verified
    verification.verifiedAt = new Date();
    verification.usedAt = new Date();
    await verification.save();

    user.emailVerified = true;
    await user.save();

    // Auto-login upon verification: Establish session
    const envInfo = extractEnvironmentInfo(req);
    const sessionToken = generateRandomToken(32);
    const refreshToken = signRefreshToken({ userId: user._id.toString(), sessionId: sessionToken });
    const refreshTokenHash = hashToken(refreshToken);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await ActiveSession.create({
      userId: user._id,
      refreshTokenHash,
      sessionToken,
      ipAddress: envInfo.ipAddress,
      browser: envInfo.browserName,
      operatingSystem: envInfo.operatingSystem,
      deviceType: envInfo.deviceType,
      city: envInfo.city,
      state: envInfo.state,
      country: envInfo.country,
      lastActiveAt: new Date(),
      expiresAt,
    });

    const accessToken = signAccessToken({ userId: user._id.toString(), username: user.username });

    // Record login history
    await LoginHistory.create({
      userId: user._id,
      ipAddress: envInfo.ipAddress,
      browserName: envInfo.browserName,
      browserVersion: envInfo.browserVersion,
      browserEngine: envInfo.browserEngine,
      operatingSystem: envInfo.operatingSystem,
      deviceType: envInfo.deviceType,
      deviceModel: envInfo.deviceModel,
      city: envInfo.city,
      state: envInfo.state,
      country: envInfo.country,
      approximateCoordinates: envInfo.approximateCoordinates,
      loginTimestamp: new Date(),
      loginStatus: 'success',
      otpStatus: 'verified',
      riskScore: 0,
      riskFactors: ['Initial account activation verification'],
      isNewDevice: true,
      isTrustedDevice: false,
    });

    await logSecurityAudit({
      userId: user._id,
      action: 'Email Verified & Account Activated',
      eventType: 'auth',
      ipAddress: envInfo.ipAddress,
      browser: envInfo.browserName,
    });

    // Set Cookies
    res.cookie('accessToken', accessToken, {
      ...COOKIE_BASE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 mins
    });
    res.cookie('refreshToken', refreshToken, {
      ...COOKIE_BASE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    res.cookie('sessionId', sessionToken, {
      ...COOKIE_BASE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const themeResult = calculateThemeForIST(user.themePreference);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! Welcome to SecurePulse.',
      accessToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        mobileNumber: user.mobileNumber,
        themePreference: user.themePreference,
        calculatedTheme: themeResult.theme,
        istTimeString: themeResult.istTimeString,
        securitySettings: user.securitySettings,
      },
    });
  } catch (err: any) {
    console.error('[Verify Email Error]:', err);
    res.status(500).json({ success: false, message: 'Server error during verification.' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { identifier, password, rememberDevice } = req.body;
    const envInfo = extractEnvironmentInfo(req);

    if (!identifier || !password) {
      res.status(400).json({ success: false, message: 'Email/username and password are required.' });
      return;
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ email: cleanIdentifier }, { username: cleanIdentifier }],
    });

    // If user does not exist
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials entered.' });
      return;
    }

    // Check account status
    if (user.accountStatus === 'locked') {
      res.status(403).json({
        success: false,
        message: 'This account has been locked for emergency security. Please complete the account recovery process.',
        isLocked: true,
        userId: user._id,
      });
      return;
    }

    // Verify Password
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      // Log failed attempt
      await LoginHistory.create({
        userId: user._id,
        ipAddress: envInfo.ipAddress,
        browserName: envInfo.browserName,
        browserVersion: envInfo.browserVersion,
        operatingSystem: envInfo.operatingSystem,
        deviceType: envInfo.deviceType,
        deviceModel: envInfo.deviceModel,
        city: envInfo.city,
        state: envInfo.state,
        country: envInfo.country,
        approximateCoordinates: envInfo.approximateCoordinates,
        loginTimestamp: new Date(),
        loginStatus: 'failed',
        otpStatus: 'not_required',
        riskScore: 40,
        riskFactors: ['Incorrect password attempt'],
        failureReason: 'Invalid password credentials',
        isNewDevice: false,
        isTrustedDevice: false,
      });

      // Check if multiple recent failures occurred
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      const recentFailures = await LoginHistory.countDocuments({
        userId: user._id,
        loginStatus: 'failed',
        loginTimestamp: { $gte: fifteenMinsAgo },
      });

      if (recentFailures >= 3) {
        await createInAppAlert({
          userId: user._id,
          alertType: 'multiple_failed_logins',
          severity: 'high',
          title: 'Multiple Failed Login Attempts',
          description: `We detected ${recentFailures} unsuccessful login attempts on your account from IP ${envInfo.ipAddress} (${envInfo.city}, ${envInfo.country}).`,
        });

        await sendSecurityAlertEmail(
          user.email,
          user.fullName,
          'Multiple Failed Login Attempts Detected',
          `${recentFailures} failed password attempts were logged within a short period. If this wasn't you, consider locking your account immediately.`,
          `Location: ${envInfo.city}, ${envInfo.country} | IP: ${envInfo.ipAddress} | Device: ${envInfo.browserName} on ${envInfo.operatingSystem}`
        );
      }

      res.status(401).json({ success: false, message: 'Invalid credentials entered.' });
      return;
    }

    // If email is not yet verified, require email verification
    if (!user.emailVerified) {
      const otp = generateSecureOTP();
      const otpHash = hashToken(otp);
      await OTPVerification.create({
        userId: user._id,
        otpHash,
        deliveryMethod: 'email',
        purpose: 'email_verification',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        resendAvailableAt: new Date(Date.now() + 60 * 1000),
      });
      await sendOtpEmail(user.email, otp, 'email verification', user.fullName);

      res.status(403).json({
        success: false,
        requiresEmailVerification: true,
        message: 'Your email address is not yet verified. A verification code has been dispatched to your email.',
        userId: user._id,
        email: user.email,
        devOtp: !isProduction ? otp : undefined,
      });
      return;
    }

    // Check trusted device token from cookie or header
    const trustedDeviceCookie = req.cookies?.trustedDeviceToken || (req.headers['x-trusted-device-token'] as string);

    // Run SecurePulse Intelligent Login Analysis & Risk Engine
    const riskAnalysis = await analyzeLoginRisk(user.toObject(), envInfo, trustedDeviceCookie);

    // Require OTP if risk engine flags unfamiliar device or risk factors
    if (riskAnalysis.requiresOtp) {
      const otp = generateSecureOTP();
      const otpHash = hashToken(otp);
      const challengeToken = generateRandomToken(32);

      await OTPVerification.create({
        userId: user._id,
        otpHash,
        deliveryMethod: 'email',
        purpose: 'login_verification',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        resendAvailableAt: new Date(Date.now() + 60 * 1000),
        metadata: {
          challengeToken,
          rememberDevice: Boolean(rememberDevice),
          envInfo,
          riskAnalysis,
        },
      });

      // Send OTP
      await sendOtpEmail(
        user.email,
        otp,
        `login from unfamiliar environment (${envInfo.browserName} on ${envInfo.operatingSystem})`,
        user.fullName
      );

      // Create in-app alert about unfamiliar login challenge
      await createInAppAlert({
        userId: user._id,
        alertType: riskAnalysis.isNewDevice ? 'new_device' : 'new_location',
        severity: riskAnalysis.riskLevel,
        title: 'Login Verification Challenge Issued',
        description: `Login attempted from an unfamiliar environment (${envInfo.browserName}, ${envInfo.city}). OTP challenge was triggered.`,
      });

      // Log attempt as otp_required
      await LoginHistory.create({
        userId: user._id,
        ipAddress: envInfo.ipAddress,
        browserName: envInfo.browserName,
        browserVersion: envInfo.browserVersion,
        operatingSystem: envInfo.operatingSystem,
        deviceType: envInfo.deviceType,
        deviceModel: envInfo.deviceModel,
        city: envInfo.city,
        state: envInfo.state,
        country: envInfo.country,
        approximateCoordinates: envInfo.approximateCoordinates,
        loginTimestamp: new Date(),
        loginStatus: 'otp_required',
        otpStatus: 'pending',
        riskScore: riskAnalysis.riskScore,
        riskFactors: riskAnalysis.factors,
        isNewDevice: riskAnalysis.isNewDevice,
        isTrustedDevice: false,
      });

      // Return challenge response
      const maskedEmail = user.email.replace(/(^.{2})(.*)(?=@)/, (_: string, a: string, b: string) => a + '*'.repeat(b.length));

      res.status(200).json({
        success: true,
        requiresOtp: true,
        challengeToken,
        deliveryMethod: 'email',
        maskedEmail,
        hasMobile: Boolean(user.mobileNumber),
        maskedMobile: user.mobileNumber
          ? user.mobileNumber.replace(/(^\+?\d{2})(\d+)(\d{4}$)/, (_: string, c: string, mid: string, last: string) => `${c}****${last}`)
          : undefined,
        riskLevel: riskAnalysis.riskLevel,
        riskScore: riskAnalysis.riskScore,
        factors: riskAnalysis.factors,
        message: 'We noticed a login from an environment you have not used before. Please verify your identity to continue.',
        devOtp: !isProduction ? otp : undefined,
      });
      return;
    }

    // Direct Login Allowed (Known environment or validated trusted device)
    const sessionToken = generateRandomToken(32);
    const refreshToken = signRefreshToken({ userId: user._id.toString(), sessionId: sessionToken });
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await ActiveSession.create({
      userId: user._id,
      refreshTokenHash,
      sessionToken,
      ipAddress: envInfo.ipAddress,
      browser: envInfo.browserName,
      operatingSystem: envInfo.operatingSystem,
      deviceType: envInfo.deviceType,
      city: envInfo.city,
      state: envInfo.state,
      country: envInfo.country,
      lastActiveAt: new Date(),
      expiresAt,
    });

    const accessToken = signAccessToken({ userId: user._id.toString(), username: user.username });

    const loginRecord = await LoginHistory.create({
      userId: user._id,
      ipAddress: envInfo.ipAddress,
      browserName: envInfo.browserName,
      browserVersion: envInfo.browserVersion,
      browserEngine: envInfo.browserEngine,
      operatingSystem: envInfo.operatingSystem,
      deviceType: envInfo.deviceType,
      deviceModel: envInfo.deviceModel,
      city: envInfo.city,
      state: envInfo.state,
      country: envInfo.country,
      approximateCoordinates: envInfo.approximateCoordinates,
      loginTimestamp: new Date(),
      loginStatus: 'success',
      otpStatus: 'not_required',
      riskScore: riskAnalysis.riskScore,
      riskFactors: riskAnalysis.factors,
      isNewDevice: false,
      isTrustedDevice: Boolean(trustedDeviceCookie),
    });

    await logSecurityAudit({
      userId: user._id,
      action: 'Successful User Login',
      eventType: 'auth',
      ipAddress: envInfo.ipAddress,
      browser: envInfo.browserName,
      relevantMetadata: { loginId: loginRecord._id },
    });

    // Set Cookies
    res.cookie('accessToken', accessToken, {
      ...COOKIE_BASE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', refreshToken, {
      ...COOKIE_BASE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie('sessionId', sessionToken, {
      ...COOKIE_BASE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const themeResult = calculateThemeForIST(user.themePreference);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      accessToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        mobileNumber: user.mobileNumber,
        themePreference: user.themePreference,
        calculatedTheme: themeResult.theme,
        istTimeString: themeResult.istTimeString,
        securitySettings: user.securitySettings,
      },
    });
  } catch (err: any) {
    console.error('[Login Error]:', err);
    res.status(500).json({ success: false, message: 'Server error during login processing.' });
  }
}

export async function verifyLoginOtp(req: Request, res: Response): Promise<void> {
  try {
    const { challengeToken, otp, trustThisDevice } = req.body;
    const envInfo = extractEnvironmentInfo(req);

    if (!challengeToken || !otp) {
      res.status(400).json({ success: false, message: 'Challenge token and verification code are required.' });
      return;
    }

    const verification = await OTPVerification.findOne({
      'metadata.challengeToken': challengeToken,
      purpose: 'login_verification',
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });

    if (!verification) {
      res.status(400).json({
        success: false,
        message: 'Verification challenge has expired or is invalid. Please log in again.',
      });
      return;
    }

    const user = await User.findById(verification.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User account not found.' });
      return;
    }

    if (verification.attempts >= verification.maxAttempts) {
      res.status(429).json({
        success: false,
        message: 'Maximum attempts exceeded for this challenge. Please start a new login.',
      });
      return;
    }

    const otpHash = hashToken(otp.trim());
    if (verification.otpHash !== otpHash) {
      verification.attempts += 1;
      await verification.save();

      // If attempts reach limit, log failure
      if (verification.attempts >= verification.maxAttempts) {
        await createInAppAlert({
          userId: user._id,
          alertType: 'otp_failure',
          severity: 'high',
          title: 'Repeated OTP Verification Failures',
          description: `5 incorrect verification codes were entered during login from ${envInfo.browserName} (${envInfo.city}).`,
        });
      }

      res.status(400).json({
        success: false,
        message: `Incorrect code. ${verification.maxAttempts - verification.attempts} attempts remaining.`,
      });
      return;
    }

    // OTP is valid!
    verification.verifiedAt = new Date();
    verification.usedAt = new Date();
    await verification.save();

    // Trust this device if user opted in
    let newTrustedDeviceToken: string | undefined = undefined;
    if (trustThisDevice) {
      newTrustedDeviceToken = generateRandomToken(48);
      const deviceTokenHash = hashToken(newTrustedDeviceToken);
      const trustDays = user.securitySettings?.trustedDeviceDurationDays || 30;
      const trustExpiresAt = new Date(Date.now() + trustDays * 24 * 60 * 60 * 1000);

      await TrustedDevice.create({
        userId: user._id,
        deviceTokenHash,
        deviceName: `${envInfo.browserName} on ${envInfo.operatingSystem}`,
        browser: envInfo.browserName,
        operatingSystem: envInfo.operatingSystem,
        deviceType: envInfo.deviceType,
        ipAddress: envInfo.ipAddress,
        city: envInfo.city,
        state: envInfo.state,
        country: envInfo.country,
        firstTrustedAt: new Date(),
        lastUsedAt: new Date(),
        expiresAt: trustExpiresAt,
      });

      await createInAppAlert({
        userId: user._id,
        alertType: 'device_trusted',
        severity: 'low',
        title: 'New Device Trusted',
        description: `Device '${envInfo.browserName} on ${envInfo.operatingSystem}' was added to your trusted devices for ${trustDays} days.`,
      });

      res.cookie('trustedDeviceToken', newTrustedDeviceToken, {
        ...COOKIE_BASE_OPTIONS,
        maxAge: trustDays * 24 * 60 * 60 * 1000,
      });
    }

    // Create session
    const sessionToken = generateRandomToken(32);
    const refreshToken = signRefreshToken({ userId: user._id.toString(), sessionId: sessionToken });
    const refreshTokenHash = hashToken(refreshToken);
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await ActiveSession.create({
      userId: user._id,
      refreshTokenHash,
      sessionToken,
      ipAddress: envInfo.ipAddress,
      browser: envInfo.browserName,
      operatingSystem: envInfo.operatingSystem,
      deviceType: envInfo.deviceType,
      city: envInfo.city,
      state: envInfo.state,
      country: envInfo.country,
      lastActiveAt: new Date(),
      expiresAt: sessionExpiresAt,
    });

    const accessToken = signAccessToken({ userId: user._id.toString(), username: user.username });

    // Record verified login
    await LoginHistory.create({
      userId: user._id,
      ipAddress: envInfo.ipAddress,
      browserName: envInfo.browserName,
      browserVersion: envInfo.browserVersion,
      browserEngine: envInfo.browserEngine,
      operatingSystem: envInfo.operatingSystem,
      deviceType: envInfo.deviceType,
      deviceModel: envInfo.deviceModel,
      city: envInfo.city,
      state: envInfo.state,
      country: envInfo.country,
      approximateCoordinates: envInfo.approximateCoordinates,
      loginTimestamp: new Date(),
      loginStatus: 'success',
      otpStatus: 'verified',
      riskScore: verification.metadata?.riskAnalysis?.riskScore || 25,
      riskFactors: verification.metadata?.riskAnalysis?.factors || ['Verified via 6-digit OTP challenge'],
      isNewDevice: verification.metadata?.riskAnalysis?.isNewDevice ?? true,
      isTrustedDevice: Boolean(trustThisDevice),
    });

    await logSecurityAudit({
      userId: user._id,
      action: 'Successful Login with OTP Verification',
      eventType: 'auth',
      ipAddress: envInfo.ipAddress,
      browser: envInfo.browserName,
    });

    // Set Cookies
    res.cookie('accessToken', accessToken, {
      ...COOKIE_BASE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', refreshToken, {
      ...COOKIE_BASE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie('sessionId', sessionToken, {
      ...COOKIE_BASE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const themeResult = calculateThemeForIST(user.themePreference);

    res.status(200).json({
      success: true,
      message: 'Identity verified successfully! Welcome to SecurePulse.',
      accessToken,
      trustedDeviceToken: newTrustedDeviceToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        mobileNumber: user.mobileNumber,
        themePreference: user.themePreference,
        calculatedTheme: themeResult.theme,
        istTimeString: themeResult.istTimeString,
        securitySettings: user.securitySettings,
      },
    });
  } catch (err: any) {
    console.error('[Verify Login OTP Error]:', err);
    res.status(500).json({ success: false, message: 'Server error during OTP verification.' });
  }
}

export async function resendOtp(req: Request, res: Response): Promise<void> {
  try {
    const { challengeToken, userId, purpose } = req.body;

    let query: Record<string, any> = {
      usedAt: { $exists: false },
    };

    if (challengeToken) {
      query['metadata.challengeToken'] = challengeToken;
    } else if (userId && purpose) {
      query.userId = userId;
      query.purpose = purpose;
    } else {
      res.status(400).json({ success: false, message: 'Verification context is required.' });
      return;
    }

    const currentVerification = await OTPVerification.findOne(query).sort({ createdAt: -1 });

    if (!currentVerification) {
      res.status(404).json({ success: false, message: 'No active verification request found.' });
      return;
    }

    // Cooldown check (60 seconds)
    if (new Date() < currentVerification.resendAvailableAt) {
      const remainingSeconds = Math.ceil((currentVerification.resendAvailableAt.getTime() - Date.now()) / 1000);
      res.status(429).json({
        success: false,
        message: `Please wait ${remainingSeconds} seconds before requesting a new code.`,
        remainingSeconds,
      });
      return;
    }

    const user = await User.findById(currentVerification.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User account not found.' });
      return;
    }

    // Generate new OTP
    const newOtp = generateSecureOTP();
    const newOtpHash = hashToken(newOtp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const resendAvailableAt = new Date(Date.now() + 60 * 1000);

    // Expire the previous code
    currentVerification.usedAt = new Date();
    await currentVerification.save();

    // Create fresh OTP
    await OTPVerification.create({
      userId: user._id,
      otpHash: newOtpHash,
      deliveryMethod: currentVerification.deliveryMethod,
      purpose: currentVerification.purpose,
      expiresAt,
      resendAvailableAt,
      metadata: currentVerification.metadata,
    });

    await sendOtpEmail(user.email, newOtp, currentVerification.purpose.replace('_', ' '), user.fullName);

    res.status(200).json({
      success: true,
      message: 'A fresh 6-digit code has been dispatched to your email.',
      resendCooldownSeconds: 60,
      devOtp: !isProduction ? newOtp : undefined,
    });
  } catch (err: any) {
    console.error('[Resend OTP Error]:', err);
    res.status(500).json({ success: false, message: 'Server error while resending verification code.' });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    let refreshToken = req.cookies?.refreshToken;
    if (!refreshToken && req.headers['x-refresh-token']) {
      refreshToken = req.headers['x-refresh-token'] as string;
    }

    if (!refreshToken) {
      res.status(401).json({ success: false, message: 'Refresh token not found. Please log in.' });
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);

    if (!user || user.accountStatus === 'locked') {
      res.status(401).json({ success: false, message: 'Account invalid or locked.' });
      return;
    }

    // Look for matching active session with this sessionToken & unrevoked
    const session = await ActiveSession.findOne({
      sessionToken: decoded.sessionId,
      userId: user._id,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      res.status(401).json({ success: false, message: 'Session expired or invalidated. Please log in.' });
      return;
    }

    // Verify token hash
    const incomingHash = hashToken(refreshToken);
    if (session.refreshTokenHash !== incomingHash) {
      // Possible token theft! Invalidate session immediately
      session.revokedAt = new Date();
      await session.save();

      await createInAppAlert({
        userId: user._id,
        alertType: 'session_terminated',
        severity: 'critical',
        title: 'Suspected Token Reuse Invalidation',
        description: 'An anomalous refresh token was used. The corresponding session was terminated immediately for your security.',
      });

      res.status(401).json({ success: false, message: 'Session anomaly detected. Please re-authenticate.' });
      return;
    }

    // Rotate refresh token
    const newRefreshToken = signRefreshToken({ userId: user._id.toString(), sessionId: session.sessionToken });
    session.refreshTokenHash = hashToken(newRefreshToken);
    session.lastActiveAt = new Date();
    await session.save();

    const newAccessToken = signAccessToken({ userId: user._id.toString(), username: user.username });

    res.cookie('accessToken', newAccessToken, {
      ...COOKIE_BASE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', newRefreshToken, {
      ...COOKIE_BASE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (err: any) {
    res.status(401).json({ success: false, message: 'Failed to refresh authentication session.' });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = req.cookies?.sessionId || (req.headers['x-session-id'] as string);

    if (sessionId) {
      await ActiveSession.findOneAndUpdate(
        { sessionToken: sessionId },
        { revokedAt: new Date() }
      );
    }

    res.clearCookie('accessToken', COOKIE_BASE_OPTIONS);
    res.clearCookie('refreshToken', COOKIE_BASE_OPTIONS);
    res.clearCookie('sessionId', COOKIE_BASE_OPTIONS);

    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error during logout.' });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      res.status(400).json({ success: false, message: 'Please provide your registered email or username.' });
      return;
    }

    const clean = identifier.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ email: clean }, { username: clean }],
    });

    if (!user) {
      // Return neutral response to prevent username/email enumeration
      res.status(200).json({
        success: true,
        message: 'If an account exists for this credential, a password reset code has been sent.',
      });
      return;
    }

    const otp = generateSecureOTP();
    const otpHash = hashToken(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const resendAvailableAt = new Date(Date.now() + 60 * 1000);
    const resetChallenge = generateRandomToken(32);

    await OTPVerification.create({
      userId: user._id,
      otpHash,
      deliveryMethod: 'email',
      purpose: 'password_reset',
      expiresAt,
      resendAvailableAt,
      metadata: { resetChallenge },
    });

    await sendOtpEmail(user.email, otp, 'password reset request', user.fullName);

    const maskedEmail = user.email.replace(/(^.{2})(.*)(?=@)/, (_: string, a: string, b: string) => a + '*'.repeat(b.length));

    res.status(200).json({
      success: true,
      message: 'Password reset code has been dispatched.',
      resetChallenge,
      maskedEmail,
      userId: user._id,
      devOtp: !isProduction ? otp : undefined,
    });
  } catch (err: any) {
    console.error('[Forgot Password Error]:', err);
    res.status(500).json({ success: false, message: 'Server error processing password reset.' });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { resetChallenge, otp, newPassword } = req.body;

    if (!resetChallenge || !otp || !newPassword) {
      res.status(400).json({ success: false, message: 'All required fields must be supplied.' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
      return;
    }

    const verification = await OTPVerification.findOne({
      'metadata.resetChallenge': resetChallenge,
      purpose: 'password_reset',
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });

    if (!verification) {
      res.status(400).json({ success: false, message: 'Reset session is invalid or has expired.' });
      return;
    }

    const otpHash = hashToken(otp.trim());
    if (verification.otpHash !== otpHash) {
      verification.attempts += 1;
      await verification.save();
      res.status(400).json({
        success: false,
        message: `Incorrect verification code. ${verification.maxAttempts - verification.attempts} attempts remaining.`,
      });
      return;
    }

    const user = await User.findById(verification.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'Account not found.' });
      return;
    }

    // Hash new password and update
    const passwordHash = await hashPassword(newPassword);
    user.passwordHash = passwordHash;
    // If account was locked, reset unlocks it upon successful verified password reset
    if (user.accountStatus === 'locked') {
      user.accountStatus = 'active';
      user.lockedAt = undefined;
      user.lockReason = undefined;
    }
    await user.save();

    verification.verifiedAt = new Date();
    verification.usedAt = new Date();
    await verification.save();

    // Invalidate all existing sessions and trusted devices for security!
    await ActiveSession.updateMany(
      { userId: user._id, revokedAt: { $exists: false } },
      { revokedAt: new Date() }
    );
    await TrustedDevice.updateMany(
      { userId: user._id, revokedAt: { $exists: false } },
      { revokedAt: new Date() }
    );

    // Notify user
    await sendSecurityAlertEmail(
      user.email,
      user.fullName,
      'Password Changed Successfully',
      'Your account password was recently changed. All other active sessions and trusted devices have been revoked for your protection.'
    );

    await createInAppAlert({
      userId: user._id,
      alertType: 'password_changed',
      severity: 'medium',
      title: 'Password Changed',
      description: 'Your account password was updated. All previous active sessions and trusted devices were revoked.',
    });

    await logSecurityAudit({
      userId: user._id,
      action: 'Password Reset Completed',
      eventType: 'security',
      ipAddress: extractEnvironmentInfo(req).ipAddress,
      browser: extractEnvironmentInfo(req).browserName,
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
    });
  } catch (err: any) {
    console.error('[Reset Password Error]:', err);
    res.status(500).json({ success: false, message: 'Server error during password reset.' });
  }
}
