<script setup>
import { computed } from 'vue'
import { ORDER_STATUSES, useOrderStore } from '../../stores/orders'

const props = defineProps({
    order: { type: Object, required: true },
})

const orderStore = useOrderStore()

// The product count includes quantities: 2 × A and 1 × B count as 3 products.
const itemCount = computed(() => props.order.items.reduce((sum, item) => sum + item.quantity, 0))
const averagePrice = computed(() => (itemCount.value ? props.order.total / itemCount.value : 0))

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
            <span class="average-price" title="Átlagár: összár / termékek száma">
                átl. {{ formatPrice(averagePrice) }}/db
            </span>
            <span>{{ formatDate(order.createdAt) }}</span>
            <select :value="order.status" @change="orderStore.updateStatus(order.id, $event.target.value)" @click.stop>
                <option v-for="s in ORDER_STATUSES" :key="s" :value="s">{{ s }}</option>
            </select>
        </summary>
        <div class="order-details">
            <p><strong>E-mail:</strong> {{ order.customer.email }}</p>
            <p><strong>Cím:</strong> {{ order.customer.address }}, {{ order.customer.zip }} {{ order.customer.city }}</p>
            <p>
                <strong>Termékek száma:</strong> {{ itemCount }} db,
                <strong>átlagár:</strong> {{ formatPrice(averagePrice) }}
            </p>
            <ul>
                <li v-for="item in order.items" :key="item.productId">
                    {{ item.name }} × {{ item.quantity }} — {{ formatPrice(item.price * item.quantity) }}
                </li>
            </ul>
            <div class="order-actions">
                <RouterLink :to="{ name: 'admin-order-edit', params: { id: order.id } }" class="edit-btn">Szerkesztés</RouterLink>
                <button class="delete-btn" @click="orderStore.deleteOrder(order.id)">Rendelés törlése</button>
            </div>
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
    grid-template-columns: 1.2fr 1fr 1fr 1fr 1.4fr 1.4fr;
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
.average-price {
    color: #7c8aa5;
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
.order-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.5rem;
}
.edit-btn {
    background: #12203c;
    color: #fff;
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    text-decoration: none;
    font-size: 0.85rem;
}
.edit-btn:hover {
    background: #ff6a3d;
}
.delete-btn {
    background: none;
    border: 1px solid #d9455f;
    color: #d9455f;
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    cursor: pointer;
}

@media (max-width: 780px) {
    .order-card summary {
        grid-template-columns: 1fr;
    }
}
</style>
