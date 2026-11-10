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
  Edit2,
  Eye,
  X,
  Info,
  Check,
} from 'lucide-react';
import { travelApi, ITravelPlanItem } from '../../api/featureApis';

// Helper to resolve country flag emojis
function getCountryFlag(country: string): string {
  const c = country.trim().toLowerCase();
  const flagMap: Record<string, string> = {
    'united states': '🇺🇸',
    'usa': '🇺🇸',
    'us': '🇺🇸',
    'united kingdom': '🇬🇧',
    'uk': '🇬🇧',
    'india': '🇮🇳',
    'united arab emirates': '🇦🇪',
    'uae': '🇦🇪',
    'dubai': '🇦🇪',
    'singapore': '🇸🇬',
    'germany': '🇩🇪',
    'france': '🇫🇷',
    'japan': '🇯🇵',
    'canada': '🇨🇦',
    'australia': '🇦🇺',
    'switzerland': '🇨🇭',
    'netherlands': '🇳🇱',
    'spain': '🇪🇸',
    'italy': '🇮🇹',
    'thailand': '🇹🇭',
    'malaysia': '🇲🇾',
    'indonesia': '🇮🇩',
    'south korea': '🇰🇷',
    'china': '🇨🇳',
    'brazil': '🇧🇷',
  };
  return flagMap[c] || '🌐';
}

// Helper to compute human-friendly relative days
function formatTripTimeline(startDateStr: string, endDateStr: string, isActive: boolean): string {
  const now = new Date();
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  end.setHours(23, 59, 59, 999);

  if (isActive) {
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Ends today';
    if (diffDays === 1) return '1 day remaining';
    return `${diffDays} days remaining`;
  }

  // Upcoming
  if (start.getTime() > now.getTime()) {
    const diffTime = start.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Starts today';
    if (diffDays === 1) return 'Starts tomorrow';
    return `Starts in ${diffDays} days`;
  }

  // Past
  return 'Trip completed';
}

export const SmartTravelPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [travelModeEnabled, setTravelModeEnabled] = useState(false);
  const [activePlan, setActivePlan] = useState<ITravelPlanItem | null>(null);
  const [upcomingPlans, setUpcomingPlans] = useState<ITravelPlanItem[]>([]);
  const [pastPlans, setPastPlans] = useState<ITravelPlanItem[]>([]);
  const [policyNotice, setPolicyNotice] = useState<string>('');

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [purpose, setPurpose] = useState('Business / Conference');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Details View Modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

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

  const openCreateModal = () => {
    setEditingPlanId(null);
    setDestinationCity('');
    setDestinationCountry('');
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
    setPurpose('Business / Conference');
    setNotes('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (plan: ITravelPlanItem) => {
    setEditingPlanId(plan._id);
    setDestinationCity(plan.destinationCity);
    setDestinationCountry(plan.destinationCountry);
    setStartDate(new Date(plan.startDate).toISOString().split('T')[0]);
    setEndDate(new Date(plan.endDate).toISOString().split('T')[0]);
    setPurpose(plan.purpose || 'Business / Conference');
    setNotes(plan.notes || '');
    setFormError(null);
    setDetailsModalOpen(false);
    setModalOpen(true);
  };

  const openDetailsModal = async (plan: ITravelPlanItem) => {
    setSelectedPlanDetails({ plan, relatedLogins: [] });
    setDetailsModalOpen(true);
    setLoadingDetails(true);

    try {
      const res = await travelApi.getPlanDetails(plan._id);
      if (res.success) {
        setSelectedPlanDetails({
          plan: res.plan,
          relatedLogins: res.relatedLogins || [],
        });
      }
    } catch {
      // Fallback to basic plan
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationCity.trim() || !destinationCountry.trim() || !startDate || !endDate) {
      setFormError('Destination city, country, departure date, and return date are all required.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      setFormError('Return date must be on or after the departure date.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (editingPlanId) {
        // Edit existing plan
        const res = await travelApi.updatePlan(editingPlanId, {
          destinationCity: destinationCity.trim(),
          destinationCountry: destinationCountry.trim(),
          startDate,
          endDate,
          purpose: purpose.trim(),
          notes: notes.trim(),
        });

        if (res.success) {
          setModalOpen(false);
          setSuccessToast('Travel plan updated successfully.');
          setTimeout(() => setSuccessToast(null), 3500);
          loadTravelStatus();
        }
      } else {
        // Create new plan
        const res = await travelApi.createPlan({
          destinationCity: destinationCity.trim(),
          destinationCountry: destinationCountry.trim(),
          startDate,
          endDate,
          purpose: purpose.trim(),
          notes: notes.trim(),
        });

        if (res.success) {
          setModalOpen(false);
          setSuccessToast('New travel plan saved successfully.');
          setTimeout(() => setSuccessToast(null), 3500);
          loadTravelStatus();
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save travel plan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Are you sure you want to cancel and remove this travel plan?')) return;
    try {
      await travelApi.deletePlan(id);
      setDetailsModalOpen(false);
      setSuccessToast('Travel plan removed.');
      setTimeout(() => setSuccessToast(null), 3000);
      loadTravelStatus();
    } catch (err: any) {
      alert(err.message || 'Failed to remove plan.');
    }
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
    <div className="w-full max-w-full min-w-0 space-y-5 box-border">
      {/* 1. Page Heading Bar with Prominent "+ Add Travel Plan" Button */}
      <div className="w-full max-w-full min-w-0 box-border glass-card-static bg-gradient-to-r from-sky-600/15 via-emerald-500/10 to-transparent border border-sky-500/25 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full min-w-0">
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-600/20 flex-shrink-0">
              <Plane className="w-5 h-5 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                  Smart Travel Mode
                </h1>
                <span
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border whitespace-nowrap ${
                    travelModeEnabled
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-700'
                  }`}
                >
                  {travelModeEnabled ? '● Active' : 'Standby'}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 break-words">
                Declare international itineraries to contextualize logins and eliminate false-positive location alerts
              </p>
            </div>
          </div>

          {/* Prominent "+ Add Travel Plan" Button */}
          <button
            type="button"
            onClick={openCreateModal}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/25 flex-shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Travel Plan</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="w-full p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 2. Security Guarantee Information Banner */}
      <div className="w-full box-border p-3.5 sm:p-4 rounded-xl bg-sky-500/10 dark:bg-sky-950/30 border border-sky-500/25 text-xs text-sky-900 dark:text-sky-200 backdrop-blur-md flex items-start gap-3 shadow-sm">
        <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5 min-w-0 flex-1 leading-relaxed">
          <span className="font-bold">Zero Authentication Bypass Guarantee: </span>
          <span className="text-sky-800 dark:text-sky-300">
            {policyNotice ||
              'Smart Travel Mode provides geographic context to explain location changes. Email OTP, password checks, device authentication, and high-risk security evaluations remain 100% active at all times.'}
          </span>
        </div>
      </div>

      {/* 3. Active Travel Window Section */}
      <div className="w-full space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">
          Active Travel Window
        </div>

        {activePlan ? (
          /* Active Travel Window: Visually distinct & compact glass card */
          <div className="w-full box-border glass-card border-2 border-emerald-500/50 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
                  Currently Traveling • {formatTripTimeline(activePlan.startDate, activePlan.endDate, true)}
                </span>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs text-gray-500">Travel Monitoring:</span>
                <button
                  type="button"
                  onClick={() => handleToggle(!travelModeEnabled)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    travelModeEnabled
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {travelModeEnabled ? 'Enabled' : 'Paused'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <div className="text-[11px] text-gray-400">Destination</div>
                <div className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 mt-0.5">
                  <span className="text-lg">{getCountryFlag(activePlan.destinationCountry)}</span>
                  <span className="truncate">
                    {activePlan.destinationCity}, {activePlan.destinationCountry}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-gray-400">Duration & Dates</div>
                <div className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span>
                    {new Date(activePlan.startDate).toLocaleDateString()} —{' '}
                    {new Date(activePlan.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-gray-400">Purpose & Notes</div>
                <div className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 truncate">
                  {activePlan.purpose || 'Travel'} {activePlan.notes ? `• ${activePlan.notes}` : ''}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-cyber-border">
              <button
                type="button"
                onClick={() => openDetailsModal(activePlan)}
                className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-cyber-card hover:bg-gray-200 dark:hover:bg-cyber-border text-gray-700 dark:text-gray-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Details</span>
              </button>

              <button
                type="button"
                onClick={() => openEditModal(activePlan)}
                className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-cyber-card hover:bg-gray-200 dark:hover:bg-cyber-border text-gray-700 dark:text-gray-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeletePlan(activePlan._id)}
                className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Cancel Trip</span>
              </button>
            </div>
          </div>
        ) : (
          /* Active Travel Window: Compact, proportioned empty state */
          <div className="w-full box-border glass-card-static border border-gray-200/70 dark:border-white/10 rounded-2xl p-5 text-center space-y-3 shadow-lg">
            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/10 flex items-center justify-center mx-auto text-gray-500 dark:text-gray-400">
              <Compass className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                No Active Travel Window
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                Planning a trip? Add your destination and travel dates to help SecurePulse understand your expected location changes.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={openCreateModal}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Your First Trip</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Upcoming Travel Plans & 5. Past Itinerary History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full min-w-0">
        {/* Upcoming Travel Plans Card */}
        <div className="w-full box-border glass-card-static border border-gray-200/70 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/10">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-500 flex-shrink-0" />
                <span>Upcoming Travel Plans ({upcomingPlans.length})</span>
              </h3>
              <button
                type="button"
                onClick={openCreateModal}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>New</span>
              </button>
            </div>

            {upcomingPlans.length === 0 ? (
              <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-xs space-y-1">
                <p>No upcoming trips planned.</p>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium inline-block"
                >
                  Schedule your next trip
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingPlans.map((plan) => (
                  <div
                    key={plan._id}
                    className="p-3 rounded-xl bg-gray-50 dark:bg-cyber-card border border-gray-100 dark:border-cyber-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-500/30 transition-all cursor-pointer"
                    onClick={() => openDetailsModal(plan)}
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                        <span className="text-base">{getCountryFlag(plan.destinationCountry)}</span>
                        <span className="truncate">
                          {plan.destinationCity}, {plan.destinationCountry}
                        </span>
                        <span className="px-2 py-0.2 text-[10px] font-semibold rounded bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 ml-1">
                          {formatTripTimeline(plan.startDate, plan.endDate, false)}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(plan.startDate).toLocaleDateString()} to{' '}
                          {new Date(plan.endDate).toLocaleDateString()}
                        </span>
                        {plan.purpose && (
                          <>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <span className="truncate">{plan.purpose}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openEditModal(plan)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-cyber-border transition-colors"
                        title="Edit Plan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlan(plan._id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Plan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Past Itinerary History Card */}
        <div className="w-full box-border glass-card-static border border-gray-200/70 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/10">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>Past Itinerary History ({pastPlans.length})</span>
              </h3>
            </div>

            {pastPlans.length === 0 ? (
              <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-xs">
                No past travel history yet.
              </div>
            ) : (
              <div className="space-y-2">
                {pastPlans.slice(0, 6).map((plan) => (
                  <div
                    key={plan._id}
                    onClick={() => openDetailsModal(plan)}
                    className="p-2.5 rounded-xl bg-white/40 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/5 text-xs flex items-center justify-between gap-3 hover:bg-white/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <span className="text-sm">{getCountryFlag(plan.destinationCountry)}</span>
                      <div className="truncate">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {plan.destinationCity}, {plan.destinationCountry}
                        </span>
                        <span className="text-[11px] text-gray-400 ml-2">
                          ({new Date(plan.startDate).toLocaleDateString()} — {new Date(plan.endDate).toLocaleDateString()})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-gray-200/60 dark:bg-white/[0.08] text-gray-600 dark:text-gray-400">
                        Completed
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeletePlan(plan._id)}
                        className="text-gray-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Travel Plan Details View Modal */}
      {detailsModalOpen && selectedPlanDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="glass-modal border border-gray-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 my-8 relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{getCountryFlag(selectedPlanDetails.plan.destinationCountry)}</span>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {selectedPlanDetails.plan.destinationCity}, {selectedPlanDetails.plan.destinationCountry}
                  </h3>
                  <div className="text-[11px] text-gray-500">
                    {selectedPlanDetails.plan.isActive ? 'Active Window' : 'Trip Details'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gray-50 dark:bg-cyber-card border border-gray-100 dark:border-cyber-border">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Departure Date</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {new Date(selectedPlanDetails.plan.startDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Return Date</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {new Date(selectedPlanDetails.plan.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {selectedPlanDetails.plan.purpose && (
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold mb-0.5">Purpose</span>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">
                    {selectedPlanDetails.plan.purpose}
                  </p>
                </div>
              )}

              {selectedPlanDetails.plan.notes && (
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold mb-0.5">Travel Notes</span>
                  <p className="text-gray-600 dark:text-gray-400 italic bg-gray-50 dark:bg-cyber-card p-2.5 rounded-lg border border-gray-100 dark:border-cyber-border">
                    {selectedPlanDetails.plan.notes}
                  </p>
                </div>
              )}

              {/* Related Login Activity Telemetry */}
              <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-cyber-border">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">
                  Matched Login Activity Telemetry
                </span>

                {loadingDetails ? (
                  <div className="flex items-center gap-2 text-gray-500 py-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Checking authentication logs...</span>
                  </div>
                ) : selectedPlanDetails.relatedLogins && selectedPlanDetails.relatedLogins.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {selectedPlanDetails.relatedLogins.map((login: any) => (
                      <div
                        key={login._id}
                        className="p-2 rounded-lg bg-gray-50 dark:bg-cyber-card text-[11px] flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {login.city}, {login.country}
                          </span>
                          <span className="text-gray-400 ml-1.5 font-mono text-[10px]">
                            ({login.browser} on {login.os})
                          </span>
                        </div>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Score {login.riskScore}/100
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-gray-50/70 dark:bg-cyber-card/60 text-[11px] text-gray-500 text-center">
                    No sign-ins recorded from this destination yet. Legitimate logins during this window will be contextualized.
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-cyber-border">
              <button
                type="button"
                onClick={() => handleDeletePlan(selectedPlanDetails.plan._id)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                Delete Plan
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(selectedPlanDetails.plan)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                >
                  Edit Itinerary
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Travel Plan Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="glass-modal border border-gray-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 my-8 relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Plane className="w-5 h-5 text-sky-500" />
                <span>{editingPlanId ? 'Edit Travel Plan' : 'Add Travel Plan'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-3.5 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Destination Country *
                  </label>
                  <input
                    type="text"
                    required
                    value={destinationCountry}
                    onChange={(e) => setDestinationCountry(e.target.value)}
                    placeholder="e.g. United Arab Emirates, Japan"
                    className="w-full bg-white/50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-500/60 transition-all"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Destination City *
                  </label>
                  <input
                    type="text"
                    required
                    value={destinationCity}
                    onChange={(e) => setDestinationCity(e.target.value)}
                    placeholder="e.g. Dubai, Tokyo"
                    className="w-full bg-white/50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-500/60 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Departure Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white/50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-500/60 transition-all"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Return Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white/50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-500/60 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Purpose of Travel
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Business Conference, Tech Summit, Vacation"
                  className="w-full bg-white/50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-500/60 transition-all"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Optional Travel Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Airport layovers, roaming provider, or multiple conference venues"
                  className="w-full bg-white/50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-500/60 resize-none transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-700 dark:text-gray-300 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold transition-colors shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Travel Plan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
