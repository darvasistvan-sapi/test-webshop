<script setup>
import { useOrderStore } from '../../stores/orders'

defineProps({
  order: { type: Object, required: true },
})

const orderStore = useOrderStore()

const statuses = ['Feldolgozás alatt', 'Csomagolás alatt', 'Kiszállítás alatt', 'Teljesítve', 'Törölve']

function formatPrice(value) {
  return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(value)
}

function formatDate(ts) {
  return new Date(ts).toLocaleString('hu-HU')
}
</script>

<template>
  <details class="order-card">
    <summary>
      <span class="order-id">{{ order.id }}</span>
      <span>{{ order.customer.name }}</span>
      <span>{{ formatPrice(order.total) }}</span>
      <span>{{ formatDate(order.createdAt) }}</span>
      <select :value="order.status" @change="orderStore.updateStatus(order.id, $event.target.value)" @click.stop>
        <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
      </select>
    </summary>
    <div class="order-details">
      <p><strong>E-mail:</strong> {{ order.customer.email }}</p>
      <p><strong>Cím:</strong> {{ order.customer.address }}, {{ order.customer.zip }} {{ order.customer.city }}</p>
      <ul>
        <li v-for="item in order.items" :key="item.productId">
          {{ item.name }} × {{ item.quantity }} — {{ formatPrice(item.price * item.quantity) }}
        </li>
      </ul>
      <button class="delete-btn" @click="orderStore.deleteOrder(order.id)">Rendelés törlése</button>
    </div>
  </details>
</template>

<style scoped>
.order-card {
  border: 1px solid #e2e6ee;
  border-radius: 8px;
  padding: 0.25rem 1rem;
}
.order-card summary {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 1.4fr 1.4fr;
  gap: 0.75rem;
  align-items: center;
  padding: clamp(0.5rem, 0.9vw, 0.75rem) 0;
  cursor: pointer;
  font-size: clamp(0.72rem, 0.55rem + 0.45vw, 0.9rem);
}
.order-id {
  font-weight: 700;
  color: #12203c;
}
.order-card select {
  font-size: inherit;
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
  border: 1px solid #d7dded;
}
.order-details {
  border-top: 1px solid #eef1f7;
  padding: 1rem 0;
  font-size: 0.9rem;
  color: #4b5977;
}
.order-details ul {
  margin: 0.5rem 0;
  padding-left: 1.2rem;
}
.delete-btn {
  background: none;
  border: 1px solid #d9455f;
  color: #d9455f;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 0.5rem;
}

@media (max-width: 780px) {
  .order-card summary {
    grid-template-columns: 1fr;
  }
}
</style>
