import React, { useState, useEffect } from 'react';
import { Sliders, Shield, AlertOctagon, CheckCircle2, Save, Bell, Smartphone, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { userApi, securityApi } from '../../api/client';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';

export const SecuritySettingsPage: React.FC = () => {
  const { user, updateUser } = useAuth();

  const [durationDays, setDurationDays] = useState(
    user?.securitySettings?.trustedDeviceDurationDays || 30
  );
  const [emailAlerts, setEmailAlerts] = useState(
    user?.securitySettings?.allowEmailAlerts ?? true
  );
  const [smsAlerts, setSmsAlerts] = useState(
    user?.securitySettings?.allowSmsAlerts ?? false
  );
  const [highRiskOtp, setHighRiskOtp] = useState(
    user?.securitySettings?.highRiskOtpEnforced ?? true
  );
  const [unfamiliarOtp, setUnfamiliarOtp] = useState(
    user?.securitySettings?.unfamiliarDeviceOtpEnforced ?? true
  );

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lockModalOpen, setLockModalOpen] = useState(false);

  useEffect(() => {
    if (user?.securitySettings) {
      setDurationDays(user.securitySettings.trustedDeviceDurationDays || 30);
      setEmailAlerts(user.securitySettings.allowEmailAlerts ?? true);
      setSmsAlerts(user.securitySettings.allowSmsAlerts ?? false);
      setHighRiskOtp(user.securitySettings.highRiskOtpEnforced ?? true);
      setUnfamiliarOtp(user.securitySettings.unfamiliarDeviceOtpEnforced ?? true);
    }
  }, [user]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);

    try {
      const res = await userApi.updateSecuritySettings({
        trustedDeviceDurationDays: durationDays,
        allowEmailAlerts: emailAlerts,
        allowSmsAlerts: smsAlerts,
        highRiskOtpEnforced: highRiskOtp,
        unfamiliarDeviceOtpEnforced: unfamiliarOtp,
      });

      if (res.success) {
        updateUser({ securitySettings: res.securitySettings });
        setSuccessMessage('Security preferences updated and synchronized.');
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update security settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivateEmergencyLock = async () => {
    try {
      await securityApi.emergencyLock('LOCK MY ACCOUNT');
      window.location.href = '/recover-account';
    } catch (err: any) {
      alert(err.message || 'Failed to activate emergency lock.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100">
          Security Engine Configuration
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Customize adaptive risk sensitivity, challenge thresholds, and device trust parameters.
        </p>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Device Trust Window */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100 dark:border-cyber-border">
            <Shield className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Trusted Device Lifecycle
            </h2>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Default Trust Duration
              </label>
              <span className="font-bold text-sm font-mono text-emerald-600 dark:text-emerald-400">
                {durationDays} Days
              </span>
            </div>
            <input
              type="range"
              min="7"
              max="90"
              step="1"
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-cyber-card rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-mono">
              <span>7 Days (High Hygiene)</span>
              <span>30 Days (Recommended)</span>
              <span>90 Days (Extended)</span>
            </div>
          </div>
        </div>

        {/* Section 2: Adaptive OTP Enforcement Rules */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100 dark:border-cyber-border">
            <Lock className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Adaptive Authentication Rules
            </h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-start justify-between gap-4 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100 block">
                  Unfamiliar Environment Challenge
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                  Automatically challenge any login attempt detected from an unrecognized browser, device, or city.
                </span>
              </div>
              <input
                type="checkbox"
                checked={unfamiliarOtp}
                onChange={(e) => setUnfamiliarOtp(e.target.checked)}
                className="w-5 h-5 rounded text-emerald-500 focus:ring-emerald-500 border-gray-300 dark:border-cyber-border bg-white dark:bg-cyber-card cursor-pointer"
              />
            </label>

            <label className="flex items-start justify-between gap-4 cursor-pointer pt-3 border-t border-gray-100 dark:border-cyber-border">
              <div>
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100 block">
                  High-Risk Telemetry Lockout
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                  Override trusted device tokens if suspicious password failure bursts or anomaly scores exceed 50.
                </span>
              </div>
              <input
                type="checkbox"
                checked={highRiskOtp}
                onChange={(e) => setHighRiskOtp(e.target.checked)}
                className="w-5 h-5 rounded text-emerald-500 focus:ring-emerald-500 border-gray-300 dark:border-cyber-border bg-white dark:bg-cyber-card cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Section 3: Notification Channels */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100 dark:border-cyber-border">
            <Bell className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Security Notification Channels
            </h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-start justify-between gap-4 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100 block">
                  Email Alert Dispatch
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                  Receive formatted cybersecurity alerts to your registered email when unfamiliar logins occur.
                </span>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-5 h-5 rounded text-emerald-500 focus:ring-emerald-500 border-gray-300 dark:border-cyber-border bg-white dark:bg-cyber-card cursor-pointer"
              />
            </label>

            <label className="flex items-start justify-between gap-4 cursor-pointer pt-3 border-t border-gray-100 dark:border-cyber-border">
              <div>
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100 block">
                  SMS Security Transmissions
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                  Deliver secondary alert pings to your registered mobile number where provider gateway is active.
                </span>
              </div>
              <input
                type="checkbox"
                checked={smsAlerts}
                onChange={(e) => setSmsAlerts(e.target.checked)}
                className="w-5 h-5 rounded text-emerald-500 focus:ring-emerald-500 border-gray-300 dark:border-cyber-border bg-white dark:bg-cyber-card cursor-pointer"
              />
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving Configurations...' : 'Save Security Settings'}</span>
        </button>
      </form>

      {/* Section 4: Emergency Account Lockdown */}
      <div className="p-5 sm:p-6 rounded-3xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <AlertOctagon className="w-6 h-6 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          <div>
            <h2 className="text-sm font-bold text-rose-900 dark:text-rose-300">
              Emergency Account Lockdown
            </h2>
            <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">
              If you suspect an active breach, immediately terminate all active sessions, invalidate trusted devices, and prevent all logins.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setLockModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors shadow-md shadow-rose-600/20"
          >
            Activate Emergency Lockdown
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={lockModalOpen}
        title="Activate Emergency Account Lock?"
        description="This action terminates every active session immediately and blocks all new logins until you complete recovery verification with your registered email."
        requirePhrase="LOCK MY ACCOUNT"
        confirmText="Lock Account Immediately"
        isDestructive={true}
        onConfirm={handleActivateEmergencyLock}
        onCancel={() => setLockModalOpen(false)}
      />
    </div>
  );
};
