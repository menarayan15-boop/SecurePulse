import React, { useEffect, useState } from 'react';
import {
  Brain,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  Activity,
  Layers,
  Clock,
  Compass,
  Monitor,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { securityApi } from '../../api/client';
import { IRiskAnalyticsData, IRiskEvaluationItem } from '../../types';

export const AiRiskAnalysisPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<IRiskAnalyticsData | null>(null);
  const [evaluations, setEvaluations] = useState<IRiskEvaluationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await securityApi.getRiskAnalysis();
      if (res.success) {
        setAnalytics(res.analytics);
        setEvaluations(res.recentEvaluations || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load AI risk analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 81) return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
    if (score >= 61) return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    if (score >= 31) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
    return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
  };

  const getLevelBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">Critical (81–100)</span>;
      case 'high':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">High (61–80)</span>;
      case 'medium':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Medium (31–60)</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Low (0–30)</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <Cpu className="w-3.5 h-3.5" />
              Explainable Risk Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            AI Login Risk Analysis
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time, multi-factor behavioral anomaly detection evaluating every login request.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-cyber-border bg-white dark:bg-cyber-surface hover:bg-gray-50 dark:hover:bg-cyber-card text-gray-700 dark:text-gray-200 text-xs font-semibold transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Current Score Gauge Card */}
        <div className="md:col-span-2 p-6 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Current Session Risk Score
              </p>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-gray-100">
                  {analytics?.currentSessionScore ?? 10}
                </span>
                <span className="text-sm text-gray-400">/ 100</span>
                {analytics && getLevelBadge(analytics.overallRiskLevel)}
              </div>
            </div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${getScoreColor(analytics?.currentSessionScore ?? 10)}`}>
              <Brain className="w-7 h-7" />
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <div className="w-full h-3 rounded-full bg-gray-100 dark:bg-cyber-card overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(30, analytics?.currentSessionScore ?? 10)}%` }}
              />
              <div
                className="h-full bg-yellow-500 transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(30, (analytics?.currentSessionScore ?? 10) - 30))}%` }}
              />
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(20, (analytics?.currentSessionScore ?? 10) - 60))}%` }}
              />
              <div
                className="h-full bg-rose-500 transition-all duration-500"
                style={{ width: `${Math.max(0, (analytics?.currentSessionScore ?? 10) - 80)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-gray-400 font-mono">
              <span>0 (Safe)</span>
              <span>30 (Low)</span>
              <span>60 (Med)</span>
              <span>80 (High)</span>
              <span>100 (Critical)</span>
            </div>
          </div>
        </div>

        {/* Historical Average */}
        <div className="p-6 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Average Risk Score
            </p>
            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mt-2">
              {analytics?.avgRiskScore ?? 15}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Calculated across {analytics?.totalEvaluatedLogins ?? 0} authentication requests
            </p>
          </div>
          <div className="pt-4 border-t border-gray-100 dark:border-cyber-border flex items-center justify-between text-xs text-gray-500">
            <span>Critical attempts:</span>
            <span className="font-bold text-rose-500">{analytics?.distribution.critical ?? 0}</span>
          </div>
        </div>

        {/* Engine Status */}
        <div className="p-6 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Evaluator Status
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Adaptive Shield Online</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              7 active signal analyzers continuously screening for travel velocity, device, and network anomalies.
            </p>
          </div>
          <div className="pt-4 border-t border-gray-100 dark:border-cyber-border flex items-center justify-between text-xs text-gray-500">
            <span>Model transparency:</span>
            <span className="font-semibold text-emerald-500">Explainable</span>
          </div>
        </div>
      </div>

      {/* Signal Weights Breakdown Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-500" />
          Explainable Multi-Signal Risk Weights
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {analytics?.configurableWeights.map((w, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{w.name}</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    w.maxWeight < 0
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-gray-100 dark:bg-cyber-card text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {w.maxWeight > 0 ? `+${w.maxWeight} pts` : `${w.maxWeight} pts`}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {w.maxWeight < 0
                  ? 'Reduces risk penalty when trusted cryptographic token matches an active device.'
                  : 'Assigned automatically when a deviation from your verified baseline is detected.'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Evaluations Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-500" />
          Recent Login Risk Assessments
        </h2>
        <div className="rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm overflow-hidden">
          {evaluations.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              No recent login evaluations recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-cyber-card text-gray-400 uppercase tracking-wider text-[11px] border-b border-gray-100 dark:border-cyber-border">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Timestamp</th>
                    <th className="py-3 px-4 font-semibold">Score</th>
                    <th className="py-3 px-4 font-semibold">Origin & Location</th>
                    <th className="py-3 px-4 font-semibold">Device / Browser</th>
                    <th className="py-3 px-4 font-semibold">Evaluated Factors</th>
                    <th className="py-3 px-4 font-semibold">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-cyber-border text-gray-700 dark:text-gray-300">
                  {evaluations.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-cyber-card/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-gray-500">
                        {new Date(item.timestamp).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg font-bold ${
                            item.riskScore >= 81
                              ? 'bg-rose-500/20 text-rose-500'
                              : item.riskScore >= 61
                              ? 'bg-amber-500/20 text-amber-500'
                              : item.riskScore >= 31
                              ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                              : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {item.riskScore}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        <div>{item.city}, {item.country}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{item.ipAddress}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>{item.browserName}</div>
                        <div className="text-[11px] text-gray-400">{item.operatingSystem} ({item.deviceType})</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        {item.riskFactors.length === 0 ? (
                          <span className="text-gray-400 italic">Verified familiar profile</span>
                        ) : (
                          <ul className="space-y-1">
                            {item.riskFactors.map((f, i) => (
                              <li key={i} className="text-[11px] text-gray-600 dark:text-gray-400 list-disc list-inside">
                                {f}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-500 font-semibold">
                            <XCircle className="w-3.5 h-3.5" /> Blocked/Challenged
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

