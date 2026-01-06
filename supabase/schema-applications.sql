-- AssetMX Extended Schema - Applications & AI Features
-- Run this AFTER schema.sql in Supabase SQL Editor

-- ============================================
-- APPLICATIONS TABLE (Full intake data)
-- ============================================

CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Link to original lead (optional - for tracking)
  lead_id UUID REFERENCES leads(id),

  -- Application Status
  status TEXT DEFAULT 'draft', -- draft, submitted, eligible, ineligible, approved, declined, settled
  step_completed INTEGER DEFAULT 0, -- Track wizard progress (0-5)

  -- ====== STEP 1: Business Details ======
  abn TEXT NOT NULL,
  abn_status TEXT, -- Active, Cancelled
  abn_registered_date DATE, -- From ABN lookup
  entity_name TEXT NOT NULL,
  entity_type TEXT, -- Company, Trust, Sole Trader, Partnership
  gst_registered BOOLEAN,
  gst_registered_date DATE,
  trading_name TEXT,
  business_address TEXT,
  business_state TEXT,
  business_postcode TEXT,

  -- ====== STEP 2: Director/Guarantor Details ======
  directors JSONB DEFAULT '[]', -- Array of director objects
  -- Each director: { firstName, lastName, dob, email, phone, address, licenceNumber, licenceState }
  primary_contact_index INTEGER DEFAULT 0, -- Which director is primary contact

  -- ====== STEP 3: Asset Details ======
  asset_type TEXT NOT NULL, -- vehicle, truck, equipment, technology
  asset_category TEXT, -- More specific: car, ute, van, prime_mover, trailer, excavator, etc
  asset_condition TEXT NOT NULL, -- new, demo, used_0_3, used_4_7, used_8_plus
  asset_year INTEGER,
  asset_make TEXT,
  asset_model TEXT,
  asset_description TEXT,
  supplier_name TEXT,
  supplier_abn TEXT,
  asset_price_ex_gst NUMERIC,
  asset_gst NUMERIC,
  asset_price_inc_gst NUMERIC,

  -- ====== STEP 4: Loan Details ======
  loan_amount NUMERIC NOT NULL,
  deposit_amount NUMERIC DEFAULT 0,
  trade_in_amount NUMERIC DEFAULT 0,
  term_months INTEGER NOT NULL,
  balloon_percentage NUMERIC DEFAULT 0,
  balloon_amount NUMERIC DEFAULT 0,
  business_use_percentage INTEGER DEFAULT 100, -- 0-100%

  -- ====== CALCULATED QUOTE ======
  indicative_rate NUMERIC,
  monthly_repayment NUMERIC,
  total_interest NUMERIC,
  total_repayments NUMERIC,
  total_fees NUMERIC,
  total_cost NUMERIC,

  -- ====== ELIGIBILITY CHECK RESULTS ======
  eligibility_passed BOOLEAN,
  eligibility_checks JSONB DEFAULT '{}',
  -- { abnAge: {passed: true, value: 36, required: 24}, gstRegistered: {passed: true}, ... }
  eligibility_fail_reasons TEXT[],

  -- ====== SCORING (Later phase) ======
  credit_score INTEGER,
  risk_score INTEGER,
  auto_decision TEXT, -- approve, refer, decline

  -- ====== DOCUMENTS (Later phase) ======
  documents_required TEXT[], -- ['drivers_licence', 'bas_last_2', 'asset_invoice']
  documents_uploaded TEXT[],
  documents_verified BOOLEAN DEFAULT FALSE,

  -- ====== ADMIN ======
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT,
  internal_notes TEXT -- Staff only
);

-- ============================================
-- ELIGIBILITY RULES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS eligibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT UNIQUE NOT NULL,
  rule_type TEXT NOT NULL, -- hard_decline, soft_flag, info
  field_name TEXT NOT NULL, -- What field to check
  operator TEXT NOT NULL, -- gte, lte, eq, neq, in, not_in
  value JSONB NOT NULL, -- The comparison value
  error_message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default eligibility rules
INSERT INTO eligibility_rules (rule_name, rule_type, field_name, operator, value, error_message) VALUES
  ('abn_age_minimum', 'hard_decline', 'abn_age_months', 'gte', '24', 'ABN must be registered for at least 24 months'),
  ('gst_registered', 'hard_decline', 'gst_registered', 'eq', 'true', 'Business must be GST registered'),
  ('loan_minimum', 'hard_decline', 'loan_amount', 'gte', '5000', 'Minimum loan amount is $5,000'),
  ('loan_maximum', 'hard_decline', 'loan_amount', 'lte', '500000', 'Maximum loan amount is $500,000'),
  ('term_minimum', 'hard_decline', 'term_months', 'gte', '12', 'Minimum term is 12 months'),
  ('term_maximum', 'hard_decline', 'term_months', 'lte', '84', 'Maximum term is 84 months'),
  ('balloon_maximum', 'hard_decline', 'balloon_percentage', 'lte', '50', 'Maximum balloon is 50%'),
  ('director_required', 'hard_decline', 'directors_count', 'gte', '1', 'At least one director/guarantor is required'),
  ('business_use_minimum', 'soft_flag', 'business_use_percentage', 'gte', '50', 'Business use should be at least 50% for best rates')
ON CONFLICT (rule_name) DO NOTHING;

-- ============================================
-- LENDER POLICIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS lender_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,

  -- Asset policies
  asset_types_allowed TEXT[], -- ['vehicle', 'truck', 'equipment']
  max_asset_age_at_term_end INTEGER, -- e.g., 15 years

  -- Amount policies
  min_loan_amount NUMERIC DEFAULT 5000,
  max_loan_amount NUMERIC DEFAULT 500000,
  max_lvr NUMERIC DEFAULT 130, -- Loan to Value Ratio

  -- Term policies
  min_term_months INTEGER DEFAULT 12,
  max_term_months INTEGER DEFAULT 84,
  max_balloon_percentage NUMERIC DEFAULT 50,

  -- Borrower policies
  min_abn_age_months INTEGER DEFAULT 24,
  min_gst_age_months INTEGER DEFAULT 0,
  requires_gst BOOLEAN DEFAULT TRUE,

  -- Rate bands (simplified)
  base_rate_new NUMERIC,
  base_rate_used NUMERIC,
  rate_loading_amount_over NUMERIC, -- Extra rate for amounts over X
  rate_loading_term_over INTEGER, -- Extra rate for terms over X months

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert a default "generic" lender policy (represents your panel)
INSERT INTO lender_policies (lender_name, asset_types_allowed, max_asset_age_at_term_end, base_rate_new, base_rate_used) VALUES
  ('Panel Standard', ARRAY['vehicle', 'truck', 'equipment', 'technology'], 15, 6.29, 6.99)
ON CONFLICT DO NOTHING;

-- ============================================
-- DOCUMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- File info
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- application/pdf, image/jpeg, etc
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,

  -- Document classification
  document_type TEXT NOT NULL, -- drivers_licence, bas, bank_statement, asset_invoice

  -- AI extraction
  extraction_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  extracted_data JSONB,
  confidence_score NUMERIC,
  processed_at TIMESTAMPTZ,

  -- Verification
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT
);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  entity_type TEXT NOT NULL, -- application, document, lead
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- created, updated, status_changed, document_uploaded, etc

  actor_id UUID REFERENCES auth.users(id),
  actor_type TEXT DEFAULT 'user', -- user, system, ai

  changes JSONB, -- What changed
  details JSONB -- Additional context
);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE eligibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lender_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Applications: Public insert (for creating), admin read/update
CREATE POLICY "Anyone can create applications" ON applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view applications" ON applications
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

CREATE POLICY "Admins can update applications" ON applications
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- Allow public to update their own draft applications (by ID in session)
CREATE POLICY "Anyone can update draft applications" ON applications
  FOR UPDATE USING (status = 'draft');

-- Eligibility rules: Public read
CREATE POLICY "Public can read eligibility rules" ON eligibility_rules
  FOR SELECT USING (true);

-- Lender policies: Admin only
CREATE POLICY "Admins can view lender policies" ON lender_policies
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- Documents: Similar to applications
CREATE POLICY "Anyone can upload documents" ON documents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view documents" ON documents
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- Audit log: Admin read only
CREATE POLICY "Admins can view audit log" ON audit_log
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

CREATE POLICY "System can insert audit log" ON audit_log
  FOR INSERT WITH CHECK (true);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created ON applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_abn ON applications(abn);
CREATE INDEX IF NOT EXISTS idx_documents_application ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- ============================================
-- TRIGGERS for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
