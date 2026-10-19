// Supabase Database Types
// These match the schema defined in the plan

export type LeadStatus = 'new' | 'contacted' | 'quoted' | 'qualified' | 'converted' | 'lost';

export type AdminRole = 'viewer' | 'editor' | 'admin';

export interface Lead {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  business_name: string;
  abn: string;
  asset_type: string;
  asset_condition: string;
  loan_amount: number;
  term_months: number;
  balloon_percentage: number;
  indicative_rate: number | null;
  monthly_repayment: number | null;
  total_cost: number | null;
  estimated_saving: number | null;
  status: LeadStatus;
  notes: string | null;
  assigned_to: string | null;
  reason: string | null;
  source: string | null;
  consent_to_share: boolean;
  // FLWUP sync outcome, written by supabase/functions/flwup-sync.
  // null = webhook never fired (replay it); see the function's README.
  flwup_deal_id: string | null;
  flwup_status: FlwupStatus | null;
  flwup_synced_at: string | null;
  flwup_error: string | null;
  // Lead workspace (supabase/quotes-crm.sql)
  last_activity_at: string | null;
  next_follow_up_at: string | null;
  next_follow_up_note: string | null;
  lost_reason: string | null;
}

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined';

export interface Quote {
  id: string;
  quote_number: string;
  lead_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  business_name: string | null;
  abn: string | null;
  asset_type: 'vehicle' | 'truck' | 'equipment';
  asset_condition: 'new' | 'demo' | 'used_0_3' | 'used_4_7' | 'used_8_plus';
  asset_description: string | null;
  loan_amount: number;
  term_months: number;
  balloon_percentage: number;
  fee_financed: boolean;
  rate_pct: number;
  monthly_repayment: number;
  weekly_repayment: number;
  fortnightly_repayment: number;
  balloon_amount: number;
  amount_financed: number;
  total_repayments: number;
  total_interest: number;
  total_cost: number;
  platform_fee: number;
  establishment_fee: number;
  broker_rate_pct: number | null;
  broker_total_cost: number | null;
  estimated_saving: number | null;
  message: string | null;
  valid_until: string;
  status: QuoteStatus;
  public_token: string;
  sent_at: string | null;
  sent_count: number;
  email_id: string | null;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  view_count: number;
  responded_at: string | null;
  decline_reason: string | null;
}

export type ActivityType =
  | 'note' | 'call' | 'email' | 'sms' | 'meeting' | 'status_change'
  | 'quote_created' | 'quote_sent' | 'quote_viewed' | 'quote_accepted' | 'quote_declined';

export interface LeadActivity {
  id: string;
  lead_id: string;
  quote_id: string | null;
  type: ActivityType;
  outcome: string | null;
  body: string | null;
  created_by: string | null;
  created_at: string;
}

export type FlwupStatus = 'created' | 'duplicate' | 'skipped' | 'error';

export interface RateConfig {
  id: string;
  asset_type: string;
  asset_condition: string;
  base_rate: number;
  is_active: boolean;
  updated_at: string;
  updated_by: string | null;
  term_months: number | null;
}

export interface FeeConfig {
  id: string;
  fee_name: string;
  amount: number;
  description: string | null;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  created_at: string;
}

// Supabase Database interface for type safety
export type Database = {
  public: {
    Tables: {
      leads: {
        Row: Lead;
        Insert: Omit<Lead, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Lead, 'id'>>;
        Relationships: [];
      };
      quotes: {
        Row: Quote;
        Insert: Partial<Quote>;
        Update: Partial<Omit<Quote, 'id'>>;
        Relationships: [];
      };
      lead_activities: {
        Row: LeadActivity;
        Insert: Partial<LeadActivity> & Pick<LeadActivity, 'lead_id' | 'type'>;
        Update: Partial<Omit<LeadActivity, 'id'>>;
        Relationships: [];
      };
      rate_config: {
        Row: RateConfig;
        Insert: Omit<RateConfig, 'id' | 'updated_at'> & { id?: string; updated_at?: string };
        Update: Partial<Omit<RateConfig, 'id'>>;
        Relationships: [];
      };
      fee_config: {
        Row: FeeConfig;
        Insert: Omit<FeeConfig, 'id' | 'updated_at'> & { id?: string; updated_at?: string };
        Update: Partial<Omit<FeeConfig, 'id'>>;
        Relationships: [];
      };
      admin_users: {
        Row: AdminUser;
        Insert: AdminUser;
        Update: Partial<Omit<AdminUser, 'id'>>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
