<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCartStore } from '../../stores/cart'
import { useAuthStore } from '../../stores/auth'
import { categories } from '../../data/categories'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const auth = useAuthStore()
const searchQuery = ref('')
const headerEl = ref(null)

const cartCount = computed(() => cart.count)

function submitSearch() {
  router.push({ name: 'home', query: searchQuery.value ? { q: searchQuery.value } : {} })
}

// Close the header dropdown menus (Categories, user menu).
function closeMenus(except = null) {
  headerEl.value?.querySelectorAll('details.header-menu[open]').forEach((menu) => {
    if (menu !== except) menu.open = false
  })
}

function onDocumentClick(event) {
  closeMenus(event.target.closest?.('details.header-menu'))
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
watch(() => route.fullPath, () => closeMenus())

async function logout() {
  closeMenus()
  await router.push({ name: 'home' })
  auth.logout()
}
</script>

<template>
  <header ref="headerEl" class="site-header">
    <div class="header-inner">
      <div class="header-top">
        <RouterLink to="/" class="brand">🖥️ TechPiac</RouterLink>

        <form class="search-form" @submit.prevent="submitSearch">
          <input v-model="searchQuery" type="search" placeholder="Keresés termékek között..." />
          <button type="submit">Keresés</button>
        </form>

        <nav class="header-actions">
          <RouterLink to="/kosar" class="cart-link">
            🛒 Kosár
            <span v-if="cartCount > 0" class="cart-badge">{{ cartCount }}</span>
          </RouterLink>
          <RouterLink v-if="auth.isAdmin" to="/admin" class="admin-link">Admin felület</RouterLink>
          <details v-if="auth.isLoggedIn" class="header-menu">
            <summary>👤 {{ auth.user.name }}</summary>
            <div class="dropdown-panel" @click="closeMenus()">
              <RouterLink :to="{ name: 'profile' }" class="dropdown-link">Profil adatok</RouterLink>
              <RouterLink :to="{ name: 'profile-password' }" class="dropdown-link">Jelszó módosítás</RouterLink>
              <button type="button" class="dropdown-link logout-link" @click="logout">Kijelentkezés</button>
            </div>
          </details>
          <template v-else>
            <RouterLink :to="{ name: 'login' }" class="auth-link">Bejelentkezés</RouterLink>
            <RouterLink :to="{ name: 'register' }" class="register-link">Regisztráció</RouterLink>
          </template>
          <details class="header-menu">
            <summary>☰ Kategóriák</summary>
            <div class="dropdown-panel" @click="closeMenus()">
              <RouterLink to="/" class="dropdown-link">Összes termék</RouterLink>
              <RouterLink
                v-for="cat in categories"
                :key="cat.id"
                :to="{ name: 'home', query: { category: cat.id } }"
                class="dropdown-link"
              >
                <img v-if="cat.icon.startsWith('/')" :src="cat.icon" :alt="cat.name" class="category-icon" />
                <span v-else>{{ cat.icon }}</span>
                {{ cat.name }}
              </RouterLink>
            </div>
          </details>
        </nav>
      </div>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  background: #12203c;
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}
.header-inner {
  width: min(1200px, 100%);
  margin: 0 auto;
  padding: 0 2rem;
}
.header-top {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.9rem 0;
  flex-wrap: wrap;
}
.brand {
  font-size: 1.4rem;
  font-weight: 700;
  color: #fff;
  text-decoration: none;
  white-space: nowrap;
}
.search-form {
  flex: 1;
  display: flex;
  min-width: 220px;
  max-width: 480px;
}
.search-form input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border-radius: 6px 0 0 6px;
  border: none;
  font-size: 0.95rem;
}
.search-form button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0 6px 6px 0;
  background: #ff6a3d;
  color: #fff;
  cursor: pointer;
  font-weight: 600;
}
.header-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-left: auto;
}
.cart-link,
.admin-link,
.auth-link {
  color: #fff;
  text-decoration: none;
  font-weight: 500;
  position: relative;
}
.cart-badge {
  background: #ff6a3d;
  border-radius: 999px;
  padding: 0.05rem 0.45rem;
  font-size: 0.75rem;
  margin-left: 0.3rem;
}
.register-link {
  background: #ff6a3d;
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  white-space: nowrap;
}
button.dropdown-link {
  width: 100%;
  border: none;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
}
button.logout-link {
  margin-top: 0.25rem;
  border-top: 1px solid #eef1f7;
  border-radius: 0 0 5px 5px;
  color: #d9455f;
}
button.logout-link:hover {
  color: #d9455f;
}
.header-menu {
  position: relative;
}
.header-menu summary {
  color: #fff;
  cursor: pointer;
  font-weight: 500;
  list-style: none;
  white-space: nowrap;
}
.header-menu summary::-webkit-details-marker {
  display: none;
}
.dropdown-panel {
  position: absolute;
  top: calc(100% + 0.75rem);
  right: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  min-width: 190px;
  padding: 0.5rem;
  background: #fff;
  border: 1px solid #e2e6ee;
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(18, 32, 60, 0.16);
}
.dropdown-link {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: #364766;
  background: #fff;
  text-decoration: none;
  font-size: 0.9rem;
  white-space: nowrap;
  padding: 0.45rem 0.6rem;
  border-radius: 5px;
}
.category-icon {
  width: 1.2rem;
  height: 1.2rem;
  object-fit: contain;
}
.dropdown-link:hover {
  background: #eef2fb;
  color: #12203c;
  font-weight: 600;
}

@media (max-width: 980px) {
  .header-top {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 1rem;
    row-gap: 0.75rem;
  }

  .search-form {
    grid-column: 1 / -1;
    grid-row: 2;
    width: 100%;
    max-width: none;
  }

  .header-actions {
    justify-self: end;
    margin-left: 0;
  }
}

@media (max-width: 780px) {
  .header-inner {
    width: 100%;
    padding: 0 1rem;
  }

  .header-actions {
    margin-left: 0;
  }
}

@media (max-width: 520px) {
  .header-top {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    justify-content: space-between;
  }
}
</style>
