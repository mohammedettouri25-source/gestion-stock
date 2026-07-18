<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useSyncStore } from '../stores/sync';
import { useI18n } from 'vue-i18n';
import { 
  LayoutDashboard, ShoppingCart, Shirt, ClipboardList, 
  Users, Truck, Wallet, FileBarChart, Settings, LogOut, 
  Menu, X, Globe, Wifi, WifiOff, RefreshCw, AlertTriangle
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const syncStore = useSyncStore();
const { t, locale } = useI18n();

const isSidebarOpen = ref(true);

const navItems = [
  { name: 'dashboard', path: '/', icon: LayoutDashboard },
  { name: 'pos', path: '/pos', icon: ShoppingCart },
  { name: 'products', path: '/products', icon: Shirt },
  { name: 'inventory', path: '/inventory', icon: ClipboardList },
  { name: 'orders', path: '/orders', icon: ClipboardList },
  { name: 'customers', path: '/customers', icon: Users },
  { name: 'suppliers', path: '/suppliers', icon: Users },
  { name: 'expenses', path: '/expenses', icon: Wallet },
  { name: 'deliveries', path: '/deliveries', icon: Truck },
  { name: 'reports', path: '/reports', icon: FileBarChart },
  { name: 'settings', path: '/settings', icon: Settings },
];

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};

const changeLang = (lang) => {
  locale.value = lang;
  localStorage.setItem('language', lang);
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
};

onMounted(() => {
  document.documentElement.dir = locale.value === 'ar' ? 'rtl' : 'ltr';
});
</script>

<template>
  <div class="min-h-screen flex bg-gradient-mesh dark:bg-[#020617] text-slate-800 dark:text-slate-100 font-sans">
    
    <!-- Sidebar navigation -->
    <aside 
      class="fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 transform md:translate-x-0"
      :class="[
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        locale === 'ar' ? 'right-0 left-auto border-l border-r-0' : 'left-0 border-r'
      ]"
    >
      <div>
        <!-- Sidebar Brand header -->
        <div class="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-accent-blue flex items-center justify-center font-bold text-white shadow-md shadow-accent-blue/30">
              G
            </div>
            <span class="font-bold text-lg tracking-wide bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              G-Stock Premium
            </span>
          </div>
          <button @click="toggleSidebar" class="md:hidden text-slate-400 hover:text-white">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Sidebar Navigation Menu -->
        <nav class="p-4 space-y-1">
          <router-link 
            v-for="item in navItems" 
            :key="item.path" 
            :to="item.path"
            class="flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200"
            :class="[
              route.path === item.path 
                ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            ]"
          >
            <component :is="item.icon" class="w-4.5 h-4.5" />
            <span>{{ t(`common.${item.name}`) }}</span>
          </router-link>
        </nav>
      </div>

      <!-- Sidebar footer (user details + log out) -->
      <div class="p-4 border-t border-slate-800">
        <div class="flex items-center gap-3 mb-4 px-2">
          <div class="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-semibold text-accent-blue uppercase">
            {{ authStore.user?.name?.substring(0,2) || 'AD' }}
          </div>
          <div class="overflow-hidden">
            <h4 class="text-sm font-semibold text-white truncate">{{ authStore.user?.name || 'Administrator' }}</h4>
            <span class="text-xs text-slate-500 capitalize">{{ authStore.user?.role || 'Admin' }}</span>
          </div>
        </div>
        <button 
          @click="handleLogout" 
          class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-accent-pink hover:bg-opacity-20 hover:text-accent-pink text-slate-400 text-sm font-medium transition-all duration-200"
        >
          <LogOut class="w-4 h-4" />
          <span>{{ t('common.logout') }}</span>
        </button>
      </div>
    </aside>

    <!-- Content Area container -->
    <div 
      class="flex-1 min-w-0 flex flex-col transition-all duration-300"
      :class="[
        locale === 'ar' 
          ? (isSidebarOpen ? 'md:mr-64' : 'mr-0') 
          : (isSidebarOpen ? 'md:ml-64' : 'ml-0')
      ]"
    >
      <!-- Top header bar -->
      <header class="h-16 sticky top-0 z-30 bg-white/70 dark:bg-[#020617]/70 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between px-6">
        <div class="flex items-center gap-4">
          <button @click="toggleSidebar" class="text-slate-500 hover:text-slate-800 dark:hover:text-white">
            <Menu class="w-5 h-5" />
          </button>
          
          <!-- Sync & Offline Badge -->
          <div class="flex items-center gap-2">
            <!-- Offline state -->
            <div v-if="syncStore.status === 'offline'" class="flex items-center gap-1.5 px-3 py-1 bg-accent-orange/10 border border-accent-orange/20 text-accent-orange rounded-full text-xs font-semibold">
              <WifiOff class="w-3.5 h-3.5" />
              <span>{{ t('common.offline') }}</span>
            </div>
            
            <!-- Synced State -->
            <div v-else-if="syncStore.status === 'synced'" class="flex items-center gap-1.5 px-3 py-1 bg-accent-green/10 border border-accent-green/20 text-accent-green rounded-full text-xs font-semibold">
              <Wifi class="w-3.5 h-3.5" />
              <span>{{ t('common.synced') }}</span>
            </div>
            
            <!-- Syncing State -->
            <div v-else-if="syncStore.status === 'syncing'" class="flex items-center gap-1.5 px-3 py-1 bg-accent-blue/10 border border-accent-blue/20 text-accent-blue rounded-full text-xs font-semibold">
              <RefreshCw class="w-3.5 h-3.5 animate-spin" />
              <span>{{ t('common.syncing') }} ({{ syncStore.progress }}%)</span>
            </div>
            
            <!-- Queue Pending notification -->
            <button 
              v-if="syncStore.queueLength > 0" 
              @click="syncStore.forceSync"
              class="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-accent-blue hover:text-white rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-400 transition-colors"
              title="Force Sync Now"
            >
              {{ syncStore.queueLength }} pending
            </button>
          </div>
        </div>

        <!-- Top Right language & profile tools -->
        <div class="flex items-center gap-4">
          <!-- Language Select selector -->
          <div class="relative group">
            <button class="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700">
              <Globe class="w-4 h-4 text-slate-500" />
              <span class="uppercase">{{ locale }}</span>
            </button>
            <div class="absolute right-0 top-full mt-1.5 w-32 bg-white dark:bg-slate-850 rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 hidden group-hover:block overflow-hidden">
              <button @click="changeLang('en')" class="w-full text-left px-4 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-355 font-medium">English</button>
              <button @click="changeLang('fr')" class="w-full text-left px-4 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-355 font-medium">Français</button>
              <button @click="changeLang('ar')" class="w-full text-left px-4 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-355 font-medium">العربية</button>
            </div>
          </div>

          <!-- Quick app statistics summary icon -->
          <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-500">
            MAD
          </div>
        </div>
      </header>

      <!-- Main Layout Routing Workspace -->
      <main class="flex-1 p-6 md:p-8 overflow-y-auto">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* Smooth View Transition Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
