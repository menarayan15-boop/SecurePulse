import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, Eye, EyeOff, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { authApi } from '../../api/client';
import { OtpInput } from '../../components/common/OtpInput';
import { PasswordStrengthMeter } from '../../components/common/PasswordStrengthMeter';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const resetChallenge = searchParams.get('challenge') || '';
  const maskedEmail = searchParams.get('email') || '';

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (otp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authApi.resetPassword({
        resetChallenge,
        otp,
        newPassword,
      });

      if (res.success) {
        setSuccessMessage('Password reset successfully! Redirecting to login in 3 seconds...');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password. Please check your passcode.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-cyber-bg transition-colors duration-200">
      <div className="max-w-md w-full bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Create New Password</h1>
          {maskedEmail && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter the 6-digit code sent to <strong className="font-mono text-gray-700 dark:text-gray-300">{maskedEmail}</strong>
            </p>
          )}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 text-center">
              6-Digit Verification Code
            </label>
            <OtpInput value={otp} onChange={setOtp} autoFocus length={6} disabled={isLoading} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              New Password
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
            {isLoading ? 'Resetting Password...' : 'Save New Password & Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="text-center pt-2">
            <Link to="/login" className="text-xs text-gray-500 hover:underline">
              Cancel and return to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
