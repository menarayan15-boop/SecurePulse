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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className={`p-3 rounded-xl ${
              isDestructive
                ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-cyber-border bg-gray-50 dark:bg-cyber-card text-gray-900 dark:text-gray-100 text-sm focus:border-rose-500 outline-none font-mono"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-300 dark:border-cyber-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-cyber-card transition-colors"
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
                ? 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

