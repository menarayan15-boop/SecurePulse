import React, { useState } from 'react';
import { AlertOctagon, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  requirePhrase?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<Props> = ({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  requirePhrase,
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  const [typedPhrase, setTypedPhrase] = useState('');

  if (!isOpen) return null;

  const canConfirm = !requirePhrase || typedPhrase.trim() === requirePhrase;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="glass-modal max-w-md w-full p-6 sm:p-7 rounded-3xl border border-gray-200/80 dark:border-white/10 shadow-2xl relative">
        <button
          onClick={onCancel}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className={`p-3 rounded-2xl ${
              isDestructive
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
            }`}
          >
            <AlertOctagon className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          {description}
        </p>

        {requirePhrase && (
          <div className="mb-5 space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Type <strong className="text-rose-600 dark:text-rose-400 font-mono">{requirePhrase}</strong> to proceed:
            </label>
            <input
              type="text"
              value={typedPhrase}
              onChange={(e) => setTypedPhrase(e.target.value)}
              placeholder={requirePhrase}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-white/50 dark:bg-white/[0.04] backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm focus:border-rose-500 outline-none font-mono transition-all"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-white/[0.05] transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              onConfirm();
              setTypedPhrase('');
            }}
            className={`px-4 py-2 text-sm font-semibold rounded-xl text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/25'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

