import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, User, Mail, Phone, Eye, EyeOff, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { authApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { PasswordStrengthMeter } from '../../components/common/PasswordStrengthMeter';
import { OtpInput } from '../../components/common/OtpInput';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginSuccess } = useAuth();

  // Registration form
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Email Verification Step
  const [verificationPending, setVerificationPending] = useState(false);
  const [createdUserId, setCreatedUserId] = useState('');
  const [verificationOtp, setVerificationOtp] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your password entry.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('Please consent to the terms of service and security privacy policy.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authApi.register({
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        mobileNumber: mobileNumber.trim(),
        password,
      });

      if (res.success) {
        setCreatedUserId(res.userId);
        setVerificationPending(true);
        if (res.devOtp) setDevOtpHint(res.devOtp);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
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
        navigate('/');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-cyber-bg dark:via-cyber-surface dark:to-cyber-bg transition-colors duration-200">
      <div className="max-w-lg w-full bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
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
            100% Free Forever • Military-Grade Adaptive Defense
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Dev OTP Hint */}
        {devOtpHint && (
          <div className="mb-5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
            <span className="font-medium">Dev Activation Code:</span>
            <span className="font-mono font-bold tracking-widest text-sm bg-white dark:bg-cyber-card px-2 py-0.5 rounded border border-emerald-300">
              {devOtpHint}
            </span>
          </div>
        )}

        {!verificationPending ? (
          /* REGISTRATION FORM */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 dark:border-cyber-border bg-gray-50/50 dark:bg-cyber-card text-gray-900 dark:text-gray-100 text-xs focus:border-emerald-500 outline-none"
                  />
                  <User className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="alex_sec"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 dark:border-cyber-border bg-gray-50/50 dark:bg-cyber-card text-gray-900 dark:text-gray-100 text-xs focus:border-emerald-500 outline-none"
                  />
                  <span className="text-gray-400 font-mono text-xs absolute left-3 top-2">@</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 dark:border-cyber-border bg-gray-50/50 dark:bg-cyber-card text-gray-900 dark:text-gray-100 text-xs focus:border-emerald-500 outline-none"
                />
                <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Mobile Number (with country code)
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 dark:border-cyber-border bg-gray-50/50 dark:bg-cyber-card text-gray-900 dark:text-gray-100 text-xs focus:border-emerald-500 outline-none"
                />
                <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-9 py-2 rounded-xl border border-gray-300 dark:border-cyber-border bg-gray-50/50 dark:bg-cyber-card text-gray-900 dark:text-gray-100 text-xs focus:border-emerald-500 outline-none"
                  />
                  <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 dark:border-cyber-border bg-gray-50/50 dark:bg-cyber-card text-gray-900 dark:text-gray-100 text-xs focus:border-emerald-500 outline-none"
                  />
                  <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                </div>
              </div>
            </div>

            {/* Password Strength Meter */}
            <PasswordStrengthMeter password={password} />

            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  required
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-emerald-500 focus:ring-emerald-500 border-gray-300 dark:border-cyber-border bg-white dark:bg-cyber-card cursor-pointer"
                />
                <span>
                  I agree to the SecurePulse Terms and consent to adaptive environment security detection.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 mt-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-60"
            >
              {isLoading ? 'Creating Account...' : 'Create Free Account'}
              <ArrowRight className="w-4 h-4" />
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
          /* EMAIL VERIFICATION OTP STEP */
          <form onSubmit={handleVerifyEmail} className="space-y-5 animate-fade-in text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Verify Your Email
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                We sent a 6-digit activation code to: <br />
                <strong className="text-gray-800 dark:text-gray-200 font-mono">{email}</strong>
              </p>
            </div>

            <OtpInput value={verificationOtp} onChange={setVerificationOtp} autoFocus length={6} disabled={isLoading} />

            <button
              type="submit"
              disabled={isLoading || verificationOtp.length !== 6}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all duration-150 disabled:opacity-50"
            >
              {isLoading ? 'Activating Account...' : 'Activate & Enter Dashboard'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
