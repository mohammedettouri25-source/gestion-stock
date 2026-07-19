import { defineStore } from 'pinia';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

function getErrorMessage(error) {
  if (error?.message) return error.message;
  return 'Authentication failed';
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('auth_token') || null,
    loading: false,
    error: null,
    session: null
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
    isManager: (state) => state.user?.role === 'manager' || state.user?.role === 'admin',
    role: (state) => state.user?.role || 'employee'
  },
  actions: {
    async login(email, password) {
      this.loading = true;
      this.error = null;

      try {
        if (!isSupabaseConfigured()) {
          throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        this.session = data.session;
        this.token = data.session?.access_token || null;
        this.user = data.user;

        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('auth_token', this.token || '');

        this.loading = false;
        return true;
      } catch (err) {
        console.error('[Auth] Login failed', err);
        this.error = getErrorMessage(err);
        this.loading = false;
        throw err;
      }
    },

    async logout() {
      try {
        if (supabase) {
          await supabase.auth.signOut();
        }
      } catch (e) {
        console.error('Logout request failed:', e);
      } finally {
        this.user = null;
        this.token = null;
        this.session = null;
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
      }
    }
  }
});
