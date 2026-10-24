<script setup>
import { computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '../stores/cart'
import { useProductStore } from '../stores/products'
import { useOrderStore } from '../stores/orders'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const cart = useCartStore()
const productStore = useProductStore()
const orderStore = useOrderStore()
const auth = useAuthStore()

onMounted(() => {
    cart.items.forEach((item) => productStore.fetchById(item.productId).catch(() => {}))
})

const form = reactive({
    name: auth.user?.name ?? '',
    email: auth.user?.email ?? '',
    address: '',
    city: '',
    zip: '',
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

async function submitOrder() {
    if (!rows.value.length) return

    const order = await orderStore.createOrder({
        customer: { ...form },
        items: rows.value.map((row) => ({
            productId: row.product.id,
            name: row.product.name,
            price: row.product.price,
            quantity: row.quantity,
        })),
        total: total.value,
    })

    await productStore.mergeProducts(
        rows.value.map((row) => ({ ...row.product, stock: Math.max(0, row.product.stock - row.quantity) })),
    )
    cart.clear()
    router.push({ name: 'order-confirmation', params: { id: order.id } })
}
</script>

<template>
    <div class="checkout-view">
        <h1>Pénztár</h1>

        <div v-if="rows.length" class="checkout-content">
            <form class="checkout-form" @submit.prevent="submitOrder">
                <h2>Szállítási adatok</h2>
                <label>
                    Név
                    <input v-model="form.name" required />
                </label>
                <label>
                    E-mail
                    <input v-model="form.email" type="email" required />
                </label>
                <label>
                    Cím
                    <input v-model="form.address" required />
                </label>
                <div class="form-row">
                    <label>
                        Város
                        <input v-model="form.city" required />
                    </label>
                    <label>
                        Irányítószám
                        <input v-model="form.zip" required />
                    </label>
                </div>
                <button type="submit" class="submit-btn">Megrendelés véglegesítése</button>
            </form>

            <aside class="order-summary">
                <h2>Rendelés összesítő</h2>
                <ul>
                    <li v-for="row in rows" :key="row.productId">
                        <span>{{ row.product.name }} × {{ row.quantity }}</span>
                        <span>{{ formatPrice(row.product.price * row.quantity) }}</span>
                    </li>
                </ul>
                <div class="summary-total">
                    <span>Végösszeg</span>
                    <strong>{{ formatPrice(total) }}</strong>
                </div>
            </aside>
        </div>

        <div v-else class="empty-cart">
            <p>A kosarad üres, nincs mit rendelni.</p>
            <RouterLink to="/">Vissza a termékekhez</RouterLink>
        </div>
    </div>
</template>

<style scoped>
.checkout-view {
    width: min(1200px, calc(100% - 4rem));
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}
.checkout-view h1 {
    color: #12203c;
    margin-bottom: 1.25rem;
}
.checkout-content {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 2rem;
}
.checkout-form h2,
.order-summary h2 {
    font-size: 1.1rem;
    color: #12203c;
    margin-bottom: 1rem;
}
.checkout-form label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    margin-bottom: 0.9rem;
    font-size: 0.9rem;
    color: #4b5977;
}
.checkout-form input {
    padding: 0.55rem 0.7rem;
    border: 1px solid #d7dded;
    border-radius: 6px;
    font-size: 0.95rem;
}
.form-row {
    display: flex;
    gap: 1rem;
}
.form-row label {
    flex: 1;
}
.submit-btn {
    margin-top: 0.5rem;
    padding: 0.7rem 1.4rem;
    background: #12203c;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    width: 100%;
}
.submit-btn:hover {
    background: #ff6a3d;
}
.order-summary {
    background: #f7f9fd;
    border-radius: 10px;
    padding: 1.25rem;
    height: fit-content;
}
.order-summary ul {
    list-style: none;
    padding: 0;
    margin: 0 0 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.order-summary li {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: #4b5977;
}
.summary-total {
    display: flex;
    justify-content: space-between;
    border-top: 1px solid #e2e6ee;
    padding-top: 0.75rem;
    font-size: 1.1rem;
    color: #12203c;
}
.empty-cart {
    text-align: center;
    padding: 3rem 0;
    color: #4b5977;
}

@media (max-width: 720px) {
    .checkout-view {
        width: calc(100% - 2rem);
    }
    .checkout-content {
        grid-template-columns: 1fr;
    }
}
</style>
