import React, { useEffect, useState, useCallback } from 'react';
import {
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  XCircle,
  AlertTriangle,
  MapPin,
  Calendar,
  Layers,
  Laptop,
} from 'lucide-react';
import { activityApi } from '../../api/client';
import { ILoginRecord } from '../../types';
import { SecurityBadge } from '../../components/common/SecurityBadge';
import { LoginMap } from '../../components/map/LoginMap';

export const LoginActivityPage: React.FC = () => {
  const [records, setRecords] = useState<ILoginRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected record for details modal
  const [selectedRecord, setSelectedRecord] = useState<ILoginRecord | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await activityApi.getHistory({
        page: currentPage,
        limit: 10,
        status: statusFilter,
        deviceType: deviceFilter,
        search: searchQuery,
        startDate,
        endDate,
      });

      if (res.success) {
        setRecords(res.data);
        setTotalCount(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
      }
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, deviceFilter, searchQuery, startDate, endDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await activityApi.exportCsv();
    } catch {
      alert('Failed to download CSV');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100">
            Login Activity Telemetry
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Comprehensive audit log of every connection attempt, device fingerprint, and location analysis.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={isExporting}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-cyber-card transition-colors shadow-sm self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-emerald-500" />
          <span>{isExporting ? 'Generating CSV...' : 'Export Audit CSV'}</span>
        </button>
      </div>

      {/* Interactive Map */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            Geographic Incident Distribution
          </span>
          <span>Showing telemetry points for current results</span>
        </div>
        <LoginMap logins={records} onSelectLogin={(rec) => setSelectedRecord(rec)} />
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Query */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search IP, City, Browser..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-cyber-border bg-gray-50 dark:bg-cyber-card text-xs text-gray-900 dark:text-gray-100 focus:border-emerald-500 outline-none"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-cyber-border bg-gray-50 dark:bg-cyber-card text-xs text-gray-900 dark:text-gray-100 focus:border-emerald-500 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="success">Successful Logins</option>
              <option value="failed">Failed Logins</option>
              <option value="otp_required">OTP Challenge Triggered</option>
            </select>
          </div>

          {/* Device Type Filter */}
          <div>
            <select
              value={deviceFilter}
              onChange={(e) => {
                setDeviceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-cyber-border bg-gray-50 dark:bg-cyber-card text-xs text-gray-900 dark:text-gray-100 focus:border-emerald-500 outline-none"
            >
              <option value="all">All Device Classes</option>
              <option value="desktop">Desktop Only</option>
              <option value="mobile">Mobile Devices</option>
              <option value="tablet">Tablets</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setStatusFilter('all');
                setDeviceFilter('all');
                setSearchQuery('');
                setStartDate('');
                setEndDate('');
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-cyber-border text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-cyber-card transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Login Activity Table / Mobile Cards */}
      <div className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-gray-400 animate-pulse">
            Loading activity log records...
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400">
            No login activity matches the selected criteria.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-cyber-card/70 border-b border-gray-200 dark:border-cyber-border text-gray-500 dark:text-gray-400 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Event Status</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Client IP Address</th>
                    <th className="py-3 px-4">Browser & OS</th>
                    <th className="py-3 px-4">Geographic Node</th>
                    <th className="py-3 px-4">Risk Telemetry</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-cyber-border">
                  {records.map((item) => (
                    <tr
                      key={item._id}
                      className="hover:bg-gray-50/60 dark:hover:bg-cyber-card/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <SecurityBadge type="status" value={item.loginStatus} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {new Date(item.loginTimestamp).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {new Date(item.loginTimestamp).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px]">
                        {item.ipAddress}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {item.browserName} {item.browserVersion ? `v${item.browserVersion.split('.')[0]}` : ''}
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                          <span className="capitalize">{item.deviceType}</span>
                          <span>•</span>
                          <span>{item.operatingSystem}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {item.city}, {item.country}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Approx. {item.approximateCoordinates?.lat}, {item.approximateCoordinates?.lng}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs">
                            {item.riskScore}
                          </span>
                          {item.isNewDevice && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-semibold">
                              New Device
                            </span>
                          )}
                          {item.isTrustedDevice && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold">
                              Trusted
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedRecord(item)}
                          className="px-2.5 py-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold text-xs"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-gray-100 dark:divide-cyber-border">
              {records.map((item) => (
                <div key={item._id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <SecurityBadge type="status" value={item.loginStatus} />
                    <span className="text-[11px] text-gray-400">
                      {new Date(item.loginTimestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {item.browserName} on {item.operatingSystem}
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between font-mono">
                    <span>{item.ipAddress}</span>
                    <span>{item.city}, {item.country}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-500">
                      Risk Score: <strong>{item.riskScore}</strong>
                    </span>
                    <button
                      onClick={() => setSelectedRecord(item)}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Inspect Telemetry →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-gray-100 dark:border-cyber-border flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div>
                Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalCount} total entries)
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-cyber-border disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-cyber-card transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-cyber-border disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-cyber-card transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Record Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-cyber-border">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Login Telemetry Inspection
              </h3>
              <SecurityBadge type="status" value={selectedRecord.loginStatus} />
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gray-50 dark:bg-cyber-card border border-gray-100 dark:border-cyber-border">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Public IP</span>
                  <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
                    {selectedRecord.ipAddress}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Timestamp</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {new Date(selectedRecord.loginTimestamp).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Browser & Engine</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {selectedRecord.browserName} {selectedRecord.browserVersion} ({selectedRecord.browserEngine || 'N/A'})
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">OS & Device Class</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {selectedRecord.operatingSystem} • {selectedRecord.deviceType}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Location</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {selectedRecord.city}, {selectedRecord.state}, {selectedRecord.country}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Risk Assessment</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    Score {selectedRecord.riskScore}/100
                  </span>
                </div>
              </div>

              {selectedRecord.failureReason && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300">
                  <strong className="block text-[11px] font-bold">Failure Reason:</strong>
                  <span>{selectedRecord.failureReason}</span>
                </div>
              )}

              {selectedRecord.riskFactors && selectedRecord.riskFactors.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300">
                  <strong className="block text-[11px] font-bold mb-1">Risk Factors Detected:</strong>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {selectedRecord.riskFactors.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-cyber-card text-gray-800 dark:text-gray-200 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
