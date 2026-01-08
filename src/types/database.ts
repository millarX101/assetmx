// Supabase Database Types
// These match the schema defined in the plan

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

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
}

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
