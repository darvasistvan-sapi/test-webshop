<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const form = reactive({
  name: '',
  username: '',
  email: '',
  password: '',
  passwordConfirm: '',
})
const error = ref('')
const submitting = ref(false)

async function submit() {
  error.value = ''
  if (form.password !== form.passwordConfirm) {
    error.value = 'A két jelszó nem egyezik.'
    return
  }
  submitting.value = true
  try {
    await auth.register(form)
    router.push(route.query.redirect || { name: 'home' })
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
      <h1>Regisztráció</h1>
      <label>
        Teljes név
        <input v-model="form.name" autocomplete="name" required autofocus />
      </label>
      <label>
        Felhasználónév
        <input v-model="form.username" autocomplete="username" minlength="3" maxlength="30" required />
      </label>
      <label>
        E-mail
        <input v-model="form.email" type="email" autocomplete="email" required />
      </label>
      <label>
        Jelszó
        <input v-model="form.password" type="password" autocomplete="new-password" minlength="6" required />
      </label>
      <label>
        Jelszó megerősítése
        <input v-model="form.passwordConfirm" type="password" autocomplete="new-password" minlength="6" required />
      </label>
      <p v-if="error" class="error">{{ error }}</p>
      <button type="submit" :disabled="submitting">Regisztráció</button>
      <p class="switch">
        Már van fiókod?
        <RouterLink :to="{ name: 'login', query: route.query }">Jelentkezz be!</RouterLink>
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
