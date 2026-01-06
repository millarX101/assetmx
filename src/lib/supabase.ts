import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not found. Copy .env.local.example to .env.local and add your credentials.'
  );
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

/**
 * Get public URL for an image in the website-images bucket
 * @param path - Path within the bucket, e.g. "products/vehicles/hero-ranger.jpg"
 * @returns Full public URL to the image
 */
export const getImageUrl = (path: string): string => {
  if (!supabaseUrl) {
    console.warn('Supabase URL not configured, using placeholder');
    return `https://placehold.co/800x600?text=${encodeURIComponent(path)}`;
  }
  return `${supabaseUrl}/storage/v1/object/public/website-images/${path}`;
};
