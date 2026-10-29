import { createClient } from '@supabase/supabase-js';
import { Profile, Resource, Booking, ConditionLog, ActivityLedgerItem } from './types';

// Default Supabase configuration from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder'));

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Initial Pre-Configured Seed Profiles
export const SEED_PROFILES: Profile[] = [
  {
    id: 'user-pankhuri-01',
    full_name: 'Pankhuri Govila (You)',
    email: 'pankhuri.govila@university.edu',
    role: 'user',
    department: 'AI & Computational Biology',
    verified_status: true,
    training_badges: ['Laser Cutter Safety Cert', 'BSL-2 Biosafety', 'GPU Slurm Cluster Certified'],
    credits_balance: 85,
    created_at: new Date().toISOString()
  },
  {
    id: 'owner-dr-thorne-02',
    full_name: 'Dr. Aris Thorne (PI)',
    email: 'a.thorne@university.edu',
    role: 'owner',
    department: 'Biotechnology & Genomics',
    verified_status: true,
    training_badges: ['BSL-2 Biosafety', 'DNA Sequencer Operator'],
    credits_balance: 100,
    created_at: new Date().toISOString()
  },
  {
    id: 'manager-elena-03',
    full_name: 'Elena Rostova (Lab Mgr)',
    email: 'e.rostova@university.edu',
    role: 'manager',
    department: 'Makerspace & Prototyping',
    verified_status: true,
    training_badges: ['Laser Cutter Safety Cert', '5-Axis CNC Certified'],
    credits_balance: 100,
    created_at: new Date().toISOString()
  },
  {
    id: 'admin-campus-04',
    full_name: 'Office of Research Integrity',
    email: 'research.admin@university.edu',
    role: 'admin',
    department: 'Campus Central Administration',
    verified_status: true,
    training_badges: ['Administrator All-Access'],
    credits_balance: 500,
    created_at: new Date().toISOString()
  }
];

// Initial Pre-Configured Seed Resources
export const SEED_RESOURCES: Resource[] = [
  {
    id: 'res-novaseq-01',
    owner_id: 'owner-dr-thorne-02',
    owner_name: 'Dr. Aris Thorne (PI)',
    title: 'Illumina NovaSeq 6000 Next-Gen Sequencer',
    category: 'Biotech Labs',
    location: 'Bio-Sciences Tower B, Room 402',
    credit_cost: 35,
    description: 'High-throughput dual-flow cell genomic sequencer. Ideal for whole-genome sequencing, single-cell transcriptomics, and meta-genomics.',
    image_url: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=800&q=80',
    availability_slots: [
      { day: 'Monday', startTime: '09:00', endTime: '13:00' },
      { day: 'Wednesday', startTime: '14:00', endTime: '18:00' },
      { day: 'Friday', startTime: '10:00', endTime: '16:00' }
    ],
    eligibility_rules: {
      required_badges: ['BSL-2 Biosafety'],
      min_department: 'All',
      notes: 'Must complete sterile decontamination cycle before checkout.'
    },
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'res-lasercutter-02',
    owner_id: 'manager-elena-03',
    owner_name: 'Elena Rostova (Lab Mgr)',
    title: 'Epilog Fusion Pro 48 Laser Cutter (120W)',
    category: 'Makerspaces',
    location: 'Engineering Hub Makerspace, Bay 3',
    credit_cost: 15,
    description: 'CO2 & Fiber dual-source precision laser cutter and engraver. Cuts up to 1/2" acrylic, birch plywood, and marks anodized aluminum.',
    image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    availability_slots: [
      { day: 'Tuesday', startTime: '10:00', endTime: '17:00' },
      { day: 'Thursday', startTime: '10:00', endTime: '17:00' },
      { day: 'Saturday', startTime: '11:00', endTime: '15:00' }
    ],
    eligibility_rules: {
      required_badges: ['Laser Cutter Safety Cert'],
      min_department: 'All',
      notes: 'No PVC or hazardous vinyl allowed due to chlorine off-gassing.'
    },
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    id: 'res-h100cluster-03',
    owner_id: 'owner-dr-thorne-02',
    owner_name: 'Dr. Aris Thorne (PI)',
    title: 'NVIDIA DGX H100 AI Compute Node (8x 80GB)',
    category: 'Compute Clusters',
    location: 'Central Supercomputing Facility, Rack 12',
    credit_cost: 25,
    description: 'Multi-GPU cluster with 640GB aggregate SXM5 VRAM and NVLink 900 GB/s. Reserved for LLM fine-tuning and structural biology simulations.',
    image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    availability_slots: [
      { day: 'Monday', startTime: '00:00', endTime: '23:59' },
      { day: 'Tuesday', startTime: '00:00', endTime: '23:59' },
      { day: 'Wednesday', startTime: '00:00', endTime: '23:59' }
    ],
    eligibility_rules: {
      required_badges: ['GPU Slurm Cluster Certified'],
      min_department: 'All',
      notes: 'Slurm job scheduler credentials checked automatically.'
    },
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'res-sonyfx6-04',
    owner_id: 'manager-elena-03',
    owner_name: 'Elena Rostova (Lab Mgr)',
    title: 'Sony FX6 Cinema Camera + Master Prime Lens Kit',
    category: 'High-End Lenses & Cameras',
    location: 'Media Arts Tech Center, Vault 04',
    credit_cost: 20,
    description: 'Full-frame 4K 120fps cinema camera package with Zeiss Master Primes (25mm, 50mm, 85mm), matte box, and wireless follow-focus.',
    image_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
    availability_slots: [
      { day: 'Wednesday', startTime: '09:00', endTime: '18:00' },
      { day: 'Friday', startTime: '09:00', endTime: '18:00' }
    ],
    eligibility_rules: {
      required_badges: ['Cleanroom Class 1000'],
      min_department: 'All',
      notes: 'Requires pelican case lock inspection upon return.'
    },
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];

// Initial Pre-Configured Seed Bookings for Demo
export const SEED_BOOKINGS: Booking[] = [
  {
    id: 'book-sample-01',
    resource_id: 'res-novaseq-01',
    resource_title: 'Illumina NovaSeq 6000 Next-Gen Sequencer',
    user_id: 'user-pankhuri-01',
    user_name: 'Pankhuri Govila (You)',
    user_department: 'AI & Computational Biology',
    status: 'approved',
    start_time: new Date(Date.now() + 3600000 * 2).toISOString(),
    end_time: new Date(Date.now() + 3600000 * 6).toISOString(),
    credit_spent: 35,
    waitlist_position: null,
    review_reason: 'Approved for RNA sequencing on cancer genome study.',
    penalty_credits: 0,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'book-sample-02',
    resource_id: 'res-lasercutter-02',
    resource_title: 'Epilog Fusion Pro 48 Laser Cutter (120W)',
    user_id: 'user-pankhuri-01',
    user_name: 'Pankhuri Govila (You)',
    user_department: 'AI & Computational Biology',
    status: 'checked_in',
    start_time: new Date(Date.now() - 3600000 * 2).toISOString(),
    end_time: new Date(Date.now() + 3600000 * 1).toISOString(),
    credit_spent: 15,
    waitlist_position: null,
    review_reason: 'Makerspace supervisor approved prototype casing cut.',
    penalty_credits: 0,
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];

// Initial Condition Logs
export const SEED_CONDITION_LOGS: ConditionLog[] = [
  {
    id: 'cond-01',
    booking_id: 'book-sample-02',
    phase: 'check_in',
    reporter_id: 'user-pankhuri-01',
    reporter_name: 'Pankhuri Govila',
    status_rating: 5,
    notes: 'Laser bed clean, honeycomb grate clear, chiller temperature verified at 19.5C. Optical lens intact.',
    media_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];

// Initial Immutable Ledger Events
export const SEED_LEDGER: ActivityLedgerItem[] = [
  {
    id: 'led-001',
    booking_id: 'book-sample-01',
    actor_id: 'user-pankhuri-01',
    actor_name: 'Pankhuri Govila',
    action: 'BOOKING_REQUESTED',
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    metadata: { credit_spent: 35, resource: 'Illumina NovaSeq 6000' }
  },
  {
    id: 'led-002',
    booking_id: 'book-sample-01',
    actor_id: 'system',
    actor_name: 'Auto-Verification Protocol',
    action: 'ELIGIBILITY_PASSED',
    timestamp: new Date(Date.now() - 3600000 * 11).toISOString(),
    metadata: { required: 'BSL-2 Biosafety', user_badges: ['BSL-2 Biosafety'] }
  },
  {
    id: 'led-003',
    booking_id: 'book-sample-01',
    actor_id: 'owner-dr-thorne-02',
    actor_name: 'Dr. Aris Thorne (PI)',
    action: 'OWNER_APPROVED',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    metadata: { reason: 'Approved for RNA sequencing on cancer genome study.' }
  },
  {
    id: 'led-004',
    booking_id: 'book-sample-02',
    actor_id: 'user-pankhuri-01',
    actor_name: 'Pankhuri Govila',
    action: 'DIGITAL_CHECK_IN_COMPLETED',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    metadata: { rating: 5, notes: 'Laser bed clean, chiller 19.5C.' }
  }
];
