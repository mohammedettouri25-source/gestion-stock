import { defineStore } from 'pinia';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('auth_token') || null,
    loading: false,
    error: null
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
        // Fallback for offline login if user is already saved locally
        if (!navigator.onLine) {
          if (this.user && email === this.user.email) {
            // Offline log in with last active session is allowed in PWA
            this.loading = false;
            return true;
          }
          throw new Error('Offline. Please login when online or use cached credentials.');
        }

        const response = await axios.post(`${API_URL}/auth/login`, { email, password });
        
        if (response.data && response.data.success) {
          const { user, token } = response.data.data;
          
          this.user = user;
          this.token = token;
          
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('auth_token', token);
          
          // Configure axios default header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          this.loading = false;
          return true;
        }
      } catch (err) {
        this.error = err.response?.data?.message || err.message || 'Login failed';
        this.loading = false;
        throw err;
      }
    },
    
    async logout() {
      try {
        if (navigator.onLine && this.token) {
          await axios.post(`${API_URL}/auth/logout`, {}, {
            headers: { Authorization: `Bearer ${this.token}` }
          });
        }
      } catch (e) {
        console.error('Logout request failed:', e);
      } finally {
        this.user = null;
        this.token = null;
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        delete axios.defaults.headers.common['Authorization'];
      }
    }
  }
});
