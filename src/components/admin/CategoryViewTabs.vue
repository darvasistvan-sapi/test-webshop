<template>
    <nav class="view-tabs">
        <RouterLink :to="{ name: 'admin-categories' }">Kategórialista</RouterLink>
        <RouterLink :to="{ name: 'admin-category-board' }">Termékek kategóriánként</RouterLink>
    </nav>
</template>

<style scoped>
.view-tabs {
    display: flex;
    gap: 0.25rem;
    border-bottom: 1px solid #e2e6ee;
    margin-bottom: 1.25rem;
}
.view-tabs a {
    padding: 0.5rem 0.9rem;
    color: #4b5977;
    text-decoration: none;
    font-size: 0.9rem;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
}
.view-tabs a.router-link-exact-active {
    color: #12203c;
    font-weight: 600;
    border-bottom-color: #ff6a3d;
}
</style>
