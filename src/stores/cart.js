import { defineStore } from 'pinia'

const STORAGE_KEY = 'webshop_cart'

function loadCart() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
        try {
            // Carts saved before the switch to integer product ids ('p12') are dropped.
            return JSON.parse(raw).filter((item) => Number.isInteger(item.productId))
        } catch {
            return []
        }
    }
    return []
}

function persist(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export const useCartStore = defineStore('cart', {
    state: () => ({
        items: loadCart(), // { productId, quantity }
    }),
    getters: {
        count: (state) => state.items.reduce((sum, i) => sum + i.quantity, 0),
        isEmpty: (state) => state.items.length === 0,
    },
    actions: {
        addItem(productId, quantity = 1) {
            const existing = this.items.find((i) => i.productId === productId)
            if (existing) {
                existing.quantity += quantity
            } else {
                this.items.push({ productId, quantity })
            }
            persist(this.items)
        },
        setQuantity(productId, quantity) {
            const existing = this.items.find((i) => i.productId === productId)
            if (existing) {
                if (quantity <= 0) {
                    this.removeItem(productId)
                } else {
                    existing.quantity = quantity
                    persist(this.items)
                }
            }
        },
        removeItem(productId) {
            this.items = this.items.filter((i) => i.productId !== productId)
            persist(this.items)
        },
        clear() {
            this.items = []
            persist(this.items)
        },
    },
})
