-- AssetMX Analytics Events
-- Track user interactions with quote tool and application flow

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Event identification
  event_name TEXT NOT NULL,
  event_category TEXT, -- 'quote', 'application', 'page_view', 'engagement'

  -- Session tracking (anonymous)
  session_id TEXT,

  -- Event data
  event_data JSONB DEFAULT '{}',

  -- Context
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,

  -- Application reference (if relevant)
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL
);

-- Index for querying events
CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_category ON analytics_events(event_category);
CREATE INDEX idx_analytics_events_session ON analytics_events(session_id);

-- RLS Policy - anyone can insert (for public tracking)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics events"
ON analytics_events
FOR INSERT
WITH CHECK (true);

-- Only admins can read analytics
CREATE POLICY "Admins can view analytics"
ON analytics_events
FOR SELECT
USING (auth.uid() IN (SELECT id FROM admin_users));

-- Useful views for reporting

-- Daily summary view
CREATE OR REPLACE VIEW analytics_daily_summary AS
SELECT
  DATE(created_at) as date,
  event_category,
  event_name,
  COUNT(*) as event_count,
  COUNT(DISTINCT session_id) as unique_sessions
FROM analytics_events
GROUP BY DATE(created_at), event_category, event_name
ORDER BY date DESC, event_count DESC;

-- Quote tool usage
CREATE OR REPLACE VIEW analytics_quote_usage AS
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE event_name = 'quote_started') as quotes_started,
  COUNT(*) FILTER (WHERE event_name = 'quote_completed') as quotes_completed,
  COUNT(*) FILTER (WHERE event_name = 'quote_apply_clicked') as apply_clicked,
  COUNT(DISTINCT session_id) as unique_users
FROM analytics_events
WHERE event_category = 'quote'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Application funnel
CREATE OR REPLACE VIEW analytics_application_funnel AS
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE event_name = 'application_started') as started,
  COUNT(*) FILTER (WHERE event_name = 'application_lead_captured') as leads_captured,
  COUNT(*) FILTER (WHERE event_name = 'application_documents_uploaded') as docs_uploaded,
  COUNT(*) FILTER (WHERE event_name = 'application_submitted') as submitted,
  COUNT(DISTINCT session_id) as unique_users
FROM analytics_events
WHERE event_category = 'application'
GROUP BY DATE(created_at)
ORDER BY date DESC;
