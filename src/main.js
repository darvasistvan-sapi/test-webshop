import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App).use(createPinia())

// Check the stored session before the router's first navigation.
useAuthStore().restore().finally(() => {
    app.use(router).mount('#app')
})
