<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useCategoryStore } from '../../stores/categories'
import CategoryViewTabs from '../../components/admin/CategoryViewTabs.vue'

const categoryStore = useCategoryStore()
const editingId = ref(null)
const saving = ref(false)
const formError = ref('')
const actionError = ref('')

const emptyForm = () => ({ id: '', name: '', icon: '', parentId: '' })
const form = reactive(emptyForm())

const isEdit = computed(() => editingId.value !== null)

onMounted(() => {
    if (!categoryStore.loaded) categoryStore.load()
})

// The edited category and its descendants cannot be chosen as the new parent.
const parentOptions = computed(() => {
    if (!isEdit.value) return categoryStore.ordered
    const excludedIds = new Set([editingId.value])
    categoryStore.ordered.forEach((category) => {
        if (excludedIds.has(category.parentId)) excludedIds.add(category.id)
    })
    return categoryStore.ordered.filter((category) => !excludedIds.has(category.id))
})

function resetForm() {
    Object.assign(form, emptyForm())
    editingId.value = null
    formError.value = ''
}

function startEdit(category) {
    Object.assign(form, {
        id: category.id,
        name: category.name,
        icon: category.icon ?? '',
        parentId: category.parentId ?? '',
    })
    editingId.value = category.id
    formError.value = ''
}

async function submit() {
    saving.value = true
    formError.value = ''
    const payload = { name: form.name, icon: form.icon, parentId: form.parentId || null }
    try {
        if (isEdit.value) {
            await categoryStore.updateCategory(editingId.value, payload)
        } else {
            await categoryStore.createCategory({ id: form.id.trim(), ...payload })
        }
        resetForm()
    } catch (error) {
        formError.value = error.message
    } finally {
        saving.value = false
    }
}

async function remove(category) {
    if (!confirm(`Biztosan törlöd ezt a kategóriát: "${category.name}"?`)) return
    actionError.value = ''
    try {
        await categoryStore.deleteCategory(category.id)
        if (editingId.value === category.id) resetForm()
    } catch (error) {
        actionError.value = error.message
    }
}
</script>

<template>
    <div class="admin-categories">
        <h1>Kategóriák</h1>
        <CategoryViewTabs />

        <div class="layout">
            <section class="list">
                <p class="result-count">{{ categoryStore.categories.length }} kategória</p>
                <p v-if="categoryStore.error || actionError" class="error">{{ actionError || categoryStore.error }}</p>

                <div class="table-wrap">
                    <table class="category-table">
                        <thead>
                            <tr>
                                <th>Név</th>
                                <th>Azonosító</th>
                                <th>Szülő kategória</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="category in categoryStore.ordered"
                                :key="category.id"
                                :class="{ editing: category.id === editingId }"
                            >
                                <td>
                                    <span class="icon">{{ categoryStore.iconOf(category.id) }}</span>
                                    {{ category.name }}
                                </td>
                                <td class="muted">{{ category.id }}</td>
                                <td>
                                    <template v-if="category.parentId">{{ categoryStore.nameOf(category.parentId) }}</template>
                                    <span v-else class="muted">—</span>
                                </td>
                                <td class="actions">
                                    <button class="edit-btn" @click="startEdit(category)">Szerkesztés</button>
                                    <button class="delete-btn" @click="remove(category)">Törlés</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p v-if="categoryStore.loading" class="empty-state">Betöltés...</p>
                <p v-else-if="!categoryStore.categories.length" class="empty-state">Még nincs egyetlen kategória sem.</p>
            </section>

            <form class="category-form" @submit.prevent="submit">
                <h2>{{ isEdit ? 'Kategória szerkesztése' : 'Új kategória' }}</h2>

                <label>
                    Azonosító
                    <input
                        v-model="form.id"
                        :disabled="isEdit"
                        required
                        pattern="[a-z0-9\-]+"
                        placeholder="pl. gamer-laptop"
                        title="Csak kisbetű, szám és kötőjel"
                    />
                    <small v-if="!isEdit">Csak kisbetű, szám és kötőjel. Később nem módosítható.</small>
                </label>

                <label>
                    Név
                    <input v-model="form.name" required />
                </label>

                <label>
                    Ikon (emoji)
                    <input v-model="form.icon" maxlength="8" placeholder="🔧" />
                </label>

                <label>
                    Szülő kategória
                    <select v-model="form.parentId">
                        <option value="">— Nincs (főkategória) —</option>
                        <option v-for="category in parentOptions" :key="category.id" :value="category.id">
                            {{ '— '.repeat(category.depth) }}{{ category.name }}
                        </option>
                    </select>
                </label>

                <p v-if="formError" class="error">{{ formError }}</p>

                <div class="form-actions">
                    <button v-if="isEdit" type="button" class="cancel-btn" @click="resetForm">Mégse</button>
                    <button type="submit" class="submit-btn" :disabled="saving">
                        {{ saving ? 'Mentés...' : isEdit ? 'Mentés' : 'Létrehozás' }}
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<style scoped>
.admin-categories h1 {
    color: #12203c;
    margin: 0 0 1rem;
}
.layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
    gap: 2rem;
    align-items: start;
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
.category-table {
    width: 100%;
    border-collapse: collapse;
}
.category-table th,
.category-table td {
    padding: clamp(0.4rem, 0.8vw, 0.6rem) clamp(0.25rem, 0.6vw, 0.5rem);
    border-bottom: 1px solid #eef1f7;
    text-align: left;
    font-size: clamp(0.72rem, 0.55rem + 0.45vw, 0.9rem);
}
.category-table th {
    color: #7c8aa5;
    text-transform: uppercase;
    font-size: clamp(0.62rem, 0.5rem + 0.3vw, 0.75rem);
}
.category-table tr.editing td {
    background: #f2f5fc;
}
.icon {
    margin-right: 0.35rem;
}
.muted {
    color: #7c8aa5;
    font-family: monospace;
}
.actions {
    display: flex;
    gap: 0.75rem;
}
.actions button {
    background: none;
    border: none;
    cursor: pointer;
    font-weight: 600;
    font-size: inherit;
    padding: 0;
}
.edit-btn {
    color: #12203c;
}
.delete-btn {
    color: #d9455f;
}
.empty-state {
    color: #7c8aa5;
    padding: 1.5rem 0;
}
.category-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: #f7f9fd;
    border: 1px solid #e2e6ee;
    border-radius: 8px;
    padding: 1.25rem;
}
.category-form h2 {
    color: #12203c;
    font-size: 1.1rem;
    margin: 0;
}
.category-form label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.9rem;
    color: #4b5977;
}
.category-form small {
    color: #7c8aa5;
    font-size: 0.78rem;
}
.category-form input,
.category-form select {
    padding: 0.55rem 0.7rem;
    border: 1px solid #d7dded;
    border-radius: 6px;
    font-family: inherit;
    font-size: 0.95rem;
    background: #fff;
}
.category-form input:disabled {
    background: #eef1f7;
    color: #7c8aa5;
}
.category-form .error {
    margin: 0;
}
.form-actions {
    display: flex;
    gap: 1rem;
}
.submit-btn {
    padding: 0.6rem 1.4rem;
    background: #12203c;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
}
.submit-btn:hover:not(:disabled) {
    background: #ff6a3d;
}
.submit-btn:disabled {
    opacity: 0.6;
    cursor: default;
}
.cancel-btn {
    padding: 0.6rem 1.4rem;
    border: 1px solid #d7dded;
    border-radius: 6px;
    background: #fff;
    color: #4b5977;
    cursor: pointer;
}

@media (max-width: 1000px) {
    .layout {
        grid-template-columns: 1fr;
    }
    .category-form {
        order: -1;
    }
}
</style>
