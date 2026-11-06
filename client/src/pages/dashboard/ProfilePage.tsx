import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  Sparkles,
  Sun,
  Moon,
  CheckCircle2,
  AlertTriangle,
  Save,
  Trash2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { userApi, securityApi } from '../../api/client';
import { IHealthScoreData } from '../../types';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { theme, preference, istTime, setPreference } = useTheme();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [mobileNumber, setMobileNumber] = useState(user?.mobileNumber || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Health Score Telemetry
  const [healthData, setHealthData] = useState<IHealthScoreData | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  // Deletion Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setMobileNumber(user.mobileNumber || '');
    }
  }, [user]);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await securityApi.getHealthScore();
        if (res.success) {
          setHealthData(res);
        }
      } catch {
        // Ignored
      } finally {
        setLoadingHealth(false);
      }
    };
    fetchHealth();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);

    try {
      const res = await userApi.updateProfile({
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
      });

      if (res.success) {
        updateUser(res.user);
        setSaveSuccess('Profile identity details updated successfully.');
        setTimeout(() => setSaveSuccess(null), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      alert('Please enter your password to confirm account deletion.');
      return;
    }

    try {
      await userApi.deleteAccount(deletePassword);
      window.location.href = '/login';
    } catch (err: any) {
      alert(err.message || 'Incorrect password.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100">
          User Profile & Security Health
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Manage your personal identity credentials, adaptive theme modes, and account hygiene.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. SECURITY HEALTH SCORE SECTION (Section 13)                             */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-cyber-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Security Hygiene Score
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Account posture evaluation based on verified telemetry & active defenses.
              </p>
            </div>
          </div>

          <div className="flex items-baseline gap-2 self-start sm:self-auto">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 font-mono">
              {healthData?.score || 0}
            </span>
            <span className="text-xs text-gray-400 font-medium">/ 100</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 ml-2">
              {healthData?.status || 'Analyzing'}
            </span>
          </div>
        </div>

        {/* Factors Breakdown */}
        {loadingHealth ? (
          <div className="py-8 text-center text-xs text-gray-400 animate-pulse">
            Calculating telemetry factors...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {healthData?.factors.map((factor) => (
              <div
                key={factor.id}
                className="p-3.5 rounded-2xl bg-gray-50/70 dark:bg-cyber-card/50 border border-gray-100 dark:border-cyber-border flex items-start gap-3"
              >
                <div className="mt-0.5">
                  {factor.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-900 dark:text-gray-100">
                    <span className="truncate">{factor.title}</span>
                    <span className="text-[10px] font-mono text-gray-400 font-normal">
                      +{factor.weight} pts
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                    {factor.description}
                  </p>
                  <p
                    className={`text-[10px] font-semibold pt-0.5 ${
                      factor.passed
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {factor.recommendation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 rounded-xl bg-gray-50 dark:bg-cyber-card text-[11px] text-gray-500 dark:text-gray-400">
          <strong>Notice:</strong> This score represents account hygiene indicators and configuration robustness, not an absolute guarantee of invulnerability against sophisticated external threats.
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ADAPTIVE THEME ENGINE PREFERENCES (Section 5)                          */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100 dark:border-cyber-border">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Adaptive Theme Engine (Indian Standard Time)
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Current server time: <strong>{istTime}</strong> • 5:00 AM–11:59 AM (Light) / 12:00 PM–4:59 AM (Dark)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            onClick={() => setPreference('auto')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              preference === 'auto'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/20'
                : 'border-gray-200 dark:border-cyber-border hover:bg-gray-50 dark:hover:bg-cyber-card text-gray-700 dark:text-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              {preference === 'auto' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold">
                  Active
                </span>
              )}
            </div>
            <div className="font-bold text-xs">Automatic Mode</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">
              Switches dynamically based on trusted Asia/Kolkata server time at each login.
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPreference('light')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              preference === 'light'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/20'
                : 'border-gray-200 dark:border-cyber-border hover:bg-gray-50 dark:hover:bg-cyber-card text-gray-700 dark:text-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Sun className="w-5 h-5 text-amber-500" />
              {preference === 'light' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold">
                  Active
                </span>
              )}
            </div>
            <div className="font-bold text-xs">Light Mode</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">
              Crisp white surfaces with soft-grey borders and emerald focus accents.
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPreference('dark')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              preference === 'dark'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/20'
                : 'border-gray-200 dark:border-cyber-border hover:bg-gray-50 dark:hover:bg-cyber-card text-gray-700 dark:text-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Moon className="w-5 h-5 text-teal-400" />
              {preference === 'dark' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold">
                  Active
                </span>
              )}
            </div>
            <div className="font-bold text-xs">Dark Mode</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">
              Deep charcoal and navy cybersecurity palette with glassmorphism touches.
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PROFILE IDENTITY & CONTACTS                                           */}
      {/* ========================================================================= */}
      <form
        onSubmit={handleUpdateProfile}
        className="p-6 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100 dark:border-cyber-border">
          <User className="w-5 h-5 text-emerald-500" />
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            Personal Identity Information
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-cyber-border bg-gray-50/50 dark:bg-cyber-card text-gray-900 dark:text-gray-100 text-xs focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <input
              type="text"
              disabled
              value={user?.username || ''}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-cyber-border bg-gray-100 dark:bg-cyber-card/40 text-gray-500 text-xs font-mono cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Primary Registered Email
            </label>
            <div className="relative">
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full pl-9 pr-20 py-2.5 rounded-xl border border-gray-200 dark:border-cyber-border bg-gray-100 dark:bg-cyber-card/40 text-gray-500 text-xs cursor-not-allowed"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <span className="absolute right-3 top-2.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Verified
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Recovery Mobile Number
            </label>
            <div className="relative">
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 dark:border-cyber-border bg-gray-50/50 dark:bg-cyber-card text-gray-900 dark:text-gray-100 text-xs focus:border-emerald-500 outline-none"
              />
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
        </button>
      </form>

      {/* ========================================================================= */}
      {/* 4. DANGER ZONE: ACCOUNT DELETION                                          */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-3xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-rose-900 dark:text-rose-300">
            Account Deactivation & Purge
          </h2>
          <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">
            Permanently revoke all sessions, purge your login telemetry logs, and delete your profile.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setDeleteModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-sm"
        >
          Delete Account
        </button>
      </div>

      {/* Deletion Dialog */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Confirm Permanent Account Deletion
              </h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              This action is permanent and irreversible. All your login history, trusted devices, active sessions, and security alerts will be purged.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Enter your password to authorize:
              </label>
              <input
                type="password"
                required
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-cyber-border text-xs focus:border-rose-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-cyber-border text-xs font-semibold text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
