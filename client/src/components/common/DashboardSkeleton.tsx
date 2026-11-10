import React from 'react';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading content...">
      {/* Top Banner / Header Skeleton */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gray-100 dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2.5 max-w-lg w-full">
            <div className="h-4 w-28 rounded-full bg-emerald-500/20" />
            <div className="h-7 w-64 rounded-xl bg-gray-200 dark:bg-cyber-card" />
            <div className="h-4 w-96 max-w-full rounded-lg bg-gray-200/80 dark:bg-cyber-card/70" />
          </div>
          <div className="h-10 w-32 rounded-xl bg-gray-200 dark:bg-cyber-card flex-shrink-0" />
        </div>
      </div>

      {/* 4 Stat Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-cyber-card" />
              <div className="w-12 h-4 rounded-full bg-gray-200 dark:bg-cyber-card" />
            </div>
            <div className="h-7 w-20 rounded-lg bg-gray-200 dark:bg-cyber-card" />
            <div className="h-3.5 w-32 rounded bg-gray-200/70 dark:bg-cyber-card/60" />
          </div>
        ))}
      </div>

      {/* Main Content Split Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-40 rounded bg-gray-200 dark:bg-cyber-card" />
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-cyber-card" />
          </div>
          <div className="h-64 rounded-xl bg-gray-100 dark:bg-cyber-card/50" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-gray-200/60 dark:bg-cyber-card/40" />
            <div className="h-3 w-3/4 rounded bg-gray-200/60 dark:bg-cyber-card/40" />
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border p-6 space-y-4">
          <div className="h-5 w-36 rounded bg-gray-200 dark:bg-cyber-card" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-cyber-card flex-shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="h-3.5 w-28 rounded bg-gray-200 dark:bg-cyber-card" />
                  <div className="h-2.5 w-20 rounded bg-gray-200/60 dark:bg-cyber-card/40" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
