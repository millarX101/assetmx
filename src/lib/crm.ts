// Shared labels and helpers for the admin lead workspace and quotes.

import { formatDistanceToNowStrict, isPast, isToday } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { ActivityType, Lead, LeadStatus, QuoteStatus } from '@/types/database';

type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'outline';

/** Pipeline order. Board columns and the stage stepper follow this. */
export const LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'quoted', 'qualified', 'converted', 'lost'];

export const LEAD_STATUS_META: Record<LeadStatus, { label: string; variant: BadgeVariant; hint: string }> = {
  new: { label: 'New', variant: 'info', hint: 'Not yet contacted' },
  contacted: { label: 'Contacted', variant: 'warning', hint: 'Spoken to, no quote yet' },
  quoted: { label: 'Quoted', variant: 'secondary', hint: 'Quote sent, awaiting response' },
  qualified: { label: 'Qualified', variant: 'default', hint: 'Accepted / applying' },
  converted: { label: 'Settled', variant: 'success', hint: 'Finance settled' },
  lost: { label: 'Lost', variant: 'destructive', hint: 'Not proceeding' },
};

export const QUOTE_STATUS_META: Record<QuoteStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: 'Draft', variant: 'outline' },
  sent: { label: 'Sent', variant: 'info' },
  viewed: { label: 'Viewed', variant: 'warning' },
  accepted: { label: 'Accepted', variant: 'success' },
  declined: { label: 'Declined', variant: 'destructive' },
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  note: 'Note',
  call: 'Call',
  email: 'Email',
  sms: 'SMS',
  meeting: 'Meeting',
  status_change: 'Stage changed',
  quote_created: 'Quote created',
  quote_sent: 'Quote sent',
  quote_viewed: 'Quote opened',
  quote_accepted: 'Quote accepted',
  quote_declined: 'Quote declined',
};

export const CALL_OUTCOMES: Record<string, string> = {
  spoke: 'Spoke',
  no_answer: 'No answer',
  left_voicemail: 'Left voicemail',
  booked_meeting: 'Booked meeting',
  wrong_number: 'Wrong number',
};

export const ASSET_TYPE_LABELS = {
  vehicle: 'Vehicle (car, ute, van)',
  truck: 'Truck / trailer',
  equipment: 'Equipment / machinery',
} as const;

export const ASSET_CONDITION_LABELS = {
  new: 'New',
  demo: 'Demo',
  used_0_3: 'Used (0-3 yrs)',
  used_4_7: 'Used (4-7 yrs)',
  used_8_plus: 'Used (8+ yrs)',
} as const;

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  return `${formatDistanceToNowStrict(new Date(iso))} ago`;
}

export type FollowUpState = 'overdue' | 'today' | 'upcoming' | null;

export function followUpState(lead: Pick<Lead, 'next_follow_up_at' | 'status'>): FollowUpState {
  if (!lead.next_follow_up_at || lead.status === 'converted' || lead.status === 'lost') return null;
  const d = new Date(lead.next_follow_up_at);
  if (isToday(d)) return 'today';
  if (isPast(d)) return 'overdue';
  return 'upcoming';
}

/** A lead's display name: person, else business, else email. */
export function leadName(lead: Pick<Lead, 'name' | 'business_name' | 'email'>): string {
  return lead.name?.trim() || lead.business_name?.trim() || lead.email || 'Unnamed lead';
}

/**
 * Untyped handle on the shared client. src/types/database.ts doesn't satisfy
 * supabase-js's schema constraints (every table resolves to `never`), which the
 * older admin pages paper over with `as never`. Admin CRM code queries through
 * this and annotates results with the types from database.ts instead.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as unknown as SupabaseClient<any>;
