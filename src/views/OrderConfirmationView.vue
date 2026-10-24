<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useOrderStore } from '../stores/orders'

const route = useRoute()
const orderStore = useOrderStore()
const loading = ref(false)

const order = computed(() => orderStore.all.find((o) => o.id === route.params.id))

// After a reload, fetch the order from the server (only available for the owner or admin).
onMounted(async () => {
    if (order.value) return
    loading.value = true
    await orderStore.fetchById(route.params.id).catch(() => {})
    loading.value = false
})

function formatPrice(value) {
    return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(value)
}
</script>

<template>
    <div class="confirmation-view">
        <div v-if="order" class="confirmation-card">
            <h1>Köszönjük a rendelést! 🎉</h1>
            <p>A rendelésed azonosítója: <strong>{{ order.id }}</strong></p>
            <p>Egy visszaigazoló e-mailt küldtünk a(z) {{ order.customer.email }} címre.</p>

            <ul class="order-items">
                <li v-for="item in order.items" :key="item.productId">
                    <span>{{ item.name }} × {{ item.quantity }}</span>
                    <span>{{ formatPrice(item.price * item.quantity) }}</span>
                </li>
            </ul>
            <div class="order-total">
                <span>Végösszeg</span>
                <strong>{{ formatPrice(order.total) }}</strong>
            </div>

            <RouterLink to="/" class="back-link">Vissza a főoldalra</RouterLink>
        </div>
        <div v-else-if="loading" class="not-found">
            <p>Rendelés betöltése…</p>
        </div>
        <div v-else class="not-found">
            <p>A rendelés nem található.</p>
            <RouterLink to="/">Vissza a főoldalra</RouterLink>
        </div>
    </div>
</template>

<style scoped>
.confirmation-view {
    width: min(1200px, calc(100% - 4rem));
    max-width: 1200px;
    margin: 3rem auto;
    padding: 0 1rem;
}
.confirmation-card {
    background: #f7f9fd;
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
}
.confirmation-card h1 {
    color: #12203c;
    margin-bottom: 0.75rem;
}
.order-items {
    list-style: none;
    margin: 1.5rem 0 1rem;
    padding: 0;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}
.order-items li {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: #4b5977;
}
.order-total {
    display: flex;
    justify-content: space-between;
    border-top: 1px solid #e2e6ee;
    padding-top: 0.75rem;
    font-size: 1.1rem;
    color: #12203c;
}
.back-link {
    display: inline-block;
    margin-top: 1.5rem;
    color: #12203c;
    font-weight: 600;
}
.not-found {
    text-align: center;
    padding: 4rem 1rem;
}

@media (max-width: 780px) {
    .confirmation-view {
        width: calc(100% - 2rem);
    }
}
</style>
