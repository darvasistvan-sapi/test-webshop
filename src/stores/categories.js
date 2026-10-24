import { defineStore } from 'pinia'
import { apiRequest as request } from '../api'

const API_URL = '/api/categories'
const DEFAULT_ICON = '🔧'

export const useCategoryStore = defineStore('categories', {
    state: () => ({
        categories: [],
        loaded: false,
        loading: false,
        error: '',
    }),
    getters: {
        byId: (state) => (id) => state.categories.find((c) => c.id === id),
        iconOf: (state) => (id) => state.categories.find((c) => c.id === id)?.icon || DEFAULT_ICON,
        nameOf: (state) => (id) => state.categories.find((c) => c.id === id)?.name ?? id,
        // Depth-first list of the category tree: every subcategory follows its parent, with its depth.
        ordered: (state) => {
            const result = []
            const visit = (parentId, depth) => {
                state.categories
                    .filter((c) => (c.parentId ?? null) === parentId)
                    .forEach((category) => {
                        result.push({ ...category, depth })
                        visit(category.id, depth + 1)
                    })
            }
            visit(null, 0)
            return result
        },
    },
    actions: {
        async load() {
            if (this.loading) return
            this.loading = true
            this.error = ''
            try {
                this.categories = await request(API_URL)
                this.loaded = true
            } catch (error) {
                this.error = error.message
            } finally {
                this.loading = false
            }
        },
        async createCategory(category) {
            const created = await request(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(category),
            })
            this.categories.push(created)
            return created
        },
        async updateCategory(id, updates) {
            const updated = await request(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            })
            const index = this.categories.findIndex((c) => c.id === id)
            if (index !== -1) this.categories[index] = updated
        },
        async deleteCategory(id) {
            await request(`${API_URL}/${id}`, { method: 'DELETE' })
            this.categories = this.categories.filter((c) => c.id !== id)
        },
    },
})
