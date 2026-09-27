<script setup>
import { computed, onMounted, ref } from 'vue'
import { useProductStore } from '../../stores/products'
import { useOrderStore } from '../../stores/orders'
import AdminOrderCard from '../../components/admin/AdminOrderCard.vue'

const productStore = useProductStore()
const orderStore = useOrderStore()

const totalProducts = ref(0)
const outOfStock = ref(0)

onMounted(async () => {
  const stats = await productStore.fetchStats().catch(() => null)
  if (stats) {
    totalProducts.value = stats.totalProducts
    outOfStock.value = stats.outOfStock
  }
})

function formatPrice(value) {
  return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(value)
}

const totalOrders = computed(() => orderStore.all.length)
const totalRevenue = computed(() => orderStore.all.reduce((sum, o) => sum + o.total, 0))
const recentOrders = computed(() => orderStore.all.slice(0, 5))
</script>

<template>
  <div class="dashboard">
    <h1>Áttekintés</h1>

    <div class="stat-grid">
      <div class="stat-card">
        <span class="label">Termékek</span>
        <strong>{{ totalProducts }}</strong>
      </div>
      <div class="stat-card">
        <span class="label">Elfogyott termékek</span>
        <strong>{{ outOfStock }}</strong>
      </div>
      <div class="stat-card">
        <span class="label">Rendelések</span>
        <strong>{{ totalOrders }}</strong>
      </div>
      <div class="stat-card">
        <span class="label">Összes bevétel</span>
        <strong>{{ formatPrice(totalRevenue) }}</strong>
      </div>
    </div>

    <h2>Legutóbbi rendelések</h2>
    <div v-if="recentOrders.length" class="orders-list">
      <AdminOrderCard v-for="order in recentOrders" :key="order.id" :order="order" />
    </div>
    <p v-else class="empty-state">Még nincs rendelés.</p>
  </div>
</template>

<style scoped>
.dashboard h1 {
  color: #12203c;
  margin-bottom: 1.25rem;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}
.stat-card {
  background: #f7f9fd;
  border-radius: 10px;
  padding: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.stat-card .label {
  font-size: 0.8rem;
  color: #7c8aa5;
}
.stat-card strong {
  font-size: 1.4rem;
  color: #12203c;
}
.dashboard h2 {
  font-size: 1.1rem;
  color: #12203c;
  margin-bottom: 0.75rem;
}
.orders-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.empty-state {
  color: #7c8aa5;
}
</style>
