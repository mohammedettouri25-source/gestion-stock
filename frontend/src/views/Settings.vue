<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { db } from '../services/db';
import { User, Store, Palette, Database, Globe, Moon, Sun, Download, Upload, Trash2, RefreshCw, Info } from 'lucide-vue-next';

const activeTab = ref('profile');
const { t, locale } = useI18n();
const darkMode = ref(document.documentElement.classList.contains('dark'));
const currentLang = ref(localStorage.getItem('locale') || 'en');

const toggleDarkMode = () => {
  darkMode.value = !darkMode.value;
  if (darkMode.value) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
};

const setLanguage = (lang) => {
  currentLang.value = lang;
  locale.value = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  localStorage.setItem('locale', lang);
};

const mockSave = () => {
  alert(t('settings.settings_saved') || 'Settings saved successfully!');
};

const handleClearDB = async () => {
  if (confirm('WARNING: This will delete ALL local data and reload the app with fresh seed data. This cannot be undone. Proceed?')) {
    try {
      await db.delete();
      alert('Database cleared. The app will now reload with fresh data.');
      window.location.reload();
    } catch (e) {
      alert('Failed to clear database: ' + e.message);
    }
  }
};

</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">{{ t('settings.settings_title') }}</h1>
      <p class="text-sm text-slate-500 mt-1">{{ t('settings.settings_desc') }}</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <!-- Sidebar Tabs -->
      <div class="md:col-span-1 space-y-1">
        <button @click="activeTab = 'profile'" :class="['w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left text-sm font-medium', activeTab === 'profile' ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800']">
          <User class="w-4 h-4" /> {{ t('settings.profile') }}
        </button>
        <button @click="activeTab = 'store'" :class="['w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left text-sm font-medium', activeTab === 'store' ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800']">
          <Store class="w-4 h-4" /> {{ t('settings.store_settings') }}
        </button>
        <button @click="activeTab = 'appearance'" :class="['w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left text-sm font-medium', activeTab === 'appearance' ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800']">
          <Palette class="w-4 h-4" /> {{ t('settings.appearance') }}
        </button>
        <button @click="activeTab = 'data'" :class="['w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left text-sm font-medium', activeTab === 'data' ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800']">
          <Database class="w-4 h-4" /> {{ t('settings.data_management') }}
        </button>
        <button @click="activeTab = 'about'" :class="['w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left text-sm font-medium', activeTab === 'about' ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800']">
          <Info class="w-4 h-4" /> {{ t('settings.about') }}
        </button>
      </div>

      <!-- Content Area -->
      <div class="md:col-span-3">
        <!-- Profile -->
        <div v-if="activeTab === 'profile'" class="glass-card p-6 space-y-6">
          <h2 class="text-xl font-bold">{{ t('settings.profile_details') }}</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-500 mb-1">{{ t('settings.full_name') }}</label>
              <input type="text" class="glass-input" value="Admin User" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-500 mb-1">{{ t('common.email', 'Email') }}</label>
              <input type="email" class="glass-input" value="admin@gstock.ma" />
            </div>
          </div>
          <button @click="mockSave" class="glass-btn-primary">{{ t('settings.update_profile') }}</button>
          
          <hr class="border-slate-200 dark:border-slate-800" />
          
          <h2 class="text-xl font-bold">{{ t('settings.change_password') }}</h2>
          <div class="space-y-4 max-w-md">
            <div>
              <label class="block text-sm font-medium text-slate-500 mb-1">{{ t('settings.current_password') }}</label>
              <input type="password" class="glass-input" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-500 mb-1">{{ t('settings.new_password') }}</label>
              <input type="password" class="glass-input" />
            </div>
            <button @click="mockSave" class="glass-btn-primary">{{ t('settings.change_password') }}</button>
          </div>
        </div>

        <!-- Store Settings -->
        <div v-if="activeTab === 'store'" class="glass-card p-6 space-y-6">
          <h2 class="text-xl font-bold">{{ t('settings.store_config') }}</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-500 mb-1">{{ t('settings.store_name') }}</label>
              <input type="text" class="glass-input" value="G-Stock Premium" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-500 mb-1">{{ t('common.phone', 'Phone') }}</label>
              <input type="text" class="glass-input" value="+212 600 000 000" />
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-slate-500 mb-1">{{ t('settings.address') }}</label>
              <textarea class="glass-input" rows="3">Casablanca, Morocco</textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-500 mb-1">{{ t('settings.currency') }}</label>
              <select class="glass-input">
                <option value="MAD">Moroccan Dirham (MAD)</option>
                <option value="USD">US Dollar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-500 mb-1">{{ t('settings.timezone') }}</label>
              <select class="glass-input">
                <option value="Africa/Casablanca">Africa/Casablanca</option>
              </select>
            </div>
          </div>
          <button @click="mockSave" class="glass-btn-primary">{{ t('settings.save_settings') }}</button>
        </div>

        <!-- Appearance -->
        <div v-if="activeTab === 'appearance'" class="glass-card p-6 space-y-6">
          <h2 class="text-xl font-bold">{{ t('settings.appearance_localization') }}</h2>
          
          <div class="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div>
              <h3 class="font-medium">{{ t('settings.dark_mode') }}</h3>
              <p class="text-sm text-slate-500">{{ t('settings.dark_mode_desc') }}</p>
            </div>
            <button @click="toggleDarkMode" class="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Moon v-if="!darkMode" class="w-5 h-5" />
              <Sun v-else class="w-5 h-5 text-accent-orange" />
            </button>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-500 mb-2">{{ t('settings.language') }}</label>
            <div class="grid grid-cols-3 gap-3">
              <button @click="setLanguage('en')" :class="['p-3 rounded-xl border text-center transition-all', currentLang === 'en' ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-slate-200 dark:border-slate-800']">
                English (LTR)
              </button>
              <button @click="setLanguage('fr')" :class="['p-3 rounded-xl border text-center transition-all', currentLang === 'fr' ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-slate-200 dark:border-slate-800']">
                Français (LTR)
              </button>
              <button @click="setLanguage('ar')" :class="['p-3 rounded-xl border text-center transition-all', currentLang === 'ar' ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-slate-200 dark:border-slate-800']">
                العربية (RTL)
              </button>
            </div>
          </div>
        </div>

        <!-- Data Management -->
        <div v-if="activeTab === 'data'" class="glass-card p-6 space-y-6">
          <h2 class="text-xl font-bold">{{ t('settings.data_management') }}</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
              <Download class="w-6 h-6 text-accent-blue" />
              <h3 class="font-medium">{{ t('settings.export_data') }}</h3>
              <p class="text-sm text-slate-500">{{ t('settings.export_desc') }}</p>
              <button class="glass-btn-secondary w-full">{{ t('reports.export_csv') }}</button>
            </div>
            
            <div class="p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
              <Upload class="w-6 h-6 text-accent-green" />
              <h3 class="font-medium">{{ t('settings.import_data') }}</h3>
              <p class="text-sm text-slate-500">{{ t('settings.import_desc') }}</p>
              <button class="glass-btn-secondary w-full">{{ t('settings.import_file') }}</button>
            </div>
          </div>

          <div class="p-4 border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 rounded-xl space-y-3">
            <h3 class="font-medium text-accent-pink flex items-center gap-2"><Trash2 class="w-5 h-5" /> {{ t('settings.danger_zone') }}</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400">{{ t('settings.danger_desc') }}</p>
            <button @click="handleClearDB" class="glass-btn-danger">{{ t('settings.clear_db') }}</button>
          </div>
        </div>

        <!-- About -->
        <div v-if="activeTab === 'about'" class="glass-card p-6 flex flex-col items-center text-center space-y-4">
          <div class="w-20 h-20 bg-accent-blue rounded-2xl flex items-center justify-center text-white shadow-lg shadow-accent-blue/30 mt-4">
            <Store class="w-10 h-10" />
          </div>
          <div>
            <h2 class="text-2xl font-bold">G-Stock Premium</h2>
            <p class="text-slate-500">Version 1.0.0 (Production)</p>
          </div>
          <p class="max-w-md text-sm text-slate-600 dark:text-slate-400">
            {{ t('settings.about_desc') }}
          </p>
          <div class="pt-6 w-full max-w-md space-y-2">
            <div class="flex justify-between text-sm py-2 border-b border-slate-200 dark:border-slate-800">
              <span class="text-slate-500">{{ t('settings.offline_engine') }}</span>
              <span class="font-medium">Dexie.js v4.0.1</span>
            </div>
            <div class="flex justify-between text-sm py-2 border-b border-slate-200 dark:border-slate-800">
              <span class="text-slate-500">{{ t('settings.ui_framework') }}</span>
              <span class="font-medium">Vue 3 + Tailwind CSS</span>
            </div>
            <div class="flex justify-between text-sm py-2">
              <span class="text-slate-500">{{ t('settings.backend_api') }}</span>
              <span class="font-medium">Laravel 12</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
