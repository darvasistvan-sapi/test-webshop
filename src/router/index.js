import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
  { path: '/termek/:id', name: 'product-detail', component: () => import('../views/ProductDetailView.vue'), props: true },
  { path: '/kosar', name: 'cart', component: () => import('../views/CartView.vue') },
  { path: '/penztar', name: 'checkout', component: () => import('../views/CheckoutView.vue') },
  { path: '/rendeles/:id', name: 'order-confirmation', component: () => import('../views/OrderConfirmationView.vue'), props: true },
  { path: '/bejelentkezes', name: 'login', component: () => import('../views/LoginView.vue'), meta: { guestOnly: true } },
  { path: '/regisztracio', name: 'register', component: () => import('../views/RegisterView.vue'), meta: { guestOnly: true } },
  { path: '/profil', name: 'profile', component: () => import('../views/ProfileView.vue'), meta: { requiresAuth: true } },
  { path: '/profil/jelszo', name: 'profile-password', component: () => import('../views/ProfileView.vue'), meta: { requiresAuth: true } },
  {
    path: '/admin',
    component: () => import('../views/admin/AdminLayout.vue'),
    meta: { requiresAdmin: true },
    children: [
      { path: '', name: 'admin-dashboard', component: () => import('../views/admin/AdminDashboard.vue') },
      { path: 'termekek', name: 'admin-products', component: () => import('../views/admin/AdminProducts.vue') },
      { path: 'termekek/uj', name: 'admin-product-new', component: () => import('../views/admin/AdminProductForm.vue') },
      { path: 'termekek/:id', name: 'admin-product-edit', component: () => import('../views/admin/AdminProductForm.vue'), props: true },
      { path: 'rendelesek', name: 'admin-orders', component: () => import('../views/admin/AdminOrders.vue') },
      { path: 'felhasznalok', name: 'admin-users', component: () => import('../views/admin/AdminUsers.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && auth.isLoggedIn) {
    return { name: 'home' }
  }
  return true
})

export default router
