<script setup>
import { computed, onMounted, ref } from 'vue'
import { useUserStore } from '../../stores/users'
import { useAuthStore } from '../../stores/auth'

const userStore = useUserStore()
const auth = useAuthStore()
const query = ref('')
const actionError = ref('')

const roles = [
    { value: 'customer', label: 'Vásárló' },
    { value: 'admin', label: 'Admin' },
]

onMounted(() => {
    userStore.load()
})

const filteredUsers = computed(() => {
    const q = query.value.trim().toLowerCase()
    if (!q) return userStore.users
    return userStore.users.filter((user) =>
        [user.name, user.username, user.email].some((field) => field.toLowerCase().includes(q)),
    )
})

function isSelf(user) {
    return user.id === auth.user?.id
}

function formatDate(ts) {
    return new Date(ts).toLocaleDateString('hu-HU')
}

async function changeRole(user, event) {
    actionError.value = ''
    const role = event.target.value
    try {
        await userStore.updateRole(user.id, role)
    } catch (error) {
        event.target.value = user.role
        actionError.value = error.message
    }
}

async function remove(user) {
    if (!confirm(`Biztosan törlöd ezt a felhasználót: "${user.name}" (${user.username})?`)) return
    actionError.value = ''
    try {
        await userStore.deleteUser(user.id)
    } catch (error) {
        actionError.value = error.message
    }
}
</script>

<template>
    <div class="admin-users">
        <h1>Felhasználók</h1>

        <input v-model="query" class="search-box" type="search" placeholder="Keresés név, felhasználónév vagy e-mail szerint..." />

        <p class="result-count">{{ filteredUsers.length }} felhasználó található</p>
        <p v-if="userStore.error || actionError" class="error">{{ actionError || userStore.error }}</p>

        <div class="table-wrap">
            <table class="user-table">
                <thead>
                    <tr>
                        <th>Név</th>
                        <th>Felhasználónév</th>
                        <th>E-mail</th>
                        <th>Szerepkör</th>
                        <th>Regisztrált</th>
                        <th>Rendelések</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="user in filteredUsers" :key="user.id">
                        <td>
                            {{ user.name }}
                            <span v-if="isSelf(user)" class="self-badge">te</span>
                        </td>
                        <td>{{ user.username }}</td>
                        <td>{{ user.email }}</td>
                        <td>
                            <select :value="user.role" :disabled="isSelf(user)" @change="changeRole(user, $event)">
                                <option v-for="r in roles" :key="r.value" :value="r.value">{{ r.label }}</option>
                            </select>
                        </td>
                        <td>{{ formatDate(user.createdAt) }}</td>
                        <td>{{ user.orderCount }}</td>
                        <td class="actions">
                            <button v-if="!isSelf(user)" @click="remove(user)">Törlés</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p v-if="userStore.loading" class="empty-state">Betöltés...</p>
        <p v-else-if="!filteredUsers.length" class="empty-state">Nincs a keresésnek megfelelő felhasználó.</p>
    </div>
</template>

<style scoped>
.admin-users h1 {
    color: #12203c;
    margin: 0 0 1rem;
}
.search-box {
    width: 100%;
    max-width: 360px;
    padding: 0.5rem 0.7rem;
    border: 1px solid #d7dded;
    border-radius: 6px;
    margin-bottom: 1.25rem;
}
.result-count {
    color: #7c8aa5;
    margin: 0 0 1rem;
    font-size: 0.9rem;
}
.error {
    color: #d9455f;
    font-size: 0.9rem;
    margin: 0 0 1rem;
}
.table-wrap {
    overflow-x: auto;
}
.user-table {
    width: 100%;
    border-collapse: collapse;
}
.user-table th,
.user-table td {
    padding: clamp(0.4rem, 0.8vw, 0.6rem) clamp(0.25rem, 0.6vw, 0.5rem);
    border-bottom: 1px solid #eef1f7;
    text-align: left;
    font-size: clamp(0.72rem, 0.55rem + 0.45vw, 0.9rem);
}
.user-table th {
    color: #7c8aa5;
    text-transform: uppercase;
    font-size: clamp(0.62rem, 0.5rem + 0.3vw, 0.75rem);
}
.user-table button,
.user-table select {
    font-size: inherit;
}
.user-table select {
    padding: 0.3rem 0.5rem;
    border-radius: 6px;
    border: 1px solid #d7dded;
}
.self-badge {
    background: #e6ecfb;
    color: #12203c;
    border-radius: 999px;
    padding: 0.05rem 0.45rem;
    font-size: 0.75rem;
    font-weight: 600;
    margin-left: 0.3rem;
}
.actions button {
    background: none;
    border: none;
    color: #d9455f;
    cursor: pointer;
    font-weight: 600;
}
.empty-state {
    color: #7c8aa5;
    padding: 1.5rem 0;
}
</style>
