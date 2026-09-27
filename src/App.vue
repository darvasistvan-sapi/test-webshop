<script setup>
import { watch } from 'vue'
import AppHeader from './components/layout/AppHeader.vue'
import AppFooter from './components/layout/AppFooter.vue'
import { useAuthStore } from './stores/auth'
import { useOrderStore } from './stores/orders'

const auth = useAuthStore()
const orderStore = useOrderStore()

// When the user changes (log in/out), other users' orders should not remain in memory.
watch(
  () => auth.user?.id,
  () => orderStore.$reset(),
)
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <main class="app-main">
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.app-main {
  flex: 1;
  width: 100%;
}
</style>

