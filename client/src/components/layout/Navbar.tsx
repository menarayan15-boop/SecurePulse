import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  Bell,
  Sun,
  Moon,
  Sparkles,
  ChevronDown,
  User,
  Shield,
  LogOut,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { securityApi } from '../../api/client';
import { ISecurityAlert } from '../../types';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, preference, istTime, setPreference } = useTheme();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [alertsDropdownOpen, setAlertsDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);

  const [unreadAlerts, setUnreadAlerts] = useState<ISecurityAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const profileRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setAlertsDropdownOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Poll recent alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await securityApi.getAlerts(true);
        if (res.success) {
          setUnreadAlerts(res.data.slice(0, 5));
          setUnreadCount(res.unreadCount);
        }
      } catch {
        // Silently handle
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await securityApi.clearAllAlerts();
      setUnreadAlerts([]);
      setUnreadCount(0);
    } catch {
      // Ignored
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-cyber-surface/80 backdrop-blur-md border-b border-gray-200 dark:border-cyber-border transition-colors duration-200">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Left: Mobile hamburger & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-cyber-card lg:hidden transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-md shadow-emerald-500/20">
              <div className="w-full h-full bg-cyber-bg rounded-[10px] flex items-center justify-center">
                <img src="/shield-pulse.svg" alt="SecurePulse" className="w-6 h-6" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                Secure<span className="text-emerald-500">Pulse</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Indian Standard Time Ticker (Adaptive Theme Rule indicator) */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100/80 dark:bg-cyber-card/80 border border-gray-200 dark:border-cyber-border text-xs text-gray-600 dark:text-gray-300">
          <Clock className="w-3.5 h-3.5 text-emerald-500" />
          <span>{istTime}</span>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium capitalize">
            {preference === 'auto' ? `IST Adaptive (${theme})` : `${preference} theme`}
          </span>
        </div>

        {/* Right: Theme Switcher, Alerts & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Selector Dropdown */}
          <div className="relative" ref={themeRef}>
            <button
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              className="p-2 rounded-xl text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-cyber-card transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Adaptive Theme Engine"
            >
              {preference === 'auto' ? (
                <Sparkles className="w-4 h-4 text-emerald-500" />
              ) : theme === 'dark' ? (
                <Moon className="w-4 h-4 text-teal-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
              <span className="hidden sm:inline capitalize">{preference}</span>
            </button>

            {themeDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-xl p-1.5 text-xs z-50">
                <div className="px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Adaptive Theme Mode
                </div>
                <button
                  onClick={() => {
                    setPreference('auto');
                    setThemeDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                    preference === 'auto'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'hover:bg-gray-50 dark:hover:bg-cyber-card text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Automatic (IST Time)</span>
                  </div>
                  {preference === 'auto' && <CheckCircle className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => {
                    setPreference('light');
                    setThemeDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                    preference === 'light'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'hover:bg-gray-50 dark:hover:bg-cyber-card text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4" />
                    <span>Light Mode</span>
                  </div>
                  {preference === 'light' && <CheckCircle className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => {
                    setPreference('dark');
                    setThemeDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                    preference === 'dark'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'hover:bg-gray-50 dark:hover:bg-cyber-card text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4" />
                    <span>Dark Mode</span>
                  </div>
                  {preference === 'dark' && <CheckCircle className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Security Alerts Dropdown */}
          <div className="relative" ref={alertsRef}>
            <button
              onClick={() => setAlertsDropdownOpen(!alertsDropdownOpen)}
              className="p-2 rounded-xl text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-cyber-card transition-colors relative"
              title="Security Alerts"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {alertsDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-2xl p-3 z-50 text-xs">
                <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-gray-100 dark:border-cyber-border">
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    Security Alerts ({unreadCount} unread)
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline text-[11px]"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {unreadAlerts.length === 0 ? (
                    <div className="py-6 text-center text-gray-400">No unread security alerts.</div>
                  ) : (
                    unreadAlerts.map((alert) => (
                      <div
                        key={alert._id}
                        className="p-2.5 rounded-xl bg-gray-50 dark:bg-cyber-card border border-gray-100 dark:border-cyber-border"
                      >
                        <div className="flex items-center justify-between font-semibold text-gray-800 dark:text-gray-200">
                          <span>{alert.title}</span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {alert.description}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 mt-2 border-t border-gray-100 dark:border-cyber-border text-center">
                  <Link
                    to="/alerts"
                    onClick={() => setAlertsDropdownOpen(false)}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold text-xs"
                  >
                    View All Security Alerts →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-cyber-card transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-2xl p-2 z-50 text-xs">
                <div className="px-3 py-2 border-b border-gray-100 dark:border-cyber-border mb-1">
                  <div className="font-bold text-gray-900 dark:text-gray-100 truncate">{user?.fullName}</div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">@{user?.username}</div>
                </div>

                <Link
                  to="/profile"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-cyber-card transition-colors"
                >
                  <User className="w-4 h-4 text-emerald-500" />
                  <span>My Profile</span>
                </Link>

                <Link
                  to="/settings"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-cyber-card transition-colors"
                >
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span>Security Settings</span>
                </Link>

                <div className="my-1 border-t border-gray-100 dark:border-cyber-border" />

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
