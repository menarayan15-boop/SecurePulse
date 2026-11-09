import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Globe,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Info,
  History,
  Search,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { phishingApi, IPhishingScanResult } from '../../api/featureApis';

export const PhishingDetectorPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'url' | 'content' | 'history'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [contentType, setContentType] = useState<'email' | 'message'>('email');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<IPhishingScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    try {
      const res = await phishingApi.getHistory();
      if (res.success) setHistory(res.scans || []);
    } catch {}
  };

  const handleScanUrl = async (sampleUrl?: string) => {
    const target = sampleUrl || urlInput;
    if (!target.trim() || loading) return;

    setLoading(true);
    setError(null);
    setScanResult(null);

    try {
      const res = await phishingApi.scanUrl(target);
      if (res.success) {
        setScanResult(res.analysis);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze URL. Please check the address and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleScanContent = async (sampleText?: string) => {
    const target = sampleText || contentInput;
    if (!target.trim() || loading) return;

    setLoading(true);
    setError(null);
    setScanResult(null);

    try {
      const res = await phishingApi.scanContent(target, contentType);
      if (res.success) {
        setScanResult(res.analysis);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to inspect message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadSamplePhishingUrl = () => {
    const sample = 'https://appleid.apple.com.verify-billing-update.xyz/login?session=48192';
    setUrlInput(sample);
    handleScanUrl(sample);
  };

  const loadSamplePhishingEmail = () => {
    const sample = `URGENT NOTICE: Your PayPal account has been restricted due to unauthorized transactions.\n\nImmediate action is required! You must verify your credit card details within 24 hours to restore access.\n\nClick here to verify now: http://192.168.1.1/paypal-recovery-form\n\nFailure to comply will result in permanent account termination.`;
    setContentInput(sample);
    handleScanContent(sample);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-600/10 via-amber-500/5 to-transparent border border-rose-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              Phishing & Threat Detector
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                SSRF-Protected
              </span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Heuristic deep-inspection for suspicious links, spoofed brand domains, and manipulative email lures
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-cyber-border pb-3">
        <button
          onClick={() => {
            setActiveTab('url');
            setScanResult(null);
            setError(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'url'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-cyber-card'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>URL Scanner</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('content');
            setScanResult(null);
            setError(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'content'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-cyber-card'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Email & Message Analyzer</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('history');
            setScanResult(null);
            setError(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'history'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-cyber-card'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Scan History</span>
        </button>
      </div>

      {/* Tab 1: URL Scanner */}
      {activeTab === 'url' && (
        <div className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Enter suspicious URL (e.g. https://paypal-security-login.top/verify)..."
                disabled={loading}
                className="w-full bg-gray-50 dark:bg-cyber-card border border-gray-200 dark:border-cyber-border rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
              />
            </div>
            <button
              onClick={() => handleScanUrl()}
              disabled={!urlInput.trim() || loading}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Inspect URL</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ⚡ Never executed: Link is inspected statically offline to protect your browser.
            </span>
            <button
              onClick={loadSamplePhishingUrl}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
            >
              Try Phishing Example
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Content Analyzer */}
      {activeTab === 'content' && (
        <div className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-4 text-xs font-semibold">
            <label className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="radio"
                name="contentType"
                checked={contentType === 'email'}
                onChange={() => setContentType('email')}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span>Suspicious Email</span>
            </label>
            <label className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="radio"
                name="contentType"
                checked={contentType === 'message'}
                onChange={() => setContentType('message')}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span>SMS / Instant Message</span>
            </label>
          </div>

          <textarea
            rows={5}
            value={contentInput}
            onChange={(e) => setContentInput(e.target.value)}
            placeholder="Paste suspicious email text, SMS alert, or message content here..."
            disabled={loading}
            className="w-full bg-gray-50 dark:bg-cyber-card border border-gray-200 dark:border-cyber-border rounded-xl p-4 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />

          <div className="flex items-center justify-between">
            <button
              onClick={loadSamplePhishingEmail}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
            >
              Try Sample Phishing Email
            </button>
            <button
              onClick={() => handleScanContent()}
              disabled={!contentInput.trim() || loading}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm flex items-center gap-2 transition-colors shadow-sm"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Inspect Content</span>
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Analysis Result Card */}
      {scanResult && (
        <div className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 dark:border-cyber-border gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold mb-1">
                Target Analyzed
              </div>
              <div className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
                {scanResult.targetSummary}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-gray-400 dark:text-gray-500">Calculated Risk</div>
                <div className="text-2xl font-bold font-mono text-gray-900 dark:text-gray-100">
                  {scanResult.riskScore}
                  <span className="text-xs text-gray-400 font-normal">/100</span>
                </div>
              </div>

              <div
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${
                  scanResult.riskLevel === 'high'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-500/30'
                    : scanResult.riskLevel === 'medium'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {scanResult.riskLevel} Risk
              </div>
            </div>
          </div>

          {/* Threat Indicators List */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Threat Indicators ({scanResult.threatIndicators.length})</span>
            </h3>
            <ul className="space-y-2">
              {scanResult.threatIndicators.map((ind, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-cyber-card border border-gray-100 dark:border-cyber-border text-xs text-gray-700 dark:text-gray-300 leading-relaxed"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                  <span>{ind}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actionable Recommendations */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Recommended Safety Actions</span>
            </h3>
            <div className="space-y-2">
              {scanResult.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: History */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" />
            <span>Recent Phishing Scans</span>
          </h3>

          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
              No previous scans found. Run your first inspection above!
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-cyber-border">
              {history.map((item) => (
                <div key={item._id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-cyber-card text-gray-600 dark:text-gray-300">
                        {item.scanType}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-gray-800 dark:text-gray-200 truncate max-w-md">
                      {item.targetSummary}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        item.riskLevel === 'high'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                          : item.riskLevel === 'medium'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                      }`}
                    >
                      {item.riskScore}/100
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

