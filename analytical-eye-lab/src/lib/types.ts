export type UserRole = 'user' | 'owner' | 'manager' | 'admin';

export type BookingStatus = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'waitlisted' 
  | 'checked_in' 
  | 'returned' 
  | 'disputed';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department: string;
  verified_status: boolean;
  training_badges: string[];
  credits_balance: number;
  created_at: string;
}

export interface AvailabilitySlot {
  day: string;
  startTime: string;
  endTime: string;
}

export interface EligibilityRules {
  required_badges: string[];
  min_department?: string;
  notes?: string;
}

export interface Resource {
  id: string;
  owner_id: string;
  owner_name?: string;
  title: string;
  category: 'Biotech Labs' | 'Makerspaces' | 'High-End Lenses & Cameras' | 'Compute Clusters' | 'Testing Devices';
  location: string;
  credit_cost: number;
  description: string;
  image_url: string;
  availability_slots: AvailabilitySlot[];
  eligibility_rules: EligibilityRules;
  is_active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  resource_id: string;
  resource_title?: string;
  user_id: string;
  user_name?: string;
  user_department?: string;
  status: BookingStatus;
  start_time: string;
  end_time: string;
  credit_spent: number;
  waitlist_position?: number | null;
  review_reason?: string;
  penalty_credits?: number;
  created_at: string;
  updated_at: string;
}

export interface ConditionLog {
  id: string;
  booking_id: string;
  phase: 'check_in' | 'check_out';
  reporter_id: string;
  reporter_name?: string;
  status_rating: number; // 1 to 5
  notes: string;
  media_url?: string;
  created_at: string;
}

export interface ActivityLedgerItem {
  id: string;
  booking_id?: string | null;
  actor_id: string;
  actor_name: string;
  action: string;
  timestamp: string;
  metadata: Record<string, any>;
}
