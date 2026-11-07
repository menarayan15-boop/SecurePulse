import React from 'react';
import { ShieldCheck, AlertTriangle, XCircle, ShieldAlert, Monitor, Smartphone, Tablet } from 'lucide-react';

interface BadgeProps {
  type: 'status' | 'risk' | 'device' | 'otp';
  value: string;
  size?: 'sm' | 'md';
}

export const SecurityBadge: React.FC<BadgeProps> = ({ type, value, size = 'sm' }) => {
  const isSmall = size === 'sm';
  const paddingClass = isSmall ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  if (type === 'risk') {
    const v = value.toLowerCase();
    if (v === 'low') {
      return (
        <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 ${paddingClass}`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          Low Risk
        </span>
      );
    }
    if (v === 'medium') {
      return (
        <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 ${paddingClass}`}>
          <AlertTriangle className="w-3.5 h-3.5" />
          Medium Risk
        </span>
      );
    }
    if (v === 'high') {
      return (
        <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50 ${paddingClass}`}>
          <AlertTriangle className="w-3.5 h-3.5" />
          High Risk
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 ${paddingClass}`}>
        <ShieldAlert className="w-3.5 h-3.5" />
        Critical Risk
      </span>
    );
  }

  if (type === 'status') {
    const v = value.toLowerCase();
    if (v === 'success') {
      return (
        <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 ${paddingClass}`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          Successful
        </span>
      );
    }
    if (v === 'otp_required') {
      return (
        <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 ${paddingClass}`}>
          <AlertTriangle className="w-3.5 h-3.5" />
          OTP Challenge
        </span>
      );
    }
    if (v === 'blocked') {
      return (
        <span className={`inline-flex items-center gap-1 font-semibold rounded-full bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800/50 ${paddingClass}`}>
          <XCircle className="w-3.5 h-3.5" />
          Blocked
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 ${paddingClass}`}>
        <XCircle className="w-3.5 h-3.5" />
        Failed
      </span>
    );
  }

  if (type === 'device') {
    const v = value.toLowerCase();
    let Icon = Monitor;
    if (v === 'mobile') Icon = Smartphone;
    if (v === 'tablet') Icon = Tablet;

    return (
      <span className={`inline-flex items-center gap-1 font-medium rounded-md bg-gray-100 text-gray-700 dark:bg-cyber-surface dark:text-gray-300 border border-gray-200 dark:border-cyber-border ${paddingClass}`}>
        <Icon className="w-3.5 h-3.5" />
        <span className="capitalize">{value}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 ${paddingClass}`}>
      {value}
    </span>
  );
};

