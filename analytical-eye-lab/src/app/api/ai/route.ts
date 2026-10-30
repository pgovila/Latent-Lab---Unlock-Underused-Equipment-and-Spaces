import { NextResponse } from 'next/server';
import { analyzeBookingConflict, summarizeIncidentReport } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    if (action === 'analyze_conflict') {
      const { resourceId, startTime, endTime, existingBookings } = payload;
      const result = await analyzeBookingConflict(resourceId, startTime, endTime, existingBookings);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'summarize_incident') {
      const { description } = payload;
      const result = await summarizeIncidentReport(description);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'query_federated_rag') {
      const { query, userBadges, selectedCampus } = payload;
      const { queryFederatedRAG } = await import('@/lib/ai');
      const result = await queryFederatedRAG(query, userBadges || [], selectedCampus || 'All');
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
