import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Radio,
  Laptop,
  History,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Sliders,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { securityApi } from '../../api/client';
import { ISecurityOverview } from '../../types';
import { SecurityBadge } from '../../components/common/SecurityBadge';
import { LoginMap } from '../../components/map/LoginMap';

export const OverviewPage: React.FC = () => {
  const { user } = useAuth();
  const { theme, preference, istTime } = useTheme();

  const [data, setData] = useState<ISecurityOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await securityApi.getOverview();
        if (res.success) {
          setData(res);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load security overview.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-3xl bg-gray-200 dark:bg-cyber-surface" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-gray-200 dark:bg-cyber-surface" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-sm">
        {error || 'Unable to retrieve dashboard telemetry.'}
      </div>
    );
  }

  const { stats, recentLogins, recentAlerts, currentEnvironment } = data;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ========================================================================= */}
      {/* 1. WELCOME & ADAPTIVE SYSTEM STATUS HERO SECTION                         */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-gray-900 via-cyber-surface to-gray-900 text-white p-6 sm:p-8 border border-gray-800 shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Adaptive Shield Online
              </span>
              <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                {istTime} (Asia/Kolkata)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, <span className="text-emerald-400">{user?.fullName}</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 max-w-xl leading-relaxed">
              SecurePulse is actively inspecting your login telemetry. Your environment matches a verified profile.
            </p>
          </div>

          {/* Current Environment Badge */}
          {currentEnvironment && (
            <div className="flex flex-col gap-1 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs backdrop-blur-sm self-start md:self-auto min-w-[220px]">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Current Connected Node
              </span>
              <span className="font-semibold text-gray-100 flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-emerald-400" />
                {currentEnvironment.browserName} on {currentEnvironment.operatingSystem}
              </span>
              <span className="text-gray-400 font-mono text-[11px]">
                {currentEnvironment.ipAddress} • {currentEnvironment.city}, {currentEnvironment.country}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SECURITY OVERVIEW STATS CARDS                                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Health Score */}
        <Link
          to="/profile"
          className="group p-5 rounded-2xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border hover:border-emerald-500/50 shadow-sm transition-all duration-200"
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-3">
            <span className="text-xs font-semibold">Security Health</span>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              {stats.healthScore}
            </span>
            <span className="text-xs text-gray-400 font-medium">/ 100</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {stats.healthStatus}
            </span>
            <span className="text-gray-400 group-hover:text-emerald-500 transition-colors">
              Details →
            </span>
          </div>
        </Link>

        {/* Card 2: Successful Logins */}
        <Link
          to="/activity"
          className="group p-5 rounded-2xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border hover:border-emerald-500/50 shadow-sm transition-all duration-200"
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-3">
            <span className="text-xs font-semibold">Successful Logins</span>
            <History className="w-5 h-5 text-teal-500" />
          </div>
          <div className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            {stats.totalSuccessLogins}
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>{stats.totalFailedLogins} failed attempts</span>
            <span className="text-gray-400 group-hover:text-teal-500 transition-colors">View →</span>
          </div>
        </Link>

        {/* Card 3: Active Sessions */}
        <Link
          to="/sessions"
          className="group p-5 rounded-2xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border hover:border-emerald-500/50 shadow-sm transition-all duration-200"
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-3">
            <span className="text-xs font-semibold">Active Sessions</span>
            <Radio className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            {stats.activeSessionsCount}
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>Online devices</span>
            <span className="text-gray-400 group-hover:text-blue-500 transition-colors">Manage →</span>
          </div>
        </Link>

        {/* Card 4: Trusted Devices */}
        <Link
          to="/devices"
          className="group p-5 rounded-2xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border hover:border-emerald-500/50 shadow-sm transition-all duration-200"
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-3">
            <span className="text-xs font-semibold">Trusted Devices</span>
            <Laptop className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            {stats.trustedDevicesCount}
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>30-day trust active</span>
            <span className="text-gray-400 group-hover:text-purple-500 transition-colors">Review →</span>
          </div>
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE LOGIN LOCATION MAP                                         */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Interactive Login Telemetry Map
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Geographic footprint of your account access events. Select any pulse pin to view event metadata.
            </p>
          </div>
          <Link
            to="/activity"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>Full History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <LoginMap logins={recentLogins} />
      </div>

      {/* ========================================================================= */}
      {/* 4. RECENT ACTIVITY & QUICK ACTIONS GRID                                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 5 Most Recent Logins */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Recent Login Events
            </h2>
            <Link
              to="/activity"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              View All ({stats.totalSuccessLogins + stats.totalFailedLogins}) →
            </Link>
          </div>

          <div className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-2xl overflow-hidden shadow-sm">
            {recentLogins.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-400">
                No recent logins recorded.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-cyber-border">
                {recentLogins.map((item) => (
                  <div
                    key={item._id}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-cyber-card/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <SecurityBadge type="device" value={item.deviceType} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                          {item.browserName} on {item.operatingSystem}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                          <span className="font-mono">{item.ipAddress}</span>
                          <span>•</span>
                          <span>{item.city}, {item.country}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <SecurityBadge type="status" value={item.loginStatus} />
                        <div className="text-[10px] text-gray-400 mt-1">
                          {new Date(item.loginTimestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Actions & Live Alerts */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Quick Security Controls
            </h2>
            <div className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-2xl p-3 space-y-1 shadow-sm">
              <Link
                to="/devices"
                className="flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-cyber-card transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Laptop className="w-4 h-4 text-emerald-500" />
                  <span>Audit Trusted Devices</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              </Link>

              <Link
                to="/sessions"
                className="flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-cyber-card transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Radio className="w-4 h-4 text-blue-500" />
                  <span>Terminate Other Sessions</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              </Link>

              <Link
                to="/settings"
                className="flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-cyber-card transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-purple-500" />
                  <span>Adjust Trust Duration</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              </Link>

              <Link
                to="/profile"
                className="flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-cyber-card transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-teal-500" />
                  <span>Update Recovery Info</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              </Link>
            </div>
          </div>

          {/* Recent Security Alerts preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Recent Security Alerts
              </h2>
              <Link
                to="/alerts"
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                All →
              </Link>
            </div>

            <div className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-2xl p-4 shadow-sm space-y-3">
              {recentAlerts.length === 0 ? (
                <div className="py-4 text-center text-xs text-gray-400">
                  No security alerts. Account safe.
                </div>
              ) : (
                recentAlerts.slice(0, 3).map((alert) => (
                  <div key={alert._id} className="text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-gray-900 dark:text-gray-100">
                      <span className="truncate">{alert.title}</span>
                      <SecurityBadge type="risk" value={alert.severity} />
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">
                      {alert.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

