import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Lock, User, Eye, EyeOff, AlertTriangle, ArrowRight, ShieldCheck, RefreshCw, CheckCircle2, ArrowLeft, Info, Fingerprint } from 'lucide-react';
import { authApi, passkeyApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { OtpInput } from '../../components/common/OtpInput';
import { SecurityBadge } from '../../components/common/SecurityBadge';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginSuccess } = useAuth();

  const redirectParam = searchParams.get('redirect');
  const targetDestination = redirectParam ? decodeURIComponent(redirectParam) : '/dashboard';

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // OTP Challenge state
  const [challengeActive, setChallengeActive] = useState(false);
  const [challengeToken, setChallengeToken] = useState('');
  const [otp, setOtp] = useState('');
  const [trustThisDevice, setTrustThisDevice] = useState(true);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [riskFactors, setRiskFactors] = useState<string[]>([]);
  const [challengeMessage, setChallengeMessage] = useState('');

  // OTP Resend cooldown timer
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

  // Handle Passkey Biometric Sign In
  const handlePasskeyLogin = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (!window.PublicKeyCredential) {
        throw new Error('Passkeys are not supported on this browser.');
      }

      const optRes = await passkeyApi.getAuthOptions(identifier.trim());
      if (!optRes.success || !optRes.options) {
        throw new Error('Failed to retrieve passkey challenge.');
      }

      const options = optRes.options;

      const base64UrlToUint8 = (str: string) => {
        const padding = '='.repeat((4 - (str.length % 4)) % 4);
        const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
        const raw = window.atob(base64);
        const arr = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
        return arr;
      };

      const arrayBufToBase64Url = (buf: ArrayBuffer) => {
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      };

      const getCredential = (await navigator.credentials.get({
        publicKey: {
          challenge: base64UrlToUint8(options.challenge) as any,
          rpId: options.rpId,
          timeout: options.timeout || 60000,
          userVerification: options.userVerification || 'preferred',
          allowCredentials: options.allowCredentials?.map((c: any) => ({
            id: base64UrlToUint8(c.id) as any,
            type: 'public-key',
            transports: c.transports,
          })),
        },
      })) as PublicKeyCredential;

      if (!getCredential) {
        throw new Error('Authentication cancelled.');
      }

      const rawId = arrayBufToBase64Url(getCredential.rawId);
      const resAssertion = getCredential.response as AuthenticatorAssertionResponse;

      const authPayload = {
        id: getCredential.id,
        rawId,
        type: getCredential.type,
        response: {
          clientDataJSON: arrayBufToBase64Url(resAssertion.clientDataJSON),
          authenticatorData: arrayBufToBase64Url(resAssertion.authenticatorData),
          signature: arrayBufToBase64Url(resAssertion.signature),
          userHandle: resAssertion.userHandle ? arrayBufToBase64Url(resAssertion.userHandle) : null,
        },
      };

      const verifyRes = await passkeyApi.verifyAuth(authPayload);
      if (verifyRes.success) {
        loginSuccess(verifyRes.user);
        navigate(targetDestination, { replace: true });
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setErrorMessage('Passkey authentication was cancelled.');
      } else {
        setErrorMessage(err.message || 'Passkey authentication failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Initial Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await authApi.login({
        identifier: identifier.trim(),
        password,
        rememberDevice,
      });

      if (res.requiresOtp || res.requiresEmailVerification) {
        // Verification challenge active
        setChallengeActive(true);
        setChallengeToken(res.challengeToken);
        setMaskedEmail(res.maskedEmail || res.email);
        setRiskLevel(res.riskLevel || 'medium');
        setRiskFactors(res.factors || ['Identity verification required']);
        setChallengeMessage(res.message || 'Verification code sent to your registered email.');
        setSuccessMessage('Verification code sent to your registered email.');
        startResendTimer();
      } else if (res.success && res.user) {
        // Direct login success
        loginSuccess(res.user, res.accessToken);
        navigate(targetDestination);
      }
    } catch (err: any) {
      if (err.data?.isLocked) {
        setErrorMessage(
          'This account has been placed under Emergency Lockdown. Please use Account Recovery to unlock.'
        );
      } else if (err.status === 401) {
        setErrorMessage('Invalid email or password.');
      } else if (err.status === 503 || err.data?.category === 'DATABASE_ERROR') {
        setErrorMessage(err.data?.message || err.message || "Authentication service is temporarily unavailable. Please try again in a few moments.");
      } else {
        setErrorMessage(err.data?.message || err.message || 'An error occurred during login. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP Challenge Verification
  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await authApi.verifyLoginOtp(challengeToken, otp, trustThisDevice);
      if (res.success && res.user) {
        loginSuccess(res.user, res.accessToken);
        navigate(targetDestination);
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

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      await authApi.resendOtp({ challengeToken });
      setSuccessMessage('Verification code sent to your registered email.');
      startResendTimer();
    } catch (err: any) {
      setErrorMessage(err.message || "We couldn't send your verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-cyber-bg dark:via-cyber-surface dark:to-cyber-bg transition-colors duration-200">
      <div className="max-w-md w-full flex flex-col gap-4">
        <div className="w-full bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
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

        {/* Redirect Notice (when user clicked a protected feature) */}
        {redirectParam && !challengeActive && (
          <div className="mb-6 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2.5 leading-relaxed">
            <Info className="w-4 h-4 flex-shrink-0 text-blue-500" />
            <span>Please sign in to access your personal security dashboard.</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5 leading-relaxed">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 leading-relaxed">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
            <span>{errorMessage}</span>
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

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-cyber-border" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-white dark:bg-cyber-surface px-2.5 text-gray-500 font-medium">Or passwordless</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePasskeyLogin}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl border border-gray-200 dark:border-cyber-border hover:border-emerald-500/50 bg-gray-50/70 dark:bg-cyber-card/60 hover:bg-emerald-500/5 text-gray-700 dark:text-gray-200 font-semibold text-xs sm:text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Fingerprint className="w-4 h-4 text-emerald-500" />
              <span>Sign in with Passkey (Biometrics)</span>
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
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Your verification code has been sent to your registered email. Please check your inbox and spam folder.
              </p>
              <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 font-mono mt-1">
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

