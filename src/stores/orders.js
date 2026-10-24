import { defineStore } from 'pinia'
import { apiRequest as request } from '../api'

const API_URL = '/api/orders'

export const ORDER_STATUSES = ['Feldolgozás alatt', 'Csomagolás alatt', 'Kiszállítás alatt', 'Teljesítve', 'Törölve']

export const useOrderStore = defineStore('orders', {
    state: () => ({
        orders: [],
        loaded: false,
        loading: false,
        error: '',
    }),
    getters: {
        all: (state) => [...state.orders].sort((a, b) => b.createdAt - a.createdAt),
    },
    actions: {
        async load() {
            if (this.loading) return
            this.loading = true
            this.error = ''
            try {
                this.orders = await request(API_URL)
                this.loaded = true
            } catch (error) {
                this.error = error.message
            } finally {
                this.loading = false
            }
        },
        async fetchById(id) {
            const cached = this.orders.find((o) => o.id === id)
            if (cached) return cached
            const order = await request(`${API_URL}/${id}`)
            this.orders.push(order)
            return order
        },
        async createOrder({ customer, items, total }) {
            const order = await request(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer, items, total }),
            })
            this.orders.push(order)
            return order
        },
        async updateStatus(id, status) {
            const updated = await request(`${API_URL}/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            })
            const index = this.orders.findIndex((o) => o.id === id)
            if (index !== -1) this.orders[index] = updated
        },
        async updateOrder(id, changes) {
            const updated = await request(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(changes),
            })
            const index = this.orders.findIndex((o) => o.id === id)
            if (index !== -1) this.orders[index] = updated
            return updated
        },
        async deleteOrder(id) {
            await request(`${API_URL}/${id}`, { method: 'DELETE' })
            this.orders = this.orders.filter((o) => o.id !== id)
        },
    },
})
