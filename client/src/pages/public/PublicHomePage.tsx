import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  LogIn,
  UserPlus,
  ArrowRight,
  Clock,
  Sparkles,
  Laptop,
  Radio,
  History,
  Sliders,
  BellRing,
  CheckCircle2,
  AlertTriangle,
  Globe,
  KeyRound,
  Eye,
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export const PublicHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { theme, istTime, preference } = useTheme();

  // Client-side environment detection for live interactive preview
  const [clientInfo, setClientInfo] = useState({
    browser: 'Modern Browser',
    os: 'Unknown Operating System',
    deviceType: 'Desktop',
    screenRes: '1920x1080',
    language: 'en-US',
  });

  const [activeTab, setActiveTab] = useState<'clean' | 'unfamiliar' | 'critical'>('clean');

  useEffect(() => {
    const ua = navigator.userAgent;
    let browser = 'Chrome/Chromium';
    if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
    else if (ua.includes('Edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Apple Safari';
    else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera';

    let os = 'Windows OS';
    if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android Mobile';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'Apple iOS';

    const isMobile = /Mobi|Android|iPhone/i.test(ua);
    const isTablet = /iPad|Tablet/i.test(ua);
    const deviceType = isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop';

    setClientInfo({
      browser,
      os,
      deviceType,
      screenRes: `${window.screen.width} × ${window.screen.height}`,
      language: navigator.language || 'en-US',
    });
  }, []);

  const handleProtectedNavigation = (path: string) => {
    if (isAuthenticated) {
      navigate(path);
    } else {
      navigate(`/login?redirect=${encodeURIComponent(path)}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-cyber-bg transition-colors duration-200">
      {/* Top Navbar with clearly visible Login button in top-right */}
      <Navbar />

      <main className="flex-1">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION                                                           */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-gray-200/80 dark:border-cyber-border">
          {/* Subtle glow background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 text-center">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold tracking-wide uppercase mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Intelligent Access • Personalized Experience • Stronger Security</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-[1.15] max-w-4xl mx-auto">
              Smart Login &amp; Adaptive{' '}
              <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 bg-clip-text text-transparent">
                Security System
              </span>
            </h1>

            {/* Subtitle / Professional Introduction */}
            <p className="mt-5 text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              SecurePulse dynamically adapts its defense interface based on login time, detects unfamiliar login
              environments in real time, and verifies user identity via cryptographically secure email OTPs.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xl shadow-emerald-600/25 transition-all duration-150 cursor-pointer"
                >
                  <Activity className="w-4 h-4" />
                  <span>Enter Personal Security Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/25 transition-all duration-150 border border-emerald-400/30"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Log In to Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    to="/register"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white dark:bg-cyber-surface hover:bg-gray-50 dark:hover:bg-cyber-card border border-gray-300 dark:border-cyber-border text-gray-800 dark:text-gray-100 font-bold text-sm shadow-sm transition-all duration-150"
                  >
                    <UserPlus className="w-4 h-4 text-emerald-500" />
                    <span>Create Free Account</span>
                  </Link>
                </>
              )}
            </div>

            {/* 100% Free Guarantee Banner */}
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                100% Free Forever
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Zero Paid Plans
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Military-Grade Privacy
              </span>
            </div>

            {/* Live Client Environment Telemetry Showcase */}
            <div className="mt-12 max-w-3xl mx-auto rounded-3xl bg-white/90 dark:bg-cyber-surface/90 border border-gray-200 dark:border-cyber-border p-5 sm:p-6 shadow-xl backdrop-blur-md text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-cyber-border gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Live Client Telemetry Engine
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Clean Environment • Score: 0/100</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-cyber-card/80 border border-gray-100 dark:border-cyber-border">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase block">
                    Detected Browser
                  </span>
                  <span className="font-bold text-gray-800 dark:text-gray-200 mt-0.5 block truncate">
                    {clientInfo.browser}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-cyber-card/80 border border-gray-100 dark:border-cyber-border">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase block">
                    Operating System
                  </span>
                  <span className="font-bold text-gray-800 dark:text-gray-200 mt-0.5 block truncate">
                    {clientInfo.os}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-cyber-card/80 border border-gray-100 dark:border-cyber-border">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase block">
                    Device Profile
                  </span>
                  <span className="font-bold text-gray-800 dark:text-gray-200 mt-0.5 block truncate">
                    {clientInfo.deviceType} ({clientInfo.screenRes})
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-cyber-card/80 border border-gray-100 dark:border-cyber-border">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase block">
                    Timezone &amp; Theme
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block truncate capitalize">
                    {istTime.split(' ')[0]} (IST {theme})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. ADAPTIVE SECURITY SYSTEM OVERVIEW                                      */}
        {/* ========================================================================= */}
        <section className="py-16 sm:py-24 bg-white dark:bg-cyber-surface border-b border-gray-200 dark:border-cyber-border transition-colors">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-2">
                Adaptive Defense Architecture
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Authentication That Adapts To Every Situation
              </h2>
              <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                Rather than treating every login attempt identically, SecurePulse analyzes 5 environmental factors in
                real time to dynamically decide whether to grant instant entry or enforce two-factor verification.
              </p>
            </div>

            {/* Interactive Scenario Tabs */}
            <div className="max-w-4xl mx-auto bg-gray-50 dark:bg-cyber-card border border-gray-200 dark:border-cyber-border rounded-3xl p-6 sm:p-8 shadow-lg">
              <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
                <button
                  onClick={() => setActiveTab('clean')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'clean'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-white dark:bg-cyber-surface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-cyber-border'
                  }`}
                >
                  1. Familiar &amp; Trusted Login
                </button>

                <button
                  onClick={() => setActiveTab('unfamiliar')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'unfamiliar'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : 'bg-white dark:bg-cyber-surface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-cyber-border'
                  }`}
                >
                  2. Unfamiliar Environment Challenge
                </button>

                <button
                  onClick={() => setActiveTab('critical')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'critical'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'bg-white dark:bg-cyber-surface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-cyber-border'
                  }`}
                >
                  3. Threat Detected &amp; Frozen
                </button>
              </div>

              {/* Tab 1: Clean Login */}
              {activeTab === 'clean' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          Frictionless Instant Access
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Known Browser • Trusted Device Token Valid • Same Geolocation
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500 text-white font-bold text-xs">
                      Risk Score: 0/100
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    When you sign in from your primary laptop or phone where you previously opted into{' '}
                    <strong>Trust this device for 30 days</strong>, SecurePulse automatically verifies your device token
                    hash, sets your session cookie, and directs you immediately to your dashboard without interrupting
                    your workflow.
                  </p>
                </div>
              )}

              {/* Tab 2: Unfamiliar Login */}
              {activeTab === 'unfamiliar' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          Unfamiliar Environment Detected
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Unrecognized Browser • New Network IP • Untrusted Session
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-amber-500 text-white font-bold text-xs">
                      Risk Score: 35/100
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    When someone attempts to log in from a new computer, incognito tab, or different city, SecurePulse
                    flags the environment anomaly. A cryptographically secure 6-digit verification code is generated,
                    hashed, and dispatched to your registered email via Gmail SMTP. Access is blocked until the code is
                    verified.
                  </p>
                </div>
              )}

              {/* Tab 3: Threat Detected */}
              {activeTab === 'critical' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                        <ShieldAlert className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          Critical Anomaly / Brute-Force Defense
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          3+ Repeated Password Failures • Automated Security Alert Triggered
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-rose-500 text-white font-bold text-xs">
                      Risk Score: 85/100
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    If multiple incorrect credentials are submitted, SecurePulse records the telemetry, alerts the user
                    via high-priority email, and logs an in-app security alert. You can trigger an{' '}
                    <strong>Emergency Account Lockdown</strong> at any time to instantly kill all active sessions,
                    revoke all trusted devices, and freeze login until recovery verification is completed.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. SIX CORE SECURITY PILLARS                                              */}
        {/* ========================================================================= */}
        <section className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-2">
              Comprehensive Feature Set
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Enterprise Protection Built For Every User
            </h2>
            <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Every registered user receives the exact same high-assurance protection at zero cost.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-md hover:shadow-xl transition-all duration-200">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-5">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                Adaptive Email OTP Delivery
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Cryptographically secure random 6-digit one-time passcodes delivered reliably to your registered inbox
                via authenticated Gmail SMTP with SSL/TLS encryption.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-md hover:shadow-xl transition-all duration-200">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-500 flex items-center justify-center mb-5">
                <Laptop className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                Trusted Device Protection
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Trust frequently used personal devices for up to 30 days. Unfamiliar devices or anomalous browsers are
                instantly challenged with multi-factor verification.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-md hover:shadow-xl transition-all duration-200">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-5">
                <History className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                Login Activity Monitoring
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Detailed telemetry logging each authentication event, including IP address, geographical city and
                country, operating system, browser engine, and CSV export.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-md hover:shadow-xl transition-all duration-200">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-5">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                Suspicious Login Detection
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Real-time risk scoring engine analyzing network shifts, multiple failed passwords, and unexpected
                geographic locations to trigger automated alerts.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-md hover:shadow-xl transition-all duration-200">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-5">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                Emergency Account Lockdown
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Immediate user-controlled kill switch that revokes all active JWT sessions, terminates all trusted
                device tokens, and locks down the account until recovery.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-md hover:shadow-xl transition-all duration-200">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-500 flex items-center justify-center mb-5">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                IST Adaptive Theme Engine
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Intelligent interface scheduling synchronized with Indian Standard Time (IST). Automatically transitions
                between clean light mode and deep cybersecurity dark surfaces.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. EXPLORE PROTECTED FEATURES (AUTHENTICATION GATE DEMONSTRATION)          */}
        {/* ========================================================================= */}
        <section className="py-16 sm:py-24 bg-gray-100/70 dark:bg-cyber-surface/60 border-t border-b border-gray-200 dark:border-cyber-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-2">
                Personal Security Center
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Explore Your Account Management Tools
              </h2>
              <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Sign in to view your real-time security dashboard, or click any protected tool below to test the
                authentication gate.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: 'Security Overview Dashboard',
                  desc: 'Comprehensive security health score, risk statistics, and live telemetry.',
                  path: '/dashboard',
                  icon: Activity,
                },
                {
                  title: 'Login Activity History',
                  desc: 'Full forensic audit log of all successful and challenged login attempts.',
                  path: '/activity',
                  icon: History,
                },
                {
                  title: 'Trusted Device Registry',
                  desc: 'Manage and revoke browser authorizations across desktop and mobile.',
                  path: '/devices',
                  icon: Laptop,
                },
                {
                  title: 'Active Session Manager',
                  desc: 'View all concurrent sessions and terminate remote access in real time.',
                  path: '/sessions',
                  icon: Radio,
                },
                {
                  title: 'Security Alert Feed',
                  desc: 'Inspect automated alerts for failed passwords and unfamiliar logins.',
                  path: '/alerts',
                  icon: BellRing,
                },
                {
                  title: 'Security & Profile Settings',
                  desc: 'Configure trusted duration, OTP enforcement, and theme preferences.',
                  path: '/security',
                  icon: Sliders,
                },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => handleProtectedNavigation(item.path)}
                    className="p-5 rounded-2xl bg-white dark:bg-cyber-card border border-gray-200 dark:border-cyber-border hover:border-emerald-500/50 hover:shadow-lg transition-all duration-150 cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-cyber-surface text-gray-700 dark:text-gray-300 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 flex items-center justify-center mb-3 transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1 group-hover:text-emerald-500 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-cyber-border flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <span>{isAuthenticated ? 'Open Feature →' : 'Sign In Required →'}</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. CALL TO ACTION SECTION                                                 */}
        {/* ========================================================================= */}
        <section className="py-20 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="rounded-3xl bg-gradient-to-r from-gray-900 via-cyber-surface to-gray-900 text-white p-8 sm:p-12 border border-gray-800 shadow-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-radial from-emerald-500/15 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10">
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Ready to Experience Intelligent Access?
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-gray-300 max-w-xl mx-auto leading-relaxed">
                Join SecurePulse today. Protect your account with military-grade environment detection and automated
                one-time passcodes. Free forever for all registered users.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Link>

                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-100 font-semibold text-sm border border-gray-700 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* 6. RESPONSIVE PUBLIC FOOTER                                               */}
      {/* ========================================================================= */}
      <footer className="border-t border-gray-200 dark:border-cyber-border bg-white dark:bg-cyber-surface py-10 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <img src="/shield-pulse.svg" alt="SecurePulse" className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                Secure<span className="text-emerald-500">Pulse</span>
              </span>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Intelligent Access • Personalized Experience • Stronger Security
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-600 dark:text-gray-400 font-medium">
            <Link to="/" className="hover:text-emerald-500 transition-colors">
              Home
            </Link>
            <Link to="/login" className="hover:text-emerald-500 transition-colors">
              Log In
            </Link>
            <Link to="/register" className="hover:text-emerald-500 transition-colors">
              Create Account
            </Link>
            <Link to="/forgot-password" className="hover:text-emerald-500 transition-colors">
              Forgot Password
            </Link>
            <Link to="/recover-account" className="hover:text-emerald-500 transition-colors">
              Account Recovery
            </Link>
          </div>

          <div className="text-[11px] text-gray-400 dark:text-gray-500">
            &copy; {new Date().getFullYear()} SecurePulse System. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
