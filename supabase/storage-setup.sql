-- Create a public storage bucket for website images
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

-- Create the bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'website-images',
  'website-images',
  true,  -- Public bucket - images accessible without auth
  5242880,  -- 5MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to all files in the bucket
CREATE POLICY "Public read access for website images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'website-images');

-- Allow authenticated users (admins) to upload/update/delete
CREATE POLICY "Admin upload access for website images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'website-images'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Admin update access for website images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'website-images'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Admin delete access for website images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'website-images'
  AND auth.role() = 'authenticated'
);

-- Suggested folder structure:
-- website-images/
--   products/
--     vehicles/
--       hero-ranger.jpg
--       utes-hilux.jpg
--       vans-transit.jpg
--       prestige-bmw.jpg
--     trucks/
--       hero-kenworth.jpg
--       prime-movers.jpg
--       rigid-trucks.jpg
--       trailers.jpg
--     equipment/
--       hero-excavator.jpg
--       excavators.jpg
--       loaders.jpg
--       earthmoving.jpg
--   og/
--     og-image.png
--   logos/
--     logo.png
