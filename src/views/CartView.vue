<script setup>
import { computed, onMounted } from 'vue'
import { useCartStore } from '../stores/cart'
import { useProductStore } from '../stores/products'

const cart = useCartStore()
const productStore = useProductStore()

onMounted(() => {
  cart.items.forEach((item) => productStore.fetchById(item.productId).catch(() => {}))
})

function formatPrice(value) {
  return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(value)
}

const rows = computed(() =>
  cart.items
    .map((item) => {
      const product = productStore.byId(item.productId)
      return product ? { ...item, product } : null
    })
    .filter(Boolean),
)

const total = computed(() => rows.value.reduce((sum, row) => sum + row.product.price * row.quantity, 0))

function updateQty(productId, qty) {
  cart.setQuantity(productId, Number(qty))
}
</script>

<template>
  <div class="cart-view">
    <h1>Kosár</h1>

    <div v-if="rows.length" class="cart-content">
      <table class="cart-table">
        <thead>
          <tr>
            <th>Termék</th>
            <th>Egységár</th>
            <th>Mennyiség</th>
            <th>Összesen</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.productId">
            <td>
              <RouterLink :to="{ name: 'product-detail', params: { id: row.product.id } }">
                {{ row.product.name }}
              </RouterLink>
            </td>
            <td>{{ formatPrice(row.product.price) }}</td>
            <td>
              <input
                type="number"
                min="1"
                :max="row.product.stock"
                :value="row.quantity"
                @change="updateQty(row.productId, $event.target.value)"
              />
            </td>
            <td>{{ formatPrice(row.product.price * row.quantity) }}</td>
            <td>
              <button class="remove-btn" @click="cart.removeItem(row.productId)">✕</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="cart-summary">
        <span>Végösszeg</span>
        <strong>{{ formatPrice(total) }}</strong>
      </div>

      <div class="cart-actions">
        <RouterLink to="/" class="secondary-btn">Vásárlás folytatása</RouterLink>
        <RouterLink to="/penztar" class="primary-btn">Tovább a pénztárhoz</RouterLink>
      </div>
    </div>

    <div v-else class="empty-cart">
      <p>A kosarad jelenleg üres.</p>
      <RouterLink to="/">Nézz körbe a termékeink között</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.cart-view {
  width: min(1200px, calc(100% - 4rem));
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}
.cart-view h1 {
  color: #12203c;
  margin-bottom: 1.25rem;
}
.cart-table {
  width: 100%;
  border-collapse: collapse;
}
.cart-table th,
.cart-table td {
  padding: 0.7rem 0.5rem;
  border-bottom: 1px solid #eef1f7;
  text-align: left;
}
.cart-table th {
  color: #7c8aa5;
  font-size: 0.8rem;
  text-transform: uppercase;
}
.cart-table a {
  color: #12203c;
  font-weight: 600;
  text-decoration: none;
}
.cart-table input {
  width: 60px;
  padding: 0.3rem;
  border: 1px solid #d7dded;
  border-radius: 6px;
}
.remove-btn {
  background: none;
  border: none;
  color: #d9455f;
  cursor: pointer;
  font-size: 1rem;
}
.cart-summary {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.25rem 0.5rem;
  font-size: 1.2rem;
  color: #12203c;
}
.cart-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
.primary-btn,
.secondary-btn {
  padding: 0.65rem 1.4rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
}
.primary-btn {
  background: #12203c;
  color: #fff;
}
.primary-btn:hover {
  background: #ff6a3d;
}
.secondary-btn {
  color: #12203c;
  border: 1px solid #d7dded;
}
.empty-cart {
  text-align: center;
  padding: 3rem 0;
  color: #4b5977;
}

@media (max-width: 780px) {
  .cart-view {
    width: calc(100% - 2rem);
  }
}
</style>
