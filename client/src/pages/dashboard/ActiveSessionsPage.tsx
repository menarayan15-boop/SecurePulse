import React, { useEffect, useState, useCallback } from 'react';
import { Radio, Power, LogOut, CheckCircle2, Clock, MapPin, Globe, Laptop, Smartphone, Tablet } from 'lucide-react';
import { sessionApi } from '../../api/client';
import { IActiveSession } from '../../types';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';

export const ActiveSessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<IActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [sessionToKill, setSessionToKill] = useState<IActiveSession | null>(null);
  const [terminateOthersOpen, setTerminateOthersOpen] = useState(false);
  const [terminateAllOpen, setTerminateAllOpen] = useState(false);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await sessionApi.getSessions();
      if (res.success) {
        setSessions(res.data);
      }
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleKillSession = async () => {
    if (!sessionToKill) return;
    try {
      const res = await sessionApi.terminateSession(sessionToKill.id);
      if (res.isCurrentSession) {
        window.location.href = '/login';
        return;
      }
      setActionSuccess(`Terminated session on ${sessionToKill.browser}.`);
      setSessionToKill(null);
      fetchSessions();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to terminate session.');
    }
  };

  const handleTerminateOthers = async () => {
    try {
      const res = await sessionApi.terminateOthers();
      setActionSuccess(res.message || 'Other active sessions terminated.');
      setTerminateOthersOpen(false);
      fetchSessions();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to terminate other sessions.');
    }
  };

  const handleTerminateAll = async () => {
    try {
      await sessionApi.terminateAll();
      window.location.href = '/login';
    } catch (err: any) {
      alert(err.message || 'Failed to terminate sessions.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100">
            Active Authenticated Sessions
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time server authenticated tokens and active connection sockets linked to your account.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {sessions.length > 1 && (
            <button
              onClick={() => setTerminateOthersOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 font-semibold text-xs hover:bg-amber-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out Others</span>
            </button>
          )}

          <button
            onClick={() => setTerminateAllOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 font-semibold text-xs hover:bg-rose-100 transition-colors"
          >
            <Power className="w-4 h-4" />
            <span>Terminate All</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Sessions List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-gray-400 animate-pulse">
            Loading active sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-20 text-center text-xs text-gray-400">
            No active sessions found.
          </div>
        ) : (
          sessions.map((sess) => {
            const isMobile = sess.deviceType?.toLowerCase() === 'mobile';
            const isTablet = sess.deviceType?.toLowerCase() === 'tablet';
            const Icon = isMobile ? Smartphone : isTablet ? Tablet : Laptop;

            return (
              <div
                key={sess.id}
                className={`p-5 rounded-2xl bg-white dark:bg-cyber-surface border transition-all duration-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  sess.isCurrent
                    ? 'border-emerald-500/80 ring-1 ring-emerald-500/20'
                    : 'border-gray-200 dark:border-cyber-border'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-xl flex-shrink-0 ${
                      sess.isCurrent
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                        : 'bg-gray-100 dark:bg-cyber-card text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                        {sess.browser} on {sess.operatingSystem}
                      </h3>
                      {sess.isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                          This Device
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-mono text-[11px]">{sess.ipAddress}</span>
                      <span>•</span>
                      <span>{sess.city}, {sess.country}</span>
                    </div>

                    <div className="text-[11px] text-gray-400 flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                      <span>
                        Started: {new Date(sess.createdAt).toLocaleString()}
                      </span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Last Active: {new Date(sess.lastActiveAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="self-end md:self-center flex-shrink-0">
                  <button
                    onClick={() => setSessionToKill(sess)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      sess.isCurrent
                        ? 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 bg-gray-100 dark:bg-cyber-card'
                        : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 border border-rose-200 dark:border-rose-900/40'
                    }`}
                  >
                    {sess.isCurrent ? 'Log Out' : 'Revoke Session'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Kill Session Modal */}
      <ConfirmationModal
        isOpen={Boolean(sessionToKill)}
        title={sessionToKill?.isCurrent ? 'Log Out of This Session?' : 'Terminate Remote Session?'}
        description={`This will invalidate the refresh token and security session on ${sessionToKill?.browser} (${sessionToKill?.ipAddress}). Subsequent API requests from this device will be blocked.`}
        confirmText={sessionToKill?.isCurrent ? 'Log Out' : 'Terminate'}
        isDestructive={true}
        onConfirm={handleKillSession}
        onCancel={() => setSessionToKill(null)}
      />

      {/* Terminate Others Modal */}
      <ConfirmationModal
        isOpen={terminateOthersOpen}
        title="Log Out of All Other Devices?"
        description="All active sessions except for your current browser will be invalidated immediately."
        confirmText="Log Out Other Sessions"
        isDestructive={true}
        onConfirm={handleTerminateOthers}
        onCancel={() => setTerminateOthersOpen(false)}
      />

      {/* Terminate All Modal */}
      <ConfirmationModal
        isOpen={terminateAllOpen}
        title="Terminate All Active Sessions?"
        description="This will instantly invalidate ALL authenticated sessions across every device, including this one. You will be logged out and will need to sign in again."
        confirmText="Terminate Everything & Log Out"
        isDestructive={true}
        onConfirm={handleTerminateAll}
        onCancel={() => setTerminateAllOpen(false)}
      />
    </div>
  );
};
