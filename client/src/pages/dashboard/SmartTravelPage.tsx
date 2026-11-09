import React, { useState, useEffect } from 'react';
import {
  Plane,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Clock,
  Compass,
} from 'lucide-react';
import { travelApi, ITravelPlanItem } from '../../api/featureApis';

export const SmartTravelPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [travelModeEnabled, setTravelModeEnabled] = useState(false);
  const [activePlan, setActivePlan] = useState<ITravelPlanItem | null>(null);
  const [upcomingPlans, setUpcomingPlans] = useState<ITravelPlanItem[]>([]);
  const [pastPlans, setPastPlans] = useState<ITravelPlanItem[]>([]);
  const [policyNotice, setPolicyNotice] = useState<string>('');

  // Form modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [purpose, setPurpose] = useState('Business / Conference');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadTravelStatus();
  }, []);

  const loadTravelStatus = async () => {
    setLoading(true);
    try {
      const res = await travelApi.getStatus();
      if (res.success) {
        setTravelModeEnabled(res.travelModeEnabled);
        setActivePlan(res.activePlan || null);
        setUpcomingPlans(res.upcomingPlans || []);
        setPastPlans(res.pastPlans || []);
        setPolicyNotice(res.policyNotice);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationCity || !destinationCountry || !startDate || !endDate) {
      setFormError('Please fill in destination city, country, start date, and end date.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await travelApi.createPlan({
        destinationCity,
        destinationCountry,
        startDate,
        endDate,
        purpose,
        notes,
      });

      if (res.success) {
        setModalOpen(false);
        setDestinationCity('');
        setDestinationCountry('');
        setStartDate('');
        setEndDate('');
        setNotes('');
        loadTravelStatus();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to create travel plan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Are you sure you want to remove this travel itinerary?')) return;
    try {
      await travelApi.deletePlan(id);
      loadTravelStatus();
    } catch {}
  };

  const handleToggle = async (enabled: boolean) => {
    try {
      await travelApi.toggle(enabled);
      setTravelModeEnabled(enabled);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600/10 via-emerald-500/5 to-transparent border border-sky-500/20 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-600/20">
              <Plane className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Smart Travel Mode
                <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                    travelModeEnabled
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-700'
                  }`}
                >
                  {travelModeEnabled ? 'Active' : 'Standby'}
                </span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Declare upcoming itineraries to eliminate false-positive impossible travel alerts while abroad
              </p>
            </div>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Travel Itinerary</span>
          </button>
        </div>
      </div>

      {/* Security Guarantee Banner */}
      <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/40 text-xs text-sky-900 dark:text-sky-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold">Zero Authentication Bypass Guarantee</div>
          <p className="text-sky-800/90 dark:text-sky-300 leading-relaxed">
            {policyNotice ||
              'Smart Travel Mode informs the risk scoring engine of your foreign destination. Password verification, device checks, and OTP verification remain 100% active.'}
          </p>
        </div>
      </div>

      {/* Active Travel Status Hero Card */}
      {activePlan ? (
        <div className="bg-white dark:bg-cyber-surface border-2 border-emerald-500/40 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-cyber-border">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
                Currently Traveling
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Travel Mode State:</span>
              <button
                onClick={() => handleToggle(!travelModeEnabled)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  travelModeEnabled
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 dark:bg-cyber-card text-gray-600 dark:text-gray-400'
                }`}
              >
                {travelModeEnabled ? 'Enabled' : 'Paused'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-400">Destination</div>
              <div className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-4 h-4 text-emerald-500" />
                <span>
                  {activePlan.destinationCity}, {activePlan.destinationCountry}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400">Duration</div>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>
                  {new Date(activePlan.startDate).toLocaleDateString()} —{' '}
                  {new Date(activePlan.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400">Purpose</div>
              <div className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                {activePlan.purpose || 'Travel'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-2xl p-6 shadow-sm text-center space-y-2">
          <Compass className="w-8 h-8 text-gray-400 mx-auto" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            No Active Travel Window
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            You are currently monitored under standard geographic rules. If you are taking an international flight, add your trip above!
          </p>
        </div>
      )}

      {/* Upcoming & Past Travel Itineraries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming */}
        <div className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-500" />
            <span>Upcoming Travel Plans ({upcomingPlans.length})</span>
          </h3>

          {upcomingPlans.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-xs">No upcoming trips planned.</div>
          ) : (
            <div className="space-y-3">
              {upcomingPlans.map((plan) => (
                <div
                  key={plan._id}
                  className="p-3.5 rounded-xl bg-gray-50 dark:bg-cyber-card border border-gray-100 dark:border-cyber-border flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-sky-500" />
                      <span>
                        {plan.destinationCity}, {plan.destinationCountry}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {new Date(plan.startDate).toLocaleDateString()} to{' '}
                      {new Date(plan.endDate).toLocaleDateString()}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeletePlan(plan._id)}
                    className="text-gray-400 hover:text-rose-500 p-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past */}
        <div className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>Past Itinerary History ({pastPlans.length})</span>
          </h3>

          {pastPlans.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-xs">No past travel history.</div>
          ) : (
            <div className="space-y-2">
              {pastPlans.slice(0, 5).map((plan) => (
                <div
                  key={plan._id}
                  className="p-3 rounded-xl bg-gray-50/60 dark:bg-cyber-card/60 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {plan.destinationCity}, {plan.destinationCountry}
                    </span>
                    <span className="mx-2 text-gray-300">•</span>
                    <span className="text-gray-400">
                      {new Date(plan.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase text-gray-400">Completed</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Travel Plan Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-cyber-surface border border-gray-200 dark:border-cyber-border rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-cyber-border">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Plane className="w-5 h-5 text-sky-500" />
                <span>Declare New Travel Destination</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-600 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Destination City *
                  </label>
                  <input
                    type="text"
                    required
                    value={destinationCity}
                    onChange={(e) => setDestinationCity(e.target.value)}
                    placeholder="e.g. Dubai"
                    className="w-full bg-gray-50 dark:bg-cyber-card border border-gray-200 dark:border-cyber-border rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Destination Country *
                  </label>
                  <input
                    type="text"
                    required
                    value={destinationCountry}
                    onChange={(e) => setDestinationCountry(e.target.value)}
                    placeholder="e.g. United Arab Emirates"
                    className="w-full bg-gray-50 dark:bg-cyber-card border border-gray-200 dark:border-cyber-border rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-cyber-card border border-gray-200 dark:border-cyber-border rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-cyber-card border border-gray-200 dark:border-cyber-border rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Purpose of Travel
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Business Conference, Vacation"
                  className="w-full bg-gray-50 dark:bg-cyber-card border border-gray-200 dark:border-cyber-border rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Flight layovers or roaming cellular provider"
                  className="w-full bg-gray-50 dark:bg-cyber-card border border-gray-200 dark:border-cyber-border rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-cyber-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-cyber-card hover:bg-gray-200 dark:hover:bg-cyber-border text-gray-700 dark:text-gray-300 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Add Itinerary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

