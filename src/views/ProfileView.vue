<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const auth = useAuthStore()

const isPasswordPage = computed(() => route.name === 'profile-password')

const profile = reactive({
  name: auth.user.name,
  username: auth.user.username,
  email: auth.user.email,
})
const profileMessage = ref('')
const profileError = ref('')
const savingProfile = ref(false)

const passwords = reactive({
  current: '',
  next: '',
  confirm: '',
})
const passwordMessage = ref('')
const passwordError = ref('')
const savingPassword = ref(false)

// Both pages use the same component: when switching, the previous messages are cleared.
watch(isPasswordPage, () => {
  profileMessage.value = profileError.value = ''
  passwordMessage.value = passwordError.value = ''
})

async function saveProfile() {
  profileMessage.value = ''
  profileError.value = ''
  savingProfile.value = true
  try {
    const user = await auth.updateProfile(profile)
    Object.assign(profile, { name: user.name, username: user.username, email: user.email })
    profileMessage.value = 'Az adataid elmentve.'
  } catch (e) {
    profileError.value = e.message
  } finally {
    savingProfile.value = false
  }
}

async function savePassword() {
  passwordMessage.value = ''
  passwordError.value = ''
  if (passwords.next !== passwords.confirm) {
    passwordError.value = 'A két új jelszó nem egyezik.'
    return
  }
  savingPassword.value = true
  try {
    await auth.changePassword(passwords.current, passwords.next)
    Object.assign(passwords, { current: '', next: '', confirm: '' })
    passwordMessage.value = 'A jelszavad megváltozott. A többi eszközön kijelentkeztettünk.'
  } catch (e) {
    passwordError.value = e.message
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <div class="profile-view">
    <h1>{{ isPasswordPage ? 'Jelszó módosítás' : 'Profil adatok' }}</h1>

    <form v-if="!isPasswordPage" class="profile-form" @submit.prevent="saveProfile">
      <label>
        Teljes név
        <input v-model="profile.name" autocomplete="name" required />
      </label>
      <label>
        Felhasználónév
        <input v-model="profile.username" autocomplete="username" minlength="3" maxlength="30" required />
      </label>
      <label>
        E-mail
        <input v-model="profile.email" type="email" autocomplete="email" required />
      </label>
      <p v-if="profileError" class="error">{{ profileError }}</p>
      <p v-if="profileMessage" class="success">{{ profileMessage }}</p>
      <button type="submit" :disabled="savingProfile">Mentés</button>
    </form>

    <form v-else class="profile-form" @submit.prevent="savePassword">
      <label>
        Jelenlegi jelszó
        <input v-model="passwords.current" type="password" autocomplete="current-password" required />
      </label>
      <label>
        Új jelszó
        <input v-model="passwords.next" type="password" autocomplete="new-password" minlength="6" required />
      </label>
      <label>
        Új jelszó megerősítése
        <input v-model="passwords.confirm" type="password" autocomplete="new-password" minlength="6" required />
      </label>
      <p v-if="passwordError" class="error">{{ passwordError }}</p>
      <p v-if="passwordMessage" class="success">{{ passwordMessage }}</p>
      <button type="submit" :disabled="savingPassword">Jelszó módosítása</button>
    </form>
  </div>
</template>

<style scoped>
.profile-view {
  width: min(640px, calc(100% - 4rem));
  margin: 0 auto;
  padding: 3rem 0;
}
.profile-view h1 {
  color: #12203c;
  margin-bottom: 1.25rem;
}
.profile-form {
  background: #fff;
  border: 1px solid #e2e6ee;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(18, 32, 60, 0.06);
  padding: 2rem 2.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.profile-form label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.95rem;
  color: #4b5977;
}
.profile-form input {
  padding: 0.7rem 0.85rem;
  border: 1px solid #d7dded;
  border-radius: 6px;
  font-size: 1rem;
}
.profile-form button {
  margin-top: 0.25rem;
  padding: 0.8rem;
  font-size: 1rem;
  background: #12203c;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}
.profile-form button:hover:not(:disabled) {
  background: #ff6a3d;
}
.profile-form button:disabled {
  opacity: 0.6;
  cursor: default;
}
.error,
.success {
  font-size: 0.85rem;
  margin: 0;
}
.error {
  color: #d9455f;
}
.success {
  color: #1f8a5b;
}

@media (max-width: 780px) {
  .profile-view {
    width: calc(100% - 2rem);
    padding: 2rem 0;
  }
  .profile-form {
    padding: 1.5rem 1.25rem;
  }
}
</style>
