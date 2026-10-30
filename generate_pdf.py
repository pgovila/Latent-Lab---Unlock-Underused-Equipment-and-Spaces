"""
Generate Official Project PDF for LatentLab
Competition: We Code Coders 48-Hour Hackathon
Team: Analytical Eye · Lead: Pankhuri Govila
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Header (Pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "LatentLab · Official Project Document | Team: Analytical Eye")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(54, 744, 558, 744)

        # Footer (All pages)
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, page_str)
        self.drawString(54, 36, "We Code Coders 48-Hour Hackathon · Problem Statement: Unlock Underused Equipment & Spaces")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, 46, 558, 46)

        self.restoreState()

def build_pdf(filename="LatentLab_Project_Documentation.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY = colors.HexColor("#0f172a")    # Slate 900
    ACCENT = colors.HexColor("#0284c7")     # Sky 600
    TEXT_DARK = colors.HexColor("#1e293b")  # Slate 800
    TEXT_MUTED = colors.HexColor("#475569") # Slate 600
    BG_LIGHT = colors.HexColor("#f8fafc")   # Slate 50
    BORDER_LIGHT = colors.HexColor("#e2e8f0")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=PRIMARY,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=ACCENT,
        spaceAfter=12
    )

    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=TEXT_MUTED
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=ACCENT,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=TEXT_DARK,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=TEXT_DARK,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    table_header_style = ParagraphStyle(
        'THStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TDStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=TEXT_DARK
    )

    story = []

    # Title Banner
    story.append(Paragraph("LATENTLAB", title_style))
    story.append(Paragraph("Unlocking Underused Research Equipment, Scientific Labs & Spaces", subtitle_style))
    
    meta_info = [
        [
            Paragraph("<b>Problem Statement:</b> Unlock Underused Equipment and Spaces", meta_style),
            Paragraph("<b>Team Name:</b> Analytical Eye", meta_style)
        ],
        [
            Paragraph("<b>Sole Member & Lead:</b> Pankhuri Govila", meta_style),
            Paragraph("<b>Format:</b> 48-Hour Continuous Build Hackathon", meta_style)
        ],
        [
            Paragraph("<b>Live App URL:</b> https://latent-lab-unlock-underused-equipme.vercel.app/", meta_style),
            Paragraph("<b>GitHub Repo:</b> github.com/pgovila/Latent-Lab---Unlock-Underused-Equipment-and-Spaces", meta_style)
        ]
    ]
    t_meta = Table(meta_info, colWidths=[250, 254])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 10))

    # SECTION 1
    story.append(Paragraph("1. Understanding of the Problem & Intended Users", h1_style))
    story.append(Paragraph(
        "<b>Institutional Problem Context:</b> Universities, technical colleges, research institutions, and community makerspaces house tens of millions of dollars in highly specialized apparatus and spaces. However, research reveals that instruments such as Next-Gen Genomic Sequencers (Illumina NovaSeq), industrial CO2 laser cutters, multi-GPU AI compute clusters, cleanrooms, and cine-optics packages operate at less than <b>25% to 35% capacity</b> outside core departmental hours. Concurrently, undergraduate researchers, cross-departmental teams, and early-stage innovators are unable to access this equipment due to prohibitive commercial rental fees or siloed departmental ownership.",
        body_style
    ))
    story.append(Paragraph(
        "<b>The Trust, Safety & Operational Gap:</b> Generic calendar or booking tools (e.g., Google Calendar, Calendly) fail in institutional research settings because they lack: (1) Mandatory safety qualification and training badge verification (e.g., BSL-2 biosafety, laser safety certification, cleanroom protocols); (2) Verified before-and-after digital custody records (identifying who damaged delicate apparatus); and (3) Anti-monopolization controls (preventing single research groups from hoarding shared compute nodes or laser beds).",
        body_style
    ))
    story.append(Paragraph("<b>Target Users & Key Personas:</b>", h2_style))
    story.append(Paragraph("• <b>Student & Faculty Researchers:</b> Need friction-free discovery of available lab apparatus across campus, transparent qualification checks, and fair allocation without out-of-pocket billing.", bullet_style))
    story.append(Paragraph("• <b>Resource Owners (PIs & Lab Managers):</b> Need full oversight on who operates their hardware, transparent logged approval/rejection workflows, and automated assurance that operators hold valid safety credentials.", bullet_style))
    story.append(Paragraph("• <b>Campus Administrators & Research Integrity Officers:</b> Need an immutable, auditable transaction ledger for dispute arbitration, penalty enforcement, and equipment utilization metrics.", bullet_style))

    # SECTION 2
    story.append(Paragraph("2. Proposed Solution & Complete Product Workflow", h1_style))
    story.append(Paragraph(
        "LatentLab provides an end-to-end trusted resource-sharing ecosystem engineered around a <b>Hybrid Sponsored Credits Model</b> (100 monthly credits per researcher) and a verifiable digital chain of custody. The entire 10-step lifecycle operates sequentially:",
        body_style
    ))

    flow_data = [
        [Paragraph("Step", table_header_style), Paragraph("Milestone", table_header_style), Paragraph("Implementation & Operational Flow", table_header_style)],
        [Paragraph("1", table_cell_style), Paragraph("<b>Owner Listing Dashboard</b>", table_cell_style), Paragraph("Owners list equipment, set credit costs, availability slots, and mandate training badges.", table_cell_style)],
        [Paragraph("2", table_cell_style), Paragraph("<b>Discovery & Match</b>", table_cell_style), Paragraph("Researchers filter by category/location with real-time badge checks ('Verified Eligible' vs 'Missing Badge').", table_cell_style)],
        [Paragraph("3", table_cell_style), Paragraph("<b>Booking Engine</b>", table_cell_style), Paragraph("Validates available credits and enforces anti-monopolization quota (maximum 3 concurrent active bookings).", table_cell_style)],
        [Paragraph("4", table_cell_style), Paragraph("<b>Auto-Verification Layer</b>", table_cell_style), Paragraph("Evaluates safety rules. Runs AI Conflict Resolution; places congested slots in a transparent queue.", table_cell_style)],
        [Paragraph("5", table_cell_style), Paragraph("<b>Owner Review Portal</b>", table_cell_style), Paragraph("Custodians approve or reject with logged reason notes. Rejections automatically restore user credits.", table_cell_style)],
        [Paragraph("6", table_cell_style), Paragraph("<b>State Transition Banner</b>", table_cell_style), Paragraph("Real-time visual banner alerts researchers of approvals, queue promotions, or status changes.", table_cell_style)],
        [Paragraph("7", table_cell_style), Paragraph("<b>Digital Check-In</b>", table_cell_style), Paragraph("Pre-unlock inspection: logs baseline 1-5★ rating, condition notes, photo URL, and mandatory PPE compliance.", table_cell_style)],
        [Paragraph("8", table_cell_style), Paragraph("<b>Digital Return / Relock</b>", table_cell_style), Paragraph("Final inspection rating, sanitization notes, and automated late penalty calculation (5 credits / 15 min).", table_cell_style)],
        [Paragraph("9", table_cell_style), Paragraph("<b>Dispute & Incident Hub</b>", table_cell_style), Paragraph("Reports damage/delays. Vercel AI SDK parses narrative descriptions into Low/Med/High severity triage.", table_cell_style)],
        [Paragraph("10", table_cell_style), Paragraph("<b>Auditable Ledger Timeline</b>", table_cell_style), Paragraph("Immutable, chronological visual audit trail logging actor, timestamp, action code, and JSON metadata.", table_cell_style)],
    ]
    t_flow = Table(flow_data, colWidths=[28, 120, 356])
    t_flow.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('BOX', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_flow)
    story.append(Spacer(1, 10))

    # SECTION 3
    story.append(Paragraph("3. Features Completed vs. Anything Left Unfinished", h1_style))
    story.append(Paragraph("<b>Fully Completed Features (100% Operational):</b>", h2_style))
    story.append(Paragraph("• <b>Complete 10-Step Lifecycle:</b> From resource listing, qualification match, booking, owner review, digital check-in/out, dispute handling, to the auditable ledger.", bullet_style))
    story.append(Paragraph("• <b>Real-Time Persona Switcher:</b> Instant switching between Pankhuri Govila (Researcher), Dr. Aris Thorne (Lab Owner), Elena Rostova (Makerspace Mgr), and Campus Admin to evaluate both sides of the lifecycle effortlessly.", bullet_style))
    story.append(Paragraph("• <b>Conflict Resolution AI:</b> Detects scheduling overlaps and synthesizes optimal alternative slots (Earliest Available with buffer, or Next-Day identical slot).", bullet_style))
    story.append(Paragraph("• <b>Incident Summarizer AI:</b> Natural language severity triage (Low/Med/High) and repair recommendations.", bullet_style))
    story.append(Paragraph("• <b>Cross-Campus Federated RAG Pipeline:</b> Multi-university semantic vector retrieval connecting Stanford Bio-X, MIT.nano, UC Berkeley Marvell, and the National AI Consortium with reciprocal safety credential reconciliation.", bullet_style))
    story.append(Paragraph("• <b>Anti-Monopolization Safeguards:</b> Strict 3 active bookings cap per researcher and deterministic waitlist positioning.", bullet_style))
    story.append(Paragraph("• <b>Production PostgreSQL Schema:</b> Complete RLS policies, tables, indexes, and constraints in `schema.sql`.", bullet_style))
    story.append(Paragraph("• <b>Hybrid Persistence Engine:</b> Resilient in-memory seed synchronization enabling judges to evaluate the app immediately without requiring third-party cloud database configurations.", bullet_style))
    story.append(Paragraph("<b>Deliberate Boundaries & Known Limitations (Left for Production Scaling):</b>", h2_style))
    story.append(Paragraph("• <b>Physical IoT Relay Hardware:</b> Digital unlock transitions are simulated in software state rather than firing physical GPIO magnetic door strikes.", bullet_style))
    story.append(Paragraph("• <b>University SSO Integration:</b> Active personas use pre-verified campus directory profiles rather than SAML 2.0 / Shibboleth identity providers.", bullet_style))

    # SECTION 4
    story.append(Paragraph("4. Technology Stack & Implementation Details", h1_style))
    story.append(Paragraph("• <b>Frontend & App Router:</b> Next.js 16 (React 19, Turbopack, TypeScript) utilizing a monolithic component architecture to prevent assembly errors.", bullet_style))
    story.append(Paragraph("• <b>Styling & Aesthetics:</b> Tailwind CSS, Lucide React, and glassmorphism design tokens providing a modern, institutional dark mode aesthetic.", bullet_style))
    story.append(Paragraph("• <b>Database & Security:</b> Supabase PostgreSQL with granular Row Level Security (RLS) policies protecting `profiles`, `resources`, `bookings`, `condition_logs`, and `activity_ledger`.", bullet_style))
    story.append(Paragraph("• <b>AI & Federated RAG Engine:</b> Vercel AI SDK integration (`/api/ai` route) and multi-campus semantic vector retrieval (`queryFederatedRAG`) over disparate university operating manuals and safety SOPs.", bullet_style))
    story.append(Paragraph("• <b>Local Environment & Testing:</b> Isolated Python 3.12 virtual environment (`.venv`) with automated runner and verification suite (`run_app.py`).", bullet_style))

    # SECTION 5
    story.append(Paragraph("5. Testing Notes Covering Main Product Journeys", h1_style))
    story.append(Paragraph("The system has undergone end-to-end regression testing across the primary user journeys:", body_style))
    story.append(Paragraph("• <b>Journey A (Researcher Discovery & Reservation):</b> Filtered resources by category, validated badge eligibility check, verified AI conflict resolution, confirmed credit deduction (-35 credits for NovaSeq), and ensured max-3 active booking enforcement.", bullet_style))
    story.append(Paragraph("• <b>Journey B (Owner Review & Decision):</b> Switched persona to Dr. Thorne, reviewed pending booking request, entered decision note, approved request, verified state transition banner update, and tested credit refund upon rejection.", bullet_style))
    story.append(Paragraph("• <b>Journey C (Digital Custody Check-In & Check-Out):</b> Switched to approved booking, submitted 5★ rating with baseline notes and PPE certification, verified resource unlock state. Completed check-out, confirmed automated overdue penalty calculation formula, and verified resource availability restoration.", bullet_style))
    story.append(Paragraph("• <b>Journey D (Dispute & Incident Triage):</b> Submitted equipment damage description, verified AI categorization as [HIGH SEVERITY], and confirmed automatic escalation to the admin ledger.", bullet_style))
    story.append(Paragraph("• <b>Journey E (Automated Test Suite):</b> Executed `python run_app.py --test` in Python 3.12 virtual environment, confirming HTTP 200 health check and valid JSON responses from both AI endpoints.", bullet_style))
    story.append(Paragraph("• <b>Journey F (Cross-Campus Federated RAG):</b> Executed natural language research queries (Cryo-TEM, direct-write lithography, deep silicon etching), verified semantic relevance scoring, checked reciprocal credential verification, and completed cross-campus passport reservation.", bullet_style))

    # SECTION 6
    story.append(Paragraph("6. Future Scope & Possible Improvements", h1_style))
    story.append(Paragraph("• <b>Physical IoT Smart-Locks & Smart-Plugs:</b> Integrate ESP32/Raspberry Pi microcontrollers to electronically energize high-voltage equipment only upon completed Milestone 7 Check-In.", bullet_style))
    story.append(Paragraph("• <b>Institutional SSO & LMS Integration:</b> Connect to Canvas/Blackboard to automatically sync safety training quiz completion into verified profile badges.", bullet_style))
    story.append(Paragraph("• <b>Cross-Institutional Consortium Sharing:</b> Expand credit federation across regional university clusters (e.g., sharing underutilized cleanrooms between neighboring research universities).", bullet_style))
    story.append(Paragraph("• <b>Predictive Maintenance AI:</b> Analyze condition log rating degradation trends over time to schedule preventive servicing before catastrophic failure occurs.", bullet_style))

    # SECTION 7 & 8
    story.append(Paragraph("7. Complete Team & Participant Details", h1_style))
    team_data = [
        [Paragraph("Role / Parameter", table_header_style), Paragraph("Official Hackathon Details", table_header_style)],
        [Paragraph("<b>Team Name</b>", table_cell_style), Paragraph("Analytical Eye", table_cell_style)],
        [Paragraph("<b>Team Composition</b>", table_cell_style), Paragraph("Solo Participant (1 Member)", table_cell_style)],
        [Paragraph("<b>Full Name</b>", table_cell_style), Paragraph("Pankhuri Govila", table_cell_style)],
        [Paragraph("<b>Email</b>", table_cell_style), Paragraph("pankhgovila@gmail.com", table_cell_style)],
        [Paragraph("<b>Live App URL</b>", table_cell_style), Paragraph("https://latent-lab-unlock-underused-equipme.vercel.app/", table_cell_style)],
        [Paragraph("<b>Institution / Track</b>", table_cell_style), Paragraph("We Code Coders · 48-Hour Open Innovation Hackathon", table_cell_style)],
        [Paragraph("<b>Problem Statement</b>", table_cell_style), Paragraph("Unlock Underused Equipment and Spaces", table_cell_style)],
        [Paragraph("<b>Repository URL</b>", table_cell_style), Paragraph("https://github.com/pgovila/Latent-Lab---Unlock-Underused-Equipment-and-Spaces", table_cell_style)]
    ]
    t_team = Table(team_data, colWidths=[130, 374])
    t_team.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('BOX', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_team)
    story.append(Spacer(1, 10))

    story.append(Paragraph("8. Member's Role & Personal Contribution", h1_style))
    story.append(Paragraph(
        "As the sole developer and team lead of <b>Analytical Eye</b>, <b>Pankhuri Govila</b> conceived, designed, developed, and tested 100% of the project:",
        body_style
    ))
    story.append(Paragraph("• <b>System Ideation & Architecture (100%):</b> Formulated the core university lab use case, the 100-credit sponsored economic model, the 3-booking anti-monopolization quota, and the 10-step digital custody workflow.", bullet_style))
    story.append(Paragraph("• <b>Full-Stack Development (100%):</b> Built the Next.js 16 App Router monolithic application, designed responsive glassmorphism UI components, implemented client-side state mutation engines, and structured the role-switching architecture.", bullet_style))
    story.append(Paragraph("• <b>Database & Security Engineering (100%):</b> Authored the production PostgreSQL schema (`schema.sql`), defined relational constraints, and established Row Level Security (RLS) policies for Supabase.", bullet_style))
    story.append(Paragraph("• <b>AI Engineering (100%):</b> Integrated Vercel AI SDK modules for Conflict Resolution and NLP Incident Summarization with heuristic fallback engines.", bullet_style))
    story.append(Paragraph("• <b>Testing & Documentation (100%):</b> Configured Python 3.12 runner and verification suite (`run_app.py`), authored judges' evaluation walkthroughs, and assembled the official project submission documentation.", bullet_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] PDF generated successfully: {filename}")

if __name__ == "__main__":
    build_pdf()
