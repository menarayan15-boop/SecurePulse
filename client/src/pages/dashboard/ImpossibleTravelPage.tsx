import React, { useEffect, useState } from 'react';
import {
  Compass,
  AlertTriangle,
  Plane,
  ShieldAlert,
  CheckCircle2,
  MapPin,
  Clock,
  Gauge,
  RefreshCw,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { securityApi } from '../../api/client';
import { IImpossibleTravelAlertItem } from '../../types';
import { LoginMap } from '../../components/map/LoginMap';

export const ImpossibleTravelPage: React.FC = () => {
  const [alerts, setAlerts] = useState<IImpossibleTravelAlertItem[]>([]);
  const [pins, setPins] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await securityApi.getImpossibleTravel();
      if (res.success) {
        setAlerts(res.alerts || []);
        setPins(res.recentLocationPins || []);
        setPendingCount(res.pendingCount || 0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve impossible travel telemetry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResolve = async (id: string, resolution: 'resolved_user' | 'reported_suspicious') => {
    setActionLoadingId(id);
    setActionSuccess(null);
    try {
      const res = await securityApi.resolveImpossibleTravel(id, resolution);
      if (res.success) {
        setActionSuccess(res.message);
        setAlerts((prev) =>
          prev.map((a) => (a._id === id ? { ...a, status: resolution } : a))
        );
        setPendingCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resolve travel alert.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              <Compass className="w-3.5 h-3.5" />
              Geographic Velocity Anomaly Guard
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            Impossible Travel Alerts
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Detects authentication requests from two distant locations within an implausible travel timeframe.
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

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Pending Alerts
            </p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100">{pendingCount}</h3>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Speed Threshold
            </p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100">800 km/h</h3>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              VPN / Proxy Tolerance
            </p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">Active</h3>
          </div>
        </div>
      </div>

      {/* Interactive Location Map */}
      <div className="rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Recent Login Coordinates Map
            </h2>
          </div>
          <span className="text-xs text-gray-400 font-mono">
            {pins.length} Location Pins Verified
          </span>
        </div>
        <div className="h-72 rounded-2xl overflow-hidden border border-gray-100 dark:border-cyber-border">
          <LoginMap logins={pins} />
        </div>
      </div>

      {/* Alerts Timeline List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Plane className="w-5 h-5 text-rose-500" />
          Impossible Travel Incident Timeline
        </h2>

        {alerts.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
              Zero Travel Anomalies Detected
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              All your recent authentication requests have arrived within physically plausible travel timeframes.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert._id}
                className="p-6 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm space-y-4 hover:border-gray-300 dark:hover:border-cyber-border/80 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {alert.speedKmPerHour} km/h Required Speed
                      </span>
                      <span className="text-xs text-gray-400">
                        {alert.distanceKm} km in {alert.timeDeltaMinutes} mins
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 pt-1">
                      <span>{alert.fromCity}, {alert.fromCountry}</span>
                      <span className="text-gray-400 font-mono">→</span>
                      <span className="text-rose-500">{alert.toCity}, {alert.toCountry}</span>
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Logged on {new Date(alert.createdAt).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div>
                    {alert.status === 'resolved_user' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Marked as Legitimate VPN
                      </span>
                    ) : alert.status === 'reported_suspicious' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-500/20">
                        <ShieldAlert className="w-3.5 h-3.5" /> Reported as Compromised
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResolve(alert._id, 'resolved_user')}
                          disabled={actionLoadingId === alert._id}
                          className="px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-cyber-card hover:bg-gray-200 dark:hover:bg-cyber-border text-gray-700 dark:text-gray-200 text-xs font-semibold transition-colors"
                        >
                          This was me (VPN)
                        </button>
                        <button
                          onClick={() => handleResolve(alert._id, 'reported_suspicious')}
                          disabled={actionLoadingId === alert._id}
                          className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-sm"
                        >
                          Report & Reset Sessions
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

