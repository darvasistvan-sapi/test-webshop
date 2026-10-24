import { defineStore } from 'pinia'
import { apiRequest as request } from '../api'

const API_URL = '/api/users'

export const useUserStore = defineStore('users', {
    state: () => ({
        users: [],
        loading: false,
        error: '',
    }),
    actions: {
        async load() {
            this.loading = true
            this.error = ''
            try {
                this.users = await request(API_URL)
            } catch (error) {
                this.error = error.message
            } finally {
                this.loading = false
            }
        },
        async updateRole(id, role) {
            const updated = await request(`${API_URL}/${id}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role }),
            })
            const index = this.users.findIndex((u) => u.id === id)
            if (index !== -1) this.users[index] = updated
        },
        async deleteUser(id) {
            await request(`${API_URL}/${id}`, { method: 'DELETE' })
            this.users = this.users.filter((u) => u.id !== id)
        },
    },
})
