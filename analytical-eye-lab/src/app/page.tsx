'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Profile,
  Resource,
  Booking,
  ConditionLog,
  ActivityLedgerItem,
  UserRole,
} from '@/lib/types';
import {
  SEED_PROFILES,
  SEED_RESOURCES,
  SEED_BOOKINGS,
  SEED_CONDITION_LOGS,
  SEED_LEDGER,
  isSupabaseConfigured,
  supabase,
} from '@/lib/supabaseClient';
import {
  analyzeBookingConflict,
  summarizeIncidentReport,
  queryFederatedRAG,
  ConflictAnalysisResult,
  IncidentSummaryResult,
} from '@/lib/ai';
import { RAGQueryResult } from '@/lib/types';
import {
  ShieldCheck,
  Cpu,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  Filter,
  ArrowRight,
  PlusCircle,
  Sparkles,
  Camera,
  History,
  Lock,
  Unlock,
  User,
  Building,
  Globe,
  BookOpen,
  Layers,
  RotateCcw,
  Zap,
  Info,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function AnalyticalEyeApp() {
  // -------------------------------------------------------------
  // STATE MANAGEMENT (Monolithic Store with Supabase / Seed Sync)
  // -------------------------------------------------------------
  const [profiles, setProfiles] = useState<Profile[]>(SEED_PROFILES);
  const [currentProfile, setCurrentProfile] = useState<Profile>(SEED_PROFILES[0]);
  const [resources, setResources] = useState<Resource[]>(SEED_RESOURCES);
  const [bookings, setBookings] = useState<Booking[]>(SEED_BOOKINGS);
  const [conditionLogs, setConditionLogs] = useState<ConditionLog[]>(SEED_CONDITION_LOGS);
  const [ledger, setLedger] = useState<ActivityLedgerItem[]>(SEED_LEDGER);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<
    'discovery' | 'my_bookings' | 'owner_dashboard' | 'disputes' | 'audit_ledger' | 'cross_campus_rag'
  >('discovery');

  // Cross-Campus Federated RAG State
  const [ragQuery, setRagQuery] = useState('Cryo-transmission electron microscope for 3D macromolecular reconstruction');
  const [ragCampus, setRagCampus] = useState('All');
  const [ragResult, setRagResult] = useState<RAGQueryResult | null>(null);
  const [isSearchingRag, setIsSearchingRag] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Notification / State Transition Banner state
  const [bannerNotice, setBannerNotice] = useState<{
    type: 'success' | 'warning' | 'info' | 'error';
    title: string;
    message: string;
    bookingId?: string;
  } | null>({
    type: 'info',
    title: 'Platform Active: Anti-Monopolization & Verification Rules Applied',
    message: 'Institutional allocation active. Max 3 active concurrent bookings per user. 100 monthly sponsored credits applied.',
  });

  // Modal Dialog states
  const [bookingModalResource, setBookingModalResource] = useState<Resource | null>(null);
  const [bookingStartTime, setBookingStartTime] = useState<string>('');
  const [bookingEndTime, setBookingEndTime] = useState<string>('');
  const [conflictCheckResult, setConflictCheckResult] = useState<ConflictAnalysisResult | null>(null);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);

  // Review Modal state (for Owners)
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewReason, setReviewReason] = useState<string>('');

  // Check-In Modal state
  const [checkInBooking, setCheckInBooking] = useState<Booking | null>(null);
  const [checkInRating, setCheckInRating] = useState<number>(5);
  const [checkInNotes, setCheckInNotes] = useState<string>('');
  const [checkInMediaUrl, setCheckInMediaUrl] = useState<string>('');
  const [checkInPpeAgreed, setCheckInPpeAgreed] = useState<boolean>(false);

  // Return / Check-Out Modal state
  const [checkOutBooking, setCheckOutBooking] = useState<Booking | null>(null);
  const [checkOutRating, setCheckOutRating] = useState<number>(5);
  const [checkOutNotes, setCheckOutNotes] = useState<string>('');
  const [checkOutMediaUrl, setCheckOutMediaUrl] = useState<string>('');

  // Dispute / Incident Modal state
  const [incidentBookingId, setIncidentBookingId] = useState<string>('');
  const [incidentText, setIncidentText] = useState<string>('');
  const [incidentAiResult, setIncidentAiResult] = useState<IncidentSummaryResult | null>(null);
  const [isAnalyzingIncident, setIsAnalyzingIncident] = useState(false);

  // New Resource Listing Form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<Resource['category']>('Makerspaces');
  const [newLocation, setNewLocation] = useState('');
  const [newCreditCost, setNewCreditCost] = useState(15);
  const [newDescription, setNewDescription] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newRequiredBadge, setNewRequiredBadge] = useState('Laser Cutter Safety Cert');
  const [showAddResourceForm, setShowAddResourceForm] = useState(false);

  // Ledger Filter
  const [ledgerFilterBookingId, setLedgerFilterBookingId] = useState<string>('all');

  // -------------------------------------------------------------
  // COMPUTED PROPERTIES & VALIDATIONS
  // -------------------------------------------------------------
  const activeBookingsCount = useMemo(() => {
    return bookings.filter(
      (b) =>
        b.user_id === currentProfile.id &&
        ['pending', 'approved', 'checked_in', 'waitlisted'].includes(b.status)
    ).length;
  }, [bookings, currentProfile.id]);

  const maxBookingsReached = activeBookingsCount >= 3;

  // Filtered resources for Discovery
  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      const matchesSearch =
        res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All' || res.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [resources, searchQuery, selectedCategory]);

  // Check eligibility for a specific resource against current user profile
  const checkEligibility = (resource: Resource) => {
    const requiredBadges = resource.eligibility_rules.required_badges || [];
    const missingBadges = requiredBadges.filter(
      (b) => !currentProfile.training_badges.includes(b)
    );
    const isEligible = missingBadges.length === 0;
    return { isEligible, missingBadges };
  };

  // Helper to record an immutable action to Activity Ledger
  const recordLedgerAction = (
    action: string,
    bookingId: string | null,
    metadata: Record<string, any>
  ) => {
    const newItem: ActivityLedgerItem = {
      id: `led-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      booking_id: bookingId,
      actor_id: currentProfile.id,
      actor_name: currentProfile.full_name,
      action,
      timestamp: new Date().toISOString(),
      metadata,
    };
    setLedger((prev) => [newItem, ...prev]);

    // Optional Supabase sync if credentials are configured
    if (isSupabaseConfigured && supabase) {
      Promise.resolve(
        supabase.from('activity_ledger').insert({
          booking_id: bookingId,
          actor_id: currentProfile.id,
          action,
          metadata,
        })
      ).catch(console.error);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS FOR 10-STEP LIFECYCLE
  // -------------------------------------------------------------

  // STEP 1: Add New Resource (Owner Listing)
  const handleCreateResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newLocation) return;

    const newRes: Resource = {
      id: `res-${Date.now()}`,
      owner_id: currentProfile.id,
      owner_name: currentProfile.full_name,
      title: newTitle,
      category: newCategory,
      location: newLocation,
      credit_cost: Number(newCreditCost) || 10,
      description: newDescription || 'Newly provisioned university shared asset.',
      image_url:
        newImageUrl ||
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
      availability_slots: [
        { day: 'Monday - Friday', startTime: '09:00', endTime: '18:00' },
      ],
      eligibility_rules: {
        required_badges: newRequiredBadge ? [newRequiredBadge] : [],
        min_department: 'All',
        notes: 'Standard lab safety protocol applies.',
      },
      is_active: true,
      created_at: new Date().toISOString(),
    };

    setResources((prev) => [newRes, ...prev]);
    recordLedgerAction('OWNER_RESOURCE_CREATED', null, {
      resource_id: newRes.id,
      title: newRes.title,
      credit_cost: newRes.credit_cost,
      required_badge: newRequiredBadge,
    });

    setBannerNotice({
      type: 'success',
      title: 'Resource Listed Successfully',
      message: `"${newRes.title}" is now published and open for qualified bookings.`,
    });

    // Reset Form
    setNewTitle('');
    setNewLocation('');
    setNewDescription('');
    setShowAddResourceForm(false);
  };

  // STEP 3 & 4: Submit Booking Request (Booking Engine & Auto-Verification)
  const handleOpenBookingModal = (res: Resource) => {
    setBookingModalResource(res);
    // Default times: starting 2 hours from now for 3 hours
    const start = new Date(Date.now() + 2 * 3600000);
    const end = new Date(Date.now() + 5 * 3600000);
    setBookingStartTime(start.toISOString().slice(0, 16));
    setBookingEndTime(end.toISOString().slice(0, 16));
    setConflictCheckResult(null);
  };

  const handleRunConflictCheck = async () => {
    if (!bookingModalResource || !bookingStartTime || !bookingEndTime) return;
    setIsCheckingConflict(true);
    try {
      const result = await analyzeBookingConflict(
        bookingModalResource.id,
        bookingStartTime,
        bookingEndTime,
        bookings
      );
      setConflictCheckResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingConflict(false);
    }
  };

  const handleSubmitBooking = async (forceWaitlist = false) => {
    if (!bookingModalResource) return;

    // Rule: Anti-Monopolization Limit (Max 3 active bookings)
    if (maxBookingsReached && !forceWaitlist) {
      alert('Anti-Monopolization Cap Reached: You already hold 3 active reservations. Please complete or release one before reserving another.');
      return;
    }

    // Rule: Credit Balance Check
    if (currentProfile.credits_balance < bookingModalResource.credit_cost) {
      alert(`Insufficient Credits: You have ${currentProfile.credits_balance} credits, but this resource requires ${bookingModalResource.credit_cost} credits.`);
      return;
    }

    // Rule: Qualification Check
    const { isEligible, missingBadges } = checkEligibility(bookingModalResource);
    if (!isEligible && !forceWaitlist) {
      alert(`Eligibility Restriction: You are missing required badge(s): ${missingBadges.join(', ')}.`);
      return;
    }

    // Overlap / Demand check
    const reqStart = new Date(bookingStartTime).getTime();
    const reqEnd = new Date(bookingEndTime).getTime();
    const hasOverlap = bookings.some(
      (b) =>
        b.resource_id === bookingModalResource.id &&
        !['rejected', 'returned'].includes(b.status) &&
        reqStart < new Date(b.end_time).getTime() &&
        reqEnd > new Date(b.start_time).getTime()
    );

    const isWaitlisted = forceWaitlist || hasOverlap;
    const waitlistPos = isWaitlisted
      ? bookings.filter(
          (b) => b.resource_id === bookingModalResource.id && b.status === 'waitlisted'
        ).length + 1
      : null;

    const newBooking: Booking = {
      id: `book-${Date.now().toString().slice(-6)}`,
      resource_id: bookingModalResource.id,
      resource_title: bookingModalResource.title,
      user_id: currentProfile.id,
      user_name: currentProfile.full_name,
      user_department: currentProfile.department,
      status: isWaitlisted ? 'waitlisted' : 'pending',
      start_time: new Date(bookingStartTime).toISOString(),
      end_time: new Date(bookingEndTime).toISOString(),
      credit_spent: bookingModalResource.credit_cost,
      waitlist_position: waitlistPos,
      review_reason: isWaitlisted
        ? `Queued automatically due to high demand. Position #${waitlistPos}.`
        : 'Auto-verification passed. Forwarded to Owner review.',
      penalty_credits: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Deduct user credits
    setCurrentProfile((prev) => ({
      ...prev,
      credits_balance: prev.credits_balance - bookingModalResource.credit_cost,
    }));

    setBookings((prev) => [newBooking, ...prev]);

    // Ledger actions
    recordLedgerAction(
      isWaitlisted ? 'BOOKING_WAITLISTED_HIGH_DEMAND' : 'BOOKING_REQUESTED',
      newBooking.id,
      {
        resource: bookingModalResource.title,
        credits: bookingModalResource.credit_cost,
        waitlist_position: waitlistPos,
      }
    );

    recordLedgerAction('AUTO_VERIFICATION_RULES_EVALUATED', newBooking.id, {
      eligibility_passed: isEligible,
      active_quota_used: activeBookingsCount + 1,
      max_quota: 3,
    });

    // Milestone 6: State Transition Banner
    if (isWaitlisted) {
      setBannerNotice({
        type: 'warning',
        title: `Waitlisted: Position #${waitlistPos} in Line`,
        message: `High demand for ${bookingModalResource.title}. You have been placed at Queue Position #${waitlistPos}. If an earlier booking cancels or concludes early, you will be automatically promoted.`,
        bookingId: newBooking.id,
      });
    } else {
      setBannerNotice({
        type: 'info',
        title: 'Booking Submitted to Owner Review',
        message: `Your request for ${bookingModalResource.title} has passed automated qualification and is awaiting approval from ${bookingModalResource.owner_name || 'Lab Staff'}.`,
        bookingId: newBooking.id,
      });
    }

    setBookingModalResource(null);
    setActiveTab('my_bookings');
  };

  // STEP 5: Owner Review (Approve / Reject)
  const handleReviewAction = (status: 'approved' | 'rejected') => {
    if (!reviewBooking) return;

    const updated = bookings.map((b) => {
      if (b.id === reviewBooking.id) {
        return {
          ...b,
          status,
          review_reason:
            reviewReason ||
            (status === 'approved'
              ? 'Owner approved after schedule review.'
              : 'Resource maintenance / conflict window.'),
          updated_at: new Date().toISOString(),
        };
      }
      return b;
    });

    // If rejected, refund credits
    if (status === 'rejected') {
      setCurrentProfile((prev) => {
        if (prev.id === reviewBooking.user_id) {
          return {
            ...prev,
            credits_balance: prev.credits_balance + reviewBooking.credit_spent,
          };
        }
        return prev;
      });
    }

    setBookings(updated);

    recordLedgerAction(
      status === 'approved' ? 'OWNER_APPROVED' : 'OWNER_REJECTED',
      reviewBooking.id,
      {
        reviewer: currentProfile.full_name,
        reason: reviewReason || 'Standard decision',
        refund_issued: status === 'rejected' ? reviewBooking.credit_spent : 0,
      }
    );

    // Milestone 6 Banner
    setBannerNotice({
      type: status === 'approved' ? 'success' : 'error',
      title: status === 'approved' ? 'Booking Approved by Owner!' : 'Booking Rejected by Owner',
      message:
        status === 'approved'
          ? `Booking #${reviewBooking.id} is approved. The user may now initiate Digital Check-In to unlock the hardware.`
          : `Booking #${reviewBooking.id} was rejected. ${reviewBooking.credit_spent} credits have been restored to the applicant.`,
      bookingId: reviewBooking.id,
    });

    setReviewBooking(null);
    setReviewReason('');
  };

  // STEP 7: Digital Check-In (Unlock Hardware)
  const handleCompleteCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInBooking) return;
    if (!checkInPpeAgreed) {
      alert('You must confirm required safety protocols and PPE compliance before the lock is released.');
      return;
    }

    const newLog: ConditionLog = {
      id: `cond-in-${Date.now().toString().slice(-6)}`,
      booking_id: checkInBooking.id,
      phase: 'check_in',
      reporter_id: currentProfile.id,
      reporter_name: currentProfile.full_name,
      status_rating: checkInRating,
      notes: checkInNotes || 'Initial inspection satisfactory. Equipment baseline verified.',
      media_url:
        checkInMediaUrl ||
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
      created_at: new Date().toISOString(),
    };

    setConditionLogs((prev) => [newLog, ...prev]);

    setBookings((prev) =>
      prev.map((b) =>
        b.id === checkInBooking.id
          ? { ...b, status: 'checked_in', updated_at: new Date().toISOString() }
          : b
      )
    );

    recordLedgerAction('DIGITAL_CHECK_IN_COMPLETED', checkInBooking.id, {
      rating: checkInRating,
      notes: newLog.notes,
      media_recorded: Boolean(checkInMediaUrl),
      hardware_status: 'UNLOCKED_AND_ACTIVE',
    });

    setBannerNotice({
      type: 'success',
      title: '🔓 Hardware Unlocked: Check-In Complete',
      message: `Safety checklist verified and baseline condition logged (${checkInRating}/5 stars). Your session is actively monitored. Please return before the scheduled window.`,
      bookingId: checkInBooking.id,
    });

    setCheckInBooking(null);
    setCheckInNotes('');
    setCheckInMediaUrl('');
    setCheckInPpeAgreed(false);
  };

  // STEP 8: Digital Return / Check-Out (Calculate Penalty & Relock)
  const handleCompleteCheckOut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkOutBooking) return;

    // Check if late (simulate penalty if past scheduled end time)
    const scheduledEnd = new Date(checkOutBooking.end_time).getTime();
    const now = Date.now();
    const isLate = now > scheduledEnd;
    const overdueMinutes = isLate ? Math.round((now - scheduledEnd) / (60 * 1000)) : 0;
    // Penalty rule: 5 credits per 15 minutes overdue
    const penaltyCredits = overdueMinutes > 0 ? Math.ceil(overdueMinutes / 15) * 5 : 0;

    const newLog: ConditionLog = {
      id: `cond-out-${Date.now().toString().slice(-6)}`,
      booking_id: checkOutBooking.id,
      phase: 'check_out',
      reporter_id: currentProfile.id,
      reporter_name: currentProfile.full_name,
      status_rating: checkOutRating,
      notes: checkOutNotes || 'Return inspection concluded. Decontamination and cleanup performed.',
      media_url:
        checkOutMediaUrl ||
        'https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=400&q=80',
      created_at: new Date().toISOString(),
    };

    setConditionLogs((prev) => [newLog, ...prev]);

    setBookings((prev) =>
      prev.map((b) =>
        b.id === checkOutBooking.id
          ? {
              ...b,
              status: 'returned',
              penalty_credits: penaltyCredits,
              updated_at: new Date().toISOString(),
            }
          : b
      )
    );

    if (penaltyCredits > 0) {
      setCurrentProfile((prev) => ({
        ...prev,
        credits_balance: Math.max(0, prev.credits_balance - penaltyCredits),
      }));
    }

    recordLedgerAction('DIGITAL_CHECK_OUT_COMPLETED', checkOutBooking.id, {
      return_rating: checkOutRating,
      notes: newLog.notes,
      overdue_minutes: overdueMinutes,
      penalty_applied: penaltyCredits,
      hardware_status: 'RESTORED_AVAILABLE',
    });

    setBannerNotice({
      type: penaltyCredits > 0 ? 'warning' : 'success',
      title: 'Resource Returned & Available for Campus',
      message:
        penaltyCredits > 0
          ? `Return logged. Late return fee of ${penaltyCredits} credits automatically applied (${overdueMinutes} min overdue). Resource relocked.`
          : 'Thank you! Resource returned in good standing. Quota slot released and availability restored.',
      bookingId: checkOutBooking.id,
    });

    setCheckOutBooking(null);
    setCheckOutNotes('');
    setCheckOutMediaUrl('');
  };

  // STEP 9: Dispute & Incident Hub with AI Severity Summarizer
  const handleAnalyzeIncident = async () => {
    if (!incidentText) return;
    setIsAnalyzingIncident(true);
    try {
      const summary = await summarizeIncidentReport(incidentText);
      setIncidentAiResult(summary);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzingIncident(false);
    }
  };

  const handleSubmitDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentText) return;

    const severity = incidentAiResult ? incidentAiResult.severity : 'medium';

    if (incidentBookingId) {
      setBookings((prev) =>
        prev.map((b) =>
          b.id === incidentBookingId ? { ...b, status: 'disputed' } : b
        )
      );
    }

    recordLedgerAction('INCIDENT_DISPUTE_FILED', incidentBookingId || null, {
      severity,
      reporter: currentProfile.full_name,
      headline: incidentAiResult?.headline || 'Damage/Conflict Incident',
      recommended_action: incidentAiResult?.recommendedAction || 'Admin review required',
      full_text: incidentText,
    });

    setBannerNotice({
      type: severity === 'high' ? 'error' : 'warning',
      title: `Incident Recorded [Severity: ${severity.toUpperCase()}]`,
      message: `Report routed to Central Office of Research Affairs. An administrative hold has been flagged in the auditable ledger.`,
      bookingId: incidentBookingId || undefined,
    });

    setIncidentText('');
    setIncidentAiResult(null);
    setIncidentBookingId('');
    setActiveTab('audit_ledger');
  };

  // Cross-Campus RAG Search Handler
  const handleExecuteRagSearch = async (overrideQuery?: string) => {
    const q = overrideQuery !== undefined ? overrideQuery : ragQuery;
    if (!q) return;
    setIsSearchingRag(true);
    try {
      const res = await queryFederatedRAG(q, currentProfile.training_badges, ragCampus);
      setRagResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingRag(false);
    }
  };

  // Instant Cross-Campus Passport Reservation
  const handleBookFederatedApparatus = (match: any) => {
    if (activeBookingsCount >= 3) {
      alert('Anti-Monopolization Limit: You already have 3 active reservations.');
      return;
    }
    if (currentProfile.credits_balance < match.credit_cost) {
      alert(`Insufficient Credits: Need ${match.credit_cost} credits, you have ${currentProfile.credits_balance}.`);
      return;
    }

    const newBooking: Booking = {
      id: `fed-${Date.now().toString().slice(-6)}`,
      resource_id: match.resource_id,
      resource_title: `${match.title} (${match.university})`,
      user_id: currentProfile.id,
      user_name: currentProfile.full_name,
      user_department: currentProfile.department,
      status: 'approved',
      start_time: new Date(Date.now() + 4 * 3600000).toISOString(),
      end_time: new Date(Date.now() + 8 * 3600000).toISOString(),
      credit_spent: match.credit_cost,
      waitlist_position: null,
      review_reason: `Cross-Campus RAG Passport verified under ${match.university} reciprocal agreement.`,
      penalty_credits: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setCurrentProfile((prev) => ({
      ...prev,
      credits_balance: prev.credits_balance - match.credit_cost,
    }));

    setBookings((prev) => [newBooking, ...prev]);

    recordLedgerAction('CROSS_CAMPUS_RAG_RESERVATION', newBooking.id, {
      university: match.university,
      apparatus: match.title,
      relevance_score: match.relevance_score,
      credential_status: match.credential_status,
      federated_credit_cost: match.credit_cost,
    });

    setBannerNotice({
      type: 'success',
      title: 'Cross-Campus Access Passport Issued!',
      message: `Reservation confirmed for ${match.title} at ${match.university}. Reciprocal credentials verified. Proceed to Digital Check-In upon arrival.`,
      bookingId: newBooking.id,
    });

    setActiveTab('my_bookings');
  };

  // Reset to initial Seed state anytime
  const handleResetDemo = () => {
    setProfiles(SEED_PROFILES);
    setCurrentProfile(SEED_PROFILES[0]);
    setResources(SEED_RESOURCES);
    setBookings(SEED_BOOKINGS);
    setConditionLogs(SEED_CONDITION_LOGS);
    setLedger(SEED_LEDGER);
    setBannerNotice({
      type: 'info',
      title: 'Demo State Reset to Default',
      message: 'Initial 10-step hackathon seed environment reloaded.',
    });
  };

  // -------------------------------------------------------------
  // RENDER UI
  // -------------------------------------------------------------
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#070b13] text-slate-100">
      {/* ------------------------------------------------------- */}
      {/* HEADER / NAVIGATION BAR */}
      {/* ------------------------------------------------------- */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#090e1a]/90 backdrop-blur-md px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
                  LATENTLAB
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
                  Team: Analytical Eye
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Unlocking Research Equipment & Lab Spaces · Pankhuri Govila
              </p>
            </div>
          </div>

          {/* User Profile Switcher & Balance Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Role Switcher */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 shadow-inner">
              <User className="w-4 h-4 text-cyan-400" />
              <label htmlFor="persona-select" className="text-xs text-slate-400 font-medium">Persona:</label>
              <select
                id="persona-select"
                aria-label="Persona"
                className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer"
                value={currentProfile.id}
                onChange={(e) => {
                  const selected = profiles.find((p) => p.id === e.target.value);
                  if (selected) {
                    setCurrentProfile(selected);
                    setBannerNotice({
                      type: 'info',
                      title: `Switched Persona to: ${selected.full_name}`,
                      message: `Role: ${selected.role.toUpperCase()} | Badges: ${selected.training_badges.join(', ') || 'None'}`,
                    });
                  }
                }}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                    {p.full_name} ({p.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Credit Balance Badge */}
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-800/40 rounded-lg px-3 py-1.5 shadow-sm">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              <div className="text-xs">
                <span className="text-slate-400 font-normal">Credits: </span>
                <span className="font-bold text-amber-300">
                  {currentProfile.credits_balance}
                </span>
                <span className="text-slate-500"> / 100</span>
              </div>
            </div>

            {/* Active Quota Badge */}
            <div
              className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 text-xs ${
                maxBookingsReached
                  ? 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
              title="Anti-monopolization rule: Maximum 3 active concurrent bookings allowed."
            >
              <Clock className="w-3.5 h-3.5" />
              <span>
                Active: <strong className="font-semibold">{activeBookingsCount}/3</strong>
              </span>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleResetDemo}
              className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/80 text-slate-400 hover:text-slate-200 text-xs transition flex items-center gap-1"
              title="Reset Demo Data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Sequential 10-Milestone UI) */}
        <div className="max-w-7xl mx-auto mt-3 flex items-center gap-1 overflow-x-auto pb-1 text-sm border-t border-slate-800/50 pt-2.5">
          <button
            onClick={() => setActiveTab('discovery')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'discovery'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Search className="w-4 h-4" />
            1. Discovery & Match
          </button>

          <button
            onClick={() => setActiveTab('my_bookings')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'my_bookings'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Clock className="w-4 h-4" />
            2. My Bookings & Check-In
            {bookings.filter((b) => b.user_id === currentProfile.id).length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/30 text-cyan-200">
                {bookings.filter((b) => b.user_id === currentProfile.id).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('owner_dashboard')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'owner_dashboard'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Building className="w-4 h-4" />
            3. Owner Portal & Listing
            {bookings.filter((b) => b.status === 'pending').length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-200 font-bold">
                {bookings.filter((b) => b.status === 'pending').length} pending
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('disputes')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'disputes'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            4. Dispute & Incident Hub
          </button>

          <button
            onClick={() => setActiveTab('audit_ledger')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'audit_ledger'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <History className="w-4 h-4" />
            5. Auditable Ledger Timeline
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-indigo-200 font-bold">
              {ledger.length} events
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('cross_campus_rag');
              if (!ragResult) handleExecuteRagSearch();
            }}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'cross_campus_rag'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Globe className="w-4 h-4 text-cyan-400" />
            6. Cross-Campus RAG
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/30 text-cyan-200 font-bold">
              Consortium
            </span>
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------- */}
      {/* MILESTONE 6: REAL-TIME STATE TRANSITION BANNER */}
      {/* ------------------------------------------------------- */}
      {bannerNotice && (
        <aside aria-label="Status notice" className="max-w-7xl mx-auto w-full px-4 lg:px-8 mt-4">
          <div
            className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 shadow-lg ${
              bannerNotice.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                : bannerNotice.type === 'warning'
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                : bannerNotice.type === 'error'
                ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                : 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {bannerNotice.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
              {bannerNotice.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
              {bannerNotice.type === 'error' && <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
              {bannerNotice.type === 'info' && <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />}
              <div>
                <h4 className="font-semibold text-sm">{bannerNotice.title}</h4>
                <p className="text-xs opacity-90 mt-0.5">{bannerNotice.message}</p>
                {bannerNotice.bookingId && (
                  <p className="text-[11px] font-mono opacity-70 mt-1">
                    Booking Reference: {bannerNotice.bookingId}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setBannerNotice(null)}
              className="text-xs opacity-60 hover:opacity-100 transition px-2 py-1 rounded bg-black/20"
            >
              Dismiss
            </button>
          </div>
        </aside>
      )}

      {/* ------------------------------------------------------- */}
      {/* MAIN VIEW AREA */}
      {/* ------------------------------------------------------- */}
      <main className="max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 flex-1 flex flex-col gap-6">
        {/* ===================================================== */}
        {/* TAB 1: DISCOVERY & MATCH INTERFACE (Milestone 2 & 3) */}
        {/* ===================================================== */}
        {activeTab === 'discovery' && (
          <div className="flex flex-col gap-6">
            {/* Hero / Filter Bar */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <Building className="w-5 h-5 text-cyan-400" />
                    Cross-Departmental Research Equipment & Space Discovery
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Real-time verification against your training badges · Anti-monopolization queue active.
                  </p>
                </div>

                {/* Search Input */}
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search equipment, labs, tools..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700/70 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-800/60">
                <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
                  <Filter className="w-3.5 h-3.5" /> Category:
                </span>
                {[
                  'All',
                  'Biotech Labs',
                  'Makerspaces',
                  'Compute Clusters',
                  'High-End Lenses & Cameras',
                ].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                      selectedCategory === cat
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                        : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Resource Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {filteredResources.map((res) => {
                const { isEligible, missingBadges } = checkEligibility(res);

                return (
                  <div
                    key={res.id}
                    className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden hover:border-cyan-500/40 transition duration-200 flex flex-col justify-between group shadow-lg"
                  >
                    <div>
                      {/* Image header with cost badge */}
                      <div className="relative h-48 w-full bg-slate-950 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={res.image_url}
                          alt={res.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300 opacity-90"
                        />
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-semibold text-slate-200 border border-white/10">
                          <Building className="w-3.5 h-3.5 text-cyan-400" />
                          {res.category}
                        </div>
                        <div className="absolute top-3 right-3 flex items-center gap-1 bg-amber-500/90 text-slate-950 px-2.5 py-1 rounded-md text-xs font-bold shadow-md">
                          <Zap className="w-3.5 h-3.5 fill-slate-950" />
                          {res.credit_cost} Credits
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-base text-slate-100 group-hover:text-cyan-300 transition">
                            {res.title}
                          </h3>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2">
                          {res.description}
                        </p>

                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <span className="text-slate-500">Location:</span>
                          <span className="text-slate-300 font-medium">{res.location}</span>
                        </div>

                        {/* Real-Time Qualification Layer Check */}
                        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 mt-1 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-medium">Auto-Verification Status:</span>
                            {isEligible ? (
                              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Verified Eligible
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Missing Badge
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-400">
                            Required Badges:{' '}
                            {res.eligibility_rules.required_badges.map((b) => (
                              <span
                                key={b}
                                className={`inline-block mr-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  currentProfile.training_badges.includes(b)
                                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
                                    : 'bg-rose-950/80 text-rose-300 border border-rose-800/50'
                                }`}
                              >
                                {b}
                              </span>
                            ))}
                          </div>

                          {!isEligible && (
                            <p className="text-[11px] text-amber-400/90 italic">
                              ⚠️ Your profile lacks {missingBadges.join(', ')}. Complete module in Safety Portal or join waitlist.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Booking Action Footer */}
                    <div className="p-5 pt-0">
                      <button
                        onClick={() => handleOpenBookingModal(res)}
                        className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition shadow-md ${
                          isEligible
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/20'
                            : 'bg-amber-600/80 hover:bg-amber-500 text-white'
                        }`}
                      >
                        <Calendar className="w-4 h-4" />
                        {isEligible ? 'Check Availability & Reserve' : 'Request Exception / Waitlist'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================== */}
        {/* TAB 2: MY BOOKINGS & DIGITAL CHECK-IN/OUT (Steps 7 & 8)*/}
        {/* ===================================================== */}
        {activeTab === 'my_bookings' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  Active Reservations & Digital Handshake Portal
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Complete Milestone 7 (Digital Check-In) to unlock hardware, and Milestone 8 (Digital Return) to restore availability.
                </p>
              </div>

              <div className="text-xs px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                User: <strong className="text-cyan-400">{currentProfile.full_name}</strong>
              </div>
            </div>

            {/* Bookings List */}
            {bookings.filter((b) => b.user_id === currentProfile.id).length === 0 ? (
              <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
                <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-300">No active bookings for this user</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Go to Discovery & Match to request laboratory space or high-end equipment.
                </p>
                <button
                  onClick={() => setActiveTab('discovery')}
                  className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold"
                >
                  Explore Catalog
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {bookings
                  .filter((b) => b.user_id === currentProfile.id)
                  .map((booking) => {
                    const statusColorMap: Record<string, string> = {
                      pending: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
                      approved: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60',
                      checked_in: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
                      returned: 'bg-slate-800 text-slate-300 border-slate-700',
                      waitlisted: 'bg-purple-950/80 text-purple-300 border-purple-700/60',
                      rejected: 'bg-rose-950/80 text-rose-300 border-rose-700/60',
                      disputed: 'bg-red-950/80 text-red-300 border-red-700/60',
                    };

                    const relatedLogs = conditionLogs.filter((c) => c.booking_id === booking.id);

                    return (
                      <div
                        key={booking.id}
                        className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-md"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-base text-white">
                                {booking.resource_title || 'Institutional Asset'}
                              </h3>
                              <span
                                className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                                  statusColorMap[booking.status] || 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {booking.status.replace('_', ' ')}
                              </span>
                              {booking.status === 'waitlisted' && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-200 border border-purple-700">
                                  Position #{booking.waitlist_position || 1} in queue
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-mono text-slate-500">ID: {booking.id}</span>
                          </div>

                          <div className="text-xs text-slate-400">
                            Credits Spent: <strong className="text-amber-400">{booking.credit_spent}</strong>
                            {booking.penalty_credits ? (
                              <span className="text-rose-400 font-bold ml-2">
                                (Penalty: -{booking.penalty_credits} credits)
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Booking Details & Time */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-1">
                            <span className="text-slate-500 font-medium">Scheduled Window:</span>
                            <div className="text-slate-200 font-mono">
                              {new Date(booking.start_time).toLocaleString()} → {new Date(booking.end_time).toLocaleTimeString()}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">
                              Status Reason: <span className="text-slate-300 italic">{booking.review_reason || 'Under review'}</span>
                            </div>
                          </div>

                          {/* Condition Logs Preview */}
                          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-1.5">
                            <span className="text-slate-500 font-medium">Condition Log Status:</span>
                            {relatedLogs.length === 0 ? (
                              <p className="text-[11px] text-slate-500">
                                No condition check performed yet. Required before hardware unlock.
                              </p>
                            ) : (
                              relatedLogs.map((log) => (
                                <div key={log.id} className="text-[11px] text-slate-300 flex items-center justify-between border-b border-slate-800/40 pb-1">
                                  <span>
                                    Phase: <strong className="text-cyan-400">{log.phase}</strong> ({log.status_rating}/5★)
                                  </span>
                                  <span className="text-slate-400 truncate max-w-[180px]">{log.notes}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Lifecycle Action Buttons */}
                        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                          {/* Step 7: Digital Check-In Button */}
                          {booking.status === 'approved' && (
                            <button
                              onClick={() => {
                                setCheckInBooking(booking);
                                setCheckInRating(5);
                                setCheckInNotes('');
                                setCheckInMediaUrl('');
                                setCheckInPpeAgreed(false);
                              }}
                              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                            >
                              <Unlock className="w-4 h-4" />
                              Milestone 7: Perform Digital Check-In (Unlock)
                            </button>
                          )}

                          {/* Step 8: Digital Return / Check-Out Button */}
                          {booking.status === 'checked_in' && (
                            <button
                              onClick={() => {
                                setCheckOutBooking(booking);
                                setCheckOutRating(5);
                                setCheckOutNotes('');
                                setCheckOutMediaUrl('');
                              }}
                              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                            >
                              <Lock className="w-4 h-4" />
                              Milestone 8: Digital Return & Relock
                            </button>
                          )}

                          {/* Step 9: Report Incident */}
                          {['checked_in', 'returned'].includes(booking.status) && (
                            <button
                              onClick={() => {
                                setIncidentBookingId(booking.id);
                                setActiveTab('disputes');
                              }}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              Report Delay or Damage
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ===================================================== */}
        {/* TAB 3: OWNER DASHBOARD & REVIEW PORTAL (Steps 1 & 5)  */}
        {/* ===================================================== */}
        {activeTab === 'owner_dashboard' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-cyan-400" />
                  Owner & Facility Manager Control Panel
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Manage resource listings (Milestone 1), review pending access requests (Milestone 5), and audit equipment usage.
                </p>
              </div>

              <button
                onClick={() => setShowAddResourceForm(!showAddResourceForm)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-cyan-500/20 transition"
              >
                <PlusCircle className="w-4 h-4" />
                {showAddResourceForm ? 'Close Form' : '+ List New Resource'}
              </button>
            </div>

            {/* MILESTONE 1 FORM: List Resource */}
            {showAddResourceForm && (
              <form
                onSubmit={handleCreateResource}
                className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-6 shadow-xl flex flex-col gap-4 animate-in fade-in duration-200"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Milestone 1: Create New Equipment / Space Listing
                  </h3>
                  <span className="text-xs text-slate-400">Step 1 of 10</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Resource Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 5-Axis CNC Milling Center"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Makerspaces">Makerspaces</option>
                      <option value="Biotech Labs">Biotech Labs</option>
                      <option value="Compute Clusters">Compute Clusters</option>
                      <option value="High-End Lenses & Cameras">High-End Lenses & Cameras</option>
                      <option value="Testing Devices">Testing Devices</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Campus Location *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Robotics Center, Bay 4"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Cost per Session (Credits)</label>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={newCreditCost}
                      onChange={(e) => setNewCreditCost(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Required Training / Safety Badge</label>
                    <select
                      value={newRequiredBadge}
                      onChange={(e) => setNewRequiredBadge(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Laser Cutter Safety Cert">Laser Cutter Safety Cert</option>
                      <option value="BSL-2 Biosafety">BSL-2 Biosafety</option>
                      <option value="GPU Slurm Cluster Certified">GPU Slurm Cluster Certified</option>
                      <option value="Cleanroom Class 1000">Cleanroom Class 1000</option>
                      <option value="5-Axis CNC Certified">5-Axis CNC Certified</option>
                      <option value="None">None (Open to all students)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Image URL (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-slate-300 font-medium block mb-1">Description & Operational Guidelines</label>
                    <textarea
                      rows={2}
                      placeholder="Detail safety protocols, pre-requisites, and operating parameters..."
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddResourceForm(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-cyan-500/20"
                  >
                    Publish to Network
                  </button>
                </div>
              </form>
            )}

            {/* MILESTONE 5: Pending Booking Review Requests */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Milestone 5: Owner Review Portal (Pending Requests)
                </h3>
                <span className="text-xs text-amber-300 font-semibold">
                  {bookings.filter((b) => b.status === 'pending').length} Action(s) Required
                </span>
              </div>

              {bookings.filter((b) => b.status === 'pending').length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No pending booking requests awaiting review right now.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {bookings
                    .filter((b) => b.status === 'pending')
                    .map((booking) => (
                      <div
                        key={booking.id}
                        className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-white">
                              {booking.resource_title}
                            </h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {booking.id}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            Applicant: <strong className="text-cyan-400">{booking.user_name}</strong> ({booking.user_department || 'University Researcher'})
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            Window: {new Date(booking.start_time).toLocaleString()} → {new Date(booking.end_time).toLocaleTimeString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setReviewBooking(booking);
                              setReviewReason('');
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-md"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            Review & Decide
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================== */}
        {/* TAB 4: DISPUTE & INCIDENT HUB (Milestone 9 with AI)  */}
        {/* ===================================================== */}
        {activeTab === 'disputes' && (
          <div className="flex flex-col gap-6">
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                  Milestone 9: Dispute & Incident Triage Hub
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Log damage, hardware defects, or scheduling violations. Integrated with Vercel AI SDK for automated severity classification.
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-cyan-300">
                <Sparkles className="w-3.5 h-3.5" />
                Vercel AI SDK Summarizer Active
              </div>
            </div>

            {/* Incident Filing Form */}
            <form
              onSubmit={handleSubmitDispute}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4"
            >
              <h3 className="font-bold text-sm text-slate-200">
                Submit an Equipment Incident or Dispute
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    Associated Booking Reference (Optional)
                  </label>
                  <select
                    value={incidentBookingId}
                    onChange={(e) => setIncidentBookingId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- General Facility / Unlinked Issue --</option>
                    {bookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.id} - {b.resource_title} ({b.user_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    Reporter
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${currentProfile.full_name} (${currentProfile.role.toUpperCase()})`}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-400"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-slate-300 font-medium block mb-1">
                    Detailed Incident Description *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe the issue, damage observed, smells, smoke, software error codes, or delays in detail..."
                    value={incidentText}
                    onChange={(e) => setIncidentText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* AI Trigger Button */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAnalyzeIncident}
                  disabled={!incidentText || isAnalyzingIncident}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md transition disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {isAnalyzingIncident ? 'AI Analyzing...' : 'Run Incident Summarizer AI'}
                </button>
                <span className="text-[11px] text-slate-400">
                  Classifies severity (Low / Medium / High) and generates triage actions for admins.
                </span>
              </div>

              {/* AI Analysis Preview Box */}
              {incidentAiResult && (
                <div
                  className={`p-4 rounded-xl border flex flex-col gap-2 mt-2 animate-in fade-in duration-200 ${
                    incidentAiResult.severity === 'high'
                      ? 'bg-rose-950/40 border-rose-500/60 text-rose-200'
                      : incidentAiResult.severity === 'medium'
                      ? 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                      : 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Severity Assessment: {incidentAiResult.severity.toUpperCase()}
                    </span>
                    <span className="text-[11px] opacity-80">
                      Est. Repair Time: {incidentAiResult.estimatedResolutionHours} hours
                    </span>
                  </div>

                  <h4 className="font-semibold text-sm text-white">
                    {incidentAiResult.headline}
                  </h4>

                  <div className="text-xs">
                    <strong>Recommended Action:</strong> {incidentAiResult.recommendedAction}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20"
                >
                  Submit Incident & Push to Admin Ledger
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===================================================== */}
        {/* TAB 5: AUDITABLE LEDGER TIMELINE (Milestone 10)       */}
        {/* ===================================================== */}
        {activeTab === 'audit_ledger' && (
          <div className="flex flex-col gap-6">
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-cyan-400" />
                  Milestone 10: Immutable Auditable Ledger Timeline
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Cryptographically trackable state transitions recording approvals, qualification checks, check-ins, returns, and disputes for hackathon judges.
                </p>
              </div>

              {/* Filter by booking */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">Filter Record:</span>
                <select
                  value={ledgerFilterBookingId}
                  onChange={(e) => setLedgerFilterBookingId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                >
                  <option value="all">All Transactions ({ledger.length})</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id} ({b.resource_title})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Timeline Stream */}
            <div className="relative border-l border-slate-800 ml-4 pl-6 space-y-6">
              {ledger
                .filter(
                  (item) =>
                    ledgerFilterBookingId === 'all' ||
                    item.booking_id === ledgerFilterBookingId
                )
                .map((event) => {
                  const actionColorMap: Record<string, string> = {
                    BOOKING_REQUESTED: 'bg-cyan-500 text-slate-950',
                    ELIGIBILITY_PASSED: 'bg-emerald-500 text-slate-950',
                    OWNER_APPROVED: 'bg-blue-500 text-slate-950',
                    OWNER_REJECTED: 'bg-rose-500 text-slate-950',
                    DIGITAL_CHECK_IN_COMPLETED: 'bg-teal-500 text-slate-950',
                    DIGITAL_CHECK_OUT_COMPLETED: 'bg-indigo-500 text-slate-950',
                    INCIDENT_REPORTED: 'bg-red-500 text-slate-950',
                    INCIDENT_DISPUTE_FILED: 'bg-red-500 text-slate-950',
                    OWNER_RESOURCE_CREATED: 'bg-purple-500 text-slate-950',
                    BOOKING_WAITLISTED_HIGH_DEMAND: 'bg-amber-500 text-slate-950',
                  };

                  return (
                    <div key={event.id} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 border-slate-900 bg-cyan-400 group-hover:scale-125 transition" />

                      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-2 hover:border-slate-700 transition">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                                actionColorMap[event.action] || 'bg-slate-700 text-white'
                              }`}
                            >
                              {event.action}
                            </span>
                            {event.booking_id && (
                              <span className="text-xs font-mono text-cyan-400 font-semibold">
                                #{event.booking_id}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-slate-500">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div className="text-xs text-slate-300">
                          Actor: <strong className="text-slate-100">{event.actor_name}</strong>
                        </div>

                        {/* Metadata Payload (Expandable / Clean) */}
                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <div className="mt-1 bg-slate-950/80 rounded-lg p-2.5 border border-slate-800/80 font-mono text-[11px] text-slate-400 overflow-x-auto">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(event.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ===================================================== */}
        {/* TAB 6: FEDERATED CROSS-CAMPUS RAG CONSORTIUM          */}
        {/* ===================================================== */}
        {activeTab === 'cross_campus_rag' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            {/* Header & Architecture Summary */}
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  Cross-University Federated RAG Equipment Network
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Semantic retrieval pipeline connecting unstructured equipment manuals, BSL/Laser SOPs, and cross-campus reciprocal credential agreements.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 font-semibold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Consortium Mesh: 5 Top Universities
                </span>
              </div>
            </div>

            {/* Semantic Query Input Box */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 shadow-lg">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Ask in Natural Language (Semantic Intent & Research Objective):
              </label>

              <div className="flex flex-col md:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={ragQuery}
                    onChange={(e) => setRagQuery(e.target.value)}
                    placeholder="e.g. I need a 300kV cryo-TEM for biological specimen vitrification..."
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <select
                  value={ragCampus}
                  onChange={(e) => setRagCampus(e.target.value)}
                  className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="All">All Partner Institutions</option>
                  <option value="Stanford">Stanford Bio-X Core</option>
                  <option value="MIT">MIT.nano Prototyping</option>
                  <option value="Berkeley">UC Berkeley Marvell Nanofab</option>
                  <option value="Supercomputing">National AI Cluster</option>
                  <option value="Caltech">Caltech Photonics Center</option>
                </select>

                <button
                  type="button"
                  onClick={() => handleExecuteRagSearch()}
                  disabled={isSearchingRag}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {isSearchingRag ? 'RAG Searching...' : 'Execute Federated RAG'}
                </button>
              </div>

              {/* Sample Preset Queries */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-500">Quick Test Prompts:</span>
                {[
                  'Cryo-TEM 300kV for macromolecular vitrification',
                  'Direct-write optical laser lithography Class 100',
                  'Deep silicon ICP etcher Bosch process',
                  'NVIDIA GH200 Grace Hopper Slurm partition',
                  'Ultra high-speed phantom camera 12,500 fps',
                ].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => {
                      setRagQuery(sample);
                      handleExecuteRagSearch(sample);
                    }}
                    className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-200 transition"
                  >
                    "{sample.slice(0, 32)}..."
                  </button>
                ))}
              </div>
            </div>

            {/* Synthesized Cross-Campus Access Passport Banner */}
            {ragResult && (
              <div className="bg-gradient-to-r from-cyan-950/40 via-blue-950/40 to-slate-900 border border-cyan-500/30 rounded-2xl p-4 flex flex-col gap-2 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-800/30 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-cyan-400" />
                    <span className="font-bold text-sm text-white">
                      RAG Inter-University Passport Engine: {ragResult.institutional_passport_status}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-cyan-300">
                    Consortium Nodes Evaluated: {ragResult.total_consortium_nodes_searched} Knowledge SOPs
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {ragResult.synthesized_guidance}
                </p>

                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <span>Your Home University Credentials Evaluated:</span>
                  <strong className="text-cyan-300 font-mono">
                    {currentProfile.training_badges.join(', ')}
                  </strong>
                </div>
              </div>
            )}

            {/* Retrieved Apparatus Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ragResult?.matches.map((item) => (
                <div
                  key={item.resource_id}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-3 shadow-md hover:border-cyan-500/50 transition group"
                >
                  <div>
                    {/* Header: University & Relevance Score */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                        <Building className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{item.university}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                          {Math.round(item.relevance_score * 100)}% Match
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/60">
                          {item.credit_cost} Credits
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-base text-white mt-2 group-hover:text-cyan-300 transition">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.location}</p>

                    {/* Retrieved SOP Citation Chunk */}
                    <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-cyan-400" />
                        Retrieved SOP Knowledge Chunk:
                      </span>
                      <p className="text-[11px] text-slate-300 italic font-serif">
                        "{item.matching_snippet}"
                      </p>
                    </div>

                    {/* Reciprocal Credential Check */}
                    <div className="mt-2.5 flex items-center justify-between text-xs p-2 rounded-lg bg-black/30 border border-white/5">
                      <span className="text-slate-400 text-[11px]">Reciprocal Safety Verification:</span>
                      {item.credential_status === 'Equivalence Verified' ? (
                        <span className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Equivalence Verified
                        </span>
                      ) : (
                        <span className="text-amber-400 font-semibold text-[11px] flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Requires Target Campus Badge
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Booking Action */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleBookFederatedApparatus(item)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition ${
                        item.credential_status === 'Equivalence Verified'
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/20'
                          : 'bg-amber-600/80 hover:bg-amber-500 text-white'
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      {item.credential_status === 'Equivalence Verified'
                        ? 'Issue Cross-Campus Passport & Reserve'
                        : 'Request Inter-University Safety Waiver'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------- */}
      {/* MODAL 1: BOOKING & CONFLICT RESOLUTION AI (Step 3 & 4) */}
      {/* ------------------------------------------------------- */}
      {bookingModalResource && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">
                  Reserve {bookingModalResource.title}
                </h3>
                <p className="text-xs text-slate-400">
                  Milestone 3 & 4: Submission & Auto-Verification Layer
                </p>
              </div>
              <button
                onClick={() => setBookingModalResource(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Constraints Check Panel */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Resource Rate:</span>
                <span className="font-bold text-amber-300">
                  {bookingModalResource.credit_cost} credits / session
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Your Current Balance:</span>
                <span className="font-bold text-slate-200">
                  {currentProfile.credits_balance} credits
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Active Bookings Count:</span>
                <span className={`font-bold ${maxBookingsReached ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {activeBookingsCount} / 3 (Anti-Monopolization Limit)
                </span>
              </div>
            </div>

            {/* Time selection */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  value={bookingStartTime}
                  onChange={(e) => setBookingStartTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>
              <div>
                <label className="text-slate-300 font-medium block mb-1">End Time</label>
                <input
                  type="datetime-local"
                  value={bookingEndTime}
                  onChange={(e) => setBookingEndTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>
            </div>

            {/* AI Conflict Detection Button */}
            <button
              type="button"
              onClick={handleRunConflictCheck}
              disabled={isCheckingConflict}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              {isCheckingConflict ? 'Checking Schedule Overlaps...' : 'Run Conflict Resolution AI'}
            </button>

            {/* AI Conflict Result Box */}
            {conflictCheckResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex flex-col gap-2 ${
                  conflictCheckResult.hasConflict
                    ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                    : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {conflictCheckResult.hasConflict ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>
                    {conflictCheckResult.hasConflict
                      ? 'Scheduling Conflict Detected'
                      : 'Time Window Available!'}
                  </span>
                </div>
                <p className="text-[11px] opacity-90">{conflictCheckResult.reason}</p>

                {conflictCheckResult.hasConflict &&
                  conflictCheckResult.suggestedAlternatives.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-rose-800/40 flex flex-col gap-1.5">
                      <span className="font-semibold text-[11px] text-white">
                        AI Recommended Alternative Windows:
                      </span>
                      {conflictCheckResult.suggestedAlternatives.map((alt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setBookingStartTime(new Date(alt.start).toISOString().slice(0, 16));
                            setBookingEndTime(new Date(alt.end).toISOString().slice(0, 16));
                            setConflictCheckResult(null);
                          }}
                          className="text-left p-2 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 text-[11px] transition"
                        >
                          <div className="font-mono text-cyan-300">
                            {new Date(alt.start).toLocaleString()} → {new Date(alt.end).toLocaleTimeString()}
                          </div>
                          <div className="text-slate-400 text-[10px] mt-0.5">{alt.explanation}</div>
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setBookingModalResource(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs hover:bg-slate-700"
              >
                Cancel
              </button>

              {conflictCheckResult?.hasConflict ? (
                <button
                  type="button"
                  onClick={() => handleSubmitBooking(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md"
                >
                  Join Waitlist (Queue System)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSubmitBooking(false)}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-500/20"
                >
                  Confirm & Submit Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------- */}
      {/* MODAL 2: OWNER REVIEW MODAL (Milestone 5)              */}
      {/* ------------------------------------------------------- */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">
                Owner Review: #{reviewBooking.id}
              </h3>
              <p className="text-xs text-slate-400">
                Resource: {reviewBooking.resource_title}
              </p>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <div>Applicant: <strong>{reviewBooking.user_name}</strong></div>
              <div>Department: {reviewBooking.user_department}</div>
              <div>Credit Spent: {reviewBooking.credit_spent} credits</div>
            </div>

            <div>
              <label className="text-slate-300 text-xs font-medium block mb-1">
                Reason / Access Protocol Notes (Logged to Audit Ledger)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Approved. Workbench sanitized and safety protocols briefed."
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReviewBooking(null)}
                className="px-3 py-2 bg-slate-800 text-slate-400 text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReviewAction('rejected')}
                className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold rounded-xl"
              >
                Reject & Refund
              </button>
              <button
                type="button"
                onClick={() => handleReviewAction('approved')}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md"
              >
                Approve Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------- */}
      {/* MODAL 3: DIGITAL CHECK-IN (Milestone 7)                 */}
      {/* ------------------------------------------------------- */}
      {checkInBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCompleteCheckIn}
            className="bg-slate-900 border border-emerald-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150"
          >
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Unlock className="w-4 h-4 text-emerald-400" />
                  Milestone 7: Digital Check-In Verification
                </h3>
                <p className="text-xs text-slate-400">
                  {checkInBooking.resource_title} (ID: {checkInBooking.id})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCheckInBooking(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300">
              Record baseline condition before the electronic lock unlocks.
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Initial Condition Rating (1 to 5 Stars) *
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setCheckInRating(star)}
                      className={`h-8 w-8 rounded-lg font-bold flex items-center justify-center transition ${
                        checkInRating >= star
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-amber-300">
                    {checkInRating} / 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Baseline Notes & Physical Inspection Checklist *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Clean optics, zero visible scratches, cables intact, emergency shutoff tested."
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Photo Evidence Link (Before Unlock)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={checkInMediaUrl}
                  onChange={(e) => setCheckInMediaUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Safety Compliance Check */}
              <label className="flex items-start gap-2 p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkInPpeAgreed}
                  onChange={(e) => setCheckInPpeAgreed(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-500"
                />
                <span className="text-[11px]">
                  I certify that I am wearing all mandated Personal Protective Equipment (PPE), have reviewed emergency shutdown procedures, and accept accountability during my session.
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCheckInBooking(null)}
                className="px-4 py-2 bg-slate-800 text-slate-400 text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <Unlock className="w-4 h-4" />
                Confirm & Unlock Equipment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------- */}
      {/* MODAL 4: DIGITAL RETURN / CHECK-OUT (Milestone 8)       */}
      {/* ------------------------------------------------------- */}
      {checkOutBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCompleteCheckOut}
            className="bg-slate-900 border border-blue-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150"
          >
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-400" />
                  Milestone 8: Digital Return & Relock
                </h3>
                <p className="text-xs text-slate-400">
                  {checkOutBooking.resource_title} (ID: {checkOutBooking.id})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCheckOutBooking(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Overdue Check / Auto-Penalty Formula Display */}
            {(() => {
              const scheduledEnd = new Date(checkOutBooking.end_time).getTime();
              const isLate = Date.now() > scheduledEnd;
              const overdueMins = isLate ? Math.round((Date.now() - scheduledEnd) / (60 * 1000)) : 0;
              const penalty = overdueMins > 0 ? Math.ceil(overdueMins / 15) * 5 : 0;

              return (
                <div
                  className={`p-3 rounded-xl border text-xs flex flex-col gap-1 ${
                    penalty > 0
                      ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex justify-between font-semibold">
                    <span>Scheduled End Time:</span>
                    <span className="font-mono">
                      {new Date(checkOutBooking.end_time).toLocaleTimeString()}
                    </span>
                  </div>
                  {penalty > 0 ? (
                    <div className="text-[11px] text-rose-300 font-bold mt-1">
                      ⚠️ Session overdue by {overdueMins} mins. Auto-Penalty Applied: {penalty} credits deducted.
                    </div>
                  ) : (
                    <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                      ✓ Returning within allocated window. Zero late penalty applied.
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Final Condition Rating (1 to 5 Stars) *
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setCheckOutRating(star)}
                      className={`h-8 w-8 rounded-lg font-bold flex items-center justify-center transition ${
                        checkOutRating >= star
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-amber-300">
                    {checkOutRating} / 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Post-Operation Notes & Sanitization Checklist *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Workspace wiped down with isopropanol, sample cleared, powered down safely."
                  value={checkOutNotes}
                  onChange={(e) => setCheckOutNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Post-Usage Photo Proof URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={checkOutMediaUrl}
                  onChange={(e) => setCheckOutMediaUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCheckOutBooking(null)}
                className="px-4 py-2 bg-slate-800 text-slate-400 text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" />
                Complete Return & Relock
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------- */}
      {/* FOOTER */}
      {/* ------------------------------------------------------- */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-4 py-4 text-center text-xs text-slate-500">
        <p>
          <strong>LatentLab</strong> (by Team Analytical Eye) · We Code Coders 48-Hour Hackathon · Lead: Pankhuri Govila
        </p>
        <p className="text-[11px] text-slate-600 mt-1">
          Next.js App Router · Supabase PostgreSQL RLS Schema · Vercel AI SDK Integration · Anti-Monopolization Fair Scheduling
        </p>
      </footer>
    </div>
  );
}
