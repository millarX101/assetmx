-- Create a table for contact form submissions
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  notes TEXT
);

-- Enable RLS
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anyone (for the contact form)
CREATE POLICY "Anyone can submit contact form"
ON contact_submissions
FOR INSERT
WITH CHECK (true);

-- Only authenticated users (admins) can read submissions
CREATE POLICY "Admins can read contact submissions"
ON contact_submissions
FOR SELECT
USING (auth.role() = 'authenticated');

-- Only authenticated users (admins) can update submissions
CREATE POLICY "Admins can update contact submissions"
ON contact_submissions
FOR UPDATE
USING (auth.role() = 'authenticated');

-- Create an index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at
ON contact_submissions (created_at DESC);

-- Create an index on status for filtering
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status
ON contact_submissions (status);
