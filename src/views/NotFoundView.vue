<template>
  <div class="not-found-view">
    <h1>404</h1>
    <p>A keresett oldal nem található.</p>
    <RouterLink to="/">Vissza a főoldalra</RouterLink>
  </div>
</template>

<style scoped>
.not-found-view {
  text-align: center;
  padding: 5rem 1rem;
}
.not-found-view h1 {
  font-size: 3rem;
  color: #12203c;
  margin-bottom: 0.5rem;
}
</style>
