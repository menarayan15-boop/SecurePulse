import React, { useEffect, useState } from 'react';
import {
  LifeBuoy,
  Key,
  Copy,
  Download,
  CheckCircle2,
  AlertTriangle,
  Mail,
  ShieldAlert,
  RefreshCw,
  Eye,
  EyeOff,
  AlertOctagon,
  Lock,
} from 'lucide-react';
import { securityApi } from '../../api/client';
import { IRecoveryCodesStats } from '../../types';

export const EmergencyRecoveryPage: React.FC = () => {
  const [stats, setStats] = useState<IRecoveryCodesStats | null>(null);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [testCodeInput, setTestCodeInput] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await securityApi.getRecoveryCodes();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve recovery codes status.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleGenerateCodes = async () => {
    if (
      stats?.hasGeneratedCodes &&
      !window.confirm(
        'Generating new codes will immediately invalidate all existing recovery codes. Proceed?'
      )
    ) {
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const res = await securityApi.generateRecoveryCodes();
      if (res.success) {
        setGeneratedCodes(res.codes || []);
        setSuccess('10 one-time emergency recovery codes generated! Please save them now.');
        fetchStats();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate emergency backup codes.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyAll = () => {
    if (generatedCodes.length === 0) return;
    const text = `SECUREPULSE EMERGENCY BACKUP CODES\nGenerated: ${new Date().toISOString()}\n\n${generatedCodes.join('\n')}\n\nNote: Each code can only be used once to recover your account.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (generatedCodes.length === 0) return;
    const text = `SECUREPULSE EMERGENCY BACKUP CODES\nGenerated: ${new Date().toISOString()}\n\n${generatedCodes.join('\n')}\n\nKeep these codes in a secure password manager or safe physical place. Each code is single-use.`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `securepulse-backup-codes-${Date.now()}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleVerifyTestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestResult(null);
    setTestError(null);

    if (!testCodeInput.trim()) return;

    try {
      const res = await securityApi.verifyBackupCode(testCodeInput.trim());
      if (res.success) {
        setTestResult(res.message || 'Recovery code verified and burned successfully!');
        setTestCodeInput('');
        fetchStats();
      }
    } catch (err: any) {
      setTestError(err.message || 'Failed to verify recovery code.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              <LifeBuoy className="w-3.5 h-3.5" />
              Emergency Access Assurance
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            Emergency Account Recovery Center
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Generate offline one-time recovery codes and configure verified channels to restore access if you lose your phone or passkeys.
          </p>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Backup Codes Section */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-500" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Single-Use Backup Recovery Codes
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xl">
              Cryptographically generated 12-character emergency codes. Store only in your password manager or print on paper.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-2xl font-black text-gray-900 dark:text-gray-100">
                {stats?.remainingCount ?? 0}
              </span>
              <span className="text-xs text-gray-400"> / 10 available</span>
            </div>
            <button
              onClick={handleGenerateCodes}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{stats?.hasGeneratedCodes ? 'Regenerate Codes' : 'Generate 10 Codes'}</span>
            </button>
          </div>
        </div>

        {/* Generated Codes Display Box */}
        {generatedCodes.length > 0 && (
          <div className="p-6 rounded-2xl bg-gray-50 dark:bg-cyber-card border border-emerald-500/30 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Active One-Time Codes (Save Now)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-cyber-card transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy All'}</span>
                </button>
                <button
                  onClick={handleDownloadTxt}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-cyber-card transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .TXT</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-sm text-gray-900 dark:text-gray-100 font-bold">
              {generatedCodes.map((code, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border text-center shadow-xs select-all"
                >
                  {code}
                </div>
              ))}
            </div>

            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              * These codes are shown only once. Any previously generated backup codes have now been permanently deactivated.
            </p>
          </div>
        )}

        {/* Test Code Burner */}
        <div className="pt-6 border-t border-gray-100 dark:border-cyber-border space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Test Emergency Code Verification
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            You can verify that one of your backup recovery codes works. Verifying a code will immediately burn it.
          </p>

          <form onSubmit={handleVerifyTestCode} className="flex gap-2 max-w-md">
            <input
              type="text"
              value={testCodeInput}
              onChange={(e) => setTestCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. 4MZ8-9K21-3LP7"
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-cyber-border bg-gray-50 dark:bg-cyber-card font-mono text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-gray-900 dark:bg-emerald-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Verify & Burn
            </button>
          </form>

          {testResult && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{testResult}</span>
            </p>
          )}

          {testError && (
            <p className="text-xs text-rose-500 font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>{testError}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

