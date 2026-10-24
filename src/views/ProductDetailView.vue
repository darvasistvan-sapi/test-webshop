<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '../stores/products'
import { useCartStore } from '../stores/cart'
import { useCategoryStore } from '../stores/categories'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()
const cart = useCartStore()
const categoryStore = useCategoryStore()

const quantity = ref(1)
const loading = ref(true)

const productId = computed(() => Number(route.params.id))
const product = computed(() => productStore.byId(productId.value))

async function ensureProductLoaded() {
    loading.value = true
    await productStore.fetchById(productId.value).catch(() => {})
    loading.value = false
}

onMounted(ensureProductLoaded)
watch(() => route.params.id, ensureProductLoaded)

const categoryIcon = computed(() => categoryStore.iconOf(product.value?.category))

function formatPrice(value) {
    return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(value)
}

function addToCart() {
    cart.addItem(product.value.id, quantity.value)
    router.push({ name: 'cart' })
}
</script>

<template>
    <div v-if="loading" class="loading-state">
        <p>Betöltés...</p>
    </div>
    <div v-else-if="product" class="product-detail">
        <div class="detail-thumb">
            <img v-if="product.image" :src="product.image" :alt="product.name" class="product-image" />
            <img v-else-if="categoryIcon.startsWith('/')" :src="categoryIcon" :alt="product.name" class="category-fallback-image" />
            <span v-else class="icon">{{ categoryIcon }}</span>
        </div>
        <div class="detail-info">
            <span class="brand">{{ product.brand }}</span>
            <h1>{{ product.name }}</h1>
            <p class="price">{{ formatPrice(product.price) }}</p>
            <p :class="['stock', { low: product.stock === 0 }]">
                {{ product.stock > 0 ? `${product.stock} db raktáron` : 'Jelenleg nincs raktáron' }}
            </p>
            <p class="description">{{ product.description }}</p>

            <table class="specs" v-if="product.specs">
                <tbody>
                    <tr v-for="(value, key) in product.specs" :key="key">
                        <th>{{ key }}</th>
                        <td>{{ value }}</td>
                    </tr>
                </tbody>
            </table>

            <div class="purchase-row">
                <input v-model.number="quantity" type="number" min="1" :max="product.stock" />
                <button :disabled="product.stock === 0" @click="addToCart">Kosárba teszem</button>
            </div>
        </div>
    </div>
    <div v-else class="not-found">
        <p>A termék nem található.</p>
        <RouterLink to="/">Vissza a főoldalra</RouterLink>
    </div>
</template>

<style scoped>
.product-detail {
    width: min(1200px, calc(100% - 4rem));
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    display: grid;
    grid-template-columns: 380px 1fr;
    gap: 2.5rem;
}
.detail-thumb {
    height: 320px;
    border-radius: 12px;
    background: linear-gradient(135deg, #eef2fb, #dbe4f7);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}
.icon {
    font-size: 6rem;
}
.product-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.category-fallback-image {
    width: 12rem;
    height: 12rem;
    object-fit: contain;
}
.brand {
    text-transform: uppercase;
    font-size: 0.8rem;
    letter-spacing: 0.04em;
    color: #7c8aa5;
}
.detail-info h1 {
    margin: 0.3rem 0 0.6rem;
    color: #12203c;
}
.price {
    font-size: 1.6rem;
    font-weight: 700;
    color: #12203c;
    margin: 0 0 0.3rem;
}
.stock {
    color: #2f9e57;
    margin-bottom: 1rem;
}
.stock.low {
    color: #d9455f;
}
.description {
    color: #4b5977;
    line-height: 1.5;
    margin-bottom: 1.25rem;
}
.specs {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1.5rem;
}
.specs th,
.specs td {
    text-align: left;
    padding: 0.4rem 0.6rem;
    border-bottom: 1px solid #eef1f7;
    font-size: 0.9rem;
}
.specs th {
    color: #7c8aa5;
    width: 40%;
}
.purchase-row {
    display: flex;
    gap: 0.75rem;
}
.purchase-row input {
    width: 80px;
    padding: 0.5rem;
    border-radius: 6px;
    border: 1px solid #d7dded;
}
.purchase-row button {
    padding: 0.6rem 1.4rem;
    background: #12203c;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
}
.purchase-row button:hover:not(:disabled) {
    background: #ff6a3d;
}
.purchase-row button:disabled {
    background: #c8cedb;
    cursor: not-allowed;
}
.not-found {
    text-align: center;
    padding: 4rem 1rem;
}
.loading-state {
    text-align: center;
    padding: 4rem 1rem;
    color: #7c8aa5;
}

@media (max-width: 720px) {
    .product-detail {
        width: calc(100% - 2rem);
    }
    .product-detail {
        grid-template-columns: 1fr;
    }
}
</style>
