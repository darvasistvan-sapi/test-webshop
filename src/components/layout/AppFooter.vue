<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <p>&copy; {{ new Date().getFullYear() }} TechPiac — Számítógépek, laptopok és kiegészítők egy helyen.</p>
      <p class="footer-note">Ez egy demonstrációs webshop projekt.</p>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  background: #12203c;
  color: #cdd8ee;
  text-align: center;
  padding: 1.5rem;
  font-size: 0.9rem;
}
.footer-inner {
  width: min(1200px, calc(100% - 4rem));
  margin: 0 auto;
}
.footer-note {
  opacity: 0.7;
  margin-top: 0.25rem;
}

@media (max-width: 780px) {
  .footer-inner {
    width: calc(100% - 2rem);
  }
}
</style>
