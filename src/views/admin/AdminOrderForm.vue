<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ORDER_STATUSES, useOrderStore } from '../../stores/orders'
import { useProductStore } from '../../stores/products'
import ProductPicker from '../../components/admin/ProductPicker.vue'

const route = useRoute()
const router = useRouter()
const orderStore = useOrderStore()
const productStore = useProductStore()

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const loadError = ref('')
const form = reactive({
    customer: { name: '', email: '', address: '', city: '', zip: '' },
    status: ORDER_STATUSES[0],
    items: [],
})

onMounted(async () => {
    try {
        const [order] = await Promise.all([orderStore.fetchById(route.params.id), productStore.fetchAll()])
        Object.assign(form.customer, order.customer)
        form.status = order.status
        form.items = order.items.map((item) => ({ ...item }))
    } catch (fetchError) {
        loadError.value = fetchError.message
    } finally {
        loading.value = false
    }
})

// Products that are not in the order yet, in alphabetical order.
const addableProducts = computed(() => {
    const orderedIds = new Set(form.items.map((item) => item.productId))
    return productStore.all
        .filter((product) => !orderedIds.has(product.id))
        .sort((a, b) => a.name.localeCompare(b.name, 'hu'))
})

const total = computed(() => form.items.reduce((sum, item) => sum + item.price * item.quantity, 0))

function formatPrice(value) {
    return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(value)
}

// A newly added product is ordered at its current price.
function addItem(product) {
    form.items.push({ productId: product.id, name: product.name, price: product.price, quantity: 1 })
}

function removeItem(productId) {
    form.items = form.items.filter((item) => item.productId !== productId)
}

async function submit() {
    if (!form.items.length) {
        error.value = 'A rendelésben legalább egy terméknek lennie kell.'
        return
    }
    saving.value = true
    error.value = ''
    try {
        await orderStore.updateOrder(route.params.id, {
            customer: { ...form.customer },
            status: form.status,
            items: form.items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity) })),
        })
        // Stock changed on the server, so the cached products are refreshed.
        await productStore.fetchAll()
        router.push({ name: 'admin-orders' })
    } catch (saveError) {
        error.value = saveError.message
    } finally {
        saving.value = false
    }
}
</script>

<template>
    <div class="order-form-view">
        <h1>Rendelés szerkesztése <span class="order-id">{{ route.params.id }}</span></h1>

        <p v-if="loading" class="empty-state">Betöltés...</p>
        <p v-else-if="loadError" class="error">{{ loadError }}</p>
        <form v-else class="order-form" @submit.prevent="submit">
            <section>
                <h2>Vásárló</h2>
                <label>
                    Név
                    <input v-model="form.customer.name" required />
                </label>
                <label>
                    E-mail
                    <input v-model="form.customer.email" type="email" required />
                </label>
                <label>
                    Cím
                    <input v-model="form.customer.address" required />
                </label>
                <div class="form-row">
                    <label>
                        Város
                        <input v-model="form.customer.city" />
                    </label>
                    <label>
                        Irányítószám
                        <input v-model="form.customer.zip" />
                    </label>
                </div>
                <label>
                    Állapot
                    <select v-model="form.status">
                        <option v-for="status in ORDER_STATUSES" :key="status" :value="status">{{ status }}</option>
                    </select>
                </label>
            </section>

            <section>
                <h2>Termékek</h2>
                <div class="table-wrap">
                    <table class="item-table">
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
                            <tr v-for="item in form.items" :key="item.productId">
                                <td>{{ item.name }}</td>
                                <td>{{ formatPrice(item.price) }}</td>
                                <td>
                                    <input v-model.number="item.quantity" type="number" min="1" step="1" required class="quantity-input" />
                                </td>
                                <td>{{ formatPrice(item.price * (item.quantity || 0)) }}</td>
                                <td>
                                    <button type="button" class="remove-btn" title="Eltávolítás" @click="removeItem(item.productId)">✕</button>
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3">Végösszeg</td>
                                <td colspan="2">{{ formatPrice(total) }}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <ProductPicker :products="addableProducts" placeholder="Termék hozzáadása – kezdd el beírni a nevét..." @select="addItem" />
                <p class="note">
                    A rendelésben már szereplő termékek a rendeléskori áron maradnak. A mennyiség változását a készlet is követi.
                </p>
            </section>

            <p v-if="error" class="error">{{ error }}</p>

            <div class="form-actions">
                <RouterLink :to="{ name: 'admin-orders' }" class="cancel-btn">Mégse</RouterLink>
                <button type="submit" class="submit-btn" :disabled="saving">{{ saving ? 'Mentés...' : 'Mentés' }}</button>
            </div>
        </form>
    </div>
</template>

<style scoped>
.order-form-view h1 {
    color: #12203c;
    margin: 0 0 1.25rem;
}
.order-id {
    color: #7c8aa5;
    font-size: 0.6em;
    font-weight: 600;
    margin-left: 0.5rem;
}
.order-form {
    max-width: 760px;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}
.order-form section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.order-form h2 {
    color: #12203c;
    font-size: 1.05rem;
    margin: 0;
}
.order-form label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.9rem;
    color: #4b5977;
}
.order-form input,
.order-form select {
    padding: 0.55rem 0.7rem;
    border: 1px solid #d7dded;
    border-radius: 6px;
    font-family: inherit;
    font-size: 0.95rem;
}
.form-row {
    display: flex;
    gap: 1rem;
}
.form-row label {
    flex: 1;
}
.table-wrap {
    overflow-x: auto;
}
.item-table {
    width: 100%;
    border-collapse: collapse;
}
.item-table th,
.item-table td {
    padding: 0.5rem;
    border-bottom: 1px solid #eef1f7;
    text-align: left;
    font-size: 0.9rem;
}
.item-table th {
    color: #7c8aa5;
    text-transform: uppercase;
    font-size: 0.75rem;
}
.item-table tfoot td {
    font-weight: 700;
    color: #12203c;
    border-bottom: none;
}
.order-form .quantity-input {
    width: 5rem;
    padding: 0.35rem 0.5rem;
}
.remove-btn {
    background: none;
    border: none;
    color: #d9455f;
    cursor: pointer;
    font-size: 1rem;
}
.note {
    color: #7c8aa5;
    font-size: 0.8rem;
    margin: 0;
}
.error {
    color: #d9455f;
    font-size: 0.9rem;
    margin: 0;
}
.empty-state {
    color: #7c8aa5;
}
.form-actions {
    display: flex;
    gap: 1rem;
}
.submit-btn {
    padding: 0.6rem 1.4rem;
    background: #12203c;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
}
.submit-btn:hover:not(:disabled) {
    background: #ff6a3d;
}
.submit-btn:disabled {
    opacity: 0.6;
    cursor: default;
}
.cancel-btn {
    padding: 0.6rem 1.4rem;
    border: 1px solid #d7dded;
    border-radius: 6px;
    color: #4b5977;
    text-decoration: none;
}

@media (max-width: 780px) {
    .form-row {
        flex-direction: column;
    }
}
</style>
