import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, KeyRound, Lock, Eye, EyeOff, AlertTriangle, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { securityApi } from '../../api/client';
import { OtpInput } from '../../components/common/OtpInput';
import { PasswordStrengthMeter } from '../../components/common/PasswordStrengthMeter';

export const AccountRecoveryPage: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [identifier, setIdentifier] = useState('');
  const [recoveryChallenge, setRecoveryChallenge] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await securityApi.requestRecovery(identifier.trim());
      if (res.success && res.recoveryChallenge) {
        setRecoveryChallenge(res.recoveryChallenge);
        setMaskedEmail(res.maskedEmail);
        setStep('verify');
      }
    } catch (err: any) {
      if (err.status === 503) {
        setErrorMessage(err.message || "We couldn't send your verification code. Please try again.");
      } else {
        setErrorMessage(err.message || 'Failed to dispatch account unlock passcode.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (otp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit recovery passcode.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await securityApi.verifyRecovery({
        recoveryChallenge,
        otp,
        newPassword,
      });

      if (res.success) {
        setSuccessMessage('Account unlocked and recovered successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2500);
      }
    } catch (err: any) {
      if (err.message?.includes('expired') || err.data?.isExpired) {
        setErrorMessage('Your verification code has expired.');
      } else {
        setErrorMessage(err.message || 'Invalid verification code.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-cyber-bg transition-colors duration-200">
      <div className="max-w-md w-full bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Emergency Account Recovery</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Restore access to your account following emergency lockdown or security freeze.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequestRecovery} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Your Email Address or Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="analyst@securepulse.local"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 dark:border-cyber-border bg-gray-50/50 dark:bg-cyber-card text-gray-900 dark:text-gray-100 text-sm focus:border-rose-500 outline-none"
                />
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 disabled:opacity-50"
            >
              {isLoading ? 'Dispatching Unlock Code...' : 'Dispatch Account Unlock Passcode'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to login</span>
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyRecovery} className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 text-center">
                6-Digit Unlock Passcode
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-300 text-center mb-2">
                Your verification code has been sent to your registered email. Please check your inbox and spam folder: <strong className="font-mono text-gray-800 dark:text-gray-200">{maskedEmail}</strong>
              </p>
              <OtpInput value={otp} onChange={setOtp} autoFocus length={6} disabled={isLoading} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                New Secure Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-9 py-2 rounded-xl border border-gray-300 dark:border-cyber-border bg-gray-50/50 dark:bg-cyber-card text-gray-900 dark:text-gray-100 text-xs focus:border-emerald-500 outline-none"
                />
                <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <PasswordStrengthMeter password={newPassword} />

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full py-2.5 px-4 mt-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {isLoading ? 'Unlocking Account...' : 'Unlock Account & Set New Password'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

