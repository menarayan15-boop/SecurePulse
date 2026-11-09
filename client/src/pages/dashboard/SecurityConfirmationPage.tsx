import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Laptop,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import {
  securityConfirmationApi,
  ISecurityConfirmationItem,
} from '../../api/featureApis';

export const SecurityConfirmationPage: React.FC = () => {
  const [confirmations, setConfirmations] = useState<ISecurityConfirmationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'danger'; text: string; actions?: string[] } | null>(null);

  useEffect(() => {
    loadConfirmations();
  }, []);

  const loadConfirmations = async () => {
    setLoading(true);
    try {
      const res = await securityConfirmationApi.getPending();
      if (res.success) {
        setConfirmations(res.confirmations || []);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const handleRespond = async (id: string, decision: 'legitimate' | 'fraudulent') => {
    setRespondingId(id);
    setActionAlert(null);

    try {
      const res = await securityConfirmationApi.respond(id, decision);
      if (res.success) {
        // Update local item status
        setConfirmations((prev) =>
          prev.map((item) =>
            item._id === id
              ? {
                  ...item,
                  status: decision === 'legitimate' ? 'confirmed_legitimate' : 'confirmed_fraudulent',
                  actionTaken: res.confirmation.actionTaken,
                }
              : item
          )
        );

        if (decision === 'legitimate') {
          setActionAlert({
            type: 'success',
            text: 'Sign-in confirmed as legitimate. Thank you for keeping your account profile verified.',
          });
        } else {
          setActionAlert({
            type: 'danger',
            text: '⚠️ Fraudulent sign-in alert registered! Associated sessions have been revoked immediately.',
            actions: res.recommendedActions,
          });
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit response.');
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600/10 via-emerald-500/5 to-transparent border border-amber-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              "Was This You?" Security Confirmations
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                Action Required
              </span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Review and confirm unrecognized sign-in events. Confirming helps SecurePulse learn your legitimate devices.
            </p>
          </div>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionAlert && (
        <div
          className={`p-4 rounded-2xl border text-sm space-y-2 animate-fade-in ${
            actionAlert.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="font-semibold flex items-center gap-2">
            {actionAlert.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            )}
            <span>{actionAlert.text}</span>
          </div>

          {actionAlert.actions && (
            <div className="pt-2 pl-7 space-y-1 text-xs">
              <div className="font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                Recommended Emergency Steps:
              </div>
              <ul className="list-disc pl-4 space-y-1">
                {actionAlert.actions.map((act, i) => (
                  <li key={i}>{act}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Confirmations List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : confirmations.length === 0 ? (
          <div className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-2xl p-12 text-center space-y-2">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              No Unconfirmed Activity Found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              All recent logins match your known devices and confirmed profiles. Any new unfamiliar sign-ins will appear here for verification.
            </p>
          </div>
        ) : (
          confirmations.map((item) => {
            const isPending = item.status === 'pending';
            const isLegit = item.status === 'confirmed_legitimate';
            const isFraud = item.status === 'confirmed_fraudulent';

            return (
              <div
                key={item._id}
                className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        isPending
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-500/30'
                          : isLegit
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isPending ? 'Pending Your Confirmation' : isLegit ? 'Confirmed Legitimate' : 'Flagged as Fraudulent'}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      IP: {item.ipAddress}
                    </span>
                  </div>

                  <div className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-emerald-500" />
                    <span>
                      {item.browser} on {item.operatingSystem} ({item.device})
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{item.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                  </div>

                  {item.actionTaken && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 italic pt-1">
                      Note: {item.actionTaken}
                    </div>
                  )}
                </div>

                {/* Confirmation Actions */}
                {isPending ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleRespond(item._id, 'fraudulent')}
                      disabled={respondingId === item._id}
                      className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>No, Not Me</span>
                    </button>

                    <button
                      onClick={() => handleRespond(item._id, 'legitimate')}
                      disabled={respondingId === item._id}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>Yes, This Was Me</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                    {isLegit ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    )}
                    <span>Resolved</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

