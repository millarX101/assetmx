import { supabase, isSupabaseConfigured } from './supabase';

// Generate or retrieve session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('amx_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('amx_session_id', sessionId);
  }
  return sessionId;
};

export type EventCategory = 'quote' | 'application' | 'page_view' | 'engagement';

export interface TrackEventParams {
  eventName: string;
  category: EventCategory;
  data?: Record<string, unknown>;
  applicationId?: string;
}

/**
 * Track an analytics event
 */
export async function trackEvent({
  eventName,
  category,
  data = {},
  applicationId,
}: TrackEventParams): Promise<void> {
  // Always log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Analytics] ${category}/${eventName}`, data);
  }

  // Skip if Supabase not configured
  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    await supabase.from('analytics_events').insert({
      event_name: eventName,
      event_category: category,
      session_id: getSessionId(),
      event_data: data,
      page_url: window.location.href,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      application_id: applicationId || null,
    });
  } catch (error) {
    // Silently fail - analytics should never break the app
    console.warn('Analytics tracking failed:', error);
  }
}

// Convenience functions for common events

export const analytics = {
  // Quote tool events
  quoteStarted: (assetType?: string) =>
    trackEvent({
      eventName: 'quote_started',
      category: 'quote',
      data: { assetType },
    }),

  quoteCompleted: (data: {
    assetType: string;
    assetValue: number;
    monthlyPayment: number;
    term: number;
  }) =>
    trackEvent({
      eventName: 'quote_completed',
      category: 'quote',
      data,
    }),

  quoteApplyClicked: (data: { assetType: string; assetValue: number }) =>
    trackEvent({
      eventName: 'quote_apply_clicked',
      category: 'quote',
      data,
    }),

  // Application events
  applicationStarted: () =>
    trackEvent({
      eventName: 'application_started',
      category: 'application',
    }),

  applicationStepCompleted: (step: string) =>
    trackEvent({
      eventName: 'application_step_completed',
      category: 'application',
      data: { step },
    }),

  applicationLeadCaptured: (data: { email: string; phone: string }) =>
    trackEvent({
      eventName: 'application_lead_captured',
      category: 'application',
      data: { hasEmail: !!data.email, hasPhone: !!data.phone },
    }),

  applicationDocumentsUploaded: (docCount: number) =>
    trackEvent({
      eventName: 'application_documents_uploaded',
      category: 'application',
      data: { documentCount: docCount },
    }),

  applicationSubmitted: (applicationId: string) =>
    trackEvent({
      eventName: 'application_submitted',
      category: 'application',
      applicationId,
    }),

  applicationAbandoned: (lastStep: string) =>
    trackEvent({
      eventName: 'application_abandoned',
      category: 'application',
      data: { lastStep },
    }),

  // Page views
  pageView: (pageName: string) =>
    trackEvent({
      eventName: 'page_view',
      category: 'page_view',
      data: { pageName },
    }),

  // Engagement
  ctaClicked: (ctaName: string, location: string) =>
    trackEvent({
      eventName: 'cta_clicked',
      category: 'engagement',
      data: { ctaName, location },
    }),
};
