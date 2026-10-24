<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function submit() {
    error.value = ''
    submitting.value = true
    try {
        const user = await auth.login(username.value, password.value)
        const fallback = user.role === 'admin' ? { name: 'admin-dashboard' } : { name: 'home' }
        router.push(route.query.redirect || fallback)
    } catch (e) {
        error.value = e.message
    } finally {
        submitting.value = false
    }
}
</script>

<template>
    <div class="login-view">
        <form class="login-form" @submit.prevent="submit">
            <h1>Bejelentkezés</h1>
            <label>
                Felhasználónév vagy e-mail
                <input v-model="username" autocomplete="username" required autofocus />
            </label>
            <label>
                Jelszó
                <input v-model="password" type="password" autocomplete="current-password" required />
            </label>
            <p v-if="error" class="error">{{ error }}</p>
            <button type="submit" :disabled="submitting">Bejelentkezés</button>
            <p class="switch">
                Még nincs fiókod?
                <RouterLink :to="{ name: 'register', query: route.query }">Regisztrálj!</RouterLink>
            </p>
        </form>
    </div>
</template>

<style scoped>
.login-view {
    display: flex;
    justify-content: center;
    width: min(1200px, calc(100% - 4rem));
    max-width: 1200px;
    margin: 0 auto;
    padding: 4rem 1rem;
}
.login-form {
    background: #fff;
    border: 1px solid #e2e6ee;
    border-radius: 10px;
    padding: 2rem;
    width: 100%;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.login-form h1 {
    font-size: 1.3rem;
    color: #12203c;
    margin: 0 0 0.5rem;
}
.login-form label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.9rem;
    color: #4b5977;
}
.login-form input {
    padding: 0.55rem 0.7rem;
    border: 1px solid #d7dded;
    border-radius: 6px;
}
.login-form button {
    padding: 0.65rem;
    background: #12203c;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
}
.login-form button:hover:not(:disabled) {
    background: #ff6a3d;
}
.login-form button:disabled {
    opacity: 0.6;
    cursor: default;
}
.switch {
    font-size: 0.9rem;
    color: #4b5977;
    text-align: center;
    margin: 0;
}
.switch a {
    color: #ff6a3d;
    font-weight: 600;
}
.error {
    color: #d9455f;
    font-size: 0.85rem;
    margin: 0;
}

@media (max-width: 780px) {
    .login-view {
        width: calc(100% - 2rem);
    }
}
</style>
