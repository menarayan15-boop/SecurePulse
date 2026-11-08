import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  Lock,
  Radio,
  CheckCircle2,
  Clock,
  RefreshCw,
  Sliders,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { securityApi, sessionApi } from '../../api/client';
import { IAccountProtectionData } from '../../types';
import { Link } from 'react-router-dom';

export const AccountProtectionPage: React.FC = () => {
  const [data, setData] = useState<IAccountProtectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isFreezing, setIsFreezing] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await securityApi.getAccountProtection();
      if (res.success) {
        setData(res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve account protection telemetry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRevokeOthers = async () => {
    try {
      const res = await sessionApi.terminateOthers();
      if (res.success) {
        setActionMessage('All other active sessions have been safely revoked.');
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to terminate other sessions.');
    }
  };

  const handleEmergencyFreeze = async () => {
    const confirmation = window.prompt(
      'Type "FREEZE" to lock your account and immediately terminate all active sessions:'
    );
    if (confirmation !== 'FREEZE') return;

    setIsFreezing(true);
    try {
      const res = await securityApi.emergencyFreeze('User requested freeze from Account Protection Center');
      if (res.success) {
        window.location.href = '/recover-account';
      }
    } catch (err: any) {
      setError(err.message || 'Failed to execute emergency freeze.');
      setIsFreezing(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Fortified':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
      case 'Strong':
        return 'text-teal-500 bg-teal-500/10 border-teal-500/30';
      case 'Moderate':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      default:
        return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              Account Takeover (ATO) Sentinel
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            Account Protection Center
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Continuous vigilance over credential modifications, session proliferation, and privilege escalation.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-cyber-border bg-white dark:bg-cyber-surface hover:bg-gray-50 dark:hover:bg-cyber-card text-gray-700 dark:text-gray-200 text-xs font-semibold transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{actionMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Main Score & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Score Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Account Protection Score
            </p>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-5xl font-black text-gray-900 dark:text-gray-100">
                {data?.protectionScore ?? 65}
              </span>
              <span className="text-sm text-gray-400">/ 100</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${getTierColor(
                  data?.protectionTier ?? 'Moderate'
                )}`}
              >
                {data?.protectionTier ?? 'Moderate'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              Based on active passkeys, recovery codes, verified contacts, and session hygiene.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-cyber-border flex items-center justify-between text-xs text-gray-500">
            <span>Passkeys Enabled:</span>
            <span className="font-bold text-gray-900 dark:text-gray-100">
              {data?.metrics.passkeysCount ?? 0}
            </span>
          </div>
        </div>

        {/* Rapid Response Quick Actions */}
        <div className="md:col-span-2 p-6 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
              Rapid Response Controls
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Instant countermeasures if you suspect your account is being accessed without authorization.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleRevokeOthers}
              className="p-4 rounded-2xl bg-gray-50 dark:bg-cyber-card hover:bg-gray-100 dark:hover:bg-cyber-border/70 border border-gray-200 dark:border-cyber-border text-left transition-all group"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-gray-100 mb-1">
                <Radio className="w-4 h-4 text-emerald-500" />
                <span>Revoke All Other Sessions</span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Instantly disconnect all phones, tablets, and computers except this current browser.
              </p>
            </button>

            <button
              onClick={handleEmergencyFreeze}
              disabled={isFreezing}
              className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-left transition-all group"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">
                <AlertOctagon className="w-4 h-4" />
                <span>Emergency Account Freeze</span>
              </div>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                Immediately lock the account, revoke all credentials, and enforce recovery mode.
              </p>
            </button>
          </div>

          <div className="text-[11px] text-gray-400 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            <span>Actions take effect within milliseconds across all serverless endpoints.</span>
          </div>
        </div>
      </div>

      {/* Security Checklist */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          Account Takeover Defense Checklist
        </h2>
        <div className="rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border divide-y divide-gray-100 dark:divide-cyber-border overflow-hidden shadow-sm">
          {data?.checklist.map((item) => (
            <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {item.status === 'passed' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                )}
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Worth +{item.points} points towards your Fortified security tier.
                  </p>
                </div>
              </div>

              <div>
                {item.status === 'passed' ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Active
                  </span>
                ) : item.id === 'passkey_active' ? (
                  <Link
                    to="/passkeys"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                  >
                    <span>Enable</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : item.id === 'recovery_codes' ? (
                  <Link
                    to="/emergency-recovery"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                  >
                    <span>Generate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-cyber-card text-gray-500">
                    Recommended
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sensitive Modifications Audit Trail */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-500" />
          Recent Sensitive Account Changes
        </h2>
        <div className="rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm overflow-hidden">
          {(!data?.recentEvents || data.recentEvents.length === 0) ? (
            <div className="p-8 text-center text-sm text-gray-400">
              No recent sensitive modifications logged. Your credentials have remained unchanged.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-cyber-border">
              {data.recentEvents.map((evt) => (
                <div key={evt._id} className="p-4 sm:p-5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{evt.title}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          evt.riskLevel === 'critical'
                            ? 'bg-rose-500/20 text-rose-500'
                            : evt.riskLevel === 'high'
                            ? 'bg-amber-500/20 text-amber-500'
                            : 'bg-emerald-500/20 text-emerald-500'
                        }`}
                      >
                        {evt.riskLevel.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{evt.description}</p>
                    <p className="text-[11px] text-gray-400 font-mono">
                      IP: {evt.ipAddress} | {evt.browser} | {new Date(evt.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

