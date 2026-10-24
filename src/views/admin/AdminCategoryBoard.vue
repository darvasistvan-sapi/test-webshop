<script setup>
import { computed, onMounted, ref } from 'vue'
import { useCategoryStore } from '../../stores/categories'
import { useProductStore } from '../../stores/products'
import CategoryViewTabs from '../../components/admin/CategoryViewTabs.vue'

const categoryStore = useCategoryStore()
const productStore = useProductStore()
const loading = ref(true)
const error = ref('')
const draggedId = ref(null)
const dropTargetId = ref(null)
const savingIds = ref(new Set())

onMounted(async () => {
    try {
        await Promise.all([categoryStore.loaded ? null : categoryStore.load(), productStore.fetchAll()])
    } catch (loadError) {
        error.value = loadError.message
    } finally {
        loading.value = false
    }
})

// Every product is listed only under its own category, not under the parent categories.
const productsByCategory = computed(() => {
    const groups = {}
    for (const product of productStore.all) {
        ;(groups[product.category] ??= []).push(product)
    }
    Object.values(groups).forEach((products) => products.sort((a, b) => a.name.localeCompare(b.name, 'hu')))
    return groups
})

function productsOf(categoryId) {
    return productsByCategory.value[categoryId] ?? []
}

function isImagePath(icon) {
    return icon.startsWith('/')
}

function onDragStart(product, event) {
    draggedId.value = product.id
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(product.id))
}

function onDragEnd() {
    draggedId.value = null
    dropTargetId.value = null
}

function onDragOver(category, event) {
    if (draggedId.value === null) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    dropTargetId.value = category.id
}

// Leaving towards a child element of the same category does not count as leaving it.
function onDragLeave(category, event) {
    if (dropTargetId.value === category.id && !event.currentTarget.contains(event.relatedTarget)) {
        dropTargetId.value = null
    }
}

async function onDrop(category) {
    const productId = draggedId.value
    onDragEnd()
    const product = productStore.byId(productId)
    if (!product || product.category === category.id) return

    error.value = ''
    savingIds.value.add(productId)
    try {
        await productStore.moveToCategory(productId, category.id)
    } catch (moveError) {
        error.value = `„${product.name}” áthelyezése nem sikerült: ${moveError.message}`
    } finally {
        savingIds.value.delete(productId)
    }
}
</script>

<template>
    <div class="admin-category-board">
        <h1>Kategóriák</h1>
        <CategoryViewTabs />

        <p class="hint">A termékeket egérrel húzd át egy másik kategóriába.</p>
        <p v-if="error || categoryStore.error" class="error">{{ error || categoryStore.error }}</p>
        <p v-if="loading" class="empty-state">Betöltés...</p>

        <div v-else class="board">
            <section
                v-for="category in categoryStore.ordered"
                :key="category.id"
                :class="['category-section', { 'drop-target': dropTargetId === category.id }]"
                @dragover="onDragOver(category, $event)"
                @dragleave="onDragLeave(category, $event)"
                @drop.prevent="onDrop(category)"
            >
                <header class="category-header">
                    <img v-if="isImagePath(categoryStore.iconOf(category.id))" :src="categoryStore.iconOf(category.id)" alt="" class="category-icon-image" />
                    <span v-else class="category-icon">{{ categoryStore.iconOf(category.id) }}</span>
                    <h2>{{ category.name }}</h2>
                    <span v-if="category.parentId" class="parent">Szülő: {{ categoryStore.nameOf(category.parentId) }}</span>
                    <span class="count">{{ productsOf(category.id).length }} termék</span>
                </header>

                <ul v-if="productsOf(category.id).length" class="product-list">
                    <li
                        v-for="product in productsOf(category.id)"
                        :key="product.id"
                        :class="['product-tile', { dragging: draggedId === product.id, saving: savingIds.has(product.id) }]"
                        draggable="true"
                        :title="product.name"
                        @dragstart="onDragStart(product, $event)"
                        @dragend="onDragEnd"
                    >
                        <img v-if="product.image" :src="product.image" :alt="product.name" class="thumb" draggable="false" />
                        <span v-else class="thumb placeholder">
                            <img v-if="isImagePath(categoryStore.iconOf(category.id))" :src="categoryStore.iconOf(category.id)" alt="" draggable="false" />
                            <template v-else>{{ categoryStore.iconOf(category.id) }}</template>
                        </span>
                        <span class="product-text">
                            <span class="product-name">{{ product.name }}</span>
                            <span class="product-brand">{{ product.brand }}</span>
                        </span>
                    </li>
                </ul>
                <p v-else class="drop-hint">Ebben a kategóriában nincs termék. Húzz ide egyet!</p>
            </section>
        </div>
    </div>
</template>

<style scoped>
.admin-category-board h1 {
    color: #12203c;
    margin: 0 0 1rem;
}
.hint {
    color: #7c8aa5;
    font-size: 0.9rem;
    margin: 0 0 1rem;
}
.error {
    color: #d9455f;
    font-size: 0.9rem;
    margin: 0 0 1rem;
}
.empty-state {
    color: #7c8aa5;
    padding: 1.5rem 0;
}
.board {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.category-section {
    border: 1px solid #e2e6ee;
    border-radius: 8px;
    background: #f7f9fd;
    padding: 0.9rem 1rem 1rem;
    transition: border-color 0.12s ease, background 0.12s ease;
}
.category-section.drop-target {
    border-color: #ff6a3d;
    background: #fff4ef;
}
.category-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
}
.category-header h2 {
    color: #12203c;
    font-size: 1rem;
    margin: 0;
}
.category-icon {
    font-size: 1.15rem;
}
.category-icon-image {
    width: 1.2rem;
    height: 1.2rem;
}
.parent {
    background: #e6ecfb;
    color: #4b5977;
    border-radius: 999px;
    padding: 0.1rem 0.55rem;
    font-size: 0.75rem;
}
.count {
    color: #7c8aa5;
    font-size: 0.8rem;
    margin-left: auto;
}
.product-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.6rem;
}
.product-tile {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: #fff;
    border: 1px solid #e2e6ee;
    border-radius: 6px;
    padding: 0.45rem;
    cursor: grab;
    user-select: none;
    transition: box-shadow 0.12s ease, opacity 0.12s ease;
}
.product-tile:hover {
    box-shadow: 0 2px 8px rgba(18, 32, 60, 0.08);
}
.product-tile.dragging {
    opacity: 0.4;
}
.product-tile.saving {
    opacity: 0.6;
    cursor: progress;
}
.thumb {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    border-radius: 4px;
    object-fit: contain;
    background: #f2f5fc;
}
.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
}
.placeholder img {
    width: 60%;
    height: 60%;
    object-fit: contain;
}
.product-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
}
.product-name {
    color: #12203c;
    font-size: 0.85rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.product-brand {
    color: #7c8aa5;
    font-size: 0.75rem;
}
.drop-hint {
    color: #7c8aa5;
    font-size: 0.85rem;
    margin: 0;
    padding: 0.9rem;
    border: 1px dashed #d7dded;
    border-radius: 6px;
    text-align: center;
}
</style>
