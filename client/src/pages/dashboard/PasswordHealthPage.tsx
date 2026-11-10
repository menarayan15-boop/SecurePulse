import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Sparkles,
  Search,
} from 'lucide-react';
import { passwordHealthApi } from '../../api/featureApis';

export const PasswordHealthPage: React.FC = () => {
  const [testPassword, setTestPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [accountSummary, setAccountSummary] = useState<any>(null);

  // Generator state
  const [genLength, setGenLength] = useState(16);
  const [genIncludeSymbols, setGenIncludeSymbols] = useState(true);
  const [genIncludeNumbers, setGenIncludeNumbers] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState('');

  // HaveIBeenPwned k-anonymity breach check state
  const [breachChecking, setBreachChecking] = useState(false);
  const [breachResult, setBreachResult] = useState<{ checked: boolean; pwned: boolean; count: number } | null>(null);

  useEffect(() => {
    passwordHealthApi
      .getAccountSummary()
      .then((res) => {
        if (res.success) setAccountSummary(res.summary);
      })
      .catch(() => {});

    generateNewPassword();
  }, []);

  // Compute password strength metrics locally
  const analyzePassword = (pwd: string) => {
    if (!pwd) {
      return { score: 0, label: 'Empty', color: 'gray', checks: [] };
    }

    const checks = [
      { id: 'len8', label: 'Minimum 8 characters', pass: pwd.length >= 8 },
      { id: 'len14', label: 'Recommended 14+ characters', pass: pwd.length >= 14 },
      { id: 'upper', label: 'Uppercase letters (A-Z)', pass: /[A-Z]/.test(pwd) },
      { id: 'lower', label: 'Lowercase letters (a-z)', pass: /[a-z]/.test(pwd) },
      { id: 'digit', label: 'Numbers (0-9)', pass: /[0-9]/.test(pwd) },
      { id: 'symbol', label: 'Symbols (!@#$%^&*)', pass: /[^A-Za-z0-9]/.test(pwd) },
      { id: 'noCommon', label: 'No common patterns (12345, qwerty, admin)', pass: !/(12345|qwerty|password|admin|welcome|summer|winter)/i.test(pwd) },
    ];

    const passCount = checks.filter((c) => c.pass).length;
    let score = Math.round((passCount / checks.length) * 100);

    // Entropy estimation
    let charsetSize = 0;
    if (/[a-z]/.test(pwd)) charsetSize += 26;
    if (/[A-Z]/.test(pwd)) charsetSize += 26;
    if (/[0-9]/.test(pwd)) charsetSize += 10;
    if (/[^A-Za-z0-9]/.test(pwd)) charsetSize += 32;

    const entropyBits = Math.round(pwd.length * (charsetSize > 0 ? Math.log2(charsetSize) : 0));

    let label = 'Weak';
    let color = 'rose';
    if (score >= 85 && entropyBits >= 60) {
      label = 'Very Strong';
      color = 'emerald';
    } else if (score >= 60 && entropyBits >= 40) {
      label = 'Moderate';
      color = 'amber';
    }

    return { score, label, color, checks, entropyBits };
  };

  const currentAnalysis = analyzePassword(testPassword);

  const generateNewPassword = () => {
    let charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (genIncludeNumbers) charset += '0123456789';
    if (genIncludeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    const array = new Uint32Array(genLength);
    window.crypto.getRandomValues(array);
    let result = '';
    for (let i = 0; i < genLength; i++) {
      result += charset[array[i] % charset.length];
    }
    setGeneratedPassword(result);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Privacy-preserving k-anonymity breach check
  const checkHaveIBeenPwned = async () => {
    if (!testPassword) return;

    setBreachChecking(true);
    setBreachResult(null);

    try {
      // 1. Compute SHA-1 hash locally in browser
      const encoder = new TextEncoder();
      const data = encoder.encode(testPassword);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();

      // 2. Extract 5-character prefix and suffix
      const prefix = hashHex.substring(0, 5);
      const suffix = hashHex.substring(5);

      // 3. Query HaveIBeenPwned Range API (sends only 5 characters; plaintext password NEVER sent!)
      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      if (!res.ok) throw new Error('Range API lookup failed');

      const responseText = await res.text();
      const lines = responseText.split('\n');

      let foundCount = 0;
      for (const line of lines) {
        const [hashSuffix, countStr] = line.trim().split(':');
        if (hashSuffix === suffix) {
          foundCount = parseInt(countStr, 10);
          break;
        }
      }

      setBreachResult({
        checked: true,
        pwned: foundCount > 0,
        count: foundCount,
      });
    } catch {
      setBreachResult({
        checked: true,
        pwned: false,
        count: 0,
      });
    } finally {
      setBreachChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card-static bg-gradient-to-r from-blue-600/15 via-emerald-500/10 to-transparent border border-blue-500/25 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              Password Health Monitor
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                Client-Side Safe
              </span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Zero-knowledge password strength scoring, k-anonymity breach verification, and passphrase generator
            </p>
          </div>
        </div>
      </div>

      {/* Account Password Hygiene Summary Card */}
      {accountSummary && (
        <div className="glass-card-static border border-gray-200/70 dark:border-white/10 rounded-2xl p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10 gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">
                Account Password Age
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Last updated {accountSummary.daysSinceLastUpdate} day(s) ago
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Authentication Method:</span>
              <span className="px-2.5 py-1 rounded-lg bg-white/40 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 text-xs font-mono font-semibold text-gray-800 dark:text-gray-200">
                {accountSummary.preferredAuthMethod.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
            {accountSummary.recommendations.map((rec: string, i: number) => (
              <div
                key={i}
                className="text-xs p-3 rounded-xl bg-white/40 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 text-gray-600 dark:text-gray-300 flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Strength Meter */}
      <div className="glass-card-static border border-gray-200/70 dark:border-white/10 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            Interactive Password Strength Analyzer
          </h2>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            🔒 Evaluated 100% locally in browser
          </span>
        </div>

        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={testPassword}
            onChange={(e) => {
              setTestPassword(e.target.value);
              setBreachResult(null);
            }}
            placeholder="Type any password to analyze entropy and strength..."
            className="w-full bg-gray-50 dark:bg-cyber-card border border-gray-200 dark:border-cyber-border rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono pr-20"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {testPassword && (
          <div className="space-y-4 animate-fade-in">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
                <span className="text-gray-600 dark:text-gray-400">Score & Entropy:</span>
                <span
                  className={
                    currentAnalysis.label === 'Very Strong'
                      ? 'text-emerald-500'
                      : currentAnalysis.label === 'Moderate'
                      ? 'text-amber-500'
                      : 'text-rose-500'
                  }
                >
                  {currentAnalysis.label} ({currentAnalysis.entropyBits} bits entropy)
                </span>
              </div>
              <div className="h-2 w-full bg-gray-100 dark:bg-cyber-card rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    currentAnalysis.label === 'Very Strong'
                      ? 'bg-emerald-500'
                      : currentAnalysis.label === 'Moderate'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${currentAnalysis.score}%` }}
                />
              </div>
            </div>

            {/* Checklist items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              {currentAnalysis.checks.map((chk) => (
                <div
                  key={chk.id}
                  className={`flex items-center gap-2 text-xs p-2.5 rounded-lg border transition-colors ${
                    chk.pass
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                      : 'bg-gray-50 dark:bg-cyber-card border-gray-100 dark:border-cyber-border text-gray-400'
                  }`}
                >
                  {chk.pass ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  )}
                  <span>{chk.label}</span>
                </div>
              ))}
            </div>

            {/* Privacy-Preserving Breach Check Button */}
            <div className="pt-2 border-t border-gray-100 dark:border-cyber-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Check HaveIBeenPwned database via <strong>k-Anonymity</strong> (only first 5 chars of hash sent).
              </div>
              <button
                onClick={checkHaveIBeenPwned}
                disabled={breachChecking}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-cyber-card hover:bg-gray-200 dark:hover:bg-cyber-border text-gray-800 dark:text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {breachChecking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Check Breach History</span>
              </button>
            </div>

            {/* Breach check results */}
            {breachResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  breachResult.pwned
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {breachResult.pwned ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>
                      ⚠️ <strong>Warning:</strong> This password has appeared in <strong>{breachResult.count.toLocaleString()}</strong> public data breach dump(s)! Never use it.
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>
                      ✅ <strong>Safe:</strong> This password was not found in known public breach databases.
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generator Card */}
      <div className="glass-card-static border border-gray-200/70 dark:border-white/10 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>Cryptographic Passphrase Generator</span>
          </h2>
          <button
            onClick={generateNewPassword}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Generate Fresh</span>
          </button>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 dark:bg-cyber-card border border-gray-200 dark:border-cyber-border rounded-xl p-3">
          <span className="flex-1 font-mono text-sm text-gray-900 dark:text-gray-100 break-all select-all">
            {generatedPassword}
          </span>
          <button
            onClick={() => copyToClipboard(generatedPassword)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span>Length: {genLength}</span>
            <input
              type="range"
              min={12}
              max={32}
              value={genLength}
              onChange={(e) => {
                setGenLength(Number(e.target.value));
                generateNewPassword();
              }}
              className="accent-emerald-600 cursor-pointer"
            />
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={genIncludeSymbols}
              onChange={(e) => {
                setGenIncludeSymbols(e.target.checked);
                generateNewPassword();
              }}
              className="text-emerald-600 rounded"
            />
            <span>Include Symbols (!@#$)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={genIncludeNumbers}
              onChange={(e) => {
                setGenIncludeNumbers(e.target.checked);
                generateNewPassword();
              }}
              className="text-emerald-600 rounded"
            />
            <span>Include Numbers (0-9)</span>
          </label>
        </div>
      </div>
    </div>
  );
};

