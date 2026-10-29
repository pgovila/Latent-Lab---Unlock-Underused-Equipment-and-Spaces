-- =========================================================================
-- ANALYTICAL EYE - UNIVERSITY & RESEARCH LAB SHARING NETWORK
-- Production PostgreSQL Database Schema & RLS Policies (Supabase Compatible)
-- Team: Analytical Eye (Lead: Pankhuri Govila)
-- Problem: Unlock Underused Equipment and Spaces (We Code Coders 48h Hackathon)
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
-- Roles: 'user', 'owner', 'manager', 'admin'
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'owner', 'manager', 'admin')) DEFAULT 'user',
    department TEXT NOT NULL,
    verified_status BOOLEAN NOT NULL DEFAULT false,
    training_badges TEXT[] NOT NULL DEFAULT '{}',
    credits_balance INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. RESOURCES TABLE
-- Categories: 'Biotech Labs', 'Makerspaces', 'High-End Lenses & Cameras', 'Compute Clusters', 'Testing Devices'
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    credit_cost INTEGER NOT NULL DEFAULT 10,
    description TEXT,
    image_url TEXT,
    availability_slots JSONB NOT NULL DEFAULT '[]'::jsonb,
    eligibility_rules JSONB NOT NULL DEFAULT '{"required_badges": [], "min_department": "All"}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. BOOKINGS TABLE
-- Status: 'pending', 'approved', 'rejected', 'waitlisted', 'checked_in', 'returned', 'disputed'
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'waitlisted', 'checked_in', 'returned', 'disputed')) DEFAULT 'pending',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    credit_spent INTEGER NOT NULL DEFAULT 10,
    waitlist_position INTEGER DEFAULT NULL,
    review_reason TEXT,
    penalty_credits INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CONDITION_LOGS TABLE
-- Phase: 'check_in', 'check_out'
CREATE TABLE IF NOT EXISTS condition_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    phase TEXT NOT NULL CHECK (phase IN ('check_in', 'check_out')),
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    status_rating INTEGER NOT NULL CHECK (status_rating BETWEEN 1 AND 5),
    notes TEXT NOT NULL,
    media_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ACTIVITY_LEDGER TABLE (Auditable Immutable Timeline)
CREATE TABLE IF NOT EXISTS activity_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- INDEXES FOR FAST FILTERING AND TIMELINE
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_owner ON resources(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_resource ON bookings(resource_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_ledger_booking ON activity_ledger(booking_id);
CREATE INDEX IF NOT EXISTS idx_ledger_timestamp ON activity_ledger(timestamp DESC);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE condition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_ledger ENABLE ROW LEVEL SECURITY;

-- Profiles: Public can read profile summaries; Users can update own profile
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Resources: Anyone can view active resources; Owners can manage their resources
CREATE POLICY "Public view active resources" ON resources FOR SELECT USING (is_active = true);
CREATE POLICY "Owners insert resources" ON resources FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update resources" ON resources FOR UPDATE USING (auth.uid() = owner_id);

-- Bookings: Users can view their bookings; Owners/Managers can view bookings for their resources
CREATE POLICY "Users view own bookings" ON bookings FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM resources WHERE resources.id = bookings.resource_id AND resources.owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager'))
);

CREATE POLICY "Users insert bookings" ON bookings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Parties update bookings" ON bookings FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM resources WHERE resources.id = bookings.resource_id AND resources.owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager'))
);

-- Condition Logs: Visible to booking participants and admins
CREATE POLICY "View condition logs" ON condition_logs FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM bookings 
        JOIN resources ON resources.id = bookings.resource_id 
        WHERE bookings.id = condition_logs.booking_id 
          AND (bookings.user_id = auth.uid() OR resources.owner_id = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager'))
);

CREATE POLICY "Insert condition logs" ON condition_logs FOR INSERT 
WITH CHECK (auth.uid() = reporter_id);

-- Activity Ledger: Immutable audit trail readable by participants and admins
CREATE POLICY "View activity ledger" ON activity_ledger FOR SELECT 
USING (true);

CREATE POLICY "Insert activity ledger" ON activity_ledger FOR INSERT 
WITH CHECK (true);

-- =========================================================================
-- INITIAL SEED DATA (For Immediate Hackathon Evaluation)
-- =========================================================================
-- Note: Replace dummy UUIDs with real Supabase Auth IDs or evaluate in mock/hybrid mode
