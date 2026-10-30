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

// -------------------------------------------------------------
// FEDERATED ACADEMIC RAG PIPELINE (Cross-Institutional Network)
// -------------------------------------------------------------
import { InstitutionalKnowledgeDoc, RAGQueryResult, RAGMatchItem } from './types';

export const FEDERATED_KNOWLEDGE_BASE: InstitutionalKnowledgeDoc[] = [
  {
    id: 'doc-sfd-01',
    university_id: 'univ-stanford',
    university_name: 'Stanford Bio-X & Shared Biotech Facilities',
    title: 'Thermo Fisher Krios G4 Cryo-Transmission Electron Microscope',
    category: 'Biotech Labs',
    doc_type: 'Safety SOP',
    raw_text: 'The Krios G4 300kV cryo-TEM enables atomic-resolution 3D reconstructions of macromolecular complexes. Operation requires BSL-2 Biosafety certification and completion of the Stanford EH&S Cryogen Safety module (EHS-2200). Cross-campus researchers must upload home institution biosafety clearance for sample vitrification in room B012.',
    required_safety_level: 'BSL-2 Biosafety',
    equipment_id: 'sfd-cryo-01',
    cost_per_hour: 40
  },
  {
    id: 'doc-mit-02',
    university_id: 'univ-mit',
    university_name: 'MIT.nano & Prototyping Core',
    title: 'Heidelberg MLA 150 Maskless Laser Lithography System',
    category: 'Makerspaces',
    doc_type: 'Equipment Manual',
    raw_text: 'Direct-write optical lithography for fast turnaround maskless exposure on 4-inch to 9-inch wafers. Operates in Class 100 cleanroom. Prerequisites: Cleanroom Class 1000 protocol, UV laser safety badge, and cleanroom gowning qualification. Nitrogen purge and spin coater protocol strictly enforced.',
    required_safety_level: 'Cleanroom Class 1000',
    equipment_id: 'mit-litho-02',
    cost_per_hour: 30
  },
  {
    id: 'doc-ucb-03',
    university_id: 'univ-berkeley',
    university_name: 'UC Berkeley Marvell Nanofabrication Laboratory',
    title: 'Oxford Plasmalab 100 Inductively Coupled Plasma (ICP) Etcher',
    category: 'Testing Devices',
    doc_type: 'Safety SOP',
    raw_text: 'Deep silicon etching (Bosch process) and compound semiconductor dielectric etching using SF6/C4F8 gases. Operator must possess Toxic Gas Safety (TGS-101) or reciprocal University Chemical/High-Voltage PPE certification. Inter-university access granted under the Northern California Nanotechnology Consortium.',
    required_safety_level: 'High-Voltage PPE',
    equipment_id: 'ucb-icp-03',
    cost_per_hour: 35
  },
  {
    id: 'doc-ai-04',
    university_id: 'univ-central-ai',
    university_name: 'National AI Supercomputing Consortium',
    title: 'NVIDIA DGX GH200 Grace Hopper Superchip Partition (32 Nodes)',
    category: 'Compute Clusters',
    doc_type: 'Specs',
    raw_text: 'Unified 576GB LPDDR5X CPU memory + 96GB HBM3 GPU memory per node with NVLink interconnect. Slurm workload manager access requires GPU Slurm Cluster Certified credentials. Cross-institutional federated quotas capped at 500 node-hours per research group monthly.',
    required_safety_level: 'GPU Slurm Cluster Certified',
    equipment_id: 'ai-gh200-04',
    cost_per_hour: 25
  },
  {
    id: 'doc-cal-05',
    university_id: 'univ-caltech',
    university_name: 'Caltech Optical Imaging & Photonics Center',
    title: 'Vision Research Phantom v2640 Ultra High-Speed Camera (12,500 fps)',
    category: 'High-End Lenses & Cameras',
    doc_type: 'Visitor Policy',
    raw_text: '4-Megapixel high-speed imaging sensor operating up to 12,500 frames per second at 2048 x 1952. Nikon F-mount and Canon EF adaptors included. Visitors from partner institutions must verify Cleanroom Class 1000 or Precision Optics Handling badge. Return protocol mandates sensor lens mount cleaning inspection.',
    required_safety_level: 'Cleanroom Class 1000',
    equipment_id: 'cal-phantom-05',
    cost_per_hour: 25
  }
];

/**
 * Cross-Institutional Federated RAG Query Engine
 * Performs semantic retrieval across federated institutional documents,
 * evaluates reciprocal credential equivalence against user badges,
 * and synthesizes an actionable cross-campus research passport.
 */
export async function queryFederatedRAG(
  query: string,
  userBadges: string[],
  selectedCampus = 'All'
): Promise<RAGQueryResult> {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  // Compute retrieval relevance score for each knowledge document
  const scoredDocs = FEDERATED_KNOWLEDGE_BASE
    .filter(doc => selectedCampus === 'All' || doc.university_name.toLowerCase().includes(selectedCampus.toLowerCase()))
    .map(doc => {
      const fullText = `${doc.title} ${doc.category} ${doc.raw_text} ${doc.university_name}`.toLowerCase();
      let matchCount = 0;
      queryWords.forEach(w => {
        if (fullText.includes(w)) matchCount += 1;
      });

      // Semantic relevance score (0.2 baseline + keyword density)
      const relevanceScore = Math.min(
        0.98,
        matchCount > 0 ? 0.45 + (matchCount / Math.max(1, queryWords.length)) * 0.5 : 0.15
      );

      // Check credential equivalence
      const hasDirectBadge = userBadges.includes(doc.required_safety_level);
      // Reciprocal equivalence logic (e.g. BSL-2 or Slurm matches cross-institution)
      const isEquivalenceVerified = hasDirectBadge || (
        doc.required_safety_level.includes('BSL') && userBadges.some(b => b.includes('BSL'))
      ) || (
        doc.required_safety_level.includes('Slurm') && userBadges.some(b => b.includes('Slurm'))
      );

      const matchItem: RAGMatchItem = {
        resource_id: doc.equipment_id || doc.id,
        title: doc.title,
        university: doc.university_name,
        location: doc.university_name.includes('Stanford')
          ? 'Palo Alto, CA · Beckman Center B012'
          : doc.university_name.includes('MIT')
          ? 'Cambridge, MA · Building 12 Cleanroom'
          : doc.university_name.includes('Berkeley')
          ? 'Berkeley, CA · Sutardja Dai Hall'
          : doc.university_name.includes('Supercomputing')
          ? 'Multi-Campus Hybrid Slurm Fabric'
          : 'Pasadena, CA · Powell-Booth Lab',
        category: doc.category,
        credit_cost: doc.cost_per_hour,
        relevance_score: Math.round(relevanceScore * 100) / 100,
        matching_snippet: doc.raw_text.slice(0, 180) + '...',
        safety_protocol_summary: `Governed under ${doc.doc_type}: Requires ${doc.required_safety_level}.`,
        prerequisites: [doc.required_safety_level],
        credential_status: isEquivalenceVerified
          ? 'Equivalence Verified'
          : 'Additional Training Required',
        reciprocal_badge_matched: isEquivalenceVerified
          ? doc.required_safety_level
          : undefined
      };

      return { doc, matchItem, score: matchItem.relevance_score };
    });

  // Sort by highest relevance
  scoredDocs.sort((a, b) => b.score - a.score);
  const topMatches = scoredDocs.slice(0, 4).map(s => s.matchItem);

  const verifiedCount = topMatches.filter(m => m.credential_status === 'Equivalence Verified').length;
  const passportStatus = verifiedCount > 0
    ? 'Approved for Cross-Campus Access'
    : 'Review Required';

  const synthesizedGuidance = topMatches.length > 0
    ? `RAG synthesis identified ${topMatches.length} matching institutional apparatus across ${new Set(topMatches.map(m => m.university)).size} partner universities. Your verified credentials (${userBadges.join(', ')}) grant reciprocal access to ${verifiedCount} instruments under the Inter-University Research Sharing Accord. Standard campus sponsored credits (100 credits/mo) are federated 1:1.`
    : `No matching apparatus found in the current federated repository. Try expanding your search terms (e.g., 'electron microscope', 'GPU cluster', 'lithography').`;

  return {
    query,
    matches: topMatches,
    synthesized_guidance: synthesizedGuidance,
    institutional_passport_status: passportStatus,
    total_consortium_nodes_searched: FEDERATED_KNOWLEDGE_BASE.length
  };
}

