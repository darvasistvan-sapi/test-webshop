<script setup>
import { ref, watch, onMounted } from 'vue'
import { useProductStore } from '../../stores/products'
import { useCategoryStore } from '../../stores/categories'

const productStore = useProductStore()
const categoryStore = useCategoryStore()
const query = ref('')

function formatPrice(value) {
    return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(value)
}

let searchTimeout = null
watch(query, (value) => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        productStore.loadCatalog({ query: value })
    }, 300)
})

onMounted(() => {
    productStore.loadCatalog({ query: query.value })
})

function remove(product) {
    if (confirm(`Biztosan törlöd ezt a terméket: "${product.name}"?`)) {
        productStore.deleteProduct(product.id)
    }
}
</script>

<template>
    <div class="admin-products">
        <div class="header-row">
            <h1>Termékek</h1>
            <RouterLink :to="{ name: 'admin-product-new' }" class="new-btn">+ Új termék</RouterLink>
        </div>

        <input v-model="query" class="search-box" type="search" placeholder="Keresés név vagy márka szerint..." />

        <p class="result-count">{{ productStore.catalog.total }} termék található</p>

        <div class="table-wrap">
            <table class="product-table">
                <thead>
                    <tr>
                        <th>Név</th>
                        <th>Kategória</th>
                        <th>Márka</th>
                        <th>Ár</th>
                        <th>Készlet</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="product in productStore.catalogItems" :key="product.id">
                        <td>{{ product.name }}</td>
                        <td>{{ categoryStore.nameOf(product.category) }}</td>
                        <td>{{ product.brand }}</td>
                        <td>{{ formatPrice(product.price) }}</td>
                        <td :class="{ low: product.stock === 0 }">{{ product.stock }}</td>
                        <td class="actions">
                            <RouterLink :to="{ name: 'admin-product-edit', params: { id: product.id } }">Szerkesztés</RouterLink>
                            <button @click="remove(product)">Törlés</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p v-if="!productStore.catalogItems.length && !productStore.catalog.loading" class="empty-state">
            Nincs a keresésnek megfelelő termék.
        </p>
        <button
            v-if="productStore.catalog.hasMore"
            class="load-more-btn"
            :disabled="productStore.catalog.loading"
            @click="productStore.loadMoreCatalog()"
        >
            {{ productStore.catalog.loading ? 'Betöltés...' : 'További termékek betöltése' }}
        </button>
    </div>
</template>

<style scoped>
.header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}
.header-row h1 {
    color: #12203c;
    margin: 0;
}
.new-btn {
    background: #12203c;
    color: #fff;
    padding: 0.55rem 1rem;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 600;
}
.new-btn:hover {
    background: #ff6a3d;
}
.search-box {
    width: 100%;
    max-width: 360px;
    padding: 0.5rem 0.7rem;
    border: 1px solid #d7dded;
    border-radius: 6px;
    margin-bottom: 1.25rem;
}
.table-wrap {
    overflow-x: auto;
}
.product-table {
    width: 100%;
    border-collapse: collapse;
}
.product-table th,
.product-table td {
    padding: clamp(0.4rem, 0.8vw, 0.6rem) clamp(0.25rem, 0.6vw, 0.5rem);
    border-bottom: 1px solid #eef1f7;
    text-align: left;
    font-size: clamp(0.72rem, 0.55rem + 0.45vw, 0.9rem);
}
.product-table th {
    color: #7c8aa5;
    text-transform: uppercase;
    font-size: clamp(0.62rem, 0.5rem + 0.3vw, 0.75rem);
}
.product-table button,
.product-table select {
    font-size: inherit;
}
.product-table td.low {
    color: #d9455f;
    font-weight: 600;
}
.actions {
    display: flex;
    gap: 0.75rem;
}
.actions a {
    color: #12203c;
    text-decoration: none;
    font-weight: 600;
}
.actions button {
    background: none;
    border: none;
    color: #d9455f;
    cursor: pointer;
    font-weight: 600;
}
.empty-state {
    color: #7c8aa5;
    padding: 1.5rem 0;
}
.result-count {
    color: #7c8aa5;
    margin: 0 0 1rem;
    font-size: 0.9rem;
}
.load-more-btn {
    margin-top: 1.25rem;
    padding: 0.6rem 1.2rem;
    border: 1px solid #d7dded;
    border-radius: 6px;
    background: #fff;
    color: #12203c;
    cursor: pointer;
    font-weight: 600;
}
.load-more-btn:disabled {
    color: #7c8aa5;
    cursor: not-allowed;
}
</style>
