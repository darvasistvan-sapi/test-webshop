<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '../../stores/products'
import { useCategoryStore } from '../../stores/categories'
import ImageDropzone from '../../components/admin/ImageDropzone.vue'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()
const categoryStore = useCategoryStore()

const productId = computed(() => (route.params.id ? Number(route.params.id) : null))
const isEdit = computed(() => productId.value !== null)
const existing = computed(() => (isEdit.value ? productStore.byId(productId.value) : null))

onMounted(() => {
    if (isEdit.value) productStore.fetchById(productId.value).catch(() => {})
})

const form = reactive({
    name: '',
    category: '',
    brand: '',
    price: 0,
    stock: 0,
    description: '',
    specsText: '',
    image: '',
})
// Newly selected image; it is uploaded only when saving.
const imageFile = ref(null)
const saving = ref(false)
const error = ref('')

// Categories load asynchronously, so a new product gets the first category once they arrive.
watch(
    () => categoryStore.ordered,
    (ordered) => {
        if (!form.category && ordered.length) form.category = ordered[0].id
    },
    { immediate: true },
)

watch(
    existing,
    (product) => {
        if (product) {
            form.name = product.name
            form.category = product.category
            form.brand = product.brand
            form.price = product.price
            form.stock = product.stock
            form.description = product.description
            form.specsText = Object.entries(product.specs ?? {})
                .map(([k, v]) => `${k}: ${v}`)
                .join('\n')
            form.image = product.image ?? ''
        }
    },
    { immediate: true },
)

function parseSpecs(text) {
    const specs = {}
    text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => {
            const [key, ...rest] = line.split(':')
            if (key && rest.length) {
                specs[key.trim()] = rest.join(':').trim()
            }
        })
    return specs
}

async function submit() {
    error.value = ''
    saving.value = true
    try {
        const image = imageFile.value
            ? await productStore.uploadImage(imageFile.value, form.category)
            : form.image || null

        const payload = {
            name: form.name,
            category: form.category,
            brand: form.brand,
            price: Number(form.price),
            stock: Number(form.stock),
            description: form.description,
            specs: parseSpecs(form.specsText),
            image,
        }

        if (isEdit.value) {
            await productStore.updateProduct(productId.value, payload)
        } else {
            await productStore.addProduct(payload)
        }
        router.push({ name: 'admin-products' })
    } catch (e) {
        error.value = e.message
    } finally {
        saving.value = false
    }
}
</script>

<template>
    <div class="product-form-view">
        <h1>{{ isEdit ? 'Termék szerkesztése' : 'Új termék' }}</h1>

        <form class="product-form" @submit.prevent="submit">
            <label>
                Név
                <input v-model="form.name" required />
            </label>

            <label>
                Kategória
                <select v-model="form.category">
                    <option v-for="cat in categoryStore.ordered" :key="cat.id" :value="cat.id">
                        {{ '— '.repeat(cat.depth) }}{{ cat.name }}
                    </option>
                </select>
            </label>

            <label>
                Márka
                <input v-model="form.brand" required />
            </label>

            <div class="form-row">
                <label>
                    Ár (Ft)
                    <input v-model.number="form.price" type="number" min="0" required />
                </label>
                <label>
                    Készlet
                    <input v-model.number="form.stock" type="number" min="0" required />
                </label>
            </div>

            <label>
                Leírás
                <textarea v-model="form.description" rows="3" required></textarea>
            </label>

            <label>
                Specifikációk (soronként "Kulcs: Érték")
                <textarea v-model="form.specsText" rows="4" placeholder="CPU: Intel Core i7&#10;RAM: 16GB"></textarea>
            </label>

            <div class="field">
                <span class="field-label">Kép</span>
                <ImageDropzone v-model="imageFile" :current-url="form.image" @remove="form.image = ''" />
            </div>

            <p v-if="error" class="error">{{ error }}</p>

            <div class="form-actions">
                <RouterLink :to="{ name: 'admin-products' }" class="cancel-btn">Mégse</RouterLink>
                <button type="submit" class="submit-btn" :disabled="saving">
                    {{ saving ? 'Mentés...' : isEdit ? 'Mentés' : 'Létrehozás' }}
                </button>
            </div>
        </form>
    </div>
</template>

<style scoped>
.product-form-view h1 {
    color: #12203c;
    margin-bottom: 1.25rem;
}
.product-form {
    max-width: 560px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.product-form label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.9rem;
    color: #4b5977;
}
.product-form input,
.product-form select,
.product-form textarea {
    padding: 0.55rem 0.7rem;
    border: 1px solid #d7dded;
    border-radius: 6px;
    font-family: inherit;
    font-size: 0.95rem;
}
.field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}
.field-label {
    font-size: 0.9rem;
    color: #4b5977;
}
.error {
    color: #d9455f;
    font-size: 0.9rem;
    margin: 0;
}
.form-row {
    display: flex;
    gap: 1rem;
}
.form-row label {
    flex: 1;
}
.form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
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
</style>
