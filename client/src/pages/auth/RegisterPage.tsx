import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, User, Mail, Phone, Eye, EyeOff, AlertTriangle, ArrowRight, CheckCircle2, RefreshCw, ArrowLeft } from 'lucide-react';
import { authApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { PasswordStrengthMeter } from '../../components/common/PasswordStrengthMeter';
import { OtpInput } from '../../components/common/OtpInput';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginSuccess } = useAuth();

  // Registration form fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Status & Error handling
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDuplicateEmail, setIsDuplicateEmail] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Email Verification Step
  const [verificationPending, setVerificationPending] = useState(false);
  const [createdUserId, setCreatedUserId] = useState('');
  const [verificationOtp, setVerificationOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const startResendTimer = () => {
    setResendCooldown(60);
    setCanResend(false);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const validateFields = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = 'Please enter your full name (at least 2 characters).';
    }

    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || !/^[a-zA-Z0-9_]{3,30}$/.test(cleanUser)) {
      errors.username = 'Username must be 3-30 characters (letters, numbers, underscore only).';
    }

    const cleanMail = email.trim().toLowerCase();
    if (!cleanMail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanMail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (mobileNumber.trim()) {
      const cleanPhone = mobileNumber.replace(/[\s-]/g, '');
      if (!/^\+?[0-9]{7,15}$/.test(cleanPhone)) {
        errors.mobileNumber = 'Please enter a valid mobile number with country code (e.g. +91 98765 43210).';
      }
    }

    if (!password || password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (!agreeTerms) {
      errors.agreeTerms = 'You must agree to the Terms of Service to create an account.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsDuplicateEmail(false);

    if (!validateFields()) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await authApi.register({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        mobileNumber: mobileNumber.trim(),
        password,
      });

      if (res.success) {
        setCreatedUserId(res.userId || '');
        setVerificationPending(true);
        setSuccessMessage('Verification code sent to your registered email.');
        startResendTimer();
      }
    } catch (err: any) {
      if (
        err.status === 409 &&
        (err.data?.isDuplicateEmail ||
          err.message?.includes('already registered') ||
          err.message?.includes('already exists') ||
          err.message?.includes('email'))
      ) {
        setIsDuplicateEmail(true);
        setErrorMessage('This email is already registered. Please log in.');
      } else if (err.status === 409 && err.message?.includes('username')) {
        setIsDuplicateEmail(false);
        setFieldErrors((prev) => ({ ...prev, username: 'This username is already taken. Please choose another.' }));
        setErrorMessage('This username is already taken. Please choose another.');
      } else {
        setIsDuplicateEmail(false);
        const serverMsg =
          err.data?.message ||
          err.message ||
          'Failed to register account. Please check your information and try again.';
        setErrorMessage(serverMsg);

        // If a pending registration was created/updated, preserve the userId
        if (err.data?.userId) {
          setCreatedUserId(err.data.userId);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (verificationOtp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit code sent to your email.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await authApi.verifyEmail(createdUserId, verificationOtp);
      if (res.success && res.user) {
        loginSuccess(res.user);
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.message?.includes('expired') || err.data?.isExpired) {
        setErrorMessage('Your verification code has expired.');
      } else {
        setErrorMessage('Invalid verification code.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || isLoading) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      await authApi.resendOtp({
        userId: createdUserId,
        email: email.trim().toLowerCase(),
        purpose: 'email_verification',
      });
      setSuccessMessage('Verification code sent to your registered email.');
      startResendTimer();
    } catch (err: any) {
      const serverMsg =
        err.data?.message ||
        err.message ||
        "We couldn't send your verification code. Please try again.";
      setErrorMessage(serverMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-cyber-bg dark:via-cyber-surface dark:to-cyber-bg transition-colors duration-200">
      <div className="max-w-lg w-full flex flex-col gap-4">
        <div className="w-full bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

          {/* Brand Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-2.5">
              <img src="/shield-pulse.svg" alt="SecurePulse" className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Join Secure<span className="text-emerald-500">Pulse</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
              100% Free Forever • Intelligent Access • Adaptive Security
            </p>
          </div>

          {/* Success Alert */}
          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1">
                <p className="font-medium leading-relaxed">{errorMessage}</p>
                {isDuplicateEmail && (
                  <div className="mt-3 pt-3 border-t border-rose-200/60 dark:border-rose-900/40 flex flex-wrap items-center gap-3 font-semibold text-xs">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-sm shadow-emerald-600/20"
                    >
                      <span>Sign In to Account</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <Link
                      to="/forgot-password"
                      className="text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {!verificationPending ? (
            /* ========================================================================= */
            /* SCREEN 1: NEW ACCOUNT REGISTRATION FORM                                   */
            /* ========================================================================= */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: '' }));
                      }}
                      placeholder="Alex Morgan"
                      className={`w-full pl-9 pr-3 py-2 rounded-xl border ${
                        fieldErrors.fullName ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-gray-300 dark:border-cyber-border'
                      } bg-gray-50/50 dark:bg-cyber-card text-gray-900 dark:text-gray-100 text-xs focus:border-emerald-500 outline-none`}
                    />
                    <User className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                  {fieldErrors.fullName && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.fullName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (fieldErrors.username) setFieldErrors((p) => ({ ...p, username: '' }));
                      }}
                      placeholder="alex_sec"
                      className={`w-full pl-9 pr-3 py-2 rounded-xl border ${
                        fieldErrors.username ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-gray-300 dark:border-cyber-border'
                      } bg-gray-50/50 dark:bg-cyber-card text-gray-900 dark:text-gray-100 text-xs focus:border-emerald-500 outline-none`}
                    />
                    <span className="text-gray-400 font-mono text-xs absolute left-3 top-2">@</span>
                  </div>
                  {fieldErrors.username && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.username}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
                    }}
                    placeholder="alex@example.com"
                    className={`w-full pl-9 pr-3 py-2 rounded-xl border ${
                      fieldErrors.email ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-gray-300 dark:border-cyber-border'
                    } bg-gray-50/50 dark:bg-cyber-card text-gray-900 dark:text-gray-100 text-xs focus:border-emerald-500 outline-none`}
                  />
                  <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                </div>
                {fieldErrors.email && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Mobile Number <span className="text-gray-400 font-normal">(with country code)</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => {
                      setMobileNumber(e.target.value);
                      if (fieldErrors.mobileNumber) setFieldErrors((p) => ({ ...p, mobileNumber: '' }));
                    }}
                    placeholder="+91 98765 43210"
                    className={`w-full pl-9 pr-3 py-2 rounded-xl border ${
                      fieldErrors.mobileNumber ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-gray-300 dark:border-cyber-border'
                    } bg-gray-50/50 dark:bg-cyber-card text-gray-900 dark:text-gray-100 text-xs focus:border-emerald-500 outline-none`}
                  />
                  <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                </div>
                {fieldErrors.mobileNumber && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.mobileNumber}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }));
                      }}
                      placeholder="••••••••••••"
                      className={`w-full pl-9 pr-9 py-2 rounded-xl border ${
                        fieldErrors.password ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-gray-300 dark:border-cyber-border'
                      } bg-gray-50/50 dark:bg-cyber-card text-gray-900 dark:text-gray-100 text-xs focus:border-emerald-500 outline-none`}
                    />
                    <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (fieldErrors.confirmPassword) setFieldErrors((p) => ({ ...p, confirmPassword: '' }));
                      }}
                      placeholder="••••••••••••"
                      className={`w-full pl-9 pr-3 py-2 rounded-xl border ${
                        fieldErrors.confirmPassword ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-gray-300 dark:border-cyber-border'
                      } bg-gray-50/50 dark:bg-cyber-card text-gray-900 dark:text-gray-100 text-xs focus:border-emerald-500 outline-none`}
                    />
                    <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Password Strength Meter */}
              <PasswordStrengthMeter password={password} />

              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    required
                    checked={agreeTerms}
                    onChange={(e) => {
                      setAgreeTerms(e.target.checked);
                      if (fieldErrors.agreeTerms) setFieldErrors((p) => ({ ...p, agreeTerms: '' }));
                    }}
                    className="w-4 h-4 mt-0.5 rounded text-emerald-500 focus:ring-emerald-500 border-gray-300 dark:border-cyber-border bg-white dark:bg-cyber-card cursor-pointer"
                  />
                  <span>
                    I agree to the SecurePulse Terms and consent to adaptive environment security detection.
                  </span>
                </label>
                {fieldErrors.agreeTerms && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.agreeTerms}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 mt-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <span>Creating Free Account...</span>
                ) : (
                  <>
                    <span>Create Free Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-3 border-t border-gray-100 dark:border-cyber-border">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Already registered?{' '}
                  <Link
                    to="/login"
                    className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            /* ========================================================================= */
            /* SCREEN 2: EMAIL VERIFICATION OTP STEP                                     */
            /* ========================================================================= */
            <form onSubmit={handleVerifyEmail} className="space-y-5 animate-fade-in text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Verify Your Email
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  Your verification code has been sent to your registered email. Please check your inbox and spam folder. <br />
                  <strong className="text-gray-800 dark:text-gray-200 font-mono">{email}</strong>
                </p>
              </div>

              <OtpInput value={verificationOtp} onChange={setVerificationOtp} autoFocus length={6} disabled={isLoading} />

              <button
                type="submit"
                disabled={isLoading || verificationOtp.length !== 6}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all duration-150 shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'Activating Account...' : 'Activate & Enter Dashboard'}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setVerificationPending(false);
                    setVerificationOtp('');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to registration</span>
                </button>

                <button
                  type="button"
                  disabled={!canResend || isLoading}
                  onClick={handleResendOtp}
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline disabled:text-gray-400 disabled:no-underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  {canResend ? 'Resend Verification Code' : `Resend in ${resendCooldown}s`}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Back to Home Link */}
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors py-1 px-3 rounded-lg hover:bg-gray-200/50 dark:hover:bg-cyber-card"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
