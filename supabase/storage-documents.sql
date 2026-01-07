-- AssetMX Storage - Application Documents Bucket
-- Run this in Supabase SQL Editor to create the storage bucket

-- Create the storage bucket for application documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-documents',
  'application-documents',
  false, -- Private bucket - not publicly accessible
  10485760, -- 10MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies

-- Allow anyone to upload documents (for public application flow)
CREATE POLICY "Anyone can upload documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'application-documents');

-- Allow admins to view all documents
CREATE POLICY "Admins can view documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'application-documents'
  AND auth.uid() IN (SELECT id FROM admin_users)
);

-- Allow uploaders to view their own documents (within same session)
CREATE POLICY "Uploaders can view own documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'application-documents'
  AND (storage.foldername(name))[1] = 'temp'
);

-- Prevent public deletion
CREATE POLICY "Only admins can delete documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'application-documents'
  AND auth.uid() IN (SELECT id FROM admin_users)
);
