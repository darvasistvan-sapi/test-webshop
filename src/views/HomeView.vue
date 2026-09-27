<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '../stores/products'
import { categories } from '../data/categories'
import ProductCard from '../components/ProductCard.vue'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()

const selectedCategory = ref(route.query.category ?? '')
const searchQuery = ref(route.query.q ?? '')
const minPrice = ref('')
const maxPrice = ref('')
const sortBy = ref('default')
const sentinel = ref(null)
let observer = null

watch(
  () => route.query,
  (q) => {
    selectedCategory.value = q.category ?? ''
    searchQuery.value = q.q ?? ''
  },
)

function applyCategory(catId) {
  selectedCategory.value = catId
  router.push({ name: 'home', query: { ...route.query, category: catId || undefined } })
}

const currentFilters = computed(() => ({
  query: searchQuery.value,
  category: selectedCategory.value,
  minPrice: minPrice.value ? Number(minPrice.value) : undefined,
  maxPrice: maxPrice.value ? Number(maxPrice.value) : undefined,
  sortBy: sortBy.value,
}))

// When the filter/sort condition changes, the first catalog page is reloaded from the server.
watch(currentFilters, (filters) => {
  productStore.loadCatalog(filters)
}, { immediate: true })

function handleIntersect(entries) {
  if (entries[0]?.isIntersecting) {
    productStore.loadMoreCatalog()
  }
}

onMounted(() => {
  observer = new IntersectionObserver(handleIntersect, { rootMargin: '400px' })
  if (sentinel.value) observer.observe(sentinel.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
})

const activeCategoryName = computed(() => {
  return categories.find((c) => c.id === selectedCategory.value)?.name
})
</script>

<template>
  <div class="home-view">
    <aside class="filters">
      <h3>Kategóriák</h3>
      <ul class="filter-categories">
        <li>
          <button :class="{ active: !selectedCategory }" @click="applyCategory('')">Összes</button>
        </li>
        <li v-for="cat in categories" :key="cat.id">
          <button :class="{ active: selectedCategory === cat.id }" @click="applyCategory(cat.id)">
            <img v-if="cat.icon.startsWith('/')" :src="cat.icon" :alt="cat.name" class="category-icon" />
            <span v-else>{{ cat.icon }}</span>
            {{ cat.name }}
          </button>
        </li>
      </ul>

      <h3>Ár szerint</h3>
      <div class="price-filter">
        <input v-model="minPrice" type="number" min="0" placeholder="Min. ár" />
        <input v-model="maxPrice" type="number" min="0" placeholder="Max. ár" />
      </div>
    </aside>

    <section class="catalog">
      <div class="catalog-header">
        <h1>{{ activeCategoryName ?? 'Minden termék' }}</h1>
        <select v-model="sortBy">
          <option value="default">Alapértelmezett sorrend</option>
          <option value="price-asc">Ár szerint növekvő</option>
          <option value="price-desc">Ár szerint csökkenő</option>
          <option value="name">Név szerint</option>
        </select>
      </div>

      <p class="result-count">{{ productStore.catalog.total }} termék található</p>

      <div v-if="productStore.catalogItems.length" class="product-grid">
        <ProductCard v-for="product in productStore.catalogItems" :key="product.id" :product="product" />
      </div>
      <p v-else-if="!productStore.catalog.loading" class="empty-state">Nincs a keresésnek megfelelő termék.</p>

      <div ref="sentinel" class="scroll-sentinel"></div>
      <p v-if="productStore.catalog.loading" class="loading-state">További termékek betöltése...</p>
      <p v-else-if="!productStore.catalog.hasMore && productStore.catalogItems.length" class="loading-state">
        Nincs több termék.
      </p>
    </section>
  </div>
</template>

<style scoped>
.home-view {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}
.filters h3 {
  margin: 0 0 0.6rem;
  font-size: 0.95rem;
  color: #12203c;
}
.filter-categories {
  list-style: none;
  margin: 0 0 1.5rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.filter-categories button {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 0.4rem 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  color: #364766;
  font-size: 0.9rem;
}
.category-icon {
  width: 1.2rem;
  height: 1.2rem;
  object-fit: contain;
}
.filter-categories button.active,
.filter-categories button:hover {
  background: #eef2fb;
  color: #12203c;
  font-weight: 600;
}
.price-filter {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.price-filter input {
  padding: 0.45rem 0.6rem;
  border: 1px solid #d7dded;
  border-radius: 6px;
}
.catalog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.catalog-header h1 {
  color: #12203c;
  font-size: 1.6rem;
  margin: 0;
}
.catalog-header select {
  padding: 0.45rem 0.6rem;
  border-radius: 6px;
  border: 1px solid #d7dded;
}
.result-count {
  color: #7c8aa5;
  margin: 0.5rem 0 1.25rem;
}
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.25rem;
}
.empty-state {
  color: #7c8aa5;
  padding: 2rem 0;
  text-align: center;
}
.loading-state {
  color: #7c8aa5;
  text-align: center;
  padding: 1.5rem 0;
}
.scroll-sentinel {
  height: 1px;
}

@media (max-width: 780px) {
  .home-view {
    grid-template-columns: 1fr;
    padding: 1rem;
  }
}
</style>
