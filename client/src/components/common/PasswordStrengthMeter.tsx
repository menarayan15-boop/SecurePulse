import React from 'react';
import { Check, X } from 'lucide-react';

interface Props {
  password: string;
}

export const PasswordStrengthMeter: React.FC<Props> = ({ password }) => {
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const criteria = [
    { label: 'At least 8 characters', met: hasMinLength },
    { label: 'Uppercase letter (A-Z)', met: hasUpper },
    { label: 'Lowercase letter (a-z)', met: hasLower },
    { label: 'Number (0-9)', met: hasNumber },
    { label: 'Special symbol (!@#$%^&*)', met: hasSpecial },
  ];

  const score = criteria.filter((c) => c.met).length;

  let strengthLabel = 'Too Weak';
  let colorClass = 'bg-gray-300 dark:bg-gray-700';

  if (score >= 5) {
    strengthLabel = 'Strong';
    colorClass = 'bg-emerald-500';
  } else if (score >= 4) {
    strengthLabel = 'Good';
    colorClass = 'bg-teal-500';
  } else if (score >= 3) {
    strengthLabel = 'Fair';
    colorClass = 'bg-amber-500';
  } else if (score > 0) {
    strengthLabel = 'Weak';
    colorClass = 'bg-rose-500';
  }

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">Password Strength</span>
        <span className="font-semibold text-gray-700 dark:text-gray-300">{strengthLabel}</span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 h-1.5">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`rounded-full transition-colors duration-200 ${
              score >= level ? colorClass : 'bg-gray-200 dark:bg-gray-800'
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 text-xs text-gray-600 dark:text-gray-400">
        {criteria.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {c.met ? (
              <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            )}
            <span className={c.met ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

