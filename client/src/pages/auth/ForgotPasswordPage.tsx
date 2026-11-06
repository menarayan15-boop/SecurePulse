import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
import { authApi } from '../../api/client';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await authApi.forgotPassword(identifier.trim());
      if (res.success && res.resetChallenge) {
        navigate(`/reset-password?challenge=${res.resetChallenge}&email=${encodeURIComponent(res.maskedEmail || '')}`);
      } else {
        // If neutral message
        navigate('/login');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch reset instructions.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-cyber-bg transition-colors duration-200">
      <div className="max-w-md w-full bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3">
            <img src="/shield-pulse.svg" alt="SecurePulse" className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Reset Account Password</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Enter your registered email address or username to receive a security reset passcode.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Registered Email or Username
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="analyst@securepulse.local"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 dark:border-cyber-border bg-gray-50/50 dark:bg-cyber-card text-gray-900 dark:text-gray-100 text-sm focus:border-emerald-500 outline-none"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            {isLoading ? 'Sending Passcode...' : 'Send Verification Passcode'}
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to login</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
