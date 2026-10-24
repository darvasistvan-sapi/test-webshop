<script setup>
import { useOrderStore } from '../../stores/orders'
import AdminOrderCard from '../../components/admin/AdminOrderCard.vue'

const orderStore = useOrderStore()
</script>

<template>
    <div class="admin-orders">
        <h1>Rendelések</h1>

        <div v-if="orderStore.all.length" class="orders-list">
            <AdminOrderCard v-for="order in orderStore.all" :key="order.id" :order="order" />
        </div>
        <p v-else class="empty-state">Még nem érkezett rendelés.</p>
    </div>
</template>

<style scoped>
.admin-orders h1 {
    color: #12203c;
    margin-bottom: 1.25rem;
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
