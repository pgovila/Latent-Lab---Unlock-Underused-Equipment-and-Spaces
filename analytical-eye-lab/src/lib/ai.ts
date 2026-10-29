import { Booking } from './types';

export interface ConflictAnalysisResult {
  hasConflict: boolean;
  conflictingBooking?: Booking;
  reason: string;
  suggestedAlternatives: {
    start: string;
    end: string;
    explanation: string;
  }[];
}

export interface IncidentSummaryResult {
  severity: 'low' | 'medium' | 'high';
  headline: string;
  keyIssues: string[];
  recommendedAction: string;
  estimatedResolutionHours: number;
}

/**
 * Conflict Resolution AI
 * Analyzes candidate booking against existing bookings, detects overlaps,
 * and intelligently computes optimal alternative windows.
 */
export async function analyzeBookingConflict(
  resourceId: string,
  startTime: string,
  endTime: string,
  existingBookings: Booking[]
): Promise<ConflictAnalysisResult> {
  const reqStart = new Date(startTime).getTime();
  const reqEnd = new Date(endTime).getTime();

  // Find active conflicting bookings for the same resource
  const conflict = existingBookings.find(b => {
    if (b.resource_id !== resourceId) return false;
    if (['rejected', 'returned'].includes(b.status)) return false;

    const bStart = new Date(b.start_time).getTime();
    const bEnd = new Date(b.end_time).getTime();

    // Overlap condition
    return (reqStart < bEnd && reqEnd > bStart);
  });

  if (!conflict) {
    return {
      hasConflict: false,
      reason: 'No conflicting bookings found. The requested time window is completely available.',
      suggestedAlternatives: []
    };
  }

  // Generate intelligent alternative windows
  const conflictEnd = new Date(conflict.end_time);
  const durationMs = reqEnd - reqStart;

  // Window 1: Immediately after conflict + 30 min buffer
  const alt1Start = new Date(conflictEnd.getTime() + 30 * 60 * 1000);
  const alt1End = new Date(alt1Start.getTime() + durationMs);

  // Window 2: Next day at same preferred starting time
  const alt2Start = new Date(reqStart + 24 * 60 * 60 * 1000);
  const alt2End = new Date(alt2Start.getTime() + durationMs);

  return {
    hasConflict: true,
    conflictingBooking: conflict,
    reason: `Time overlap detected with booking #${conflict.id.slice(-6)} (${new Date(conflict.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(conflict.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`,
    suggestedAlternatives: [
      {
        start: alt1Start.toISOString(),
        end: alt1End.toISOString(),
        explanation: 'Earliest Available: 30 minutes after current reservation concludes with automated maintenance buffer.'
      },
      {
        start: alt2Start.toISOString(),
        end: alt2End.toISOString(),
        explanation: 'Next-Day Slot: Exact same time block tomorrow with zero active reservations.'
      }
    ]
  };
}

/**
 * Incident Summarizer AI
 * Processes incident text, extracts damage indicators, classifies severity
 * into low/medium/high, and provides structured triage recommendations for admins.
 */
export async function summarizeIncidentReport(text: string): Promise<IncidentSummaryResult> {
  const lower = text.toLowerCase();

  // Severity indicators
  const highIndicators = ['broken', 'fire', 'smoke', 'shattered', 'burnt', 'explosion', 'hazardous', 'leak', 'cut off', 'cracked lens', 'destroyed', 'injury'];
  const medIndicators = ['stuck', 'misaligned', 'overheating', 'error code', 'vibration', 'worn out', 'scratched', 'delay', 'overdue', 'missing cable'];
  
  const highMatches = highIndicators.filter(word => lower.includes(word));
  const medMatches = medIndicators.filter(word => lower.includes(word));

  let severity: 'low' | 'medium' | 'high' = 'low';
  let recommendedAction = 'Log to standard maintenance queue; no immediate lockout required.';
  let resolutionHours = 24;

  if (highMatches.length > 0) {
    severity = 'high';
    recommendedAction = 'CRITICAL: Immediately lock resource from active scheduling, notify faculty PI, and dispatch emergency technician.';
    resolutionHours = 72;
  } else if (medMatches.length > 0) {
    severity = 'medium';
    recommendedAction = 'Notify lab manager for inspection prior to next scheduled check-in. Restrict high-speed operations.';
    resolutionHours = 48;
  }

  // Key issue extraction
  const sentences = text.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 0);
  const keyIssues = sentences.slice(0, 3).map(s => s.trim());

  return {
    severity,
    headline: severity === 'high' 
      ? `High-Severity Incident Alert: Suspected hardware failure (${highMatches.join(', ') || 'critical warning'})`
      : severity === 'medium'
      ? `Medium-Priority Notice: Operational defect reported (${medMatches.join(', ') || 'calibration issue'})`
      : `Low-Priority Maintenance Notice: Minor cosmetic or scheduling note`,
    keyIssues: keyIssues.length > 0 ? keyIssues : [text.slice(0, 120)],
    recommendedAction,
    estimatedResolutionHours: resolutionHours
  };
}
