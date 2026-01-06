-- AssetMX Database Schema
-- Run this in Supabase SQL Editor to set up your database

-- ============================================
-- TABLES
-- ============================================

-- Leads/Quotes table (full capture)
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contact info (captured on "Start Application" click)
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  business_name TEXT NOT NULL,
  abn TEXT NOT NULL,

  -- Quote details
  asset_type TEXT NOT NULL,
  asset_condition TEXT NOT NULL,
  loan_amount NUMERIC NOT NULL,
  term_months INTEGER NOT NULL,
  balloon_percentage NUMERIC NOT NULL,

  -- Calculated values (snapshot)
  indicative_rate NUMERIC,
  monthly_repayment NUMERIC,
  total_cost NUMERIC,
  estimated_saving NUMERIC,

  -- Lead status
  status TEXT DEFAULT 'new', -- new, contacted, qualified, converted, lost
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id)
);

-- Rate configuration table
CREATE TABLE IF NOT EXISTS rate_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type TEXT NOT NULL,
  asset_condition TEXT NOT NULL,
  base_rate NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(asset_type, asset_condition)
);

-- Fee configuration table
CREATE TABLE IF NOT EXISTS fee_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_name TEXT UNIQUE NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users (simple role-based)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  role TEXT DEFAULT 'viewer', -- viewer, editor, admin
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Leads: Anyone can insert, only admins can view/edit
CREATE POLICY "Anyone can insert leads" ON leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view leads" ON leads
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

CREATE POLICY "Admins can update leads" ON leads
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- Rate config: Public read, admin write
CREATE POLICY "Public can read rates" ON rate_config
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage rates" ON rate_config
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('editor', 'admin'))
  );

-- Fee config: Public read, admin write
CREATE POLICY "Public can read fees" ON fee_config
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage fees" ON fee_config
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('editor', 'admin'))
  );

-- Admin users: Only admins can view
CREATE POLICY "Admins can view admin_users" ON admin_users
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- ============================================
-- SEED DATA - Default Rates
-- ============================================

-- Insert default rate configuration
INSERT INTO rate_config (asset_type, asset_condition, base_rate) VALUES
  -- Vehicle rates
  ('vehicle', 'new', 6.29),
  ('vehicle', 'demo', 6.29),
  ('vehicle', 'used_0_3', 6.49),
  ('vehicle', 'used_4_7', 6.99),
  ('vehicle', 'used_8_plus', 7.49),
  -- Truck rates
  ('truck', 'new', 6.49),
  ('truck', 'demo', 6.49),
  ('truck', 'used_0_3', 6.79),
  ('truck', 'used_4_7', 7.29),
  ('truck', 'used_8_plus', 7.99),
  -- Equipment rates
  ('equipment', 'new', 6.49),
  ('equipment', 'demo', 6.79),
  ('equipment', 'used_0_3', 6.99),
  ('equipment', 'used_4_7', 7.49),
  ('equipment', 'used_8_plus', 8.29),
  -- Technology rates
  ('technology', 'new', 7.49),
  ('technology', 'demo', 7.99),
  ('technology', 'used_0_3', 8.29),
  ('technology', 'used_4_7', 9.49),
  ('technology', 'used_8_plus', 10.99)
ON CONFLICT (asset_type, asset_condition) DO NOTHING;

-- Insert default fee configuration
INSERT INTO fee_config (fee_name, amount, description) VALUES
  ('platform_fee', 800, 'AssetMX platform fee - transparent and upfront'),
  ('ppsr_fee', 7.40, 'PPSR registration fee'),
  ('lender_establishment_fee', 495, 'Lender establishment fee')
ON CONFLICT (fee_name) DO NOTHING;

-- ============================================
-- INDEXES for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_rate_config_lookup ON rate_config(asset_type, asset_condition);
