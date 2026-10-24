<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

// v-model: the selected file that has not yet been uploaded (or null).
// currentUrl: the product's saved image while no new one is selected.
const props = defineProps({
    modelValue: { type: File, default: null },
    currentUrl: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'remove'])

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 5 * 1024 * 1024

const fileInput = ref(null)
const dragging = ref(false)
const error = ref('')
const objectUrl = ref('')

watch(
    () => props.modelValue,
    (file) => {
        if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
        objectUrl.value = file ? URL.createObjectURL(file) : ''
    },
    { immediate: true },
)
onBeforeUnmount(() => {
    if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
})

const previewUrl = computed(() => objectUrl.value || props.currentUrl)

function pick(file) {
    error.value = ''
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
        error.value = 'Csak JPG, PNG, WebP vagy GIF kép választható.'
        return
    }
    if (file.size > MAX_BYTES) {
        error.value = 'A kép legfeljebb 5 MB lehet.'
        return
    }
    emit('update:modelValue', file)
}

function onDragLeave(event) {
    // dragleave also fires when moving over inner elements; only clear the highlight when leaving the box.
    if (!event.currentTarget.contains(event.relatedTarget)) dragging.value = false
}

function onDrop(event) {
    dragging.value = false
    pick(event.dataTransfer.files[0])
}

function onFileChange(event) {
    pick(event.target.files[0])
    event.target.value = ''
}

function openPicker() {
    fileInput.value?.click()
}

function remove() {
    error.value = ''
    emit('update:modelValue', null)
    emit('remove')
}
</script>

<template>
    <div class="image-dropzone">
        <div
            :class="['dropzone', { dragging, 'has-image': previewUrl }]"
            role="button"
            tabindex="0"
            aria-label="Termékkép kiválasztása"
            @click="openPicker"
            @keydown.enter.prevent="openPicker"
            @keydown.space.prevent="openPicker"
            @dragenter.prevent="dragging = true"
            @dragover.prevent="dragging = true"
            @dragleave.prevent="onDragLeave"
            @drop.prevent="onDrop"
        >
            <img v-if="previewUrl" :src="previewUrl" alt="A termék képe" class="preview" />
            <div v-else class="placeholder">
                <img src="/upload-icon.png" alt="" class="icon" />
                <strong>Húzd ide a képet</strong>
                <span>vagy kattints a tallózáshoz</span>
                <small>JPG, PNG, WebP vagy GIF · max. 5 MB</small>
            </div>
            <div v-if="dragging" class="drop-overlay">Engedd el a feltöltéshez</div>
        </div>

        <div v-if="previewUrl" class="image-actions">
            <span v-if="modelValue" class="file-name">{{ modelValue.name }} (mentéskor töltődik fel)</span>
            <button type="button" @click="openPicker">Csere</button>
            <button type="button" class="remove" @click="remove">Eltávolítás</button>
        </div>
        <p v-if="error" class="error">{{ error }}</p>

        <input ref="fileInput" type="file" :accept="ACCEPTED_TYPES.join(',')" hidden @change="onFileChange" />
    </div>
</template>

<style scoped>
.dropzone {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 280px;
    border: 2px dashed #c9d2e6;
    border-radius: 10px;
    background: #f7f9fd;
    cursor: pointer;
    overflow: hidden;
    transition: border-color 0.15s, background 0.15s;
}
.dropzone:hover,
.dropzone:focus-visible {
    border-color: #12203c;
    outline: none;
}
.dropzone.dragging {
    border-color: #ff6a3d;
    background: #fff4f0;
}
.dropzone.has-image {
    background: #fff;
}
.placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 1.5rem;
    text-align: center;
    color: #4b5977;
    font-size: 0.9rem;
}
.placeholder .icon {
    width: 88px;
    height: 88px;
    margin-bottom: 1rem;
    opacity: 0.8;
}
.placeholder strong {
    color: #12203c;
    font-size: 1rem;
}
.placeholder small {
    color: #7c8aa5;
    margin-top: 0.25rem;
}
.preview {
    max-width: 100%;
    max-height: 260px;
    object-fit: contain;
    padding: 0.75rem;
}
.drop-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 244, 240, 0.9);
    color: #ff6a3d;
    font-weight: 600;
    pointer-events: none;
}
.image-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 0.5rem;
    font-size: 0.85rem;
}
.file-name {
    color: #7c8aa5;
    margin-right: auto;
    overflow-wrap: anywhere;
}
.image-actions button {
    background: none;
    border: 1px solid #d7dded;
    border-radius: 6px;
    padding: 0.35rem 0.8rem;
    color: #12203c;
    cursor: pointer;
    font-weight: 600;
}
.image-actions button.remove {
    border-color: #d9455f;
    color: #d9455f;
}
.error {
    color: #d9455f;
    font-size: 0.85rem;
    margin: 0.5rem 0 0;
}
</style>
