<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useOrderStore } from '../../stores/orders'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const orderStore = useOrderStore()

onMounted(() => {
    orderStore.load()
})

// Sub-pages (both category views, order editing) keep their sidebar menu item highlighted.
const isCategorySection = computed(() => ['admin-categories', 'admin-category-board'].includes(route.name))
const isOrderSection = computed(() => route.name === 'admin-order-edit')

// If the server marks the token as invalid, the store logs the user out and redirects back to sign in.
watch(
    () => auth.isAdmin,
    (isAdmin) => {
        if (!isAdmin) router.push({ name: 'login', query: { redirect: route.fullPath } })
    },
)

async function logout() {
    await router.push({ name: 'home' })
    auth.logout()
}
</script>

<template>
    <div class="admin-layout">
        <aside class="admin-sidebar">
            <h2>Admin felület</h2>
            <nav>
                <RouterLink :to="{ name: 'admin-dashboard' }">Áttekintés</RouterLink>
                <RouterLink :to="{ name: 'admin-products' }">Termékek</RouterLink>
                <RouterLink :to="{ name: 'admin-categories' }" :class="{ 'section-active': isCategorySection }">Kategóriák</RouterLink>
                <RouterLink :to="{ name: 'admin-orders' }" :class="{ 'section-active': isOrderSection }">Rendelések</RouterLink>
                <RouterLink :to="{ name: 'admin-users' }">Felhasználók</RouterLink>
            </nav>
            <button class="logout-btn" @click="logout">Kijelentkezés</button>
        </aside>
        <section class="admin-content">
            <RouterView />
        </section>
    </div>
</template>

<style scoped>
.admin-layout {
    display: grid;
    grid-template-columns: clamp(160px, 18vw, 220px) 1fr;
    width: 100%;
    min-height: calc(100vh - 200px);
}
.admin-sidebar {
    background: #f7f9fd;
    border-right: 1px solid #e2e6ee;
    padding: clamp(1rem, 2vw, 1.5rem) clamp(0.6rem, 1.5vw, 1.5rem);
    display: flex;
    flex-direction: column;
}
.admin-sidebar h2 {
    font-size: clamp(0.95rem, 0.75rem + 0.4vw, 1.1rem);
    color: #12203c;
    margin: 0 0 1.25rem;
}
.admin-sidebar nav {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    flex: 1;
}
.admin-sidebar nav a {
    color: #4b5977;
    text-decoration: none;
    font-size: clamp(0.8rem, 0.65rem + 0.3vw, 0.92rem);
    padding: 0.4rem 0.5rem;
    border-radius: 6px;
}
.admin-sidebar nav a.router-link-exact-active,
.admin-sidebar nav a.section-active {
    background: #e6ecfb;
    color: #12203c;
    font-weight: 600;
}
.logout-btn {
    background: none;
    border: 1px solid #d7dded;
    color: #4b5977;
    margin-top: 1rem;
    padding: 0.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: clamp(0.75rem, 0.6rem + 0.3vw, 0.85rem);
}
.admin-content {
    min-width: 0;
    padding: 2rem;
}

@media (max-width: 780px) {
    .admin-layout {
        grid-template-columns: 1fr;
    }
    .admin-sidebar {
        border-right: none;
        border-bottom: 1px solid #e2e6ee;
    }
    .admin-content {
        padding: 1.5rem 1rem;
    }
}
</style>
