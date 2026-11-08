import React, { useEffect, useState, useCallback } from 'react';
import {
  Bell,
  CheckCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  Clock,
  CheckCircle2,
  Trash2,
  Sliders,
  Settings,
  Mail,
  X,
  RefreshCw,
} from 'lucide-react';
import { securityApi } from '../../api/client';
import { ISecurityAlert } from '../../types';
import { SecurityBadge } from '../../components/common/SecurityBadge';
import { Link } from 'react-router-dom';

export const SecurityAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<ISecurityAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Preferences modal
  const [prefModalOpen, setPrefModalOpen] = useState(false);
  const [prefs, setPrefs] = useState<any>({
    allowEmailAlerts: true,
    highRiskOtpEnforced: true,
    unfamiliarDeviceOtpEnforced: true,
    recoveryEmail: '',
  });
  const [prefSavedMessage, setPrefSavedMessage] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await securityApi.getAlerts(false);
      if (res.success) {
        setAlerts(res.data);
        setUnreadCount(res.unreadCount);
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    // Fetch preferences
    securityApi.getAlertPreferences().then((res) => {
      if (res.success) setPrefs(res.preferences);
    }).catch(() => {});
  }, [fetchAlerts]);

  const handleMarkRead = async (id: string) => {
    try {
      await securityApi.markAlertRead(id);
      setAlerts((prev) =>
        prev.map((a) => (a._id === id ? { ...a, readStatus: true } : a))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Ignored
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await securityApi.markAllAlertsRead();
      setAlerts((prev) => prev.map((a) => ({ ...a, readStatus: true })));
      setUnreadCount(0);
    } catch {
      // Ignored
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await securityApi.deleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a._id !== id));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Ignored
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefSavedMessage(null);
    try {
      const res = await securityApi.updateAlertPreferences(prefs);
      if (res.success) {
        setPrefSavedMessage('Notification preferences updated successfully.');
        setTimeout(() => setPrefModalOpen(false), 1200);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update preferences.');
    }
  };

  // Filter alerts by severity / unread
  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter === 'unread') return !a.readStatus;
    if (severityFilter !== 'all') return a.severity === severityFilter;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <Bell className="w-3.5 h-3.5" />
              Real-Time Alert Dispatch
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            Security Notification Center
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Instant security notifications, automated threat alerts, and account protection updates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPrefModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-cyber-border bg-white dark:bg-cyber-surface hover:bg-gray-50 dark:hover:bg-cyber-card text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors shadow-sm"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Alert Preferences</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All Read ({unreadCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {[
          { key: 'all', label: 'All Alerts', count: alerts.length },
          { key: 'unread', label: 'Unread', count: unreadCount },
          { key: 'critical', label: 'Critical', count: alerts.filter((a) => a.severity === 'critical').length },
          { key: 'high', label: 'High', count: alerts.filter((a) => a.severity === 'high').length },
          { key: 'medium', label: 'Medium', count: alerts.filter((a) => a.severity === 'medium').length },
          { key: 'low', label: 'Low', count: alerts.filter((a) => a.severity === 'low').length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSeverityFilter(tab.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              severityFilter === tab.key
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white dark:bg-cyber-surface text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-cyber-card border border-gray-200 dark:border-cyber-border'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                severityFilter === tab.key
                  ? 'bg-emerald-700 text-white'
                  : 'bg-gray-100 dark:bg-cyber-card text-gray-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-gray-400 animate-pulse">
            Loading security notifications...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="py-20 text-center rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm p-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-70" />
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
              No Alerts In This View
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Your security notifications are completely up to date.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert._id}
              className={`p-5 rounded-3xl border transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                !alert.readStatus
                  ? 'bg-white dark:bg-cyber-surface border-gray-300 dark:border-cyber-border/90 shadow-sm'
                  : 'bg-gray-50/60 dark:bg-cyber-card/30 border-gray-100 dark:border-cyber-border/40 opacity-80'
              }`}
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className="mt-0.5">
                  <SecurityBadge type="risk" value={alert.severity} size="md" />
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                      {alert.title}
                    </h3>
                    {!alert.readStatus && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    )}
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    {alert.description}
                  </p>

                  <div className="text-[11px] text-gray-400 flex items-center gap-2 pt-1 font-mono">
                    <Clock className="w-3 h-3 text-emerald-500" />
                    <span>{new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                {alert.alertType === 'impossible_travel' && (
                  <Link
                    to="/impossible-travel"
                    className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 text-xs font-semibold hover:opacity-90"
                  >
                    View Map
                  </Link>
                )}

                {!alert.readStatus && (
                  <button
                    onClick={() => handleMarkRead(alert._id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 dark:text-gray-400 dark:hover:bg-cyber-card transition-colors"
                  >
                    Mark Read
                  </button>
                )}

                <button
                  onClick={() => handleDeleteAlert(alert._id)}
                  title="Dismiss Alert"
                  className="p-1.5 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preferences Modal */}
      {prefModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Security Notification Preferences
                </h3>
              </div>
              <button
                onClick={() => setPrefModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {prefSavedMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{prefSavedMessage}</span>
              </div>
            )}

            <form onSubmit={handleSavePreferences} className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.allowEmailAlerts}
                  onChange={(e) => setPrefs({ ...prefs, allowEmailAlerts: e.target.checked })}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-gray-900 dark:text-gray-100 block">
                    Instant Email Alerts (Critical / High Events)
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    Receive urgent email notifications for impossible travel, new device logins, and password resets.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.highRiskOtpEnforced}
                  onChange={(e) => setPrefs({ ...prefs, highRiskOtpEnforced: e.target.checked })}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-gray-900 dark:text-gray-100 block">
                    Enforce High-Risk OTP Verification
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    Always prompt for 6-digit email OTP when risk score exceeds 30.
                  </span>
                </div>
              </label>

              <div className="space-y-1 pt-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Secondary Recovery Email
                </label>
                <input
                  type="email"
                  value={prefs.recoveryEmail || ''}
                  onChange={(e) => setPrefs({ ...prefs, recoveryEmail: e.target.value })}
                  placeholder="secondary-backup@gmail.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-cyber-border bg-gray-50 dark:bg-cyber-card text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <p className="text-[11px] text-gray-400">
                  Used as backup channel if primary email is compromised.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPrefModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-cyber-card text-xs font-semibold text-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                >
                  Save Preferences
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
