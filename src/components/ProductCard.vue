<script setup>
import { computed } from 'vue'
import { useCartStore } from '../stores/cart'
import { categories } from '../data/categories'

const props = defineProps({
  product: { type: Object, required: true },
})

const cart = useCartStore()

const categoryIcon = computed(() => {
  return categories.find((c) => c.id === props.product.category)?.icon ?? '🔧'
})

const formattedPrice = computed(() => formatPrice(props.product.price))

function formatPrice(value) {
  return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(value)
}

function addToCart() {
  cart.addItem(props.product.id, 1)
}
</script>

<template>
  <article class="product-card">
    <RouterLink :to="{ name: 'product-detail', params: { id: product.id } }" class="product-thumb">
      <img v-if="product.image" :src="product.image" :alt="product.name" class="product-image" />
      <img v-else-if="categoryIcon.startsWith('/')" :src="categoryIcon" :alt="product.name" class="category-fallback-image" />
      <span v-else class="icon">{{ categoryIcon }}</span>
    </RouterLink>
    <div class="product-info">
      <span class="brand">{{ product.brand }}</span>
      <div class="name-row">
        <RouterLink :to="{ name: 'product-detail', params: { id: product.id } }" class="name">
          {{ product.name }}
        </RouterLink>
        <span :class="['stock', { low: product.stock === 0 }]">
          {{ product.stock > 0 ? `${product.stock} db` : 'Elfogyott' }}
        </span>
      </div>
      <span class="price">{{ formattedPrice }}</span>
      <button class="add-btn" :disabled="product.stock === 0" @click="addToCart">
        Kosárba
      </button>
    </div>
  </article>
</template>

<style scoped>
.product-card {
  border: 1px solid #e2e6ee;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #fff;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}
.product-card:hover {
  box-shadow: 0 8px 20px rgba(18, 32, 60, 0.12);
  transform: translateY(-2px);
}
.product-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 280px;
  background: linear-gradient(135deg, #eef2fb, #dbe4f7);
  text-decoration: none;
  overflow: hidden;
}
.icon {
  font-size: 3rem;
}
.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.category-fallback-image {
  width: 6rem;
  height: 6rem;
  object-fit: contain;
}
.product-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  height: 140px;
  padding: 0.6rem 0.7rem 0.7rem;
  box-sizing: border-box;
  overflow: hidden;
}
.brand {
  font-size: 0.6rem;
  text-transform: uppercase;
  color: #7c8aa5;
  letter-spacing: 0.03em;
}
.name {
  color: #12203c;
  font-weight: 600;
  text-decoration: none;
  font-size: 0.92rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.name:hover {
  color: #ff6a3d;
}
.name-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  min-width: 0;
}
.name-row .name {
  flex: 1;
  min-width: 0;
}
.price {
  font-weight: 700;
  font-size: 1rem;
  color: #12203c;
  white-space: nowrap;
  margin-top: 0.1rem;
}
.stock {
  font-size: 0.75rem;
  color: #2f9e57;
  white-space: nowrap;
  flex-shrink: 0;
}
.stock.low {
  color: #d9455f;
}
.add-btn {
  margin-top: auto;
  padding: 0.4rem;
  background: #12203c;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
}
.add-btn:hover:not(:disabled) {
  background: #ff6a3d;
}
.add-btn:disabled {
  background: #c8cedb;
  cursor: not-allowed;
}
</style>
