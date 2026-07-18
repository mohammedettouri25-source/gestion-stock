<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { Shield, Mail, Lock, Loader2 } from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();

const email = ref('admin@gstock.ma');
const password = ref('password');
const errorMessage = ref('');
const loadingLocal = ref(false);

const handleLogin = async () => {
  if (!email.value || !password.value) {
    errorMessage.value = t('login.fill_fields');
    return;
  }

  loadingLocal.value = true;
  errorMessage.value = '';

  try {
    // If offline, simulate auth using cached creds or bypass if pre-auth saved
    if (!navigator.onLine) {
      if (email.value === 'admin@gstock.ma' && password.value === 'password') {
        const dummyUser = { id: 1, name: 'Admin Account', email: email.value, role: 'admin' };
        localStorage.setItem('user', JSON.stringify(dummyUser));
        localStorage.setItem('auth_token', 'offline-fake-token-123');
        authStore.user = dummyUser;
        authStore.token = 'offline-fake-token-123';
        router.push('/');
        return;
      }
    }

    await authStore.login(email.value, password.value);
    router.push('/');
  } catch (err) {
    console.error(err);
    errorMessage.value = err.response?.data?.message || err.message || t('login.auth_failed');
  } finally {
    loadingLocal.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[#020617] text-white p-6 relative overflow-hidden font-sans">
    
    <!-- Background visual mesh ornaments -->
    <div class="absolute w-[500px] h-[500px] rounded-full bg-accent-blue/10 blur-[120px] top-[-10%] left-[-10%] animate-pulse"></div>
    <div class="absolute w-[500px] h-[500px] rounded-full bg-accent-purple/10 blur-[120px] bottom-[-10%] right-[-10%] animate-pulse" style="animation-delay: 2s"></div>

    <div class="w-full max-w-md z-10">
      <!-- Brand Logo representation -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-accent-blue to-accent-purple shadow-xl shadow-accent-blue/20 mb-4">
          <Shield class="w-7 h-7 text-white" />
        </div>
        <h1 class="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          G-Stock Premium
        </h1>
        <p class="text-slate-400 mt-2 text-sm font-medium">Clothing Store Inventory & Financials</p>
      </div>

      <!-- Glassmorphic Login Card -->
      <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        <h2 class="text-xl font-semibold mb-6 text-slate-100 text-center">{{ t('login.sign_in_dash') }}</h2>

        <!-- Form fields -->
        <form @submit.prevent="handleLogin" class="space-y-5">
          <!-- Error alert -->
          <div v-if="errorMessage" class="p-4 bg-accent-pink/10 border border-accent-pink/20 rounded-xl text-accent-pink text-xs font-semibold text-center">
            {{ errorMessage }}
          </div>

          <!-- Email Input container -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">{{ t('login.email_addr') }}</label>
            <div class="relative">
              <Mail class="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <input 
                type="email" 
                v-model="email"
                placeholder="admin@gstock.ma"
                class="w-full pl-12 pr-4 py-3 rounded-xl border border-white/10 bg-white/5 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue text-sm transition-all duration-200 text-white placeholder:text-slate-600"
                required
              />
            </div>
          </div>

          <!-- Password Input container -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">{{ t('login.password') }}</label>
            <div class="relative">
              <Lock class="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <input 
                type="password" 
                v-model="password"
                placeholder="••••••••"
                class="w-full pl-12 pr-4 py-3 rounded-xl border border-white/10 bg-white/5 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue text-sm transition-all duration-200 text-white placeholder:text-slate-600"
                required
              />
            </div>
          </div>

          <!-- Offline capability notification note -->
          <p class="text-[11px] text-slate-500 text-center">
            {{ t('login.offline_note') }}
          </p>

          <!-- Submit Action button -->
          <button 
            type="submit" 
            :disabled="loadingLocal"
            class="w-full py-3.5 rounded-xl bg-accent-blue hover:bg-opacity-95 text-white font-semibold transition-all duration-250 flex items-center justify-center gap-2 shadow-lg shadow-accent-blue/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
          >
            <Loader2 v-if="loadingLocal" class="w-5 h-5 animate-spin" />
            <span>{{ loadingLocal ? t('login.connecting') : t('login.sign_in') }}</span>
          </button>
        </form>
      </div>

      <!-- Quick credentials help text -->
      <div class="mt-6 text-center text-xs text-slate-600">
        {{ t('login.demo_creds') }} <span class="text-slate-400">admin@gstock.ma</span> / <span class="text-slate-400">password</span>
      </div>
    </div>
  </div>
</template>
