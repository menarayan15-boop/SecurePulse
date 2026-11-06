import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, User, Eye, EyeOff, AlertTriangle, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { authApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { OtpInput } from '../../components/common/OtpInput';
import { SecurityBadge } from '../../components/common/SecurityBadge';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginSuccess } = useAuth();

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OTP Challenge state
  const [challengeActive, setChallengeActive] = useState(false);
  const [challengeToken, setChallengeToken] = useState('');
  const [otp, setOtp] = useState('');
  const [trustThisDevice, setTrustThisDevice] = useState(true);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [riskFactors, setRiskFactors] = useState<string[]>([]);
  const [challengeMessage, setChallengeMessage] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // OTP Resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Handle Initial Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await authApi.login({
        identifier: identifier.trim(),
        password,
        rememberDevice,
      });

      if (res.requiresOtp) {
        // Unfamiliar environment or elevated risk detected!
        setChallengeActive(true);
        setChallengeToken(res.challengeToken);
        setMaskedEmail(res.maskedEmail);
        setRiskLevel(res.riskLevel);
        setRiskFactors(res.factors || []);
        setChallengeMessage(res.message);
        if (res.devOtp) setDevOtpHint(res.devOtp);

        // Start 60s resend timer
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
      } else if (res.success && res.user) {
        // Direct login success
        loginSuccess(res.user);
        navigate('/');
      }
    } catch (err: any) {
      if (err.data?.isLocked) {
        setErrorMessage(
          'This account has been placed under Emergency Lockdown. Please use Account Recovery to unlock.'
        );
      } else {
        setErrorMessage(err.message || 'Incorrect email/username or password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP Challenge Verification
  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setErrorMessage('Please enter the full 6-digit verification passcode.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await authApi.verifyLoginOtp(challengeToken, otp, trustThisDevice);
      if (res.success && res.user) {
        loginSuccess(res.user);
        navigate('/');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired passcode. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await authApi.resendOtp({ challengeToken });
      setCanResend(false);
      setResendCooldown(60);
      if (res.devOtp) setDevOtpHint(res.devOtp);

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
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-cyber-bg dark:via-cyber-surface dark:to-cyber-bg transition-colors duration-200">
      <div className="max-w-md w-full bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/10">
            <img src="/shield-pulse.svg" alt="SecurePulse" className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Secure<span className="text-emerald-500">Pulse</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Intelligent Access • Adaptive Security System
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 leading-relaxed">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* DEV MODE OTP POPUP BANNER FOR INSTANT TESTING */}
        {devOtpHint && (
          <div className="mb-6 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
            <span className="font-medium">Dev Test Code:</span>
            <span className="font-mono font-bold tracking-widest text-sm bg-white dark:bg-cyber-card px-2 py-0.5 rounded border border-emerald-300">
              {devOtpHint}
            </span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 1: STANDARD CREDENTIALS LOGIN                                      */}
        {/* ========================================================================= */}
        {!challengeActive ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="analyst@securepulse.local"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-cyber-border bg-gray-50/50 dark:bg-cyber-card text-gray-900 dark:text-gray-100 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 dark:border-cyber-border bg-gray-50/50 dark:bg-cyber-card text-gray-900 dark:text-gray-100 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 border-gray-300 dark:border-cyber-border bg-white dark:bg-cyber-card cursor-pointer"
                />
                <span>Remember this trusted device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <span>Analyzing Environment...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-4 border-t border-gray-100 dark:border-cyber-border">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Do not have an account?{' '}
                <Link
                  to="/register"
                  className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Create one for free
                </Link>
              </p>
            </div>
          </form>
        ) : (
          /* ========================================================================= */
          /* SCREEN 2: INTELLIGENT OTP VERIFICATION CHALLENGE SCREEN                   */
          /* ========================================================================= */
          <form onSubmit={handleOtpVerify} className="space-y-5 animate-fade-in">
            {/* Risk & Environment Alert Badge */}
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  Unfamiliar Login Detected
                </span>
                <SecurityBadge type="risk" value={riskLevel} />
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/80 leading-relaxed">
                {challengeMessage ||
                  'We noticed a login from an environment you have not used before. Please verify your identity.'}
              </p>
              {riskFactors.length > 0 && (
                <ul className="mt-2 text-[10px] text-amber-800/70 dark:text-amber-400 space-y-0.5 list-disc list-inside">
                  {riskFactors.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                A 6-digit one-time passcode was dispatched to:
              </p>
              <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 font-mono mt-0.5">
                {maskedEmail}
              </p>
            </div>

            {/* Split 6-digit OTP Input */}
            <div className="py-2">
              <OtpInput value={otp} onChange={setOtp} autoFocus length={6} disabled={isLoading} />
            </div>

            {/* Trust this device checkbox */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-cyber-card border border-gray-200 dark:border-cyber-border text-left">
              <input
                id="trustDeviceCheck"
                type="checkbox"
                checked={trustThisDevice}
                onChange={(e) => setTrustThisDevice(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-emerald-500 focus:ring-emerald-500 border-gray-300 dark:border-cyber-border bg-white dark:bg-cyber-card cursor-pointer"
              />
              <label htmlFor="trustDeviceCheck" className="text-xs cursor-pointer">
                <span className="font-semibold text-gray-800 dark:text-gray-200 block">
                  Trust this device for 30 days
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                  Bypasses future OTP prompts from this browser under normal security conditions.
                </span>
              </label>
            </div>

            {/* Submit & Resend Controls */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {isLoading ? 'Verifying Passcode...' : 'Verify & Continue'}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setChallengeActive(false);
                    setOtp('');
                    setErrorMessage(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ← Back to login
                </button>

                <button
                  type="button"
                  disabled={!canResend || isLoading}
                  onClick={handleResendOtp}
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline disabled:text-gray-400 disabled:no-underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  {canResend ? 'Resend Passcode' : `Resend in ${resendCooldown}s`}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
