import React, { useEffect, useState } from 'react';
import {
  KeyRound,
  Fingerprint,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Laptop,
  Smartphone,
  RefreshCw,
  Info,
} from 'lucide-react';
import { passkeyApi } from '../../api/client';
import { IPasskeyItem } from '../../types';

// Helper: Base64URL to Uint8Array
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper: ArrayBuffer to Base64URL
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export const PasskeysPage: React.FC = () => {
  const [passkeys, setPasskeys] = useState<IPasskeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [activePasskey, setActivePasskey] = useState<IPasskeyItem | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.PublicKeyCredential) {
      setIsWebAuthnSupported(false);
    }
    fetchPasskeys();
  }, []);

  const fetchPasskeys = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await passkeyApi.list();
      if (res.success) {
        setPasskeys(res.passkeys || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve registered passkeys.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterPasskey = async () => {
    setIsRegistering(true);
    setError(null);
    setSuccess(null);

    try {
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn / Passkeys are not supported on this browser or platform.');
      }

      // 1. Get options from server
      const optRes = await passkeyApi.getRegisterOptions();
      if (!optRes.success || !optRes.options) {
        throw new Error('Failed to retrieve passkey challenge.');
      }

      const options = optRes.options;

      // 2. Decode options for browser navigator.credentials.create
      const publicKeyCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: base64UrlToUint8Array(options.challenge) as any,
        rp: options.rp,
        user: {
          ...options.user,
          id: base64UrlToUint8Array(options.user.id) as any,
        },
        pubKeyCredParams: options.pubKeyCredParams,
        timeout: options.timeout || 60000,
        attestation: options.attestation || 'none',
        authenticatorSelection: options.authenticatorSelection,
      };

      // 3. Prompt user for biometrics / hardware token
      const credential = (await navigator.credentials.create({
        publicKey: publicKeyCreationOptions,
      })) as PublicKeyCredential;

      if (!credential) {
        throw new Error('No credential was returned by your authenticator.');
      }

      const rawId = arrayBufferToBase64Url(credential.rawId);
      const response = credential.response as AuthenticatorAttestationResponse;

      const registrationPayload = {
        id: credential.id,
        rawId,
        type: credential.type,
        response: {
          clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
          attestationObject: arrayBufferToBase64Url(response.attestationObject),
          transports: (response as any).getTransports ? (response as any).getTransports() : ['internal', 'hybrid'],
        },
      };

      // Prompt friendly name
      const passkeyName =
        window.prompt('Enter a recognizable name for this passkey:', 'My Biometric Key') || 'Passkey Device';

      // 4. Send to server for registration
      const verifyRes = await passkeyApi.register(registrationPayload, passkeyName);
      if (verifyRes.success) {
        setSuccess('Passkey registered successfully! You can now use biometric sign-in.');
        fetchPasskeys();
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Passkey registration was cancelled or timed out.');
      } else {
        setError(err.message || 'Passkey registration failed.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this passkey?')) return;
    try {
      const res = await passkeyApi.delete(id);
      if (res.success) {
        setSuccess('Passkey removed.');
        setPasskeys((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove passkey.');
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePasskey || !renameInput.trim()) return;

    try {
      const res = await passkeyApi.rename(activePasskey.id, renameInput.trim());
      if (res.success) {
        setSuccess('Passkey renamed.');
        setPasskeys((prev) =>
          prev.map((p) => (p.id === activePasskey.id ? { ...p, name: renameInput.trim() } : p))
        );
        setRenameModalOpen(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to rename passkey.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <Fingerprint className="w-3.5 h-3.5" />
              WebAuthn / FIDO2 Standard
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            Passkeys & Biometric Authentication
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sign in securely using Touch ID, Face ID, Windows Hello, or hardware security keys without passwords.
          </p>
        </div>

        <button
          onClick={handleRegisterPasskey}
          disabled={isRegistering || !isWebAuthnSupported}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>{isRegistering ? 'Registering...' : 'Register New Passkey'}</span>
        </button>
      </div>

      {!isWebAuthnSupported && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-500" />
          <span>
            Your current browser does not support WebAuthn passkeys. Please use a modern browser such as Chrome, Safari, or Edge.
          </span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Info Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-cyber-surface to-cyber-surface border border-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Zero Biometrics Sent to Server
            </h3>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 max-w-xl">
            Passkeys use public-key cryptography. Your fingerprints and face scans remain stored strictly inside your device's Secure Enclave.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
          <Fingerprint className="w-4 h-4" />
          <span>Touch ID & Face ID Ready</span>
        </div>
      </div>

      {/* Registered Passkeys List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-emerald-500" />
          Active Registered Passkeys ({passkeys.length})
        </h2>

        {passkeys.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-cyber-card text-gray-400 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
              No Passkeys Registered Yet
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-5">
              Add a passkey to experience instant, passwordless sign-ins using your device's biometric sensor.
            </p>
            <button
              onClick={handleRegisterPasskey}
              disabled={isRegistering || !isWebAuthnSupported}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Register Passkey Now</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {passkeys.map((p) => (
              <div
                key={p.id}
                className="p-5 rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                    <Fingerprint className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {p.name}
                    </h3>
                    <p className="text-[11px] text-gray-400 font-mono truncate max-w-xs">
                      ID: {p.credentialId.slice(0, 16)}...
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 pt-1">
                      <span>Created: {new Date(p.createdAt).toLocaleDateString()}</span>
                      {p.lastUsedAt && (
                        <span>Last used: {new Date(p.lastUsedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setActivePasskey(p);
                      setRenameInput(p.name);
                      setRenameModalOpen(true);
                    }}
                    title="Rename Passkey"
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-cyber-card transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    title="Revoke Passkey"
                    className="p-2 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rename Dialog Modal */}
      {renameModalOpen && activePasskey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Rename Passkey
            </h3>
            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-cyber-border bg-gray-50 dark:bg-cyber-card text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="e.g. Work MacBook Touch ID"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-cyber-card text-xs font-semibold text-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
