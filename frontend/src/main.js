import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import i18n from './i18n';
import './style.css';
import { seedLocalDB } from './services/db';

// Ensure the local IndexedDB contains seed data for offline preview/demo
seedLocalDB().catch(err => console.error('Database seeding failed:', err));

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(i18n);

app.mount('#app');
