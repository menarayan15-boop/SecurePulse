import React, { useEffect, useState } from 'react';
import {
  History,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Info,
  Clock,
  MapPin,
  Laptop,
  ArrowDownToLine,
  RefreshCw,
} from 'lucide-react';
import { securityApi } from '../../api/client';
import { ITimelineItem, ITimelineResponse } from '../../types';

export const SecurityTimelinePage: React.FC = () => {
  const [timelineData, setTimelineData] = useState<ITimelineResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await securityApi.getTimeline({
        category: selectedCategory,
        search: searchQuery,
      });
      if (res.success) {
        setTimelineData(res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load personal security timeline.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTimeline();
  };

  const getStatusIcon = (status: string, severity: string) => {
    if (status === 'danger' || severity === 'critical') {
      return <ShieldAlert className="w-4 h-4 text-rose-500" />;
    }
    if (status === 'warning' || severity === 'high') {
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
    if (status === 'success') {
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    }
    return <Info className="w-4 h-4 text-blue-500" />;
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">CRITICAL</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">HIGH</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">LOW</span>;
    }
  };

  const filterTabs = [
    { key: 'all', label: 'All Activity', count: timelineData?.counts.all ?? 0 },
    { key: 'login', label: 'Login Events', count: timelineData?.counts.login ?? 0 },
    { key: 'security', label: 'Security Changes', count: timelineData?.counts.security ?? 0 },
    { key: 'suspicious', label: 'Suspicious Activity', count: timelineData?.counts.suspicious ?? 0 },
    { key: 'recovery', label: 'Recovery Events', count: timelineData?.counts.recovery ?? 0 },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <History className="w-3.5 h-3.5" />
              Immutable Audit Log
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            Personal Security Timeline
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Chronological audit trail of all logins, credential updates, sessions, and automated anomaly responses.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => securityApi.exportTimelineCsv()}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-cyber-border bg-white dark:bg-cyber-surface hover:bg-gray-50 dark:hover:bg-cyber-card text-gray-700 dark:text-gray-200 text-xs font-semibold transition-all shadow-sm"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => securityApi.exportTimelineJson()}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-cyber-border bg-white dark:bg-cyber-surface hover:bg-gray-50 dark:hover:bg-cyber-card text-gray-700 dark:text-gray-200 text-xs font-semibold transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedCategory(tab.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                selectedCategory === tab.key
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-white dark:bg-cyber-surface text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-cyber-card border border-gray-200 dark:border-cyber-border'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedCategory === tab.key
                    ? 'bg-emerald-700 text-white'
                    : 'bg-gray-100 dark:bg-cyber-card text-gray-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by keyword, IP, city..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-cyber-border bg-white dark:bg-cyber-surface text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </form>
      </div>

      {/* Timeline Stream */}
      <div className="rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border p-6 shadow-sm">
        {(!timelineData?.items || timelineData.items.length === 0) ? (
          <div className="p-12 text-center text-sm text-gray-400">
            No events matched your current category or search criteria.
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200 dark:before:bg-cyber-border">
            {timelineData.items.map((item) => (
              <div key={item.id} className="relative group">
                {/* Node Dot */}
                <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full bg-white dark:bg-cyber-surface border-2 border-gray-300 dark:border-cyber-border flex items-center justify-center group-hover:border-emerald-500 transition-colors">
                  {getStatusIcon(item.status, item.severity)}
                </div>

                {/* Content Box */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-cyber-card/60 hover:bg-gray-100/80 dark:hover:bg-cyber-card border border-gray-100 dark:border-cyber-border/80 transition-all space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {item.title}
                      </h3>
                      {getSeverityBadge(item.severity)}
                    </div>
                    <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-500" />
                      {new Date(item.timestamp).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200/50 dark:border-cyber-border/50">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      {item.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Laptop className="w-3 h-3 text-gray-400" />
                      {item.device}
                    </span>
                    <span className="font-mono text-gray-400">
                      IP: {item.ipAddress}
                    </span>
                  </div>

                  {item.actionRecommendation && (
                    <div className="pt-2 text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Recommended: {item.actionRecommendation}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

