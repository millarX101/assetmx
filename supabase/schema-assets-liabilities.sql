-- AssetMX Schema - Personal Assets & Liabilities
-- Run this AFTER schema-applications.sql in Supabase SQL Editor

-- ============================================
-- PERSONAL ASSETS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS personal_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Link to application and director
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  director_index INTEGER DEFAULT 0, -- Which director (0 = primary)

  -- Asset details
  asset_type TEXT NOT NULL, -- property, investment_property, vehicles
  description TEXT, -- Optional description
  estimated_value NUMERIC NOT NULL,

  -- Linked liability (if any)
  has_liability BOOLEAN DEFAULT FALSE,
  liability_balance NUMERIC, -- Mortgage balance, car loan balance etc
  lender TEXT -- Who holds the loan
);

-- ============================================
-- PERSONAL LIABILITIES TABLE
-- (For liabilities without corresponding assets - credit cards, personal loans etc)
-- ============================================

CREATE TABLE IF NOT EXISTS personal_liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Link to application and director
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  director_index INTEGER DEFAULT 0, -- Which director (0 = primary)

  -- Liability details
  liability_type TEXT NOT NULL, -- credit_card, personal_loan, hecs, other
  description TEXT, -- Optional description
  lender TEXT,
  credit_limit NUMERIC, -- For credit cards
  balance NUMERIC NOT NULL,
  monthly_payment NUMERIC
);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE personal_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_liabilities ENABLE ROW LEVEL SECURITY;

-- Personal assets: Public insert, admin read
CREATE POLICY "Anyone can create personal assets" ON personal_assets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view personal assets" ON personal_assets
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

CREATE POLICY "Anyone can update personal assets" ON personal_assets
  FOR UPDATE USING (true);

-- Personal liabilities: Public insert, admin read
CREATE POLICY "Anyone can create personal liabilities" ON personal_liabilities
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view personal liabilities" ON personal_liabilities
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

CREATE POLICY "Anyone can update personal liabilities" ON personal_liabilities
  FOR UPDATE USING (true);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_personal_assets_application ON personal_assets(application_id);
CREATE INDEX IF NOT EXISTS idx_personal_assets_director ON personal_assets(application_id, director_index);
CREATE INDEX IF NOT EXISTS idx_personal_liabilities_application ON personal_liabilities(application_id);
CREATE INDEX IF NOT EXISTS idx_personal_liabilities_director ON personal_liabilities(application_id, director_index);

-- ============================================
-- TRIGGERS for updated_at
-- ============================================

CREATE TRIGGER personal_assets_updated_at
  BEFORE UPDATE ON personal_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER personal_liabilities_updated_at
  BEFORE UPDATE ON personal_liabilities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
