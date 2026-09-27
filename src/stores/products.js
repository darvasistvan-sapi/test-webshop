import { defineStore } from 'pinia'
import { apiRequest as request } from '../api'

const API_URL = '/api/products'

function buildQueryString(filters = {}, extra = {}) {
  const params = new URLSearchParams()
  if (filters.query) params.set('search', filters.query)
  if (filters.category) params.set('category', filters.category)
  if (filters.minPrice != null && filters.minPrice !== '') params.set('minPrice', filters.minPrice)
  if (filters.maxPrice != null && filters.maxPrice !== '') params.set('maxPrice', filters.maxPrice)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  Object.entries(extra).forEach(([key, value]) => params.set(key, value))
  return params.toString()
}

export const useProductStore = defineStore('products', {
  state: () => ({
    // Cache: every product ever loaded, accessible by id.
    products: [],
    // The catalog's current paginated list order and state (home page).
    catalog: {
      ids: [],
      total: 0,
      page: 0,
      pageSize: 20,
      hasMore: true,
      loading: false,
      error: '',
    },
    filters: {},
  }),
  getters: {
    all: (state) => state.products,
    byId: (state) => (id) => state.products.find((p) => p.id === id),
    catalogItems: (state) => state.catalog.ids.map((id) => state.products.find((p) => p.id === id)).filter(Boolean),
  },
  actions: {
    mergeProducts(list) {
      for (const product of list) {
        const index = this.products.findIndex((p) => p.id === product.id)
        if (index === -1) this.products.push(product)
        else this.products[index] = product
      }
    },
    async fetchPage({ filters = this.filters, page = 1, pageSize = this.catalog.pageSize, reset = false } = {}) {
      this.catalog.loading = true
      this.catalog.error = ''
      try {
        const qs = buildQueryString(filters, { page, pageSize })
        const response = await request(`${API_URL}?${qs}`)
        this.mergeProducts(response.items)
        this.catalog.ids = reset ? response.items.map((p) => p.id) : [...this.catalog.ids, ...response.items.map((p) => p.id)]
        this.catalog.total = response.total
        this.catalog.page = response.page
        this.catalog.pageSize = response.pageSize
        this.catalog.hasMore = response.hasMore
      } catch (error) {
        this.catalog.error = error.message
      } finally {
        this.catalog.loading = false
      }
    },
    async loadCatalog(filters = {}) {
      this.filters = filters
      await this.fetchPage({ filters, page: 1, reset: true })
    },
    async loadMoreCatalog() {
      if (this.catalog.loading || !this.catalog.hasMore) return
      await this.fetchPage({ filters: this.filters, page: this.catalog.page + 1, reset: false })
    },
    async fetchById(id) {
      const cached = this.byId(id)
      if (cached) return cached
      const product = await request(`${API_URL}/${id}`)
      this.mergeProducts([product])
      return product
    },
    // Fetch only the counts (pageSize=1), without downloading the full list.
    async fetchStats() {
      const [all, outOfStock] = await Promise.all([
        request(`${API_URL}?${buildQueryString({}, { page: 1, pageSize: 1 })}`),
        request(`${API_URL}?${buildQueryString({}, { page: 1, pageSize: 1, stock: '0' })}`),
      ])
      return { totalProducts: all.total, outOfStock: outOfStock.total }
    },
    // Upload the image to the category folder and return its public path.
    async uploadImage(file, category) {
      const { url } = await request(`/api/uploads/product-image?category=${encodeURIComponent(category)}`, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      return url
    },
    async addProduct(product) {
      const created = await request(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      })
      this.mergeProducts([created])
      return created.id
    },
    async updateProduct(id, updates) {
      const updated = await request(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      this.mergeProducts([updated])
    },
    async deleteProduct(id) {
      await request(`${API_URL}/${id}`, { method: 'DELETE' })
      this.products = this.products.filter((p) => p.id !== id)
      this.catalog.ids = this.catalog.ids.filter((productId) => productId !== id)
    },
    async decrementStock(id, quantity) {
      const updated = await request(`${API_URL}/${id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      })
      this.mergeProducts([updated])
    },
  },
})
