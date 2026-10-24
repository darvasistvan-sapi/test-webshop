<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
    products: { type: Array, required: true },
    placeholder: { type: String, default: 'Termék keresése...' },
})
const emit = defineEmits(['select'])

const MAX_RESULTS = 20

const query = ref('')
const open = ref(false)
const activeIndex = ref(0)

// Case- and accent-insensitive comparison, so "kepernyo" also finds "képernyő".
function normalize(text) {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Every word typed must appear in the product's name or brand.
const matches = computed(() => {
    const words = normalize(query.value).split(/\s+/).filter(Boolean)
    return props.products
        .filter((product) => {
            const text = normalize(`${product.name} ${product.brand}`)
            return words.every((word) => text.includes(word))
        })
        .slice(0, MAX_RESULTS)
})

function formatPrice(value) {
    return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(value)
}

function openList() {
    open.value = true
    activeIndex.value = 0
}

function choose(product) {
    emit('select', product)
    query.value = ''
    open.value = false
}

function moveActive(step) {
    if (!open.value) return openList()
    const count = matches.value.length
    if (count) activeIndex.value = (activeIndex.value + step + count) % count
}

function chooseActive() {
    const product = matches.value[activeIndex.value]
    if (open.value && product) choose(product)
}
</script>

<template>
    <div class="product-picker">
        <input
            v-model="query"
            type="search"
            role="combobox"
            autocomplete="off"
            :aria-expanded="open"
            :placeholder="placeholder"
            @focus="openList"
            @input="openList"
            @blur="open = false"
            @keydown.down.prevent="moveActive(1)"
            @keydown.up.prevent="moveActive(-1)"
            @keydown.enter.prevent="chooseActive"
            @keydown.esc="open = false"
        />
        <ul v-if="open" class="results" role="listbox">
            <li
                v-for="(product, index) in matches"
                :key="product.id"
                role="option"
                :aria-selected="index === activeIndex"
                :class="{ active: index === activeIndex }"
                @mousedown.prevent="choose(product)"
                @mouseenter="activeIndex = index"
            >
                <span class="name">{{ product.name }}</span>
                <span class="details">{{ product.brand }} · {{ formatPrice(product.price) }} · {{ product.stock }} db raktáron</span>
            </li>
            <li v-if="!matches.length" class="no-results">Nincs a keresésnek megfelelő termék.</li>
        </ul>
    </div>
</template>

<style scoped>
.product-picker {
    position: relative;
}
.product-picker input {
    width: 100%;
    box-sizing: border-box;
    padding: 0.55rem 0.7rem;
    border: 1px solid #d7dded;
    border-radius: 6px;
    font-family: inherit;
    font-size: 0.95rem;
}
.results {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 10;
    max-height: 320px;
    overflow-y: auto;
    margin: 0;
    padding: 0.25rem 0;
    list-style: none;
    background: #fff;
    border: 1px solid #d7dded;
    border-radius: 6px;
    box-shadow: 0 6px 18px rgba(18, 32, 60, 0.12);
}
.results li {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    padding: 0.45rem 0.7rem;
    cursor: pointer;
}
.results li.active {
    background: #e6ecfb;
}
.name {
    color: #12203c;
    font-size: 0.9rem;
    font-weight: 600;
}
.details {
    color: #7c8aa5;
    font-size: 0.78rem;
}
.results li.no-results {
    color: #7c8aa5;
    font-size: 0.85rem;
    cursor: default;
}
</style>
