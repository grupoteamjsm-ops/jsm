import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ── Auth ──────────────────────────────────────────────────
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { public: true }
    },

    // ── App (requiere auth) ───────────────────────────────────
    {
      path: '/',
      component: () => import('@/components/layout/AppLayout.vue'),
      children: [
        {
          path: '',
          redirect: '/dashboard'
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/dashboard/DashboardView.vue'),
          meta: { title: 'Dashboard' }
        },
        {
          path: 'analytics',
          name: 'analytics',
          component: () => import('@/views/analytics/AnalyticsView.vue'),
          meta: { title: 'Analíticas' }
        },
        {
          path: 'zones',
          name: 'zones',
          component: () => import('@/views/zones/ZonesView.vue'),
          meta: { title: 'Zonas' }
        },
        {
          path: 'energy',
          name: 'energy',
          component: () => import('@/views/energy/EnergyView.vue'),
          meta: { title: 'Energía' }
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/users/UsersView.vue'),
          meta: { title: 'Usuarios', roles: ['admin'] }
        }
      ]
    },

    // ── 404 ───────────────────────────────────────────────────
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard'
    },
    // ── Demo (solo desarrollo) ────────────────────────────────
    {
      path: '/demo/buttons',
      name: 'button-demo',
      component: () => import('@/views/ButtonDemo.vue'),
      meta: { public: true }
    }
  ]
})

// ── Guard de autenticación ────────────────────────────────────
router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (to.meta.public) return true

  if (!auth.isAuthenticated) return { name: 'login' }

  if (!auth.user) await auth.fetchMe()

  // Control de roles
  if (to.meta.roles && auth.user) {
    const roles = to.meta.roles as string[]
    if (!roles.includes(auth.user.rol)) return { name: 'dashboard' }
  }

  return true
})

export default router
