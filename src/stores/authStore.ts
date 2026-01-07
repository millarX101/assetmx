import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { AdminUser, AdminRole } from '@/types/database';

interface AuthState {
  user: User | null;
  adminUser: AdminUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  role: AdminRole | null;

  // Actions
  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  checkAdminStatus: (userId: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      adminUser: null,
      isLoading: true,
      isAdmin: false,
      role: null,

      initialize: async () => {
        if (!isSupabaseConfigured()) {
          set({ isLoading: false });
          return;
        }

        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            const isAdmin = await get().checkAdminStatus(session.user.id);
            set({
              user: session.user,
              isLoading: false,
              isAdmin
            });
          } else {
            set({ user: null, isLoading: false, isAdmin: false });
          }

          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
              const isAdmin = await get().checkAdminStatus(session.user.id);
              set({
                user: session.user,
                isAdmin
              });
            } else {
              set({
                user: null,
                adminUser: null,
                isAdmin: false,
                role: null
              });
            }
          });
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ isLoading: false });
        }
      },

      signInWithEmail: async (email: string, password: string) => {
        if (!isSupabaseConfigured()) {
          return { error: 'Supabase not configured. Please add credentials to .env.local' };
        }

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            return { error: error.message };
          }

          if (data.user) {
            const isAdmin = await get().checkAdminStatus(data.user.id);
            if (!isAdmin) {
              await supabase.auth.signOut();
              return { error: 'Access denied. You are not an admin user.' };
            }
            set({ user: data.user, isAdmin: true });
          }

          return { error: null };
        } catch (error) {
          return { error: 'An unexpected error occurred' };
        }
      },

      signInWithMagicLink: async (email: string) => {
        if (!isSupabaseConfigured()) {
          return { error: 'Supabase not configured. Please add credentials to .env.local' };
        }

        try {
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: `${window.location.origin}/admin`,
            },
          });

          if (error) {
            return { error: error.message };
          }

          return { error: null };
        } catch (error) {
          return { error: 'An unexpected error occurred' };
        }
      },

      signInWithGoogle: async () => {
        if (!isSupabaseConfigured()) {
          return { error: 'Supabase not configured. Please add credentials to .env.local' };
        }

        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/admin`,
            },
          });

          if (error) {
            return { error: error.message };
          }

          return { error: null };
        } catch (error) {
          return { error: 'An unexpected error occurred' };
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({
          user: null,
          adminUser: null,
          isAdmin: false,
          role: null
        });
      },

      checkAdminStatus: async (userId: string) => {
        try {
          const { data, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('id', userId)
            .single();

          if (error || !data) {
            set({ adminUser: null, isAdmin: false, role: null });
            return false;
          }

          const adminData = data as AdminUser;
          set({
            adminUser: adminData,
            isAdmin: true,
            role: adminData.role as AdminRole
          });
          return true;
        } catch {
          set({ adminUser: null, isAdmin: false, role: null });
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (_state) => ({
        // Don't persist sensitive data
      }),
    }
  )
);
