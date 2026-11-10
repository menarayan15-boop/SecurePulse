import React, { useState, useEffect } from 'react';
import {
  Lock,
  Download,
  Trash2,
  Bell,
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Database,
} from 'lucide-react';
import { privacyApi } from '../../api/featureApis';

export const PrivacyControlPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [preferences, setPreferences] = useState({
    loginAlertsEmail: true,
    criticalAlertsEmail: true,
    travelAlertsEmail: true,
    weeklySecurityDigest: false,
    dataRetentionDays: 90,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Retention cleanup state
  const [cleaningUp, setCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  // Deletion modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadPrivacyOverview();
  }, []);

  const loadPrivacyOverview = async () => {
    setLoading(true);
    try {
      const res = await privacyApi.getOverview();
      if (res.success && res.dataInventory) {
        setOverview(res.dataInventory);
        if (res.dataInventory.preferences) {
          setPreferences(res.dataInventory.preferences);
        }
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    setSaveSuccess(false);
    try {
      await privacyApi.updatePreferences(preferences);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {}
    finally {
      setSavingPrefs(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await privacyApi.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `securepulse-privacy-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to generate export file. Please try again.');
    }
  };

  const handleCleanupRetention = async () => {
    setCleaningUp(true);
    setCleanupResult(null);
    try {
      const res = await privacyApi.cleanupTelemetry(preferences.dataRetentionDays);
      setCleanupResult(res.message || 'Telemetry logs pruned.');
      loadPrivacyOverview();
    } catch {
      setCleanupResult('Failed to prune records.');
    } finally {
      setCleaningUp(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmPhrase !== 'DELETE MY ACCOUNT PERMANENTLY') return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await privacyApi.deleteAccount(confirmPhrase);
      window.location.href = '/';
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to process account deletion.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card-static bg-gradient-to-r from-purple-600/15 via-emerald-500/10 to-transparent border border-purple-500/25 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/20">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              Privacy Control Center
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-500/30">
                Zero Data Selling
              </span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Complete transparency over your collected data, notification controls, and data portability
            </p>
          </div>
        </div>
      </div>

      {/* Data Inventory Disclosure Card */}
      {overview && (
        <div className="glass-card-static border border-gray-200/70 dark:border-white/10 rounded-2xl p-6 shadow-lg space-y-4">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-500" />
            <span>Account Telemetry & Identity Inventory</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white/40 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 space-y-1">
              <div className="text-xs text-gray-400 dark:text-gray-500">Identity Details</div>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {overview.identity.fullName}
              </div>
              <div className="text-xs text-gray-500 font-mono truncate">{overview.identity.email}</div>
            </div>

            <div className="p-4 rounded-xl bg-white/40 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 space-y-1">
              <div className="text-xs text-gray-400 dark:text-gray-500">Authentication Telemetry</div>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {overview.telemetry.totalStoredLogins} Login Event(s)
              </div>
              <div className="text-xs text-gray-500">{overview.telemetry.registeredDevices} Device(s) Tracked</div>
            </div>

            <div className="p-4 rounded-xl bg-white/40 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 space-y-1">
              <div className="text-xs text-gray-400 dark:text-gray-500">Geolocation Accuracy</div>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Coarse GeoIP (City Level)
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                Zero precise GPS tracking
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification & Alert Preferences */}
      <div className="glass-card-static border border-gray-200/70 dark:border-white/10 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-500" />
            <span>Security Notification Preferences</span>
          </h2>
          {saveSuccess && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Saved!</span>
            </span>
          )}
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Sign-In Notification Emails
              </div>
              <div className="text-[11px] text-gray-500">
                Send an alert when a sign-in is detected from a new browser or location.
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.loginAlertsEmail}
              onChange={(e) => setPreferences({ ...preferences, loginAlertsEmail: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Critical Threat & Anomaly Alerts
              </div>
              <div className="text-[11px] text-gray-500">
                Immediate email dispatch upon impossible travel anomalies or rapid failed logins.
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.criticalAlertsEmail}
              onChange={(e) => setPreferences({ ...preferences, criticalAlertsEmail: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-cyber-card border border-gray-100 dark:border-cyber-border cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Smart Travel Context Notifications
              </div>
              <div className="text-[11px] text-gray-500">
                Notify me when declared travel itinerary matches an active foreign login.
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.travelAlertsEmail}
              onChange={(e) => setPreferences({ ...preferences, travelAlertsEmail: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSavePreferences}
            disabled={savingPrefs}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {savingPrefs ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
            <span>Save Preferences</span>
          </button>
        </div>
      </div>

      {/* Data Portability & Retention */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-500" />
            <span>Export Account Data (JSON)</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Download a portable copy of your account profile, login history, and security alerts. Strict privacy guarantee: password hashes, salts, and session tokens are permanently excluded from exports.
          </p>
          <button
            onClick={handleExportData}
            className="w-full px-4 py-2.5 rounded-xl bg-white/40 dark:bg-white/[0.04] hover:bg-white/60 dark:hover:bg-white/[0.08] text-gray-800 dark:text-gray-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors border border-gray-200 dark:border-white/10 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download My JSON Export</span>
          </button>
        </div>

        {/* Retention Cleanup Card */}
        <div className="glass-card-static border border-gray-200/70 dark:border-white/10 rounded-2xl p-6 shadow-lg space-y-4">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            <span>Data Retention & Pruning</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Choose your preferred telemetry retention period. Prune historical sign-in logs older than your threshold with one click.
          </p>
          <div className="flex items-center gap-3">
            <select
              value={preferences.dataRetentionDays}
              onChange={(e) => setPreferences({ ...preferences, dataRetentionDays: Number(e.target.value) })}
              className="bg-white/50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-gray-200 focus:outline-none"
            >
              <option value={30}>30 Days Retention</option>
              <option value={60}>60 Days Retention</option>
              <option value={90}>90 Days Retention (Default)</option>
              <option value={180}>180 Days Retention</option>
            </select>
            <button
              onClick={handleCleanupRetention}
              disabled={cleaningUp}
              className="flex-1 px-4 py-2 rounded-xl bg-white/40 dark:bg-white/[0.04] hover:bg-white/60 dark:hover:bg-white/[0.08] text-gray-800 dark:text-gray-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-gray-200 dark:border-white/10 shadow-sm"
            >
              {cleaningUp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Prune Old Logs</span>
            </button>
          </div>
          {cleanupResult && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              {cleanupResult}
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="glass-card-static border border-rose-500/25 dark:border-rose-500/25 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Danger Zone: Permanent Account Deletion</span>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          Requesting account deletion will revoke all active browser sessions, clear your trusted devices, and queue your profile for permanent removal.
        </p>
        <button
          onClick={() => setDeleteModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 border border-rose-500/25 text-rose-600 dark:text-rose-400 font-semibold text-xs transition-colors shadow-sm"
        >
          Request Account Deletion
        </button>
      </div>

      {/* Deletion Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="glass-modal border border-rose-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Confirm Permanent Deletion</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                To confirm, please type exactly <strong>DELETE MY ACCOUNT PERMANENTLY</strong> below:
              </p>
            </div>

            <input
              type="text"
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              placeholder="DELETE MY ACCOUNT PERMANENTLY"
              className="w-full bg-gray-50 dark:bg-cyber-card border border-rose-200 dark:border-rose-900/60 rounded-xl px-4 py-2.5 text-xs font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />

            {deleteError && (
              <div className="text-xs text-rose-600 dark:text-rose-400 text-center font-semibold">
                {deleteError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setConfirmPhrase('');
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-cyber-card hover:bg-gray-200 dark:hover:bg-cyber-border text-gray-700 dark:text-gray-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={confirmPhrase !== 'DELETE MY ACCOUNT PERMANENTLY' || deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-sm"
              >
                {deleting ? 'Deactivating...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

