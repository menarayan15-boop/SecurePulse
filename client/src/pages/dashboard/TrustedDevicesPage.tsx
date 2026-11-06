import React, { useEffect, useState, useCallback } from 'react';
import { Laptop, Trash2, ShieldCheck, CheckCircle2, Clock, AlertTriangle, Smartphone, Tablet } from 'lucide-react';
import { deviceApi } from '../../api/client';
import { ITrustedDevice } from '../../types';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';

export const TrustedDevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<ITrustedDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals state
  const [deviceToDelete, setDeviceToDelete] = useState<ITrustedDevice | null>(null);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);

  const fetchDevices = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await deviceApi.getDevices();
      if (res.success) {
        setDevices(res.data);
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleTrustCurrent = async () => {
    try {
      const res = await deviceApi.trustCurrentDevice();
      if (res.success) {
        setActionSuccess('Current browser marked as trusted for 30 days.');
        fetchDevices();
        setTimeout(() => setActionSuccess(null), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to trust current device.');
    }
  };

  const handleRemoveDevice = async () => {
    if (!deviceToDelete) return;
    try {
      await deviceApi.removeDevice(deviceToDelete.id);
      setActionSuccess(`Trust revoked for ${deviceToDelete.deviceName}.`);
      setDeviceToDelete(null);
      fetchDevices();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to revoke device.');
    }
  };

  const handleRevokeAll = async () => {
    try {
      await deviceApi.removeAllDevices();
      setActionSuccess('All trusted devices have been revoked.');
      setRevokeAllOpen(false);
      fetchDevices();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to revoke all devices.');
    }
  };

  const isCurrentDeviceTrusted = devices.some((d) => d.isCurrent);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100">
            Trusted Devices Ecosystem
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Devices registered with long-term trust tokens to bypass routine OTP challenges.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {!isCurrentDeviceTrusted && (
            <button
              onClick={handleTrustCurrent}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm shadow-emerald-600/20"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Trust This Device</span>
            </button>
          )}

          {devices.length > 0 && (
            <button
              onClick={() => setRevokeAllOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 font-semibold text-xs hover:bg-rose-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Revoke All</span>
            </button>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Devices Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-xs text-gray-400 animate-pulse">
          Loading trusted devices...
        </div>
      ) : devices.length === 0 ? (
        <div className="py-20 text-center rounded-3xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm p-8">
          <Laptop className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
            No Trusted Devices Registered
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            When you complete an OTP challenge and choose &quot;Trust this device&quot;, your browser will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map((device) => {
            const isMobile = device.deviceType?.toLowerCase() === 'mobile';
            const isTablet = device.deviceType?.toLowerCase() === 'tablet';
            const Icon = isMobile ? Smartphone : isTablet ? Tablet : Laptop;

            return (
              <div
                key={device.id}
                className={`p-5 rounded-2xl bg-white dark:bg-cyber-surface border transition-all duration-200 shadow-sm relative ${
                  device.isCurrent
                    ? 'border-emerald-500/80 ring-1 ring-emerald-500/20'
                    : 'border-gray-200 dark:border-cyber-border'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-3 rounded-xl ${
                        device.isCurrent
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                          : 'bg-gray-100 dark:bg-cyber-card text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                          {device.deviceName}
                        </h3>
                        {device.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {device.browser} • {device.operatingSystem}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setDeviceToDelete(device)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Revoke trust"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-cyber-border grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px]">Location</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300 truncate block">
                      {device.city}, {device.country}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">IP Address</span>
                    <span className="font-mono text-gray-700 dark:text-gray-300 truncate block">
                      {device.ipAddress}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">First Trusted</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {new Date(device.firstTrustedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Trust Expiry</span>
                    <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-500" />
                      {new Date(device.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Single Device Modal */}
      <ConfirmationModal
        isOpen={Boolean(deviceToDelete)}
        title="Revoke Trusted Device?"
        description={`Are you sure you want to revoke trust for "${deviceToDelete?.deviceName}"? The next login from this browser will require a one-time passcode.`}
        confirmText="Revoke Trust"
        isDestructive={true}
        onConfirm={handleRemoveDevice}
        onCancel={() => setDeviceToDelete(null)}
      />

      {/* Revoke All Modal */}
      <ConfirmationModal
        isOpen={revokeAllOpen}
        title="Revoke All Trusted Devices?"
        description="This will instantly invalidate trust tokens across all registered devices. Any upcoming login from any browser will undergo full environment risk analysis and OTP challenge."
        confirmText="Revoke All Devices"
        isDestructive={true}
        onConfirm={handleRevokeAll}
        onCancel={() => setRevokeAllOpen(false)}
      />
    </div>
  );
};
