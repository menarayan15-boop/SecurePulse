import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Brain,
  History,
  Compass,
  BellRing,
  KeyRound,
  ShieldAlert,
  Clock,
  LifeBuoy,
  Laptop,
  UserCheck,
  AlertOctagon,
  ShieldCheck,
  Sparkles,
  Plane,
  Lock,
  GraduationCap,
  HelpCircle,
  Key,
} from 'lucide-react';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { securityApi } from '../../api/client';

// Route chunk preload map for instantaneous tab transitions
const routePreloaders: Record<string, () => Promise<any>> = {
  '/dashboard': () => import('../../pages/dashboard/OverviewPage'),
  '/assistant': () => import('../../pages/dashboard/SecurityAssistantPage'),
  '/phishing': () => import('../../pages/dashboard/PhishingDetectorPage'),
  '/password-health': () => import('../../pages/dashboard/PasswordHealthPage'),
  '/confirmations': () => import('../../pages/dashboard/SecurityConfirmationPage'),
  '/travel': () => import('../../pages/dashboard/SmartTravelPage'),
  '/learning': () => import('../../pages/dashboard/LearningCenterPage'),
  '/privacy': () => import('../../pages/dashboard/PrivacyControlPage'),
  '/risk-analysis': () => import('../../pages/dashboard/AiRiskAnalysisPage'),
  '/activity': () => import('../../pages/dashboard/LoginActivityPage'),
  '/impossible-travel': () => import('../../pages/dashboard/ImpossibleTravelPage'),
  '/alerts': () => import('../../pages/dashboard/SecurityAlertsPage'),
  '/passkeys': () => import('../../pages/dashboard/PasskeysPage'),
  '/account-protection': () => import('../../pages/dashboard/AccountProtectionPage'),
  '/timeline': () => import('../../pages/dashboard/SecurityTimelinePage'),
  '/emergency-recovery': () => import('../../pages/dashboard/EmergencyRecoveryPage'),
  '/devices': () => import('../../pages/dashboard/TrustedDevicesPage'),
  '/profile': () => import('../../pages/dashboard/ProfilePage'),
};

const preloadedRoutes = new Set<string>();
function preloadRouteChunk(path: string) {
  if (preloadedRoutes.has(path)) return;
  const loader = routePreloaders[path];
  if (loader) {
    preloadedRoutes.add(path);
    loader().catch(() => {});
  }
}

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  const navLinks = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/assistant', label: 'AI Security Assistant', icon: Sparkles },
    { to: '/phishing', label: 'Phishing Detector', icon: ShieldAlert },
    { to: '/password-health', label: 'Password Health', icon: Key },
    { to: '/confirmations', label: 'Was This You?', icon: HelpCircle },
    { to: '/travel', label: 'Smart Travel Mode', icon: Plane },
    { to: '/learning', label: 'Learning Center', icon: GraduationCap },
    { to: '/privacy', label: 'Privacy Control', icon: Lock },
    { to: '/risk-analysis', label: 'AI Risk Analysis', icon: Brain },
    { to: '/activity', label: 'Login Activity', icon: History },
    { to: '/impossible-travel', label: 'Impossible Travel Alerts', icon: Compass },
    { to: '/alerts', label: 'Security Notifications', icon: BellRing },
    { to: '/passkeys', label: 'Passkeys & Authentication', icon: KeyRound },
    { to: '/account-protection', label: 'Account Protection', icon: ShieldAlert },
    { to: '/timeline', label: 'Security Timeline', icon: Clock },
    { to: '/emergency-recovery', label: 'Emergency Recovery', icon: LifeBuoy },
    { to: '/devices', label: 'Device Management', icon: Laptop },
    { to: '/profile', label: 'Profile & Settings', icon: UserCheck },
  ];

  const handleTriggerEmergencyLock = async () => {
    setIsLocking(true);
    setLockError(null);
    try {
      await securityApi.emergencyLock('LOCK MY ACCOUNT');
      window.location.href = '/recover-account';
    } catch (err: any) {
      setLockError(err.message || 'Failed to trigger emergency lock.');
      setIsLocking(false);
    }
  };

  return (
    <>
      <aside className="w-64 h-full bg-white/70 dark:bg-[#070b14]/75 backdrop-blur-2xl border-r border-gray-200/70 dark:border-white/10 flex flex-col justify-between py-6 px-4 transition-colors duration-200 overflow-y-auto scrollbar-thin shadow-sm dark:shadow-[4px_0_24px_rgba(0,0,0,0.35)]">
        <div className="space-y-6">
          {/* Section Label */}
          <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Security Management
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onCloseMobile}
                  onMouseEnter={() => preloadRouteChunk(item.to)}
                  onFocus={() => preloadRouteChunk(item.to)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-500/10 font-bold backdrop-blur-md'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100/70 dark:hover:bg-white/[0.04]'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Emergency Kill Switch & Status */}
        <div className="space-y-3 pt-6 border-t border-gray-200/60 dark:border-white/10">
          {lockError && (
            <div className="text-[11px] p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              {lockError}
            </div>
          )}

          <button
            onClick={() => setLockModalOpen(true)}
            disabled={isLocking}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 border border-rose-500/25 text-rose-600 dark:text-rose-400 font-semibold text-xs transition-colors shadow-sm"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>Emergency Account Lock</span>
          </button>

          <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Shield Active</span>
            </span>
            <span className="font-mono">v1.0.0</span>
          </div>
        </div>
      </aside>

      {/* Emergency Lock Confirmation Modal */}
      <ConfirmationModal
        isOpen={lockModalOpen}
        title="Activate Emergency Account Lock?"
        description="This action immediately invalidates ALL active sessions across all devices, revokes every trusted device, and halts all subsequent login attempts until you complete identity recovery with your registered email OTP."
        requirePhrase="LOCK MY ACCOUNT"
        confirmText="Lock Account Immediately"
        cancelText="Abort"
        isDestructive={true}
        onConfirm={handleTriggerEmergencyLock}
        onCancel={() => setLockModalOpen(false)}
      />
    </>
  );
};

